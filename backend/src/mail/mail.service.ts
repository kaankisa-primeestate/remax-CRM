import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Genel amacli e-posta gonderici -- Gmail (App Password ile), Yandex,
// Outlook, ya da baska herhangi bir SMTP saglayicisiyla calisir. Ortam
// degiskenleri (Render'da) ayarlanmadiysa, e-posta GONDERILMEZ ama
// uygulama COKMEZ -- hata loglanir, cagiran taraf false doner ve
// kullaniciya uygun bir mesaj gosterir.
//
// Gerekli ortam degiskenleri:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (opsiyonel)
// Gmail icin ornek: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587,
//   SMTP_USER=ofis@gmail.com, SMTP_PASS=<Google Hesap App Password>
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return null;
    }
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return this.transporter;
  }

  isConfigured(): boolean {
    return this.getTransporter() !== null;
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, name: string): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP yapılandırılmamış — şifre sıfırlama e-postası GÖNDERİLEMEDİ (${to})`);
      return false;
    }
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: 'PrimeCRM — Şifre Sıfırlama Talebi',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1F3A5F;">Şifre Sıfırlama Talebi</h2>
            <p>Merhaba ${name},</p>
            <p>PrimeCRM hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki butona tıklayarak yeni bir şifre belirleyebilirsiniz.</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background: #1F3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Şifremi Sıfırla
              </a>
            </p>
            <p style="font-size: 13px; color: #666;">Bu link 1 saat boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            <p style="font-size: 13px; color: #666;">RE/MAX Bostancı — PrimeCRM</p>
          </div>
        `,
      });
      return true;
    } catch (err) {
      this.logger.error(`Şifre sıfırlama e-postası gönderilemedi (${to}): ${err}`);
      return false;
    }
  }
}
