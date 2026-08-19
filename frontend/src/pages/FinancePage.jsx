import { useState } from 'react';
import BankAccountsTab from '../components/finance/BankAccountsTab.jsx';
import ExpensesTab from '../components/finance/ExpensesTab.jsx';
import RecurringExpensesTab from '../components/finance/RecurringExpensesTab.jsx';
import ChequeNotesTab from '../components/finance/ChequeNotesTab.jsx';
import CashFlowTab from '../components/finance/CashFlowTab.jsx';
import PartnersTab from '../components/finance/PartnersTab.jsx';
import AgentLedgerTab from '../components/finance/AgentLedgerTab.jsx';

const FINANCE_TABS = [
  { key: 'accounts', label: '🏦 Banka Hesapları' },
  { key: 'expenses', label: '🧾 Giderler' },
  { key: 'recurring', label: '🔁 Sabit Giderler' },
  { key: 'cheques', label: '📑 Çek/Senet' },
  { key: 'cashflow', label: '📈 Nakit Akış' },
  { key: 'ledger', label: '👤 Danışman Cari Hesapları' },
  { key: 'partners', label: '🤝 Ortaklar' },
  { key: 'summary', label: '📊 Özet' },
];

// Finans: sekmeli (tab) bir "kabuk" -- her sekme KENDI dosyasinda,
// KENDI verisini yukleyen, bagimsiz calisan bir bilesen (bkz.
// components/finance/). Boylece hicbir sekme digerine bagimli degil,
// her biri kendi icinde tam bir ekran gibi kullanilabilir/genisletilebilir.
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('accounts');

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Finans</h2>

      <div className="folder-tabs" style={{ flexWrap: 'wrap' }}>
        {FINANCE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`folder-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="finance-tab-content">
        {activeTab === 'accounts' && <BankAccountsTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'recurring' && <RecurringExpensesTab />}
        {activeTab === 'cheques' && <ChequeNotesTab />}
        {activeTab === 'cashflow' && <CashFlowTab />}
        {activeTab === 'ledger' && <AgentLedgerTab />}

        {activeTab === 'partners' && <PartnersTab />}

        {activeTab === 'summary' && (
          <div className="finance-placeholder">
            <div className="finance-placeholder__icon">📊</div>
            <div className="finance-placeholder__title">Özet</div>
            <p className="finance-placeholder__text">
              Bu bölüm sırada: toplam gelir/gider, net kâr-zarar, banka bakiyeleri toplamı ve danışmanlara olan
              toplam borç, hepsi bir arada burada görünecek.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
