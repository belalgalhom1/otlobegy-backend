import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import {
  CreateDirectConversationDto,
  CreateOrderConversationDto,
  CreateSupportConversationDto,
  CreateVendorConversationDto,
  QueryConversationsDto,
} from './dto/chat.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';


@ApiTags('Chat - Conversations')
@ApiBearerAuth()
@Controller('chat/conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @ApiStandardResponse()
  @Post('order')
  @ApiOperation({ summary: 'Create a new conversation for an order' })
  createOrder(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: CreateOrderConversationDto,
  ) {
    return this.conversationsService.createOrderConversation(actor, dto);
  }

  @ApiStandardResponse()
  @Post('support')
  @ApiOperation({ summary: 'Create a new support conversation' })
  createSupport(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: CreateSupportConversationDto,
  ) {
    return this.conversationsService.createSupportConversation(actor, dto);
  }

  @ApiStandardResponse()
  @Post('vendor')
  @ApiOperation({ summary: 'Create a new vendor conversation' })
  createVendor(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: CreateVendorConversationDto,
  ) {
    return this.conversationsService.createVendorConversation(actor, dto);
  }

  @ApiStandardResponse()
  @Post('direct')
  @ApiOperation({ summary: 'Create or get a direct conversation with a user' })
  createDirect(
    @CurrentUser() actor: JwtAccessPayload,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.conversationsService.createDirectConversation(actor, dto);
  }

  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'List my conversations' })
  listMine(
    @CurrentUser() actor: JwtAccessPayload,
    @Query() dto: QueryConversationsDto,
  ) {
    return this.conversationsService.listMyConversations(actor, dto);
  }

  @ApiStandardResponse()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific conversation by ID' })
  getOne(@CurrentUser() actor: JwtAccessPayload, @Param('id') id: string) {
    return this.conversationsService.getConversation(actor, id);
  }

  @ApiStandardResponse()
  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a conversation' })
  close(@CurrentUser() actor: JwtAccessPayload, @Param('id') id: string) {
    return this.conversationsService.closeConversation(actor, id);
  }
}
