import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LocationRepository } from '../../infrastructure/location/location.repository';

@Injectable()
export class SocketListener {
  private readonly logger = new Logger(SocketListener.name);

  constructor(private readonly locationRepository: LocationRepository) {}

  @OnEvent('ws.driver.location.update', { async: true })
  async handleDriverLocationUpdate(payload: { userId: string; location: [number, number] }) {
    try {
      await this.locationRepository.processLiveLocationUpdate(payload.userId, payload.location[0], payload.location[1]);
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(`Failed to update driver location via WS: ${err.message}`);
      }
    }
  }

  @OnEvent('ws.driver.disconnected', { async: true })
  async handleDriverDisconnected(payload: { userId: string }) {
    try {
      await this.locationRepository.handleUserDisconnect(payload.userId);
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(`Failed to handle driver disconnect via WS: ${err.message}`);
      }
    }
  }
}
