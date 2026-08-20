import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('OtlobEgy API')
    .setDescription('The OtlobEgy API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync('../docs.json', JSON.stringify(document));
  console.log('Swagger docs generated successfully');
  process.exit(0);
}
bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
