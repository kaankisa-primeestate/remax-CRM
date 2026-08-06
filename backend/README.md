# Remax CRM — Backend (Müşteri Modülü)

NestJS + TypeORM + PostgreSQL ile yazılmış API. Brief'in **3.1 Kişisel CRM ve
Müşteri Yönetimi** bölümündeki müşteri kartları ve görüşme geçmişi
özelliklerini karşılar.

## Kurulum

1. PostgreSQL'in bilgisayarınızda kurulu ve çalışır olduğundan emin olun.
2. Veritabanını oluşturun:
   ```bash
   createdb remax_crm
   ```
3. `.env.example` dosyasını `.env` olarak kopyalayıp kendi bilgilerinizle
   güncelleyin:
   ```bash
   cp .env.example .env
   ```
4. Bağımlılıkları kurun:
   ```bash
   npm install
   ```
5. Geliştirme sunucusunu başlatın:
   ```bash
   npm run start:dev
   ```
   API şu adreste çalışacak: `http://localhost:3000/api`

`DB_SYNCHRONIZE=true` olduğu için ilk çalıştırmada `customers` ve
`interactions` tabloları otomatik oluşturulur.

## API Uç Noktaları

| Metot  | Yol                              | Açıklama                          |
|--------|-----------------------------------|------------------------------------|
| POST   | `/api/customers`                  | Yeni müşteri oluştur               |
| GET    | `/api/customers?search=&type=`    | Müşterileri listele / filtrele     |
| GET    | `/api/customers/:id`              | Tek müşteri + görüşme geçmişi      |
| PATCH  | `/api/customers/:id`               | Müşteri bilgilerini güncelle       |
| DELETE | `/api/customers/:id`               | Müşteriyi sil                      |
| POST   | `/api/customers/:id/interactions`  | Görüşme kaydı ekle                 |

## Sırada ne var?

Bu modül, tam Remax CRM sisteminin sadece bir parçası. Bir sonraki
adımlarda birlikte şunları ekleyeceğiz:

- **AuthModule**: Broker/Danışman girişi, JWT, rol tabanlı yetkilendirme
  (Mahremiyet Duvarı'nın gerçek anlamda çalışması için gerekli —
  şu an `agentId` alanı var ama kimlik doğrulama yok).
- **PortfoliosModule**: Portföy (ilan) yönetimi.
- **CommissionsModule**: Komisyon hesaplama.
- Otomatik "portföy eşleştirme" mantığı (müşteri ihtiyaçlarına göre).
