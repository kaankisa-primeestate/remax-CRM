import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from './customers/customers.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // .env dosyasını global olarak yükle
    ConfigModule.forRoot({ isGlobal: true }),

    // PostgreSQL bağlantısı
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '5432'), 10),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'remax_crm'),
        autoLoadEntities: true,
        // Geliştirme aşamasında entity'lere göre tabloları otomatik oluşturur.
        // Production'da bunun yerine migration kullanılmalı.
        synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
      }),
    }),

    // Müşteri (CRM) modülü, Kimlik Doğrulama ve Kullanıcı (Broker/Danışman) yönetimi
    CustomersModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
