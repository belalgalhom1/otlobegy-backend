import {
  Injectable,
  BadRequestException,
  Logger,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import * as path from 'path';
import {
  MEDIA_CONFIGS,
  ALL_ALLOWED_MIME_TYPES,
  ChatMediaTypeConfig,
} from './media.config';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { ChatMediaErrors } from '../../../common/constants/response.constants';

export interface UploadedChatMediaResult {
  mediaUrl: string;
  messageType: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

@Injectable()
export class ChatMediaService {
  private readonly logger = new Logger(ChatMediaService.name);

  constructor(private readonly storage: StorageService) {}

  async uploadChatMedia(
    file: Express.Multer.File,
    conversationId: string,
  ): Promise<UploadedChatMediaResult> {
    if (!ALL_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(ChatMediaErrors.UNSUPPORTED_TYPE);
    }

    const config = this.getConfigByMime(file.mimetype);
    if (!config) {
      throw new UnsupportedMediaTypeException(ChatMediaErrors.UNSUPPORTED_TYPE);
    }

    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    if (!config.extensions.includes(ext)) {
      throw new BadRequestException(ChatMediaErrors.EXTENSION_MISMATCH);
    }

    if (file.size > config.maxSizeBytes) {
      throw new PayloadTooLargeException(ChatMediaErrors.FILE_TOO_LARGE);
    }

    const folderPath = `${config.folder}/${conversationId}`;
    const mediaUrl = await this.storage.upload(file, folderPath);

    this.logger.log(
      `Media uploaded: ${config.messageType} | ${this.formatBytes(file.size)} | ${mediaUrl}`,
    );

    return {
      mediaUrl,
      messageType: config.messageType,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      originalName: file.originalname,
    };
  }

  async deleteChatMedia(mediaUrl: string): Promise<void> {
    await this.storage.delete(mediaUrl);
  }

  private getConfigByMime(mime: string): ChatMediaTypeConfig | null {
    return (
      Object.values(MEDIA_CONFIGS).find((c) => c.mimeTypes.includes(mime)) ??
      null
    );
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
