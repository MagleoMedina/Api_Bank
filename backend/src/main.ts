import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );

  const config = app.get(ConfigService);
  const host = config.get<string>('host') ?? '127.0.0.1';
  const port = config.get<number>('port') ?? 3000;

  await app.listen(port, host);
  console.log(`API disponible en http://${host}:${port}`);
}
await bootstrap();