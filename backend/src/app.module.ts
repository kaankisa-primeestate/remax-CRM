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
import { MarketNewsModule } from './market-news/market-news.module';
import { ValuationsModule } from './valuations/valuations.module';
import { RecurringExpensesModule } from './recurring-expenses/recurring-expenses.module';
import { ChequeNotesModule } from './cheque-notes/cheque-notes.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
import { PartnersModule } from './partners/partners.module';

@Module({
  imports: [
    // .env dosyasını global olarak yükle
    ConfigModule.forRoot({ isGlobal: true }),

    // Genel istek sinirlamasi (rate limiting) -- brute-force saldirilarina
    // karsi temel koruma. Asil siki sinir zaten login endpoint'ine ozel
    // uygulaniyor (bkz. auth.controller.ts, dakikada 10 deneme). Bu genel
    // limit sadece anormal/otomatik trafiği (bot, DoS denemesi) yakalamak
    // icin -- bilinçli olarak YUKSEK tutuldu (300/dakika), cunku bircok
    // danisman AYNI ofis WiFi'sinden (ayni genel IP) calisabiliyor; dusuk
    // bir limit, gercek kullanicilarin yogun saatlerde (herkes ayni anda
    // dashboard actiginda + bildirim zili her 60sn otomatik yenilendiginde)
    // yanlislikla engellenmesine yol acabilirdi.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 300,
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
    MarketNewsModule,
    ValuationsModule,
    RecurringExpensesModule,
    ChequeNotesModule,
    CashFlowModule,
    PartnersModule,
  ],
  providers: [
    // ThrottlerGuard'ı tüm endpoint'lere global olarak uygular.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
