import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
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
import { Guest } from 'src/common/decorators/guest.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiStandardResponse, ApiPaginatedResponse, ApiArrayResponse } from 'src/common/decorators/api-response.decorator';
import { UserResponseDto } from 'src/common/dto/response-models.dto';
import { AuthErrors } from 'src/common/constants/response.constants';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
} from 'src/common/interfaces/jwt-payload.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Guest()
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 10, ttl: 300000 },
  })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiStandardResponse()
  register(@Body() dto: RegisterDto) {
    if (dto.role && dto.role !== 'CUSTOMER') {
      throw new BadRequestException(AuthErrors.ONLY_CUSTOMER_REGISTRATION);
    }
    dto.role = 'CUSTOMER'; // Force CUSTOMER role
    dto.vendorId = undefined;
    dto.vendorRole = undefined;
    return this.authService.register(dto, false);
  }

  @Guest()
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 10, ttl: 300000 },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiStandardResponse()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Guest()
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 10, ttl: 300000 },
  })
  @Post('social')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with OAuth provider (Google/Apple)' })
  @ApiStandardResponse()
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }

  @Guest()
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 10, ttl: 300000 },
  })
  @Post('verify/request')
  @ApiOperation({ summary: 'Request a verification code (OTP)' })
    @ApiStandardResponse()
  sendVerification(@Body() dto: SendOtpDto) {
    return this.authService.requestVerification(dto);
  }

  @Guest()
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 10, ttl: 300000 },
  })
  @Post('verify/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm verification code (OTP)' })
    @ApiStandardResponse()
  confirmVerification(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyContact(dto);
  }

  @Guest()
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 10, ttl: 300000 },
  })
  @Post('password/forgot')
  @ApiOperation({ summary: 'Request password reset' })
    @ApiStandardResponse()
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Guest()
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 10, ttl: 300000 },
  })
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using code' })
    @ApiStandardResponse()
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 20, ttl: 300000 },
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access tokens' })
    @ApiStandardResponse()
  refreshTokens(
    @Req()
    req: {
      user: { payload: JwtRefreshPayload; rawRefreshToken: string };
    },
  ) {
    const { payload, rawRefreshToken } = req.user;
    return this.authService.refreshTokens(payload, rawRefreshToken);
  }

  @Throttle({
    short: { limit: 5, ttl: 60000 },
  })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from current session' })
    @ApiStandardResponse()
  logout(@CurrentUser() user: JwtAccessPayload, @Body() dto: LogoutDto) {
    return this.authService.logout(user.sub, user.sid, dto);
  }

  @Throttle({
    short: { limit: 3, ttl: 60000 },
  })
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all sessions' })
    @ApiStandardResponse()
  logoutAll(@CurrentUser('sub') userId: string) {
    return this.authService.logoutAll(userId);
  }
}
