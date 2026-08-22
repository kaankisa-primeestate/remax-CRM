import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      const defaultLanding = loggedInUser.role === 'broker' ? '/dashboard' : '/panelim';
      const redirectTo = location.state?.from ?? defaultLanding;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ?? 'Giriş yapılamadı. Bilgilerinizi kontrol edin.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">PrimeCRM</h1>
        <p className="login-card__subtitle">Müşteri Kayıt Defteri'ne giriş yapın</p>

        <form onSubmit={handleSubmit}>
          <div className="form-field" style={{ marginBottom: 14 }}>
            <label>E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-field" style={{ marginBottom: 14 }}>
            <label>Şifre</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>
        <Link to="/sifremi-unuttum" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 13 }}>
          Şifremi unuttum
        </Link>
      </div>
    </div>
  );
}
