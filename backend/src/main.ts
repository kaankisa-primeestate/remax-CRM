import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Sadece bu adreslerden gelen tarayici isteklerine izin verilir.
// NOT: Bu liste sadece tarayici (web) isteklerini etkiler -- mobil
// uygulama (React Native) ve curl gibi araclar CORS'a tabi degildir,
// bu yuzden mobil uygulama bu listeden etkilenmez.
const ALLOWED_ORIGINS = [
  'https://remaxbostanci.com',
  'https://www.remaxbostanci.com',
  'https://remax-crm.netlify.app', // Netlify varsayilan alan adi (yedek)
  'http://localhost:5173', // yerel gelistirme (vite dev server)
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Frontend (React) için CORS izni -- sadece bilinen adreslerden erisime izin verilir
  app.enableCors({
    origin: (origin, callback) => {
      // origin bos ise (mobil uygulama, curl, Postman vb.) her zaman izin ver
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS: Bu adresten erisime izin verilmiyor'), false);
      }
    },
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
