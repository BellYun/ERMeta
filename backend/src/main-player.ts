import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PlayerApiModule } from './player-api/player-api.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(PlayerApiModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  const origins = (process.env.FRONTEND_ORIGINS ?? 'https://erwagg.com,https://www.erwagg.com,http://localhost:3000,http://localhost:3001')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: origins, methods: ['GET', 'POST', 'OPTIONS'] });
  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}

bootstrap();
