import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JWT_ACCESS_SERVICE } from 'src/common/constants/jwt.constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SocketAuthService } from './socket-auth.service';

@WebSocketGateway({
  namespace: 'events',
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    @Inject(JWT_ACCESS_SERVICE)
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly socketAuthService: SocketAuthService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('Unauthorized'));

        const payload = this.jwtService.verify(token);

        // Enforce strict authorization rules based on user role and activity
        const isAuthorized = await this.socketAuthService.authorize(payload.sub, payload.role);
        if (!isAuthorized) {
          return next(new Error('Forbidden'));
        }

        socket.data.user = payload;
        const room = `user_${payload.sub}`;
        void socket.join(room);
        this.logger.debug(
          `User ${payload.sub} authenticated and joined room ${room}`,
        );
        next();
      } catch (err) {
        if (err instanceof Error) {
          this.logger.warn(`WS auth failed: ${err.message}`);
        } else {
          this.logger.warn(`WS auth failed: ${String(err)}`);
        }
        next(new Error('Unauthorized'));
      }
    });
  }


  @SubscribeMessage('driver.location.update')
  handleDriverLocation(client: Socket, payload: { location: [number, number] }) {
    const user = client.data.user as { sub: string; role: string } | undefined;
    if (user?.role === 'DRIVER') {
      this.eventEmitter.emit('ws.driver.location.update', {
        userId: user.sub,
        location: payload.location,
      });
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(
      `✅ Client Connected: ${(client.data.user as { sub: string } | undefined)?.sub} (${client.id})`,
    );
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as { sub: string; role: string } | undefined;
    this.logger.log(
      `❌ Client Disconnected: ${user?.sub ?? 'unknown'} (${client.id})`,
    );

    if (user?.role === 'DRIVER') {
      this.eventEmitter.emit('ws.driver.disconnected', {
        userId: user.sub,
      });
    }
  }
}
