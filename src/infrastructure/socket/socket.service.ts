import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
// @ts-ignore - The user will install this package on their VPS
import { Emitter } from '@socket.io/redis-emitter';

@Injectable()
export class SocketService implements OnModuleInit {
  private readonly logger = new Logger(SocketService.name);
  private emitter!: any;

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    const redisClient = this.redisService.getClient();
    this.emitter = new Emitter(redisClient);
  }

  async emitToUser(userId: string, event: string, data: unknown): Promise<void> {
    this.logger.debug(`Emitting ${event} to user_${userId}`);
    this.emitter.of('/events').to(`user_${userId}`).emit(event, data);
  }

  async emitToRoom(room: string, event: string, data: unknown): Promise<void> {
    this.emitter.of('/events').to(room).emit(event, data);
  }

  async broadcast(event: string, data: unknown): Promise<void> {
    this.emitter.of('/events').emit(event, data);
  }

  async emitToSocket(socketId: string, event: string, data: unknown): Promise<void> {
    this.emitter.of('/events').to(socketId).emit(event, data);
  }

  async joinRoom(socketId: string, room: string): Promise<void> {
    this.emitter.of('/events').in(socketId).socketsJoin(room);
  }

  async leaveRoom(socketId: string, room: string): Promise<void> {
    this.emitter.of('/events').in(socketId).socketsLeave(room);
  }

  async disconnectRoom(room: string): Promise<void> {
    this.emitter.of('/events').in(room).disconnectSockets(true);
  }

  async disconnectUser(userId: string): Promise<void> {
    await this.disconnectRoom(`user_${userId}`);
  }
}
