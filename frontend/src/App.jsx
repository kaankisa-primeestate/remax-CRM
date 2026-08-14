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
import AgentDashboardPage from './pages/AgentDashboardPage.jsx';
import RequestsPage from './pages/RequestsPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import NotificationBell from './components/NotificationBell.jsx';

// Broker ve Danışman icin gorunurluk kurallarina sahip sol menu ogeleri.
// role: 'broker' | 'agent' | 'both'
const NAV_ITEMS = [
  { to: '/', label: 'Müşteriler', icon: '👥', role: 'both' },
  { to: '/portfoyler', label: 'Portföyler', icon: '🏠', role: 'both' },
  { to: '/talepler', label: 'Talepler', icon: '📋', role: 'both' },
  { to: '/eslesmeler', label: 'Eşleşmeler', icon: '🔗', role: 'both', disabled: true },
  { to: '/islemler', label: 'İşlemler', icon: '🔄', role: 'both' },
  { to: '/komisyonlar', label: 'Komisyonlar', icon: '💰', role: 'both' },
  { to: '/takvim', label: 'Takvim', icon: '📅', role: 'agent' },
  { to: '/gorevler', label: 'Görevler', icon: '✅', role: 'agent' },
  { to: '/panelim', label: 'Panelim', icon: '🏡', role: 'agent' },
  { to: '/finans', label: 'Finans', icon: '💵', role: 'broker' },
  { to: '/raporlar', label: 'Raporlar', icon: '📊', role: 'broker' },
  { to: '/dashboard', label: 'Dashboard', icon: '📈', role: 'broker' },
  { to: '/danismanlar', label: 'Danışmanlar', icon: '🧑\u200d💼', role: 'broker' },
];

function Sidebar({ open, onClose }) {
  const { user, logout, isBroker } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
    onClose();
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.role === 'both' || (item.role === 'broker' && isBroker) || (item.role === 'agent' && !isBroker),
  );

  return (
    <>
      {open && <div className="sidebar__backdrop" onClick={onClose} />}
      <aside className={`sidebar${open ? ' is-open' : ''}`}>
        <div className="sidebar__brand">
          <Link to="/" className="sidebar__brand-link" onClick={onClose}>
            <span className="sidebar__brand-title">PrimeCRM</span>
          </Link>
        </div>
        <nav className="sidebar__nav">
          {visibleItems.map((item) => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            if (item.disabled) {
              return (
                <span key={item.to} className="sidebar__link is-disabled" title="Yakında">
                  <span className="sidebar__icon">{item.icon}</span>
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`sidebar__link${isActive ? ' is-active' : ''}`}
                onClick={onClose}
              >
                <span className="sidebar__icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          <Link to="/sifre-degistir" className="sidebar__account" onClick={onClose}>
            <span className="sidebar__account-name">{user?.name}</span>
            <span className="sidebar__account-role">{isBroker ? 'Broker' : 'Danışman'}</span>
          </Link>
          <button type="button" onClick={handleLogout} className="sidebar__logout">Çıkış</button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onToggleSidebar }) {
  return (
    <header className="app-topbar">
      <button
        type="button"
        className="app-topbar__hamburger"
        onClick={onToggleSidebar}
        aria-label="Menüyü aç/kapat"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div className="app-topbar__spacer" />
      <NotificationBell />
    </header>
  );
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();
  const isPublicPage = location.pathname.startsWith('/ilan/');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isPublicPage) {
    return (
      <main className="app-body">
        <Routes>
          <Route path="/ilan/:id" element={<PublicPropertyPage />} />
        </Routes>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-body">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="app-body">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
              path="/panelim"
              element={
                <ProtectedRoute>
                  <AgentDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/talepler"
              element={
                <ProtectedRoute>
                  <RequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/islemler"
              element={
                <ProtectedRoute>
                  <TransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finans"
              element={
                <ProtectedRoute brokerOnly>
                  <FinancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/raporlar"
              element={
                <ProtectedRoute brokerOnly>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/takvim"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gorevler"
              element={
                <ProtectedRoute>
                  <TasksPage />
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
    </div>
  );
}
