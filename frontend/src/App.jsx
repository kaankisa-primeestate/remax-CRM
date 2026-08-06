import { Routes, Route } from 'react-router-dom';
import CustomerListPage from './pages/CustomerListPage.jsx';
import CustomerDetailPage from './pages/CustomerDetailPage.jsx';

export default function App() {
  return (
    <div>
      <header className="app-header">
        <div>
          <h1 className="app-header__title">Remax Entegre</h1>
        </div>
        <div className="app-header__subtitle">Müşteri Kayıt Defteri</div>
      </header>
      <main className="app-body">
        <Routes>
          <Route path="/" element={<CustomerListPage />} />
          <Route path="/musteriler/:id" element={<CustomerDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
