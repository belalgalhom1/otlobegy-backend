import { Global, Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SocketAuthService } from './socket-auth.service';

@Global()
@Module({
  providers: [SocketService, SocketAuthService],
  exports: [SocketService, SocketAuthService],
})
export class SocketModule {}
