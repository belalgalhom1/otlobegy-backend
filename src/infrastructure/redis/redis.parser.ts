import { ConfigService } from '@nestjs/config';

export interface ParsedRedisConfig {
  urls: string[];
  isCluster: boolean;
}

export function parseRedisConfig(config: ConfigService): ParsedRedisConfig {
  const urlStr = config.getOrThrow<string>('REDIS_URL');
  const urls = urlStr.split(',').map((u) => u.trim());
  const isCluster =
    urls.length > 1 || config.get<string>('REDIS_CLUSTER_MODE') === 'true';

  return { urls, isCluster };
}
