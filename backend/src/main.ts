import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Frontend (React) için CORS izni
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Gelen tüm isteklerde DTO doğrulamasını zorunlu kıl
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da tanımlı olmayan alanları at
      forbidNonWhitelisted: true, // Tanımsız alan gelirse hata ver
      transform: true, // Gelen veriyi DTO tipine dönüştür
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Remax CRM API çalışıyor: http://localhost:${port}/api`);
}
bootstrap();
