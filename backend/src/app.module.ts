import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CustomersModule } from './customers/customers.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { CommissionsModule } from './commissions/commissions.module';
import { UploadModule } from './upload/upload.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MatchingModule } from './matching/matching.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TasksModule } from './tasks/tasks.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PropertyCommentsModule } from './property-comments/property-comments.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AgentDuesModule } from './agent-dues/agent-dues.module';
import { AgentLedgerModule } from './agent-ledger/agent-ledger.module';

@Module({
  imports: [
    // .env dosyasını global olarak yükle
    ConfigModule.forRoot({ isGlobal: true }),

    // Genel istek sinirlamasi (rate limiting) -- brute-force saldirilarina
    // (orn. giris ekraninda sinirsiz sifre denemesi) karsi temel koruma.
    // Varsayilan: dakikada 100 istek/IP -- normal kullanimda hic
    // hissedilmez, ama otomatik/bot saldirilarini engeller. Login
    // endpoint'ine ayrica daha siki bir sinir uygulanir (bkz.
    // auth.controller.ts, @Throttle dekoratoru).
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

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
    DashboardModule,
    MatchingModule,
    NotificationsModule,
    TasksModule,
    AppointmentsModule,
    PropertyCommentsModule,
    AnnouncementsModule,
    TransactionsModule,
    BankAccountsModule,
    ExpensesModule,
    AgentDuesModule,
    AgentLedgerModule,
  ],
  providers: [
    // ThrottlerGuard'ı tüm endpoint'lere global olarak uygular.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
