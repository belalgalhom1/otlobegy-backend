export interface ChatMediaTypeConfig {
  messageType: string;
  mimeTypes: string[];
  extensions: string[];
  maxSizeBytes: number;
  folder: string;
}

export const MEDIA_CONFIGS: Record<string, ChatMediaTypeConfig> = {
  IMAGE: {
    messageType: 'IMAGE',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxSizeBytes: 10 * 1024 * 1024,
    folder: 'chat/images',
  },
  VIDEO: {
    messageType: 'VIDEO',
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'],
    extensions: ['mp4', 'mov', 'webm', '3gp'],
    maxSizeBytes: 10 * 1024 * 1024,
    folder: 'chat/videos',
  },
  AUDIO: {
    messageType: 'AUDIO',
    mimeTypes: [
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/x-m4a',
    ],
    extensions: ['mp3', 'ogg', 'wav', 'webm', 'm4a', 'aac'],
    maxSizeBytes: 10 * 1024 * 1024,
    folder: 'chat/audio',
  },
};

export const ALL_ALLOWED_MIME_TYPES = new Set(
  Object.values(MEDIA_CONFIGS).flatMap((c) => c.mimeTypes),
);

export const MULTER_MAX_FILE_SIZE = Math.max(
  ...Object.values(MEDIA_CONFIGS).map((c) => c.maxSizeBytes),
);
