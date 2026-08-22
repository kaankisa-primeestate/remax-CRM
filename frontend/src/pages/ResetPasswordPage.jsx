import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email, token, newPassword);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Şifre sıfırlanamadı. Bağlantının süresi dolmuş olabilir.');
    } finally {
      setLoading(false);
    }
  }

  if (!email || !token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-card__title">Geçersiz Bağlantı</h1>
          <p className="login-card__subtitle">Bu şifre sıfırlama bağlantısı eksik ya da hatalı görünüyor.</p>
          <Link to="/sifremi-unuttum" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13 }}>Yeni bir bağlantı iste →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">Yeni Şifre Belirle</h1>
        <p className="login-card__subtitle">{email} için yeni bir şifre girin.</p>

        {done ? (
          <p style={{ fontSize: 14, color: '#1e7a3d' }}>✓ Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-field" style={{ marginBottom: 14 }}>
              <label>Yeni Şifre</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus required />
            </div>
            <div className="form-field" style={{ marginBottom: 14 }}>
              <label>Yeni Şifre (Tekrar)</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
