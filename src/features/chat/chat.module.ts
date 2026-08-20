import { Global, Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { ChatMediaService } from './media/media.service';

@Global()
@Module({
  controllers: [ConversationsController, MessagesController],
  providers: [ConversationsService, MessagesService, ChatMediaService],
  exports: [ConversationsService, MessagesService, ChatMediaService],
})
export class ChatModule {}
