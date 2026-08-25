import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
// @ts-ignore - The user will install this package on their VPS
import { Emitter } from '@socket.io/redis-emitter';

@Injectable()
export class SocketService implements OnModuleInit {
  private readonly logger = new Logger(SocketService.name);
  private emitter!: Emitter;

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    const redisClient = this.redisService.getClient();
    this.emitter = new Emitter(redisClient);
  }

  emitToUser(userId: string, event: string, data: unknown): Promise<void> {
    this.logger.debug(`Emitting ${event} to user_${userId}`);
    this.emitter.of('/events').to(`user_${userId}`).emit(event, data);
    return Promise.resolve();
  }

  emitToRoom(room: string, event: string, data: unknown): Promise<void> {
    this.emitter.of('/events').to(room).emit(event, data);
    return Promise.resolve();
  }

  broadcast(event: string, data: unknown): Promise<void> {
    this.emitter.of('/events').emit(event, data);
    return Promise.resolve();
  }

  emitToSocket(socketId: string, event: string, data: unknown): Promise<void> {
    this.emitter.of('/events').to(socketId).emit(event, data);
    return Promise.resolve();
  }

  joinRoom(socketId: string, room: string): Promise<void> {
    this.emitter.of('/events').in(socketId).socketsJoin(room);
    return Promise.resolve();
  }

  leaveRoom(socketId: string, room: string): Promise<void> {
    this.emitter.of('/events').in(socketId).socketsLeave(room);
    return Promise.resolve();
  }

  disconnectRoom(room: string): Promise<void> {
    this.emitter.of('/events').in(room).disconnectSockets(true);
    return Promise.resolve();
  }

  disconnectUser(userId: string): Promise<void> {
    return this.disconnectRoom(`user_${userId}`);
  }
}
