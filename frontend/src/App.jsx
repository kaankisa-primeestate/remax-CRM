import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import CustomerListPage from './pages/CustomerListPage.jsx';
import CustomerDetailPage from './pages/CustomerDetailPage.jsx';
import PropertyListPage from './pages/PropertyListPage.jsx';
import PropertyDetailPage from './pages/PropertyDetailPage.jsx';
import AgentsPage from './pages/AgentsPage.jsx';
import CommissionsPage from './pages/CommissionsPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import PublicPropertyPage from './pages/PublicPropertyPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

const navLinkStyle = {
  color: 'var(--brass-light)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textDecoration: 'none',
};

function Header() {
  const { user, logout, isBroker } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, flexWrap: 'wrap', rowGap: 10 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 className="app-header__title">PrimeCRM</h1>
        </Link>
        {user && (
          <>
            <Link to="/" style={navLinkStyle}>Müşteriler</Link>
            <Link to="/portfoyler" style={navLinkStyle}>Portföyler</Link>
            <Link to="/komisyonlar" style={navLinkStyle}>Komisyonlar</Link>
            {isBroker && <Link to="/dashboard" style={navLinkStyle}>Dashboard</Link>}
            {isBroker && <Link to="/danismanlar" style={navLinkStyle}>Danışmanlar</Link>}
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {user && (
          <>
            <Link to="/sifre-degistir" style={navLinkStyle}>
              <span className="app-header__subtitle">
                {user.name} · {user.role === 'broker' ? 'Broker' : 'Danışman'}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                background: 'transparent',
                color: 'var(--paper-raised)',
                borderColor: 'var(--ink-navy-light)',
                padding: '6px 12px',
                fontSize: 12,
              }}
            >
              Çıkış
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const location = useLocation();
  const isPublicPage = location.pathname.startsWith('/ilan/');

  return (
    <div>
      {!isPublicPage && <Header />}
      <main className="app-body">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ilan/:id" element={<PublicPropertyPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <CustomerListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/musteriler/:id"
            element={
              <ProtectedRoute>
                <CustomerDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfoyler"
            element={
              <ProtectedRoute>
                <PropertyListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfoyler/:id"
            element={
              <ProtectedRoute>
                <PropertyDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/komisyonlar"
            element={
              <ProtectedRoute>
                <CommissionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sifre-degistir"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute brokerOnly>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/danismanlar"
            element={
              <ProtectedRoute brokerOnly>
                <AgentsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
