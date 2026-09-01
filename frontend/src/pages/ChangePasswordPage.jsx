import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function ChangePasswordPage() {
  const { logout, isBroker } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // E-posta degistirme -- SADECE Broker (yonetici) icin. Danismanlarin
  // e-postasi zaten Broker tarafindan Danisman Yonetimi sayfasindan
  // yonetiliyor, kendi kendilerine degistirmelerine gerek/yetki yok.
  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Yeni Yonetici (Broker) Ekle -- bir is ortagina AYRI, kendi mail/
  // sifresiyle giris yapabilecegi bir yonetici hesabi acmak icin.
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [brokerName, setBrokerName] = useState('');
  const [brokerEmail, setBrokerEmail] = useState('');
  const [brokerPassword, setBrokerPassword] = useState('');
  const [brokerError, setBrokerError] = useState(null);
  const [brokerSuccess, setBrokerSuccess] = useState(false);
  const [savingBroker, setSavingBroker] = useState(false);

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
      await usersApi.changePassword({ currentPassword, newPassword });
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

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);
    setSavingEmail(true);
    try {
      await usersApi.changeEmail({ currentPassword: emailPassword, newEmail });
      setEmailSuccess(true);
      setTimeout(() => {
        logout();
        navigate('/login', { state: { message: 'E-posta adresiniz değiştirildi. Lütfen yeni e-postanızla giriş yapın.' } });
      }, 1800);
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'E-posta değiştirilemedi. Bilgilerinizi kontrol edin.';
      setEmailError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleAddBroker(e) {
    e.preventDefault();
    setBrokerError(null);
    setBrokerSuccess(false);
    setSavingBroker(true);
    try {
      await usersApi.createBroker({ name: brokerName, email: brokerEmail, password: brokerPassword });
      setBrokerSuccess(true);
      setBrokerName('');
      setBrokerEmail('');
      setBrokerPassword('');
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Yönetici eklenemedi. Bilgileri kontrol edin.';
      setBrokerError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSavingBroker(false);
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

      {isBroker && (
        <>
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--paper-line)' }}>
            <h2 style={{ marginBottom: 20 }}>E-posta Adresini Değiştir</h2>
            <form onSubmit={handleEmailSubmit}>
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>Mevcut Şifre</label>
                <PasswordInput value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} required />
              </div>
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>Yeni E-posta Adresi</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>

              {emailError && <div className="form-error">{emailError}</div>}
              {emailSuccess && (
                <div style={{ color: 'var(--success)', fontSize: 14, marginBottom: 14 }}>
                  ✓ E-posta adresiniz başarıyla değiştirildi. Güvenlik gereği çıkış yapılıyor, yeni e-postanızla tekrar giriş yapmanız gerekecek…
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingEmail}>
                {savingEmail ? 'Kaydediliyor…' : 'E-postayı Güncelle'}
              </button>
            </form>
          </div>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--paper-line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAddBroker ? 20 : 0 }}>
              <h2 style={{ margin: 0 }}>Yeni Yönetici Ekle</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddBroker((v) => !v)}>
                {showAddBroker ? 'Vazgeç' : '+ Yeni Yönetici'}
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
              Bir iş ortağınıza, kendi e-postası ve şifresiyle giriş yapabileceği ayrı bir yönetici hesabı açın.
            </p>

            {showAddBroker && (
              <form onSubmit={handleAddBroker} style={{ marginTop: 16 }}>
                <div className="form-field" style={{ marginBottom: 14 }}>
                  <label>Ad Soyad</label>
                  <input value={brokerName} onChange={(e) => setBrokerName(e.target.value)} required />
                </div>
                <div className="form-field" style={{ marginBottom: 14 }}>
                  <label>E-posta Adresi</label>
                  <input type="email" value={brokerEmail} onChange={(e) => setBrokerEmail(e.target.value)} required />
                </div>
                <div className="form-field" style={{ marginBottom: 14 }}>
                  <label>Şifre</label>
                  <PasswordInput value={brokerPassword} onChange={(e) => setBrokerPassword(e.target.value)} minLength={6} required />
                </div>

                {brokerError && <div className="form-error">{brokerError}</div>}
                {brokerSuccess && (
                  <div style={{ color: 'var(--success)', fontSize: 14, marginBottom: 14 }}>
                    ✓ Yeni yönetici hesabı oluşturuldu. Bilgileri iş ortağınızla güvenli bir şekilde paylaşabilirsiniz.
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingBroker}>
                  {savingBroker ? 'Oluşturuluyor…' : 'Yönetici Hesabı Oluştur'}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
