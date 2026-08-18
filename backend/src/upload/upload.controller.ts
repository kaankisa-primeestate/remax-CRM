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

// Izin verilen dosya tipleri: fotograf formatlari + PDF + Word belgeleri
// (kimlik/vergi levhasi/diploma gibi taranmis belgeler icin) + ses
// dosyalari (musteri sesli notlari da bu ayni endpoint'ten geciyor).
// Baska hicbir tip kabul edilmez -- rastgele dosya turlerinin (orn.
// calistirilabilir dosyalar) sunucuya/Cloudinary'e yuklenmesini engeller.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/x-m4a',
  // Portfoy fotograf/video galerisi icin video destegi
  'video/mp4',
  'video/webm',
  'video/quicktime',
];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB (kısa portföy videoları için)

// Bellekte tutup dogrudan Cloudinary'e akitiyoruz, diske hic yazmiyoruz
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Desteklenmeyen dosya türü. Sadece JPG, PNG, WEBP, PDF veya Word belgesi yükleyebilirsiniz.',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Dosya bulunamadi (50 MB üst sınırını aşmış veya desteklenmeyen bir tür olabilir)');
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
