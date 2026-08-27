import { useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
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
import TransactionDetailPage from './pages/TransactionDetailPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import AccountingPage from './pages/AccountingPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import MarketPage from './pages/MarketPage.jsx';
import ValuationsListPage from './pages/ValuationsListPage.jsx';
import ValuationWizardPage from './pages/ValuationWizardPage.jsx';
import ExpenseCategoryDetailPage from './pages/ExpenseCategoryDetailPage.jsx';
import AgentLedgerStatementPage from './pages/AgentLedgerStatementPage.jsx';
import AgentDuesPage from './pages/AgentDuesPage.jsx';
import ContractsPage from './pages/ContractsPage.jsx';
import LegalPage from './pages/LegalPage.jsx';
import ListingSyndicationPage from './pages/ListingSyndicationPage.jsx';
import OfficeSettingsPage from './pages/OfficeSettingsPage.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import GlobalSearch from './components/GlobalSearch.jsx';

// Broker sol menusu -- mockup'taki "Merkez Ofis Yonetici Ekrani" sirasina
// birebir uygun (Genel Bakis -> Danisman Yonetimi -> Musteri Havuzu ->
// Portfoy Havuzu -> Ciro & Komisyon -> ... -> Ofis Ayarlari).
const BROKER_NAV = [
  { to: '/dashboard', label: 'Genel Bakış', icon: '📌' },
  { to: '/danismanlar', label: 'Danışman Yönetimi', icon: '👥' },
  { to: '/musteriler', label: 'Müşteri Havuzu', icon: '👤' },
  { to: '/portfoyler', label: 'Portföy Havuzu', icon: '🏠' },
  { to: '/komisyonlar', label: 'Ciro & Komisyon', icon: '📈' },
  { to: '/talepler', label: 'Sıcak Fırsatlar', icon: '🔥' },
  { to: '/islemler', label: 'İşlemler', icon: '🔄' },
  { to: '/finans', label: 'Finans', icon: '💵' },
  { to: '/muhasebe', label: 'Muhasebe', icon: '📒' },
  { to: '/aidatlar', label: 'Danışman Aidatları', icon: '🧾' },
  { to: '/raporlar', label: 'Raporlar', icon: '📊' },
  { to: '/piyasa', label: 'Piyasa', icon: '💹' },
  { to: '/degerleme', label: 'Piyasa Değer Analizi', icon: '📊' },
  { to: '/sozlesmeler', label: 'Sözleşmeler & Tapu', icon: '📄' },
  { to: '/hukuk', label: 'Hukuk / İhtarname', icon: '⚖️' },
  { to: '/ilan-entegrasyon', label: 'İlan Entegrasyonu', icon: '📣' },
  { to: '/ayarlar', label: 'Ofis Ayarları', icon: '⚙️' },
];

// Danışman sol menusu -- mevcut, onaylanmis yapi korunuyor.
const AGENT_NAV = [
  { to: '/panelim', label: 'Panelim', icon: '🏡' },
  { to: '/musteriler', label: 'Müşteriler', icon: '👥' },
  { to: '/portfoyler', label: 'Portföyler', icon: '🏠' },
  { to: '/talepler', label: 'Sıcak Fırsatlar', icon: '🔥' },
  { to: '/islemler', label: 'İşlemler', icon: '🔄' },
  { to: '/komisyonlar', label: 'Komisyonlar', icon: '💰' },
  { to: '/aidatlar', label: 'Aidatlarım', icon: '🧾' },
  { to: '/cari-hesabim', label: 'Cari Hesabım', icon: '💳' },
  { to: '/takvim', label: 'Takvim', icon: '📅' },
  { to: '/gorevler', label: 'Görevler', icon: '✅' },
  { to: '/piyasa', label: 'Piyasa', icon: '💹' },
  { to: '/degerleme', label: 'Piyasa Değer Analizi', icon: '📊' },
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

  const visibleItems = isBroker ? BROKER_NAV : AGENT_NAV;

  return (
    <>
      {open && <div className="sidebar__backdrop" onClick={onClose} />}
      <aside className={`sidebar${open ? ' is-open' : ''}`}>
        <div className="sidebar__brand">
          <Link to={isBroker ? '/dashboard' : '/panelim'} className="sidebar__brand-link" onClick={onClose}>
            <span className="sidebar__brand-title">PrimeCRM</span>
          </Link>
        </div>
        <nav className="sidebar__nav">
          {visibleItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
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

function QuickAddMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="quickadd-menu">
      <button type="button" className="quickadd-menu__button" onClick={() => setOpen((v) => !v)}>
        + Hızlı Ekle <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <>
          <div className="quickadd-menu__backdrop" onClick={() => setOpen(false)} />
          <div className="quickadd-menu__panel">
            <Link to="/musteriler" state={{ openQuickAdd: true }} className="quickadd-menu__item" onClick={() => setOpen(false)}>👤 Yeni Müşteri</Link>
            <Link to="/portfoyler" state={{ openPropertyWizard: true }} className="quickadd-menu__item" onClick={() => setOpen(false)}>🏠 Yeni Portföy</Link>
          </div>
        </>
      )}
    </div>
  );
}

function TopBar({ onToggleSidebar }) {
  const { user, isBroker } = useAuth();
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
      <GlobalSearch />
      <div className="app-topbar__spacer" />
      <QuickAddMenu />
      <NotificationBell />
      <Link to="/sifre-degistir" className="app-topbar__profile">
        <span className="app-topbar__profile-name">{user?.name}</span>
        <span className="app-topbar__profile-role">{isBroker ? 'Broker' : 'Danışman'}</span>
      </Link>
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
          <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
          <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />
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
            <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
            <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to={user.role === 'broker' ? '/dashboard' : '/panelim'} replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/musteriler"
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
              path="/islemler/:id"
              element={
                <ProtectedRoute>
                  <TransactionDetailPage />
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
              path="/muhasebe"
              element={
                <ProtectedRoute brokerOnly>
                  <AccountingPage />
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
              path="/piyasa"
              element={
                <ProtectedRoute>
                  <MarketPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/degerleme"
              element={
                <ProtectedRoute>
                  <ValuationsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/degerleme/yeni"
              element={
                <ProtectedRoute>
                  <ValuationWizardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/degerleme/:id"
              element={
                <ProtectedRoute>
                  <ValuationWizardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/giderler/:categoryId"
              element={
                <ProtectedRoute>
                  <ExpenseCategoryDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cari-hesap/:agentId"
              element={
                <ProtectedRoute>
                  <AgentLedgerStatementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cari-hesabim"
              element={
                <ProtectedRoute>
                  <AgentLedgerStatementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aidatlar"
              element={
                <ProtectedRoute>
                  <AgentDuesPage />
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
            <Route
              path="/sozlesmeler"
              element={
                <ProtectedRoute brokerOnly>
                  <ContractsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hukuk"
              element={
                <ProtectedRoute brokerOnly>
                  <LegalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ilan-entegrasyon"
              element={
                <ProtectedRoute brokerOnly>
                  <ListingSyndicationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ayarlar"
              element={
                <ProtectedRoute brokerOnly>
                  <OfficeSettingsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
