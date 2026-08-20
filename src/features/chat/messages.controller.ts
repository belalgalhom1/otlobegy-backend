import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiFileUpload } from 'src/common/decorators/api-file-upload.decorator';
import { ChatMediaErrors } from 'src/common/constants/response.constants';
import { MessagesService } from './messages.service';
import { SendMessageDto, QueryMessagesDto, MarkReadDto } from './dto/chat.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtAccessPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';

// Added ApiParam to the imports below
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Chat - Messages')
@ApiBearerAuth()
// Explicitly define the conversationId parameter for the entire controller's documentation
@ApiParam({
  name: 'conversationId',
  description: 'The unique identifier of the conversation',
  example: '123e4567-e89b-12d3-a456-426614174000',
})
@Controller('chat/conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @ApiStandardResponse()
  @Post()
  @ApiOperation({ summary: 'Send a message in a conversation' })
  send(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.send(actor, conversationId, dto);
  }

  @ApiStandardResponse()
  @Get()
  @ApiOperation({ summary: 'List messages in a conversation' })
  list(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('conversationId') conversationId: string,
    @Query() dto: QueryMessagesDto,
  ) {
    return this.messagesService.list(actor, conversationId, dto);
  }

  @ApiStandardResponse()
  @Patch('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read' })
  markRead(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('conversationId') conversationId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.messagesService.markRead(actor, conversationId, dto);
  }

  @ApiStandardResponse()
  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a message' })
  // Added ApiParam for messageId and included conversationId in the method signature
  @ApiParam({
    name: 'messageId',
    description: 'The unique identifier of the message',
  })
  delete(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    // We include conversationId in the params so Swagger sees it,
    // even if the service only requires the messageId for deletion.
    return this.messagesService.deleteMessage(actor, messageId);
  }

  @ApiStandardResponse()
  @Patch(':messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a message' })
  @ApiParam({
    name: 'messageId',
    description: 'The unique identifier of the message',
  })
  update(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: { text: string },
  ) {
    return this.messagesService.updateMessage(actor, messageId, dto);
  }

  @ApiStandardResponse()
  @Post('upload')
  @ApiFileUpload({ type: 'CHAT_MEDIA', required: true })
  @ApiOperation({ summary: 'Upload a media file for chat' })
  upload(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.messagesService.uploadMedia(actor, conversationId, file);
  }
}
