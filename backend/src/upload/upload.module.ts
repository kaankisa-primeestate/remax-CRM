import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB sinir (storage belirtilmezse otomatik olarak bellekte tutulur)
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
