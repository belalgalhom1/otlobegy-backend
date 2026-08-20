import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RegisterDeviceDto } from './dto/device.dto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private prisma: PrismaService) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    return this.prisma.device.upsert({
      where: { token: dto.token },
      update: {
        userId,
        lastActive: new Date(),
      },
      create: {
        token: dto.token,
        platform: dto.platform,
        userId,
      },
    });
  }

  async remove(userId: string, token: string) {
    return this.prisma.device.deleteMany({
      where: {
        userId,
        token,
      },
    });
  }
}
