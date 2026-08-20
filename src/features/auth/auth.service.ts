import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { Role, VendorMemberRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SocketService } from '../../infrastructure/socket/socket.service';

import { OtpService } from '../otp/otp.service';
import { OtpRequestedEvent } from 'src/common/events';
import {
  LoginDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LogoutDto,
  SocialLoginDto,
} from './dto/auth.dto';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from 'src/common/interfaces/jwt-payload.interface';
import {
  AuthErrors,
  CommonSuccess,
} from 'src/common/constants/response.constants';
import {
  JWT_ACCESS_SERVICE,
  JWT_REFRESH_SERVICE,
} from 'src/common/constants/jwt.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client();
  constructor(
    private prisma: PrismaService,
    @Inject(JWT_ACCESS_SERVICE) private accessJwt: JwtService,
    @Inject(JWT_REFRESH_SERVICE) private refreshJwt: JwtService,
    private otpService: OtpService,
    private eventEmitter: EventEmitter2,
    private config: ConfigService,
    private socketService: SocketService,
  ) {}

  async register(dto: RegisterDto, isAdminCreated: boolean = false) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      if (existing.isEmailVerified) {
        throw new ConflictException(AuthErrors.USER_EXISTS);
      }
      await this.prisma.user.delete({ where: { id: existing.id } });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone ?? null,
          password: hashedPassword,
          name: dto.name,
          role: dto.role ?? Role.CUSTOMER,
          isEmailVerified: isAdminCreated,
          isPhoneVerified: isAdminCreated ? !!dto.phone : false,
        },
      });

      if (dto.role === Role.VENDOR_MEMBER && dto.vendorId) {
        await tx.vendorMember.create({
          data: {
            userId: u.id,
            vendorId: dto.vendorId,
            role:
              (dto.vendorRole as VendorMemberRole) ?? VendorMemberRole.STAFF,
          },
        });
      }

      return u;
    });

    if (user.email) {
      await this.requestVerification({ contact: user.email, method: 'EMAIL' });
    }

    const tokens = await this.createSession(user.id, user.role, false);
    const { password: _, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async login(dto: LoginDto) {
    this.logger.log(`Login attempt for: ${dto.email}`);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        vendorMemberships: {
          include: {
            vendor: true,
          },
        },
        driver: {
          select: {
            isApproved: true,
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: User not found for ${dto.email}`);
      throw new UnauthorizedException(AuthErrors.INVALID_CREDENTIALS);
    }

    if (!user.password) {
      this.logger.warn(`Login failed: OAuth account without password for ${dto.email}`);
      throw new UnauthorizedException('This account uses social login. Please sign in with Google or Apple.');
    }

    this.logger.debug(
      `Password lengths - Received: ${dto.password.length}, Stored: ${user.password.length}`,
    );
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      this.logger.warn(`Login failed: Password mismatch for ${dto.email}`);
      throw new UnauthorizedException(AuthErrors.INVALID_CREDENTIALS);
    }

    if (user.isBanned) {
      this.logger.warn(`Login failed: User is banned: ${dto.email}`);
      throw new UnauthorizedException(
        user.banReason
          ? `${AuthErrors.BANNED}: ${user.banReason}`
          : AuthErrors.BANNED,
      );
    }

    if (!user.isEmailVerified) {
      this.logger.warn(`Login failed: Email not verified: ${dto.email}`);
      throw new ForbiddenException(AuthErrors.UNVERIFIED);
    }

    if (dto.app === 'driver' && user.role !== Role.DRIVER) {
      this.logger.warn(
        `Login failed: Invalid app access for user ${dto.email}`,
      );
      throw new ForbiddenException(
        'Drivers can only log in using the Driver App.',
      );
    }

    if (user.role === Role.DRIVER && user.driver && !user.driver.isApproved) {
      this.logger.warn(`Login failed: Driver pending approval: ${dto.email}`);
      throw new ForbiddenException(
        'Your account is pending approval.',
        { description: 'DRIVER_NOT_APPROVED' },
      );
    }

    this.logger.log(`Login success: ${dto.email}`);
    const tokens = await this.createSession(user.id, user.role, true);
    const { password: _, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  private async verifyGoogleToken(idToken: string): Promise<{ sub: string; email?: string; name?: string }> {
    try {
      const googleClientIds = this.config.get<string>('GOOGLE_CLIENT_IDS')?.split(',') || [];
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: googleClientIds.map((id) => id.trim()).filter(Boolean),
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error('No payload found');
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    } catch (error: any) {
      this.logger.error(`Google token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async verifyAppleToken(idToken: string): Promise<{ sub: string; email?: string }> {
    try {
      const appleClientIds = this.config.get<string>('APPLE_CLIENT_IDS')?.split(',') || [];
      const payload = await appleSignin.verifyIdToken(idToken, {
        audience: appleClientIds.map((id) => id.trim()).filter(Boolean),
        ignoreExpiration: true,
      });
      return {
        sub: payload.sub,
        email: payload.email,
      };
    } catch (error: any) {
      this.logger.error(`Apple token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  async socialLogin(dto: SocialLoginDto) {
    this.logger.log(`Social login attempt for: ${dto.provider}`);

    let providerAccountId = dto.providerAccountId;
    let email = dto.email;
    let name = dto.name;

    if (dto.provider === 'GOOGLE') {
      const payload = await this.verifyGoogleToken(dto.idToken);
      providerAccountId = payload.sub;
      email = payload.email || email;
      name = payload.name || name;
    } else if (dto.provider === 'APPLE') {
      const payload = await this.verifyAppleToken(dto.idToken);
      providerAccountId = payload.sub;
      email = payload.email || email;
    } else {
      throw new BadRequestException('Unsupported social provider');
    }

    if (!providerAccountId) {
      throw new BadRequestException('Could not verify provider account ID');
    }

    // 1. Check if Account exists
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: dto.provider,
          providerAccountId: providerAccountId,
        },
      },
      include: {
        user: {
          include: {
            driver: { select: { isApproved: true } },
          },
        },
      },
    });

    let user = account?.user || null;

    // 2. If no account, check if User exists by email to link
    if (!user && dto.email) {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: {
          driver: { select: { isApproved: true } },
        },
      });

      if (user) {
        // Link new account to existing user
        await this.prisma.account.create({
          data: {
            userId: user.id,
            provider: dto.provider,
            providerAccountId: providerAccountId,
          },
        });
        this.logger.log(`Linked ${dto.provider} account to existing user ${user.email}`);
      }
    }

    // 3. If still no user, Auto-Register
    if (!user) {
      user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: email ?? null,
            name: name ?? 'New User',
            role: dto.app === 'driver' ? Role.DRIVER : Role.CUSTOMER,
            isEmailVerified: true, // Social accounts are implicitly verified
            accounts: {
              create: {
                provider: dto.provider,
                providerAccountId: providerAccountId,
              },
            },
          },
          include: {
            driver: { select: { isApproved: true } },
          },
        });
        return u;
      });
      this.logger.log(`Auto-registered new user via ${dto.provider}: ${user.email}`);
    }

    // 4. Validate Role / App Access
    if (user.isBanned) {
      this.logger.warn(`Social login failed: User is banned: ${user.email}`);
      throw new UnauthorizedException(
        user.banReason
          ? `${AuthErrors.BANNED}: ${user.banReason}`
          : AuthErrors.BANNED,
      );
    }

    if (dto.app === 'driver' && user.role !== Role.DRIVER) {
      this.logger.warn(`Social login failed: Invalid app access for user ${user.email}`);
      throw new ForbiddenException('Drivers can only log in using the Driver App.');
    }

    if (user.role === Role.DRIVER && user.driver && !user.driver.isApproved) {
      this.logger.warn(`Social login failed: Driver pending approval: ${user.email}`);
      throw new ForbiddenException(
        'Your account is pending approval.',
        { description: 'DRIVER_NOT_APPROVED' },
      );
    }

    // 5. Success
    const tokens = await this.createSession(user.id, user.role, true);
    const { password: _, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async requestVerification(dto: SendOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.contact }, { phone: dto.contact }] },
    });
    if (!user) throw new NotFoundException(AuthErrors.USER_NOT_FOUND);

    await this.otpService.deleteOtp(dto.contact, 'VERIFICATION');
    const code = await this.otpService.generateOtp(dto.contact, 'VERIFICATION');

    this.eventEmitter.emit(
      'auth.otp.requested',
      new OtpRequestedEvent(dto.contact, code, dto.method, 'VERIFICATION'),
    );

    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  async verifyContact(dto: VerifyOtpDto) {
    const isPasswordReset = dto.purpose === 'PASSWORD_RESET';

    const isValid = isPasswordReset
      ? await this.otpService.peekOtp(dto.contact, dto.code, 'PASSWORD_RESET')
      : await this.otpService.validateOtp(
          dto.contact,
          dto.code,
          'VERIFICATION',
        );

    if (!isValid) throw new BadRequestException(AuthErrors.OTP_INVALID);

    if (!isPasswordReset) {
      const isEmail = dto.contact.includes('@');
      await this.prisma.user.update({
        where: isEmail ? { email: dto.contact } : { phone: dto.contact },
        data: {
          isEmailVerified: isEmail ? true : undefined,
          isPhoneVerified: !isEmail ? true : undefined,
        },
      });
    }

    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.contact }, { phone: dto.contact }] },
    });

    if (!user) {
      return { message: CommonSuccess.OPERATION_SUCCESS };
    }

    const isEmail = dto.contact.includes('@');
    const method = isEmail ? 'EMAIL' : ('SMS' as const);

    await this.otpService.deleteOtp(dto.contact, 'PASSWORD_RESET');
    const code = await this.otpService.generateOtp(
      dto.contact,
      'PASSWORD_RESET',
    );

    this.eventEmitter.emit(
      'auth.otp.requested',
      new OtpRequestedEvent(dto.contact, code, method, 'PASSWORD_RESET'),
    );

    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const isValid = await this.otpService.validateOtp(
      dto.contact,
      dto.code,
      'PASSWORD_RESET',
    );
    if (!isValid) throw new BadRequestException(AuthErrors.OTP_INVALID);

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    const isEmail = dto.contact.includes('@');

    const user = await this.prisma.user.update({
      where: isEmail ? { email: dto.contact } : { phone: dto.contact },
      data: { password: hashedPassword },
      select: { id: true },
    });

    await this.prisma.session.deleteMany({ where: { userId: user.id } });
    this.socketService.disconnectUser(user.id);

    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  async refreshTokens(payload: JwtRefreshPayload, rawRefreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isBanned: true,
            banReason: true,
            isEmailVerified: true,
          },
        },
      },
    });

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException(AuthErrors.SESSION_EXPIRED);
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      throw new UnauthorizedException(AuthErrors.SESSION_EXPIRED);
    }

    const driverProfile = await this.prisma.driver.findUnique({
      where: { userId: payload.sub },
      select: { isApproved: true },
    });

    const rtHashInput = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    const isMatch = await bcrypt.compare(rtHashInput, session.hashedRt);
    if (!isMatch) {
      await this.prisma.session.deleteMany({ where: { userId: payload.sub } });
      throw new UnauthorizedException(AuthErrors.SESSION_EXPIRED);
    }

    const user = session.user;

    if (user.isBanned) {
      throw new UnauthorizedException(
        user.banReason
          ? `${AuthErrors.BANNED}: ${user.banReason}`
          : AuthErrors.BANNED,
      );
    }

    if (user.role === Role.DRIVER && driverProfile && !driverProfile.isApproved) {
      throw new ForbiddenException(
        'Your account is pending approval.',
        { description: 'DRIVER_NOT_APPROVED' },
      );
    }

    await this.prisma.session.deleteMany({ where: { id: session.id } });
    return this.createSession(user.id, user.role, user.isEmailVerified);
  }

  async logout(userId: string, sessionId: string, dto: LogoutDto) {
    await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    this.socketService.disconnectUser(userId);

    if (dto.fcmToken) {
      await this.prisma.device.deleteMany({
        where: { userId, token: dto.fcmToken },
      });
    }

    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.device.deleteMany({ where: { userId } });
    this.socketService.disconnectUser(userId);
    return { message: CommonSuccess.OPERATION_SUCCESS };
  }

  private async createSession(
    userId: string,
    role: string,
    verified: boolean,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const refreshExpiresIn = this.config.getOrThrow<string>(
      'JWT_REFRESH_EXPIRATION',
    );

    const expiresAt = this.parseExpiry(refreshExpiresIn);

    const sessionId = randomUUID();

    const accessPayload: JwtAccessPayload = {
      sub: userId,
      sid: sessionId,
      role: role as Role,
      verified,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: userId,
      sid: sessionId,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.accessJwt.signAsync(accessPayload),
      this.refreshJwt.signAsync(refreshPayload),
    ]);

    const rtHashInput = crypto
      .createHash('sha256')
      .update(refresh_token)
      .digest('hex');
    const hashedRt = await bcrypt.hash(rtHashInput, 10);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        hashedRt,
        expiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    return { access_token, refresh_token };
  }

  private parseExpiry(expiry: string): Date {
    const now = Date.now();
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    const ms: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const multiplier = ms[unit] ?? ms['d'];
    return new Date(now + value * multiplier);
  }
}
