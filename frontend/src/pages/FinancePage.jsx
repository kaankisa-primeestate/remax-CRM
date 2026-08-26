import { useState } from 'react';
import BankAccountsTab from '../components/finance/BankAccountsTab.jsx';
import ExpensesTab from '../components/finance/ExpensesTab.jsx';
import ChequeNotesTab from '../components/finance/ChequeNotesTab.jsx';
import CashFlowTab from '../components/finance/CashFlowTab.jsx';
import PartnersTab from '../components/finance/PartnersTab.jsx';
import AgentLedgerTab from '../components/finance/AgentLedgerTab.jsx';
import SummaryTab from '../components/finance/SummaryTab.jsx';

const FINANCE_TABS = [
  { key: 'accounts', label: '🏦 Banka Hesapları' },
  { key: 'expenses', label: '🧾 Giderler' },
  { key: 'cheques', label: '📑 Çek/Senet' },
  { key: 'cashflow', label: '📈 Nakit Akış' },
  { key: 'ledger', label: '👤 Danışman Cari Hesapları' },
  { key: 'partners', label: '🤝 Ortaklar' },
  { key: 'summary', label: '📊 Özet' },
];

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
        {activeTab === 'cheques' && <ChequeNotesTab />}
        {activeTab === 'cashflow' && <CashFlowTab />}
        {activeTab === 'ledger' && <AgentLedgerTab />}
        {activeTab === 'partners' && <PartnersTab />}
        {activeTab === 'summary' && <SummaryTab />}
      </div>
    </div>
  );
}
