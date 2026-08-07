# Remax CRM — Backend (Müşteri + Kimlik Doğrulama Modülleri)

NestJS + TypeORM + PostgreSQL ile yazılmış API. Brief'in **3.1 Kişisel CRM ve
Müşteri Yönetimi** ve **1.1 Rol Tabanlı Yetkilendirme** bölümlerini karşılar.

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

`DB_SYNCHRONIZE=true` olduğu için ilk çalıştırmada tüm tablolar otomatik
oluşturulur.

## İlk giriş

Sunucuyu ilk çalıştırdığınızda, sistemde hiç kullanıcı yoksa otomatik
olarak bir **Broker** hesabı oluşturulur. Terminal loglarında şuna benzer
bir satır göreceksiniz:

```
İlk kurulum: varsayılan Broker hesabı oluşturuldu → e-posta: admin@remax.local / şifre: broker123
```

Bu bilgilerle giriş yapıp, Broker panelinden yeni danışman hesapları
oluşturabilirsiniz. Farklı bir varsayılan e-posta/şifre istiyorsanız,
`.env` dosyasındaki `DEFAULT_BROKER_EMAIL` / `DEFAULT_BROKER_PASSWORD`
değerlerini değiştirip veritabanını sıfırdan kurun.

## API Uç Noktaları

| Metot  | Yol                              | Açıklama                          | Yetki |
|--------|------------------------------------|------------------------------------|-------|
| POST   | `/api/auth/login`                  | Giriş yap, JWT token al            | Herkese açık |
| GET    | `/api/users/agents`                | Danışman listesi                   | Sadece Broker |
| POST   | `/api/users/agents`                | Yeni danışman hesabı oluştur       | Sadece Broker |
| POST   | `/api/customers`                   | Yeni müşteri oluştur               | Giriş gerekli |
| GET    | `/api/customers?search=&type=`     | Müşterileri listele / filtrele     | Giriş gerekli (Danışman sadece kendi müşterilerini görür) |
| GET    | `/api/customers/:id`               | Tek müşteri + görüşme geçmişi      | Giriş gerekli |
| PATCH  | `/api/customers/:id`               | Müşteri bilgilerini güncelle       | Giriş gerekli |
| DELETE | `/api/customers/:id`               | Müşteriyi sil                      | Giriş gerekli |
| POST   | `/api/customers/:id/interactions`  | Görüşme kaydı ekle                 | Giriş gerekli |

## Sırada ne var?

- **PortfoliosModule**: Portföy (ilan) yönetimi.
- **CommissionsModule**: Komisyon hesaplama.
- Şifre değiştirme / "şifremi unuttum" ekranı.
- Otomatik "portföy eşleştirme" mantığı (müşteri ihtiyaçlarına göre).
