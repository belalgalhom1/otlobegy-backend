import {
  applyDecorators,
  UseInterceptors,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Observable } from 'rxjs';
import {
  ALL_ALLOWED_MIME_TYPES,
  MULTER_MAX_FILE_SIZE,
} from '../../features/chat/media/media.config';
import { ChatMediaErrors, CommonErrors } from '../constants/response.constants';

@Injectable()
export class FileRequiredInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!req.file && !req.files) {
      throw new BadRequestException(CommonErrors.FILE_REQUIRED);
    }
    return next.handle();
  }
}

export interface ApiFileUploadOptions {
  fieldName?: string;
  required?: boolean;
  type?: 'IMAGE' | 'CHAT_MEDIA';
}

export function ApiFileUpload(options: ApiFileUploadOptions = {}) {
  const { fieldName = 'file', required = true, type = 'IMAGE' } = options;

  const isChatMedia = type === 'CHAT_MEDIA';
  const maxSize = isChatMedia ? MULTER_MAX_FILE_SIZE : 5 * 1024 * 1024;
  const imageMimeTypes = /^(image\/jpeg|image\/png|image\/webp|image\/gif)$/i;

  const multerOptions = {
    storage: memoryStorage(),
    limits: {
      fileSize: maxSize,
      files: 1,
    },
    fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
      if (isChatMedia) {
        if (ALL_ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(ChatMediaErrors.UNSUPPORTED_TYPE), false);
        }
      } else {
        if (imageMimeTypes.test(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Validation failed (expected type is /(jpg|jpeg|png|webp|gif)$/i)',
            ),
            false,
          );
        }
      }
    },
  };

  const decorators = [
    UseInterceptors(FileInterceptor(fieldName, multerOptions)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  ];

  if (required) {
    decorators.push(UseInterceptors(FileRequiredInterceptor));
  }

  return applyDecorators(...decorators);
}
