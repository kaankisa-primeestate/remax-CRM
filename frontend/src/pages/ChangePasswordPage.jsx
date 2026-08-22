import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function ChangePasswordPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      // Dunya standardi guvenlik kurali: sifre degisince mevcut oturum
      // (token) da teknik olarak gecersiz hale gelir (backend, JwtStrategy
      // uzerinden bunu zaten uyguluyor). Kullaniciyi belirsiz bir sekilde
      // "gecersiz oturum" hatasiyla karsilasmaya birakmak yerine, ACIKCA
      // ve kontrollu bir sekilde cikis yapip yeni sifresiyle tekrar giris
      // yapmasini istiyoruz -- boylece ne oldugunu tam anlar.
      setTimeout(() => {
        logout();
        navigate('/login', { state: { message: 'Şifreniz değiştirildi. Lütfen yeni şifrenizle giriş yapın.' } });
      }, 1800);
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Şifre değiştirilemedi. Bilgilerinizi kontrol edin.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="folder-panel" style={{ maxWidth: 420, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 20 }}>Şifre Değiştir</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>Mevcut Şifre</label>
          <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>Yeni Şifre</label>
          <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
        </div>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>Yeni Şifre (Tekrar)</label>
          <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && (
          <div style={{ color: 'var(--success)', fontSize: 14, marginBottom: 14 }}>
            ✓ Şifreniz başarıyla değiştirildi. Güvenlik gereği çıkış yapılıyor, yeni şifrenizle tekrar giriş yapmanız gerekecek…
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </div>
  );
}
