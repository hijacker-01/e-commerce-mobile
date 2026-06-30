import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  // In production set CORS_ORIGINS to a comma-separated allow-list (e.g. the
  // Vercel URL). Unset = reflect any origin (fine for dev / Bearer-token auth).
  const corsEnv = process.env.CORS_ORIGINS?.trim();
  app.enableCors({
    origin: corsEnv ? corsEnv.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  // Serve uploaded product images at /uploads/<name> (outside the /api prefix).
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}/api`);
}
bootstrap();
