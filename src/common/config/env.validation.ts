import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsEmail,
  IsOptional,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsNumber()
  API_PORT!: number;

  @IsNumber()
  WS_PORT!: number;

  @IsString()
  APP_NAME!: string;

  @IsString()
  LOG_LEVEL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRATION!: string;

  @IsString()
  JWT_REFRESH_EXPIRATION!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsOptional()
  @IsString()
  REDIS_CLUSTER_MODE?: string;

  @IsString()
  SMTP_HOST!: string;

  @IsNumber()
  SMTP_PORT!: number;

  @IsString()
  SMTP_USER!: string;

  @IsString()
  SMTP_PASS!: string;

  @IsString()
  SMTP_NAME!: string;

  @IsString()
  FIREBASE_PROJECT_ID!: string;

  @IsEmail()
  FIREBASE_CLIENT_EMAIL!: string;

  @IsString()
  FIREBASE_PRIVATE_KEY!: string;

  @IsString()
  GOOGLE_CLIENT_IDS!: string;

  @IsString()
  APPLE_CLIENT_IDS!: string;
}

export function envValidate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors.map((err) => {
      const constraints = err.constraints || {};
      return `\n❌ ${err.property}: ${Object.values(constraints).join(', ')}`;
    });

    throw new Error(
      `\n⚠️  ENVIRONMENT CONFIGURATION ERROR ⚠️${formattedErrors.join('')}\n`,
    );
  }

  return validatedConfig;
}
