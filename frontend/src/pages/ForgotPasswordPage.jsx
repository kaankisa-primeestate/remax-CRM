import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setResult(res);
    } catch {
      // Guvenlik geregi backend zaten genel bir mesaj donuyor, burada da
      // farkli bir hata gostermiyoruz (email enumeration'i onlemek icin).
      setResult({ message: 'Eğer bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.', smtpConfigured: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">Şifremi Unuttum</h1>
        <p className="login-card__subtitle">Kayıtlı e-posta adresinizi girin, size bir sıfırlama bağlantısı gönderelim.</p>

        {result ? (
          <div>
            <p style={{ fontSize: 14 }}>{result.message}</p>
            {!result.smtpConfigured && (
              <p style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 10 }}>
                ⚠️ Not: Sistem yöneticisi henüz e-posta gönderimini yapılandırmadı. Lütfen Broker'ınızla iletişime geçip şifrenizi elle sıfırlamasını isteyin.
              </p>
            )}
            <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13 }}>← Girişe dön</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-field" style={{ marginBottom: 14 }}>
              <label>E-posta</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Gönderiliyor…' : 'Sıfırlama Bağlantısı Gönder'}
            </button>
            <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 13 }}>← Girişe dön</Link>
          </form>
        )}
      </div>
    </div>
  );
}
