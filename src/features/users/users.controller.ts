import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiFileUpload } from 'src/common/decorators/api-file-upload.decorator';
import { UsersService } from './users.service';
import { UserErrors } from 'src/common/constants/response.constants';
import {
  UpdateUserDto,
  UpdateNotificationSettingsDto,
  ChangePasswordDto,
  QueryUsersDto,
  AdminUpdateUserDto,
  BanUserDto,
} from './dto/user.dto';
import { RegisterDto } from '../auth/dto/auth.dto';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission, Role } from '@prisma/client';
import type { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SELF-SERVICE  — /users/me/*
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse()
  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  getUser(@CurrentUser('sub') userId: string) {
    return this.userService.getUser(userId);
  }

  @ApiStandardResponse()
  @Patch('me')
  @ApiOperation({ summary: 'Update my profile (name, email, phone, language)' })
  updateUser(@CurrentUser('sub') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(userId, dto);
  }

  @ApiStandardResponse()
  @Post('me/avatar')
  @ApiFileUpload({ type: 'IMAGE', required: true })
  @ApiOperation({ summary: 'Upload my avatar' })
  uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadAvatar(userId, file);
  }

  @ApiStandardResponse()
  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change my password' })
  changePassword(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(actor.sub, actor.sid, dto);
  }

  @ApiStandardResponse()
  @Get('me/notification-settings')
  @ApiOperation({ summary: 'Get my notification settings' })
  getNotificationSettings(@CurrentUser('sub') userId: string) {
    return this.userService.getNotificationSettings(userId);
  }

  @ApiStandardResponse()
  @Patch('me/notification-settings')
  @ApiOperation({ summary: 'Update my notification settings' })
  updateNotificationSettings(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.userService.updateNotificationSettings(userId, dto);
  }

  @ApiStandardResponse()
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my account' })
  deleteAccount(@CurrentUser() user: JwtAccessPayload) {
    return this.userService.deleteAccount(user.sub);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — /users  (MANAGE_USERS)
  // Same pattern as VendorsController, ZonesController, etc.
  // ═══════════════════════════════════════════════════════════════════════════

  @ApiStandardResponse()
  @Get()
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({
    summary:
      '[Admin] List all users — filter by role, isBanned, includeDeleted, search',
  })
  adminFindAll(
    @CurrentUser() actor: JwtAccessPayload,
    @Query() dto: QueryUsersDto,
  ) {
    return this.userService.adminFindAll(actor, dto);
  }

  @ApiStandardResponse()
  @Get(':userId')
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({
    summary:
      '[Admin] Get a user — includes sessions, devices, vendor memberships, customer/driver snapshots',
  })
  adminFindOne(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('userId') userId: string,
  ) {
    return this.userService.adminFindOne(actor, userId);
  }

  @ApiStandardResponse()
  @Post()
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({ summary: '[Admin] Create a new user directly' })
  adminCreate(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: RegisterDto,
  ) {
    if (actor.role === Role.ADMIN && dto.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(UserErrors.CANNOT_CREATE_SUPER_ADMIN);
    }
    return this.authService.register(dto, true);
  }

  @ApiStandardResponse()
  @Patch(':userId')
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({
    summary:
      '[Admin] Update a user — name, email, phone, role, title, permissions, verification flags',
  })
  adminUpdate(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.userService.adminUpdate(actor, userId, dto);
  }

  @ApiStandardResponse()
  @Post(':userId/ban')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({
    summary:
      '[Admin] Ban a user — immediately revokes all sessions. Cannot ban SUPER_ADMIN.',
  })
  adminBan(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('userId') userId: string,
    @Body() dto: BanUserDto,
  ) {
    return this.userService.adminBan(actor, userId, dto);
  }

  @ApiStandardResponse()
  @Post(':userId/unban')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({ summary: '[Admin] Unban a user' })
  adminUnban(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('userId') userId: string,
  ) {
    return this.userService.adminUnban(actor, userId);
  }

  @ApiStandardResponse()
  @Get(':userId/sessions')
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({ summary: '[Admin] List active sessions for a user' })
  adminGetSessions(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('userId') userId: string,
  ) {
    return this.userService.adminGetSessions(actor, userId);
  }

  @ApiStandardResponse()
  @Delete(':userId/sessions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({
    summary: '[Admin] Revoke all sessions for a user (force logout)',
  })
  adminRevokeAllSessions(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('userId') userId: string,
  ) {
    return this.userService.adminRevokeAllSessions(actor, userId);
  }

  @ApiStandardResponse()
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({
    summary:
      '[Admin] Soft-delete a user — wipes email/phone PII. Cannot delete SUPER_ADMIN.',
  })
  adminRemove(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('userId') userId: string,
  ) {
    return this.userService.adminRemove(actor, userId);
  }
}
