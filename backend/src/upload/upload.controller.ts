import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { configureCloudinary } from './cloudinary.config';

// Bellekte tutup dogrudan Cloudinary'e akitiyoruz, diske hic yazmiyoruz
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Dosya bulunamadi');
    }

    const cloudinary = configureCloudinary();

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'remax-crm/portfolio-photos',
          resource_type: 'auto', // fotograf ve video ikisini de kabul eder
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            return reject(error);
          }
          resolve(uploadResult as { secure_url: string });
        },
      );
      uploadStream.end(file.buffer);
    });

    return { url: result.secure_url };
  }
}
