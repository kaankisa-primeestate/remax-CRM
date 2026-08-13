import { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  function handleLogout() {
    logout();
    navigate('/login');
    setMenuOpen(false);
  }
  function closeMenu() {
    setMenuOpen(false);
  }
  return (
    <header className="app-header">
      <div className="app-header__top">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }} onClick={closeMenu}>
          <h1 className="app-header__title">PrimeCRM</h1>
        </Link>
        {user && (
          <button type="button" className="app-header__hamburger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menüyü aç/kapat" aria-expanded={menuOpen}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        )}
      </div>
      {user && (
        <nav className={`app-header__nav${menuOpen ? ' is-open' : ''}`}>
          <div className="app-header__links">
            <Link to="/" style={navLinkStyle} onClick={closeMenu}>Müşteriler</Link>
            <Link to="/portfoyler" style={navLinkStyle} onClick={closeMenu}>Portföyler</Link>
            <Link to="/komisyonlar" style={navLinkStyle} onClick={closeMenu}>Komisyonlar</Link>
            {isBroker && <Link to="/dashboard" style={navLinkStyle} onClick={closeMenu}>Dashboard</Link>}
            {isBroker && <Link to="/danismanlar" style={navLinkStyle} onClick={closeMenu}>Danışmanlar</Link>}
          </div>
          <div className="app-header__account">
            <Link to="/sifre-degistir" style={navLinkStyle} onClick={closeMenu}>
              <span className="app-header__subtitle">{user.name} · {user.role === 'broker' ? 'Broker' : 'Danışman'}</span>
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ background: 'transparent', color: 'var(--paper-raised)', borderColor: 'var(--ink-navy-light)', padding: '6px 12px', fontSize: 12 }}>
              Çıkış
            </button>
          </div>
        </nav>
      )}
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
