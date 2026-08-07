import { useState } from 'react';
import { authApi } from '../api/auth';

export default function ChangePasswordPage() {
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>Yeni Şifre</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label>Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && (
          <div style={{ color: 'var(--success)', fontSize: 14, marginBottom: 14 }}>
            Şifreniz başarıyla değiştirildi.
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </div>
  );
}
