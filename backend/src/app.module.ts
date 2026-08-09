import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from './customers/customers.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { CommissionsModule } from './commissions/commissions.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    // .env dosyasını global olarak yükle
    ConfigModule.forRoot({ isGlobal: true }),

    // PostgreSQL bağlantısı
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // DATABASE_URL varsa (Render'in tek parca baglanti adresi) onu
        // kullan -- bu, host/port/kullanici/sifre alanlarini ayri ayri
        // elle girme sirasinda olusabilecek hatalari tamamen ortadan
        // kaldirir. Yoksa eski (ayri ayri) degiskenlere geri duser.
        const databaseUrl = config.get('DATABASE_URL');
        const base = databaseUrl
          ? { url: databaseUrl }
          : {
              host: config.get('DB_HOST', 'localhost'),
              port: parseInt(config.get('DB_PORT', '5432'), 10),
              username: config.get('DB_USERNAME', 'postgres'),
              password: config.get('DB_PASSWORD', 'postgres'),
              database: config.get('DB_DATABASE', 'remax_crm'),
            };
        return {
          type: 'postgres' as const,
          ...base,
          autoLoadEntities: true,
          // Gelistirme asamasinda entity'lere gore tablolari otomatik olusturur.
          // Production'da bunun yerine migration kullanilmali.
          synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
        };
      },
    }),

    // Müşteri (CRM), Kimlik Doğrulama, Kullanıcı ve Portföy modülleri
    CustomersModule,
    AuthModule,
    UsersModule,
    PortfoliosModule,
    CommissionsModule,
    UploadModule,
  ],
})
export class AppModule {}
