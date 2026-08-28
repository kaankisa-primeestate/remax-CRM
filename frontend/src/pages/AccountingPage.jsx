import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ACCOUNTING_ACCOUNT_TYPES,
  ACCOUNTING_CURRENCIES,
  ACCOUNTING_ENTRY_TYPES,
  ACCOUNTING_PARTY_TYPES,
  accountingApi,
  formatAccountingMoney,
} from '../api/accounting';
import { usersApi } from '../api/auth';

const ACCOUNTING_TABS = [
  { key: 'entries', label: 'Hareketler' },
  { key: 'ledgers', label: 'Cari Kartlar' },
  { key: 'commissions', label: 'Komisyonlar' },
  { key: 'dues', label: 'Danışman Kiraları' },
  { key: 'accounts', label: 'Hesaplar' },
  { key: 'reports', label: 'Raporlar' },
];

const EMPTY_COMMISSION_FORM = {
  agentId: '',
  transactionType: 'sale',
  date: new Date().toISOString().slice(0, 10),
  grossAmount: '',
  currency: 'TRY',
  propertyTitle: '',
  notes: '',
};

const EXPENSE_CATEGORIES = [
  'Market / Ofis İhtiyaçları',
  'Müşteri Yemeği',
  'Kira',
  'Elektrik',
  'Su',
  'İnternet / Telefon',
  'Personel / Hizmet',
  'Vergi / Harç',
  'Ulaşım',
  'Diğer Gider',
];

const INCOME_CATEGORIES = [
  'Genel Gelir',
  'Müşteri Tahsilatı',
  'Kira Geliri',
  'Diğer Gelir',
];

const NEW_CATEGORY_VALUE = '__new_category__';
const PARTY_PAGE_SIZE = 20;
const REPORT_PAGE_SIZE = 20;
const REPORT_MOVEMENT_FILTERS = [
  { value: 'all', label: 'Tüm hareketler' },
  { value: 'operation', label: 'Gelir ve giderler' },
  { value: 'income', label: 'Yalnız gelirler' },
  { value: 'expense', label: 'Yalnız giderler' },
  { value: 'partner', label: 'Ortak hareketleri' },
  { value: 'cash', label: 'Nakit etkili hareketler' },
  { value: 'transfer', label: 'Hesap transferleri' },
];
const REPORT_PRESETS = [
  { value: 'today', label: 'Bugün' },
  { value: 'last_7_days', label: 'Son 7 gün' },
  { value: 'this_month', label: 'Bu ay' },
  { value: 'last_month', label: 'Geçen ay' },
  { value: 'last_3_months', label: 'Son 3 ay' },
  { value: 'last_6_months', label: 'Son 6 ay' },
  { value: 'this_year', label: 'Bu yıl' },
  { value: 'all_time', label: 'Tüm zamanlar' },
];
const RESET_COUNT_LABELS = {
  accounts: 'Muhasebe hesapları',
  entries: 'Para hareketleri',
  commissions: 'Komisyon kayıtları',
  rents: 'Kira kayıtları',
  parties: 'Cari kartlar',
  recurringExpenses: 'Tekrarlayan gider şablonları',
  categories: 'Özel kategoriler',
  auditLogs: 'Muhasebe audit kayıtları',
};

function categoryNames(defaults, savedCategories) {
  const savedNames = (savedCategories || []).map((category) => category.name).filter(Boolean);
  return [...defaults, ...savedNames.filter((name) => !defaults.includes(name))];
}

const PARTNER_MOVEMENT_TYPES = [
  { value: 'capital_in', label: 'Ortak sermaye katkısı', type: 'income', category: 'Ortak Sermaye Katkısı' },
  { value: 'loan_in', label: 'Ortaklardan şirkete borç girişi', type: 'income', category: 'Ortak Borç Girişi' },
  { value: 'withdrawal', label: 'Ortak çekişi', type: 'expense', category: 'Ortak Çekişi' },
  { value: 'loan_out', label: 'Ortağa borç geri ödemesi', type: 'expense', category: 'Ortağa Borç Ödemesi' },
  { value: 'profit_distribution', label: 'Kâr dağıtımı', type: 'expense', category: 'Kâr Dağıtımı' },
];

const EMPTY_ENTRY_FORM = {
  type: 'income',
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  currency: 'TRY',
  accountId: '',
  counterAccountId: '',
  category: 'Genel',
  customCategory: '',
  partyId: '',
  partyName: '',
  description: '',
  referenceNo: '',
};

function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function periodLabel(period) {
  if (!period) return '';
  const [year, month] = period.split('-');
  return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(
    new Date(Number(year), Number(month) - 1, 1),
  );
}

function getPeriodBounds(period) {
  if (!period) return {};
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${period}-01`,
    to: `${period}-${String(lastDay).padStart(2, '0')}`,
  };
}

function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('tr-TR').format(new Date(`${date}T00:00:00`));
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getReportDateRange(preset = 'this_month') {
  const today = new Date();
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let from = new Date(to);
  if (preset === 'today') from = new Date(to);
  if (preset === 'last_7_days') from.setDate(from.getDate() - 6);
  if (preset === 'this_month') from = new Date(to.getFullYear(), to.getMonth(), 1);
  if (preset === 'last_month') {
    from = new Date(to.getFullYear(), to.getMonth() - 1, 1);
    const lastMonthEnd = new Date(to.getFullYear(), to.getMonth(), 0);
    return { from: toIsoDate(from), to: toIsoDate(lastMonthEnd) };
  }
  if (preset === 'last_3_months') from = new Date(to.getFullYear(), to.getMonth() - 2, 1);
  if (preset === 'last_6_months') from = new Date(to.getFullYear(), to.getMonth() - 5, 1);
  if (preset === 'this_year') from = new Date(to.getFullYear(), 0, 1);
  if (preset === 'all_time') from = new Date(2000, 0, 1);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

const DEFAULT_REPORT_RANGE = getReportDateRange('this_month');

function reportMovementLabel(classification) {
  if (classification === 'partner_in') return 'Ortak girişi';
  if (classification === 'partner_out') return 'Ortak çıkışı';
  return entryTypeLabel(classification);
}

function reportSourceLabel(sourceType) {
  if (sourceType === 'manual') return 'Manuel';
  if (sourceType === 'manual_correction') return 'Düzeltme';
  if (sourceType === 'accounting_recurring_expense') return 'Tekrarlayan gider';
  if (sourceType === 'accounting_commission_collection') return 'Komisyon tahsilatı';
  if (sourceType === 'accounting_commission_payment') return 'Komisyon ödemesi';
  if (sourceType === 'accounting_rent_collection') return 'Kira tahsilatı';
  return sourceType || 'Sistem';
}

function entryTypeLabel(type) {
  return ACCOUNTING_ENTRY_TYPES.find((item) => item.value === type)?.label || type;
}

function quickExpenseLabel(entry) {
  return entry?.category?.trim() || 'Gider';
}

function statementTypeLabel(type) {
  if (type === 'opening_balance') return 'Açılış';
  if (type === 'rent_accrual') return 'Kira tahakkuku';
  if (type === 'commission_accrual') return 'Komisyon hakedişi';
  return entryTypeLabel(type);
}

function buildStatementRows(entries) {
  let receivable = 0;
  let payable = 0;
  return (entries || []).map((entry) => {
    receivable = Number((receivable + Number(entry.receivableDelta || 0)).toFixed(2));
    payable = Number((payable + Number(entry.payableDelta || 0)).toFixed(2));
    return {
      ...entry,
      runningReceivable: receivable,
      runningPayable: payable,
      runningBalance: Number((receivable - payable).toFixed(2)),
    };
  });
}

function EmptyTab({ title, description }) {
  return (
    <div className="folder-panel" style={{ padding: 28, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink-navy)', marginBottom: 8 }}>
        {title}
      </div>
      <p style={{ color: 'var(--muted)', maxWidth: 560, margin: '0 auto', fontSize: 14 }}>
        {description}
      </p>
      <div style={{ marginTop: 18, color: 'var(--brass)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Bu bölüm bir sonraki geliştirme adımında bağlanacak
      </div>
    </div>
  );
}

function FormField({ label, children, style }) {
  return (
    <div className="form-field" style={{ margin: 0, minWidth: 150, ...style }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function parseAccountingAmount(value) {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return NaN;
  if (raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.'));
  const dotParts = raw.split('.');
  if (dotParts.length > 1 && dotParts.slice(1).every((part) => part.length === 3)) {
    return Number(dotParts.join(''));
  }
  return Number(raw);
}

function addMonthsToDate(dateString, count = 1) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  date.setMonth(date.getMonth() + count);
  return date.toISOString().slice(0, 10);
}


function AmountInput({ value, currency, onChange, id, ...props }) {
  const parsed = parseAccountingAmount(value);
  const hintId = id ? `${id}-hint` : undefined;
  return (
    <>
      <input
        {...props}
        id={id}
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        onChange={onChange}
        aria-describedby={hintId}
      />
      <div id={hintId} className="accounting-amount-hint" aria-live="polite">
        {value && Number.isFinite(parsed)
          ? `Görünen tutar: ${formatAccountingMoney(parsed, currency)}`
          : 'Nokta veya virgül kullanabilirsiniz; sistem tutarı böyle gösterecek.'}
      </div>
    </>
  );
}

function SavedRecordNotice({ notice }) {
  if (!notice) return null;
  return (
    <div className="accounting-save-notice" role="status" aria-live="polite">
      <div className="accounting-save-notice__title">Kayıt oldu</div>
      <div className="accounting-save-notice__summary">{notice.title}</div>
      <div className="accounting-save-notice__details">{notice.details}</div>
    </div>
  );
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('entries');
  const [accountSubTab, setAccountSubTab] = useState('bank');
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [currency, setCurrency] = useState('TRY');
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entrySaveNotice, setEntrySaveNotice] = useState(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSaveNotice, setAccountSaveNotice] = useState(null);
  const [error, setError] = useState('');
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [selectedQuickExpenseId, setSelectedQuickExpenseId] = useState('');
  const [recentExpenseEntries, setRecentExpenseEntries] = useState([]);
  const [quickExpensePreferences, setQuickExpensePreferences] = useState([]);
  const [recentExpenseLoading, setRecentExpenseLoading] = useState(false);
  const [quickExpensePreferenceAction, setQuickExpensePreferenceAction] = useState('');
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    type: 'bank',
    name: '',
    bankName: '',
    iban: '',
    currency: 'TRY',
    openingBalance: '',
  });
  const [agents, setAgents] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionSaveNotice, setCommissionSaveNotice] = useState(null);
  const [commissionActionId, setCommissionActionId] = useState(null);
  const [commissionForm, setCommissionForm] = useState(EMPTY_COMMISSION_FORM);
  const [settlementAccounts, setSettlementAccounts] = useState({});
  const [rents, setRents] = useState([]);
  const [rentLoading, setRentLoading] = useState(false);
  const [rentGenerating, setRentGenerating] = useState(false);
  const [rentActionId, setRentActionId] = useState(null);
  const [parties, setParties] = useState([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [partyStatement, setPartyStatement] = useState(null);
  const [partyStatementLoading, setPartyStatementLoading] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState('all');
  const [partyPage, setPartyPage] = useState(1);
  const [partySaving, setPartySaving] = useState(false);
  const [partySaveNotice, setPartySaveNotice] = useState(null);
  const [partnerSaveNotice, setPartnerSaveNotice] = useState(null);
  const [masterSaving, setMasterSaving] = useState(false);
  const [partyForm, setPartyForm] = useState({
    type: 'partner',
    name: '',
    companyName: '',
    phone: '',
    taxId: '',
    currency: 'TRY',
    openingBalance: '',
    openingBalanceDirection: 'receivable',
  });
  const [partnerMovementForm, setPartnerMovementForm] = useState({
    partyId: '',
    movementType: 'capital_in',
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    currency: 'TRY',
    accountId: '',
    description: '',
  });
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [reportFromDate, setReportFromDate] = useState(DEFAULT_REPORT_RANGE.from);
  const [reportToDate, setReportToDate] = useState(DEFAULT_REPORT_RANGE.to);
  const [reportPreset, setReportPreset] = useState('this_month');
  const [reportMovementFilter, setReportMovementFilter] = useState('all');
  const [reportAccountFilter, setReportAccountFilter] = useState('all');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('all');
  const [reportSearch, setReportSearch] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const [managementReport, setManagementReport] = useState(null);
  const [managementReportLoading, setManagementReportLoading] = useState(false);
  const [migrationPreview, setMigrationPreview] = useState(null);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [resetPreview, setResetPreview] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTarget, setAuditTarget] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [customCategories, setCustomCategories] = useState({ income: [], expense: [] });
  const commissionIdempotencyKeyRef = useRef(null);
  const entryIdempotencyKeyRef = useRef(null);
  const reportDetailRef = useRef(null);

  const periodParams = useMemo(() => ({ ...getPeriodBounds(period), currency }), [period, currency]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [accountList, entryList] = await Promise.all([
        accountingApi.listAccounts(),
        accountingApi.listEntries(periodParams),
      ]);
      setAccounts(accountList || []);
      setEntries(entryList || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Muhasebe verileri yüklenemedi. Backend bağlantısını kontrol edin.');
    } finally {
      setLoading(false);
    }
  }, [periodParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadRecentExpenseEntries = useCallback(async () => {
    setRecentExpenseLoading(true);
    try {
      const [expenseList, preferenceList] = await Promise.all([
        accountingApi.listEntries({ type: 'expense' }),
        accountingApi.listQuickExpensePreferences(),
      ]);
      setRecentExpenseEntries(expenseList || []);
      setQuickExpensePreferences(preferenceList || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Önceki gider kayıtları yüklenemedi.');
    } finally {
      setRecentExpenseLoading(false);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const agentList = await usersApi.listAgents();
      setAgents(agentList || []);
      return true;
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Danışman listesi yüklenemedi.');
      return false;
    }
  }, []);

  const loadCommissions = useCallback(async () => {
    try {
      const commissionList = await accountingApi.listCommissions();
      setCommissions(commissionList || []);
      return true;
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Komisyon verileri yüklenemedi.');
      return false;
    }
  }, []);

  const loadCommissionData = useCallback(async () => {
    setCommissionLoading(true);
    await Promise.allSettled([loadAgents(), loadCommissions()]);
    setCommissionLoading(false);
  }, [loadAgents, loadCommissions]);

  const loadRents = useCallback(async () => {
    setRentLoading(true);
    try {
      const rentList = await accountingApi.listRents({ period, currency });
      setRents(rentList || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Danışman kira kayıtları yüklenemedi.');
    } finally {
      setRentLoading(false);
    }
  }, [period, currency]);

  const loadParties = useCallback(async () => {
    setPartyLoading(true);
    try {
      const partyList = await accountingApi.listParties({ currency });
      setParties(partyList || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Cari kartlar yüklenemedi.');
    } finally {
      setPartyLoading(false);
    }
  }, [currency]);

  const loadCategories = useCallback(async () => {
    try {
      const [expenseList, incomeList] = await Promise.all([
        accountingApi.listCategories({ type: 'expense' }),
        accountingApi.listCategories({ type: 'income' }),
      ]);
      setCustomCategories({
        expense: expenseList || [],
        income: incomeList || [],
      });
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Muhasebe kategorileri yüklenemedi.');
    }
  }, []);

  const loadManagementReport = useCallback(async () => {
    if (!reportFromDate || !reportToDate) return;
    if (reportFromDate > reportToDate) {
      setError('Rapor başlangıç tarihi bitiş tarihinden sonra olamaz.');
      return;
    }
    setManagementReportLoading(true);
    setError('');
    try {
      const report = await accountingApi.getManagementReport({ from: reportFromDate, to: reportToDate, currency });
      setManagementReport(report || null);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Yönetimsel rapor yüklenemedi.');
    } finally {
      setManagementReportLoading(false);
    }
  }, [reportFromDate, reportToDate, currency]);

  function handleReportPreset(preset) {
    const nextRange = getReportDateRange(preset);
    setReportPreset(preset);
    setReportFromDate(nextRange.from);
    setReportToDate(nextRange.to);
    setReportPage(1);
  }

  function handleReportDrilldown(filter, category = 'all') {
    setReportMovementFilter(filter);
    setReportCategoryFilter(category);
    setReportSearch('');
    setReportPage(1);
    window.requestAnimationFrame(() => reportDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  useEffect(() => {
    if (activeTab !== 'entries') return undefined;
    loadRecentExpenseEntries();
    return undefined;
  }, [activeTab, loadRecentExpenseEntries]);

  useEffect(() => {
    if (activeTab !== 'commissions') return undefined;
    loadCommissionData();
    return undefined;
  }, [activeTab, loadCommissionData]);

  useEffect(() => {
    if (activeTab !== 'dues') return undefined;
    loadRents();
    return undefined;
  }, [activeTab, loadRents]);

  useEffect(() => {
    if (activeTab !== 'ledgers' && activeTab !== 'accounts' && activeTab !== 'entries' && activeTab !== 'reports') return undefined;
    loadParties();
    return undefined;
  }, [activeTab, loadParties]);

  useEffect(() => {
    if (activeTab !== 'reports') return undefined;
    loadManagementReport();
    return undefined;
  }, [activeTab, loadManagementReport]);

  const loadMigrationPreview = useCallback(async () => {
    setMigrationLoading(true);
    setError('');
    try {
      const preview = await accountingApi.getMigrationPreview();
      setMigrationPreview(preview || null);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Finans aktarım önizlemesi yüklenemedi.');
    } finally {
      setMigrationLoading(false);
    }
  }, []);

  const loadResetPreview = useCallback(async () => {
    setResetLoading(true);
    setError('');
    try {
      const preview = await accountingApi.getResetPreview();
      setResetPreview(preview || null);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Muhasebe sıfırlama önizlemesi yüklenemedi.');
    } finally {
      setResetLoading(false);
    }
  }, []);

  const handleResetDemo = async (event) => {
    event.preventDefault();
    if (!resetPreview?.canReset || resetConfirmation !== 'MUHASEBE DENEME KAYITLARINI SIFIRLA' || resetReason.trim().length < 10) return;
    const confirmed = window.confirm('Bu işlem yalnızca yeni Muhasebe demo kayıtlarını kalıcı olarak silecek ve saklanan yedek snapshot oluşturacaktır. Eski Finans ve CRM kayıtlarına dokunulmayacaktır. Devam edilsin mi?');
    if (!confirmed) return;
    setResetting(true);
    setError('');
    try {
      const result = await accountingApi.resetDemoData({ confirmation: resetConfirmation, reason: resetReason.trim() });
      setResetPreview({ ...resetPreview, alreadyReset: true, canReset: false, counts: Object.fromEntries(Object.keys(resetPreview.counts || {}).map((key) => [key, 0])), total: 0, message: result.message });
      setResetConfirmation('');
      setResetReason('');
      await loadData();
    } catch (resetError) {
      setError(resetError.response?.data?.message || 'Muhasebe demo kayıtları sıfırlanamadı. Hiçbir kayıt silinmemiş olabilir; lütfen önizlemeyi yenileyin.');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'migration') return undefined;
    loadMigrationPreview();
    return undefined;
  }, [activeTab, loadMigrationPreview]);

  useEffect(() => {
    if (activeTab !== 'entries') return undefined;
    loadCategories();
    return undefined;
  }, [activeTab, loadCategories]);

  const currencyAccounts = useMemo(
    () => accounts.filter((account) => account.currency === entryForm.currency && account.isActive !== false),
    [accounts, entryForm.currency],
  );
  const hiddenQuickExpenseLabels = useMemo(
    () => new Set(
      quickExpensePreferences
        .filter((preference) => preference.isHidden)
        .map((preference) => preference.label.toLocaleLowerCase('tr-TR')),
    ),
    [quickExpensePreferences],
  );
  const quickExpenseOptions = useMemo(() => {
    const latestByLabel = new Map();
    recentExpenseEntries.forEach((entry) => {
      const label = quickExpenseLabel(entry);
      const key = label.toLocaleLowerCase('tr-TR');
      if (!hiddenQuickExpenseLabels.has(key) && !latestByLabel.has(key)) latestByLabel.set(key, entry);
    });
    return Array.from(latestByLabel.values()).sort((left, right) => quickExpenseLabel(left).localeCompare(quickExpenseLabel(right), 'tr-TR', { sensitivity: 'base' }));
  }, [recentExpenseEntries, hiddenQuickExpenseLabels]);
  const reportMovements = managementReport?.movements || [];
  const reportCategoryOptions = useMemo(
    () => Array.from(new Set(reportMovements.map((entry) => entry.category || 'Kategorisiz')))
      .sort((left, right) => left.localeCompare(right, 'tr-TR', { sensitivity: 'base' })),
    [reportMovements],
  );
  const filteredReportMovements = useMemo(() => {
    const query = reportSearch.trim().toLocaleLowerCase('tr-TR');
    return reportMovements.filter((entry) => {
      const classification = entry.classification || entry.type;
      const matchesType = reportMovementFilter === 'all'
        || (reportMovementFilter === 'operation' && ['income', 'expense'].includes(classification))
        || (reportMovementFilter === 'partner' && ['partner_in', 'partner_out'].includes(classification))
        || (reportMovementFilter === 'cash' && classification !== 'transfer')
        || classification === reportMovementFilter;
      const matchesAccount = reportAccountFilter === 'all'
        || entry.accountId === reportAccountFilter
        || entry.counterAccountId === reportAccountFilter;
      const matchesCategory = reportCategoryFilter === 'all'
        || (entry.category || 'Kategorisiz') === reportCategoryFilter;
      const searchable = [entry.category, entry.description, entry.partyName, entry.accountName, entry.counterAccountName, entry.referenceNo]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return matchesType && matchesAccount && matchesCategory && (!query || searchable.includes(query));
    });
  }, [reportMovements, reportMovementFilter, reportAccountFilter, reportCategoryFilter, reportSearch]);
  const reportPageCount = Math.max(1, Math.ceil(filteredReportMovements.length / REPORT_PAGE_SIZE));
  const visibleReportMovements = useMemo(
    () => filteredReportMovements.slice((reportPage - 1) * REPORT_PAGE_SIZE, reportPage * REPORT_PAGE_SIZE),
    [filteredReportMovements, reportPage],
  );
  const entryCategoryOptions = useMemo(
    () => entryForm.type === 'expense'
      ? categoryNames(EXPENSE_CATEGORIES, customCategories.expense)
      : categoryNames(INCOME_CATEGORIES, customCategories.income),
    [entryForm.type, customCategories],
  );
  const statementRows = useMemo(() => buildStatementRows(partyStatement?.entries), [partyStatement]);
  const statementLastRow = statementRows[statementRows.length - 1];
  const statementReceivable = statementLastRow?.runningReceivable || 0;
  const statementPayable = statementLastRow?.runningPayable || 0;
  const statementBalance = statementLastRow?.runningBalance || 0;
  const filteredParties = useMemo(() => {
    const query = partySearch.trim().toLocaleLowerCase('tr-TR');
    return parties.filter((party) => {
      const matchesType = partyTypeFilter === 'all' || party.type === partyTypeFilter;
      const searchableText = [party.name, party.companyName, party.phone, party.taxId]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return matchesType && (!query || searchableText.includes(query));
    });
  }, [parties, partySearch, partyTypeFilter]);
  const partyPageCount = Math.max(1, Math.ceil(filteredParties.length / PARTY_PAGE_SIZE));
  const visibleParties = useMemo(
    () => filteredParties.slice((partyPage - 1) * PARTY_PAGE_SIZE, partyPage * PARTY_PAGE_SIZE),
    [filteredParties, partyPage],
  );

  useEffect(() => {
    setPartyPage(1);
  }, [partySearch, partyTypeFilter, currency]);

  useEffect(() => {
    setReportPage(1);
  }, [reportMovementFilter, reportAccountFilter, reportCategoryFilter, reportSearch, currency, reportFromDate, reportToDate]);

  useEffect(() => {
    if (partyPage > partyPageCount) setPartyPage(partyPageCount);
  }, [partyPage, partyPageCount]);

  function applyRecentExpense(expenseId) {
    setSelectedQuickExpenseId(expenseId);
    setQuickExpenseOpen(false);
    setEntrySaveNotice(null);
    if (!expenseId) return;
    const previousExpense = recentExpenseEntries.find((entry) => entry.id === expenseId);
    if (!previousExpense) return;
    setEntryForm((previous) => ({
      ...previous,
      type: 'expense',
      amount: String(previousExpense.amount ?? ''),
      currency: previousExpense.currency || previous.currency,
      accountId: accounts.find((account) => account.id === previousExpense.accountId && account.isActive !== false)?.id || '',
      counterAccountId: '',
      category: previousExpense.category || EXPENSE_CATEGORIES[0],
      customCategory: '',
      partyId: previousExpense.partyId || '',
      partyName: previousExpense.partyName || '',
      description: previousExpense.description || '',
      referenceNo: '',
    }));
  }

  function handleRecentExpenseChange(event) {
    applyRecentExpense(event.target.value);
  }

  async function handleHideQuickExpense(label) {
    if (!label || quickExpensePreferenceAction) return;
    if (!window.confirm(`“${label}” hızlı seçim listesinden gizlensin mi? Gerçek Muhasebe hareketi silinmeyecektir.`)) return;
    setQuickExpensePreferenceAction(label);
    setError('');
    try {
      const saved = await accountingApi.updateQuickExpensePreference({ label, isHidden: true });
      setQuickExpensePreferences((current) => [
        ...current.filter((preference) => preference.label.toLocaleLowerCase('tr-TR') !== label.toLocaleLowerCase('tr-TR')),
        saved,
      ]);
      setSelectedQuickExpenseId('');
      setQuickExpenseOpen(false);
    } catch (hideError) {
      setError(hideError.response?.data?.message || 'Hızlı seçim adı gizlenemedi.');
    } finally {
      setQuickExpensePreferenceAction('');
    }
  }

  function handleEntryChange(event) {
    const { name, value } = event.target;
    if (name === 'type') setSelectedQuickExpenseId('');
    setEntrySaveNotice(null);
    setEntryForm((previous) => {
      const next = { ...previous, [name]: value };
      if (name === 'currency') {
        next.accountId = '';
        next.counterAccountId = '';
      }
      if (name === 'type' && value === 'transfer') {
        next.category = 'Hesaplar Arası Transfer';
        next.customCategory = '';
        next.partyId = '';
        next.partyName = '';
      }
      if (name === 'type' && value === 'expense') {
        next.category = EXPENSE_CATEGORIES[0];
        next.customCategory = '';
      }
      if (name === 'type' && value === 'income') {
        next.category = INCOME_CATEGORIES[0];
        next.customCategory = '';
      }
      if (name === 'type' && value !== 'transfer' && previous.type === 'transfer') {
        next.category = value === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0];
        next.customCategory = '';
      }
      if (name === 'category' && value !== NEW_CATEGORY_VALUE) {
        next.customCategory = '';
      }
      return next;
    });
  }

  async function handleCreatePartnerMovement(event) {
    event.preventDefault();
    const movement = PARTNER_MOVEMENT_TYPES.find((item) => item.value === partnerMovementForm.movementType);
    const party = parties.find((item) => item.id === partnerMovementForm.partyId);
    if (!party) {
      setError('Önce bir ortak cari kartı seçin.');
      return;
    }
    const partnerAmount = parseAccountingAmount(partnerMovementForm.amount);
    if (!Number.isFinite(partnerAmount) || partnerAmount <= 0) {
      setError('Ortak hareket tutarı sıfırdan büyük olmalıdır. Örn. 170000 veya 170.000 yazabilirsiniz.');
      return;
    }
    if (!partnerMovementForm.accountId) {
      setError('Ortak hareketi için para hesabı seçin.');
      return;
    }

    setPartnerSaving(true);
    setError('');
    try {
      await accountingApi.createEntry({
        type: movement.type,
        date: partnerMovementForm.date,
        amount: partnerAmount,
        currency: partnerMovementForm.currency,
        accountId: partnerMovementForm.accountId,
        category: movement.category,
        partyType: 'partner',
        partyId: party.id,
        partyName: party.name,
        description: partnerMovementForm.description.trim() || movement.label,
      });
      setPartnerSaveNotice({
        title: `${movement.label} kaydedildi`,
        details: `${party.name} · ${formatAccountingMoney(partnerAmount, partnerMovementForm.currency)} · ${formatDate(partnerMovementForm.date)}`,
      });
      setPartnerMovementForm({
        partyId: '',
        movementType: 'capital_in',
        date: new Date().toISOString().slice(0, 10),
        amount: '',
        currency,
        accountId: '',
        description: '',
      });
      await Promise.all([loadParties(), loadData()]);
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Ortak hareketi kaydedilemedi.');
    } finally {
      setPartnerSaving(false);
    }
  }

  async function handleCreateParty(event) {
    event.preventDefault();
    if (!partyForm.name.trim()) {
      setError('Cari kart adı boş bırakılamaz.');
      return;
    }
    const openingBalance = partyForm.openingBalance ? parseAccountingAmount(partyForm.openingBalance) : 0;
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setError('Açılış bakiyesi geçerli bir tutar olmalıdır. Örn. 170000 veya 170.000 yazabilirsiniz.');
      return;
    }
    setPartySaveNotice(null);
    setPartySaving(true);
    setError('');
    try {
      await accountingApi.createParty({
        ...partyForm,
        name: partyForm.name.trim(),
        companyName: partyForm.companyName.trim() || undefined,
        phone: partyForm.phone.trim() || undefined,
        taxId: partyForm.taxId.trim() || undefined,
        openingBalance,
      });
      setPartySaveNotice({
        title: 'Cari kart kaydedildi',
        details: `${partyForm.name.trim()} · ${partyForm.currency}${openingBalance > 0 ? ` · Açılış: ${formatAccountingMoney(openingBalance, partyForm.currency)}` : ''}`,
      });
      setPartyForm({
        type: 'partner',
        name: '',
        companyName: '',
        phone: '',
        taxId: '',
        currency,
        openingBalance: '',
        openingBalanceDirection: 'receivable',
      });
      await loadParties();
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Cari kart oluşturulamadı.');
    } finally {
      setPartySaving(false);
    }
  }

  async function handleViewPartyStatement(party) {
    setPartyStatementLoading(true);
    setPartyStatement({ party, entries: [] });
    setError('');
    try {
      const statement = await accountingApi.listPartyEntries(party.id);
      setPartyStatement(statement);
    } catch (loadError) {
      setPartyStatement(null);
      setError(loadError.response?.data?.message || 'Cari ekstre yüklenemedi.');
    } finally {
      setPartyStatementLoading(false);
    }
  }

  async function handleViewAudit(target) {
    setAuditTarget(target);
    setAuditLoading(true);
    setError('');
    try {
      const logs = await accountingApi.listAuditLogs({ entityType: 'accounting_entry', entityId: target.id });
      setAuditLogs(logs || []);
    } catch (auditError) {
      setAuditLogs([]);
      setError(auditError.response?.data?.message || 'Denetim geçmişi yüklenemedi.');
    } finally {
      setAuditLoading(false);
    }
  }

  function handleStartCorrectEntry(entry) {
    if (entry.sourceType !== 'manual') {
      setError('Komisyon, kira ve tekrarlayan gider hareketleri kendi işlem ekranlarından yönetilmelidir.');
      return;
    }
    setEditingEntry(entry);
    setActiveTab('entries');
    setSelectedQuickExpenseId('');
    setCorrectionReason('');
    setEntryForm({
      ...EMPTY_ENTRY_FORM,
      type: entry.type,
      date: entry.date,
      amount: String(entry.amount),
      currency: entry.currency,
      accountId: entry.accountId || '',
      counterAccountId: entry.counterAccountId || '',
      category: entry.category || (entry.type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]),
      partyId: parties.find((party) => party.id === entry.partyId || party.linkedUserId === entry.partyId)?.id || entry.partyId || '',
      partyName: entry.partyName || '',
      description: entry.description || '',
      referenceNo: entry.referenceNo || '',
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelCorrection() {
    setEditingEntry(null);
    setSelectedQuickExpenseId('');
    setCorrectionReason('');
    setEntryForm({ ...EMPTY_ENTRY_FORM, date: new Date().toISOString().slice(0, 10), currency });
  }

  async function handleVoidEntry(entry) {
    if (!['manual', 'manual_correction', 'accounting_recurring_expense'].includes(entry.sourceType)) {
      setError('Komisyon ve kira hareketleri kendi ekranından iptal edilmelidir.');
      return;
    }
    const reason = window.prompt('İptal nedeni nedir? Bu neden denetim geçmişine kaydedilecektir.');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('İptal nedeni en az 3 karakter olmalıdır.');
      return;
    }
    if (!window.confirm('Bu hareket iptal edilsin mi? Kayıt silinmeyecek; bakiyelerden çıkarılıp geçmişte korunacak.')) return;
    setSaving(true);
    setError('');
    try {
      await accountingApi.voidEntry(entry.id, { reason: reason.trim() });
      await loadData();
      if (activeTab === 'reports') await loadManagementReport();
    } catch (voidError) {
      setError(voidError.response?.data?.message || 'Muhasebe hareketi iptal edilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateEntry(event) {
    event.preventDefault();
    const entryAmount = parseAccountingAmount(entryForm.amount);
    if (!Number.isFinite(entryAmount) || entryAmount <= 0) {
      setError('Tutar sıfırdan büyük olmalıdır. Örn. 170000 veya 170.000 yazabilirsiniz.');
      return;
    }
    if (!entryForm.accountId) {
      setError('Önce para hesabı seçmelisiniz.');
      return;
    }
    if (entryForm.type === 'transfer' && !entryForm.counterAccountId) {
      setError('Transfer için hedef hesap seçmelisiniz.');
      return;
    }

    const selectedCategory = entryForm.category === NEW_CATEGORY_VALUE
      ? entryForm.customCategory.trim()
      : entryForm.category;
    if (entryForm.type !== 'transfer' && !selectedCategory) {
      setError('Yeni kategori adı boş bırakılamaz.');
      return;
    }

    const selectedParty = entryForm.partyId ? parties.find((party) => party.id === entryForm.partyId) : null;
    if (entryForm.partyId && !selectedParty) {
      setError('Seçilen cari kart bulunamadı.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingEntry && correctionReason.trim().length < 3) {
        throw new Error('Düzeltme nedeni en az 3 karakter olmalıdır.');
      }
      if (entryForm.type !== 'transfer' && ![...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].includes(selectedCategory)) {
        await accountingApi.createCategory({ type: entryForm.type, name: selectedCategory });
        await loadCategories();
      }
      const { customCategory: _customCategory, ...entryPayload } = entryForm;
      const normalizedPayload = {
        ...entryPayload,
        amount: entryAmount,
        category: entryForm.type === 'transfer' ? 'Hesaplar Arası Transfer' : selectedCategory,
        partyType: entryForm.type === 'transfer' ? undefined : selectedParty?.type,
        partyId: entryForm.type === 'transfer' ? undefined : selectedParty ? (selectedParty.linkedUserId || selectedParty.id) : undefined,
        partyName: entryForm.type === 'transfer' ? undefined : selectedParty?.name || entryForm.partyName || undefined,
        counterAccountId: entryForm.type === 'transfer' ? entryForm.counterAccountId : undefined,
        referenceNo: entryForm.referenceNo || undefined,
      };
      if (editingEntry) {
        await accountingApi.correctEntry(editingEntry.id, { ...normalizedPayload, reason: correctionReason.trim() });
      } else {
        const idempotencyKey = entryIdempotencyKeyRef.current
          || window.crypto?.randomUUID?.()
          || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        entryIdempotencyKeyRef.current = idempotencyKey;
        await accountingApi.createEntry({ ...normalizedPayload, idempotencyKey });
      }
      entryIdempotencyKeyRef.current = null;
      const savedEntryAccount = accounts.find((account) => account.id === entryForm.accountId);
      const savedEntryCounterAccount = accounts.find((account) => account.id === entryForm.counterAccountId);
      setEntrySaveNotice({
        title: editingEntry ? 'Muhasebe hareketi düzeltildi' : 'Muhasebe hareketi kaydedildi',
        details: `${entryTypeLabel(entryForm.type)} · ${formatAccountingMoney(entryAmount, entryForm.currency)} · ${savedEntryAccount?.name || 'Hesap'}${savedEntryCounterAccount ? ` → ${savedEntryCounterAccount.name}` : ''} · ${formatDate(entryForm.date)}`,
      });
      setEditingEntry(null);
      setSelectedQuickExpenseId('');
      setCorrectionReason('');
      setEntryForm({ ...EMPTY_ENTRY_FORM, date: new Date().toISOString().slice(0, 10), currency });
      setActiveTab('entries');
      // Kayıt POST isteği başarılı olduktan sonra ekran yenilemesini
      // kullanıcıyı bekletmeden arka planda yap.
      loadData().catch(() => undefined);
      loadRecentExpenseEntries().catch(() => undefined);
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Muhasebe hareketi kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateRents() {
    if (currency !== 'TRY') {
      setError('Danışman kira tutarı ilk sürümde yalnızca TL olarak işlenir.');
      return;
    }
    if (!window.confirm(`${periodLabel(period)} dönemi için danışman kira tahakkukları oluşturulsun mu?`)) return;

    setRentGenerating(true);
    setError('');
    try {
      await accountingApi.generateRents({ period, currency: 'TRY' });
      await loadRents();
    } catch (generateError) {
      setError(generateError.response?.data?.message || 'Danışman kira tahakkukları oluşturulamadı.');
    } finally {
      setRentGenerating(false);
    }
  }

  async function handleRentAction(rent, action) {
    const accountId = getSettlementAccount(rent.id);
    if (action !== 'void' && !accountId) {
      setError('Önce bu kira için bir banka, kasa veya kredi kartı hesabı seçin.');
      return;
    }
    const actionLabel = action === 'collect' ? 'tahsilatı' : 'iptali';
    const reason = action === 'void' ? window.prompt('İptal nedeni nedir? Bu neden denetim geçmişine kaydedilecektir.') : null;
    if (action === 'void' && reason === null) return;
    if (action === 'void' && reason.trim().length < 3) {
      setError('İptal nedeni en az 3 karakter olmalıdır.');
      return;
    }
    if (!window.confirm(`Bu kira tahakkukunun ${actionLabel} kaydedilsin mi?`)) return;

    setRentActionId(rent.id);
    setError('');
    try {
      if (action === 'collect') {
        await accountingApi.collectRent(rent.id, {
          accountId,
          date: new Date().toISOString().slice(0, 10),
        });
      } else {
        await accountingApi.voidRent(rent.id, { reason: reason.trim() });
      }
      await Promise.all([loadRents(), loadData()]);
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Danışman kira işlemi kaydedilemedi.');
    } finally {
      setRentActionId(null);
    }
  }

  async function handleCreateCommission(event) {
    event.preventDefault();
    const grossAmount = parseAccountingAmount(commissionForm.grossAmount);
    if (!commissionForm.agentId || !Number.isFinite(grossAmount) || grossAmount <= 0) {
      setError('Danışman ve sıfırdan büyük brüt komisyon tutarı seçilmelidir. Örn. 170000 veya 170.000 yazabilirsiniz.');
      return;
    }
    setCommissionSaving(true);
    setError('');
    try {
      const idempotencyKey = commissionIdempotencyKeyRef.current
        || window.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      commissionIdempotencyKeyRef.current = idempotencyKey;
      await accountingApi.createCommission({
        ...commissionForm,
        idempotencyKey,
        grossAmount,
        propertyTitle: commissionForm.propertyTitle.trim() || undefined,
        notes: commissionForm.notes.trim() || undefined,
      });
      const savedAgent = agents.find((agent) => agent.id === commissionForm.agentId);
      setCommissionSaveNotice({
        title: 'Komisyon kapaması kaydedildi',
        details: `${savedAgent?.name || 'Danışman'} · ${formatAccountingMoney(grossAmount, commissionForm.currency)} · ${formatDate(commissionForm.date)}`,
      });
      setCommissionForm({ ...EMPTY_COMMISSION_FORM, date: new Date().toISOString().slice(0, 10), currency });
      commissionIdempotencyKeyRef.current = null;
      loadCommissionData().catch(() => undefined);
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Komisyon kaydı oluşturulamadı.');
    } finally {
      setCommissionSaving(false);
    }
  }

  function getSettlementAccount(commissionId) {
    return settlementAccounts[commissionId] || '';
  }

  function setSettlementAccount(commissionId, accountId) {
    setSettlementAccounts((previous) => ({ ...previous, [commissionId]: accountId }));
  }

  async function handleCommissionAction(commission, action) {
    const accountId = getSettlementAccount(commission.id);
    if (action !== 'void' && !accountId) {
      setError('Önce bu komisyon için bir banka, kasa veya kredi kartı hesabı seçin.');
      return;
    }
    const actionLabel = action === 'collect'
      ? 'tahsilatı'
      : action === 'pay'
        ? 'danışman ödemesi'
        : 'iptali';
    const reason = action === 'void' ? window.prompt('İptal nedeni nedir? Bu neden denetim geçmişine kaydedilecektir.') : null;
    if (action === 'void' && reason === null) return;
    if (action === 'void' && reason.trim().length < 3) {
      setError('İptal nedeni en az 3 karakter olmalıdır.');
      return;
    }
    if (!window.confirm(`Bu komisyonun ${actionLabel} kaydedilsin mi?`)) return;

    setCommissionActionId(commission.id);
    setError('');
    try {
      const payload = {
        accountId,
        date: new Date().toISOString().slice(0, 10),
      };
      if (action === 'collect') {
        await accountingApi.collectCommission(commission.id, payload);
      } else if (action === 'pay') {
        await accountingApi.payCommission(commission.id, payload);
      } else {
        await accountingApi.voidCommission(commission.id, { reason: reason.trim() });
      }
      Promise.all([loadCommissionData(), loadData()]).catch(() => undefined);
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Komisyon işlemi kaydedilemedi.');
    } finally {
      setCommissionActionId(null);
    }
  }

  async function handleEditAccount(account) {
    const name = window.prompt('Hesap adı:', account.name);
    if (name === null) return;
    if (!name.trim()) { setError('Hesap adı boş bırakılamaz.'); return; }
    setMasterSaving(true);
    setError('');
    try {
      await accountingApi.updateAccount(account.id, { name: name.trim(), bankName: account.bankName || '', iban: account.iban || '' });
      await loadData();
    } catch (editError) {
      setError(editError.response?.data?.message || 'Hesap güncellenemedi.');
    } finally {
      setMasterSaving(false);
    }
  }

  async function handleArchiveAccount(account) {
    const reason = window.prompt('Hesabı neden pasifleştiriyorsunuz? Bu neden audit geçmişine kaydedilecektir.');
    if (reason === null || reason.trim().length < 3) { if (reason !== null) setError('Pasifleştirme nedeni en az 3 karakter olmalıdır.'); return; }
    if (!window.confirm(`${account.name} pasifleştirilsin mi? Geçmiş hareketler korunacak; yeni işlemlerde seçilemeyecek.`)) return;
    setMasterSaving(true);
    setError('');
    try {
      await accountingApi.archiveAccount(account.id, { reason: reason.trim() });
      await loadData();
    } catch (archiveError) {
      setError(archiveError.response?.data?.message || 'Hesap pasifleştirilemedi.');
    } finally {
      setMasterSaving(false);
    }
  }

  async function handleEditParty(party) {
    const name = window.prompt('Cari kart adı / unvanı:', party.name);
    if (name === null) return;
    if (!name.trim()) { setError('Cari kart adı boş bırakılamaz.'); return; }
    setMasterSaving(true);
    setError('');
    try {
      await accountingApi.updateParty(party.id, { name: name.trim(), companyName: party.companyName || '', phone: party.phone || '', taxId: party.taxId || '' });
      await loadParties();
    } catch (editError) {
      setError(editError.response?.data?.message || 'Cari kart güncellenemedi.');
    } finally {
      setMasterSaving(false);
    }
  }

  async function handleArchiveParty(party) {
    const reason = window.prompt('Cari kartı neden pasifleştiriyorsunuz?');
    if (reason === null || reason.trim().length < 3) { if (reason !== null) setError('Pasifleştirme nedeni en az 3 karakter olmalıdır.'); return; }
    if (!window.confirm(`${party.name} pasifleştirilsin mi? Geçmiş hareketler korunacak.`)) return;
    setMasterSaving(true);
    setError('');
    try {
      await accountingApi.archiveParty(party.id, { reason: reason.trim() });
      await loadParties();
    } catch (archiveError) {
      setError(archiveError.response?.data?.message || 'Cari kart pasifleştirilemedi.');
    } finally {
      setMasterSaving(false);
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    if (!accountForm.name.trim()) {
      setError('Hesap adı zorunludur.');
      return;
    }
    const openingBalance = accountForm.openingBalance ? parseAccountingAmount(accountForm.openingBalance) : 0;
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setError('Açılış bakiyesi geçerli bir tutar olmalıdır. Örn. 170000 veya 170.000 yazabilirsiniz.');
      return;
    }
    setAccountSaveNotice(null);
    setAccountSaving(true);
    setError('');
    try {
      await accountingApi.createAccount({
        ...accountForm,
        name: accountForm.name.trim(),
        bankName: accountForm.bankName.trim() || undefined,
        iban: accountForm.iban.trim() || undefined,
        openingBalance,
      });
      setAccountSaveNotice({
        title: 'Muhasebe hesabı kaydedildi',
        details: `${accountForm.name.trim()} · ${accountForm.currency}${openingBalance > 0 ? ` · Açılış: ${formatAccountingMoney(openingBalance, accountForm.currency)}` : ''}`,
      });
      setAccountForm({ ...accountForm, name: '', bankName: '', iban: '', openingBalance: '' });
      setActiveTab('accounts');
      loadData().catch(() => undefined);
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Muhasebe hesabı oluşturulamadı.');
    } finally {
      setAccountSaving(false);
    }
  }

  return (
    <div className="accounting-page">
      <div className="accounting-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 className="dossier__name" style={{ margin: 0 }}>Muhasebe</h2>
          <p style={{ color: 'var(--muted)', margin: '6px 0 0', maxWidth: 720, fontSize: 14 }}>
            Mevcut Finans bölümünden bağımsız, yönetimsel muhasebe ve cari takip alanı.
          </p>
        </div>
        <div className="accounting-page__filters" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {activeTab !== 'reports' && (
            <>
              <label style={{ color: 'var(--muted)', fontSize: 12 }} htmlFor="accounting-period">Dönem</label>
              <input
                id="accounting-period"
                type="month"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                style={{ minWidth: 150 }}
              />
            </>
          )}
          <label style={{ color: 'var(--muted)', fontSize: 12 }} htmlFor="accounting-currency">Para birimi</label>
          <select id="accounting-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {ACCOUNTING_CURRENCIES.map((item) => (
              <option value={item.value} key={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>


      {error && (
        <div className="folder-panel" style={{ marginBottom: 20, borderLeft: '4px solid var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="folder-tabs" style={{ flexWrap: 'wrap', marginBottom: 18 }}>
        {ACCOUNTING_TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            className={`folder-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'entries' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>{editingEntry ? 'Muhasebe hareketini düzelt' : 'Yeni muhasebe hareketi'}</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                  {editingEntry ? 'Eski kayıt silinmez ve geçmişte korunur. Yeni değerler ayrı bir düzeltme kaydı olarak oluşturulur.' : 'Gelir/tahsilat, gider/ödeme veya aynı para birimindeki iki hesap arasında transfer kaydedin.'}
                </p>
              </div>
              <span style={{ color: 'var(--brass)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>İlk sürüm</span>
            </div>
            <form onSubmit={handleCreateEntry} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FormField label="Hareket türü">
                <select name="type" value={entryForm.type} onChange={handleEntryChange}>
                  {ACCOUNTING_ENTRY_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              {!editingEntry && entryForm.type === 'expense' && (
                <FormField label="Önceki gideri kullan" style={{ minWidth: 300 }}>
                  {recentExpenseLoading ? (
                    <span className="quick-expense-empty">Önceki giderler yükleniyor…</span>
                  ) : quickExpenseOptions.length > 0 ? (
                    <div className="quick-expense-dropdown">
                      <button
                        type="button"
                        className="quick-expense-dropdown__trigger"
                        aria-haspopup="listbox"
                        aria-expanded={quickExpenseOpen}
                        onClick={() => setQuickExpenseOpen((open) => !open)}
                      >
                        <span>{selectedQuickExpenseId ? quickExpenseLabel(recentExpenseEntries.find((entry) => entry.id === selectedQuickExpenseId) || {}) : 'Önceki gider seçin'}</span>
                        <span aria-hidden="true">⌄</span>
                      </button>
                      {quickExpenseOpen && (
                        <div className="quick-expense-dropdown__menu" role="listbox" aria-label="Önceki giderler">
                          {quickExpenseOptions.map((expense) => {
                            const label = quickExpenseLabel(expense);
                            return (
                              <div className="quick-expense-dropdown__item" role="option" aria-selected={selectedQuickExpenseId === expense.id} key={expense.id}>
                                <button type="button" className="quick-expense-dropdown__select" onClick={() => applyRecentExpense(expense.id)}>
                                  <span>{label}</span>
                                  <small>{expense.currency} · {formatAccountingMoney(expense.amount, expense.currency)}</small>
                                </button>
                                <button
                                  type="button"
                                  className="quick-expense-dropdown__remove"
                                  aria-label={`${label} adını hızlı seçim listesinden gizle`}
                                  title="Bu adı hızlı seçim listesinden gizle"
                                  onClick={() => handleHideQuickExpense(label)}
                                  disabled={quickExpensePreferenceAction === label}
                                >
                                  {quickExpensePreferenceAction === label ? '…' : '×'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="quick-expense-empty">Henüz kaydedilmiş bir gider bulunmuyor.</span>
                  )}
                  <span style={{ display: 'block', marginTop: 4, color: 'var(--muted)', fontSize: 11 }}>
                    Seçim açıldığında kategori adları alfabetik görünür. İsme tıklayınca son kaydın alanları gelir; çarpı gerçek Muhasebe hareketini silmeden yalnızca listeden gizler.
                  </span>
                </FormField>
              )}
              <FormField label="Tarih">
                <input type="date" name="date" value={entryForm.date} onChange={handleEntryChange} required />
              </FormField>
              <FormField label="Tutar">
                <AmountInput id="accounting-entry-amount" name="amount" value={entryForm.amount} currency={entryForm.currency} onChange={handleEntryChange} placeholder="Örn. 170000 veya 170.000,00" required />
              </FormField>
              <FormField label="Para birimi">
                <select name="currency" value={entryForm.currency} onChange={handleEntryChange}>
                  {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              <FormField label={entryForm.type === 'transfer' ? 'Kaynak hesap' : 'Para hesabı'} style={{ minWidth: 210 }}>
                <select name="accountId" value={entryForm.accountId} onChange={handleEntryChange} required>
                  <option value="">Hesap seçin</option>
                  {currencyAccounts.map((account) => (
                    <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>
                  ))}
                </select>
              </FormField>
              {entryForm.type === 'transfer' && (
                <FormField label="Hedef hesap" style={{ minWidth: 210 }}>
                  <select name="counterAccountId" value={entryForm.counterAccountId} onChange={handleEntryChange} required>
                    <option value="">Hesap seçin</option>
                    {currencyAccounts.filter((account) => account.id !== entryForm.accountId).map((account) => (
                      <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>
                    ))}
                  </select>
                </FormField>
              )}
              {entryForm.type !== 'transfer' && (
                <FormField label="Kategori · sonraki kayıtlarda bu adla bulunur" style={{ minWidth: 280 }}>
                  <span className="accounting-category-hint">İlk kayıtta anlaşılır bir isim yazın; açıklama bu seçim adını değiştirmez.</span>
                  <select name="category" value={entryForm.category} onChange={handleEntryChange} required>
                    {entryCategoryOptions.map((category) => <option value={category} key={category}>{category}</option>)}
                    <option value={NEW_CATEGORY_VALUE}>+ Yeni kategori ekle</option>
                  </select>
                </FormField>
              )}
              {entryForm.type !== 'transfer' && entryForm.category === NEW_CATEGORY_VALUE && (
                <FormField label="Yeni kategori adı" style={{ minWidth: 220 }}>
                  <input name="customCategory" value={entryForm.customCategory} onChange={handleEntryChange} placeholder="Örn. Reklam gideri" required />
                </FormField>
              )}
              {entryForm.type !== 'transfer' && (
                <FormField label="Cari kart / muhatap" style={{ minWidth: 220 }}>
                  <select name="partyId" value={entryForm.partyId} onChange={handleEntryChange}>
                    <option value="">Cari kart seçmeden devam et</option>
                    {parties.filter((party) => party.currency === entryForm.currency || party.type === 'agent').map((party) => {
                      const typeLabel = ACCOUNTING_PARTY_TYPES.find((item) => item.value === party.type)?.label || (party.type === 'agent' ? 'Danışman' : party.type);
                      return <option value={party.id} key={party.id}>{party.name} · {typeLabel}</option>;
                    })}
                  </select>
                </FormField>
              )}
              <FormField label="Açıklama" style={{ minWidth: 220, flex: '1 1 220px' }}>
                <input name="description" value={entryForm.description} onChange={handleEntryChange} placeholder="İşlem açıklaması" />
              </FormField>
              {editingEntry && (
                <FormField label="Düzeltme nedeni" style={{ minWidth: 260, flex: '1 1 260px' }}>
                  <input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Örn. Tutar yanlış girildi" required />
                </FormField>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving || currencyAccounts.length === 0}>
                {saving ? 'Kaydediliyor…' : editingEntry ? 'Düzeltmeyi Kaydet' : 'Hareketi Kaydet'}
              </button>
              {editingEntry && <button type="button" className="btn btn-secondary" onClick={cancelCorrection} disabled={saving}>Düzeltmeden Çık</button>}
            </form>
            <SavedRecordNotice notice={entrySaveNotice} />
            {currencyAccounts.length === 0 && (
              <p style={{ color: 'var(--danger)', fontSize: 13, margin: '12px 0 0' }}>
                Bu para biriminde henüz hesap yok. Önce Hesaplar sekmesinden bir hesap oluşturun.
              </p>
            )}
          </div>

          <div className="folder-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Hareket listesi</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>{periodLabel(period)} · {currency}</p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{entries.length} kayıt</span>
            </div>
            {loading ? (
              <div className="empty-state">Yükleniyor…</div>
            ) : entries.length === 0 ? (
              <div className="empty-state">Bu dönem ve para biriminde henüz hareket yok.</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '7px 8px' }}>Tarih</th>
                      <th style={{ padding: '7px 8px' }}>Tür</th>
                      <th style={{ padding: '7px 8px' }}>Kategori</th>
                      <th style={{ padding: '7px 8px' }}>Hesap</th>
                      <th style={{ padding: '7px 8px' }}>Cari / açıklama</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Tutar</th>
                      <th style={{ padding: '7px 8px' }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                        <td style={{ padding: '9px 8px' }}>{formatDate(entry.date)}</td>
                        <td style={{ padding: '9px 8px' }}>{entryTypeLabel(entry.type)}</td>
                        <td style={{ padding: '9px 8px' }}>{entry.category}</td>
                        <td style={{ padding: '9px 8px' }}>
                          {entry.type === 'transfer' ? `${entry.accountName || '—'} → ${entry.counterAccountName || '—'}` : entry.accountName || '—'}
                        </td>
                        <td style={{ padding: '9px 8px' }}>{entry.partyName || entry.description || '—'}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: entry.type === 'expense' ? 'var(--danger)' : 'var(--success)' }}>
                          {formatAccountingMoney(entry.amount, entry.currency)}
                        </td>
                        <td style={{ padding: '9px 8px' }}>
                          {entry.sourceType === 'manual' && <button type="button" className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: 11 }} disabled={saving} onClick={() => handleStartCorrectEntry(entry)}>Düzelt</button>}
                          {['manual', 'manual_correction', 'accounting_recurring_expense'].includes(entry.sourceType) && <button type="button" className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: 11 }} disabled={saving} onClick={() => handleVoidEntry(entry)}>İptal Et</button>}
                          {!['manual', 'manual_correction', 'accounting_recurring_expense'].includes(entry.sourceType) && <span style={{ color: 'var(--muted)', fontSize: 11 }}>Komisyon/kira kaynağı</span>}
                          <button type="button" className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: 11, marginTop: 4 }} onClick={() => handleViewAudit(entry)}>Geçmiş</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {auditTarget && (
            <div className="folder-panel" style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Kayıt geçmişi</h3>
                  <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>{auditTarget.category} · {formatAccountingMoney(auditTarget.amount, auditTarget.currency)} · Değişiklikler silinmeden saklanır.</p>
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => { setAuditTarget(null); setAuditLogs([]); }}>Geçmişi Kapat</button>
              </div>
              {auditLoading ? <div className="empty-state">Kayıt geçmişi yükleniyor…</div> : auditLogs.length === 0 ? <div className="empty-state">Bu kayıt için henüz denetim geçmişi bulunmuyor.</div> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {auditLogs.map((log) => <div key={log.id} style={{ borderTop: '1px solid var(--paper-line)', padding: '9px 0', fontSize: 13 }}><strong>{log.action === 'create' ? 'Oluşturuldu' : log.action === 'void' ? 'İptal edildi' : log.action === 'correct' ? 'Düzeltildi' : log.action}</strong><span style={{ color: 'var(--muted)' }}> · {log.createdAt ? new Date(log.createdAt).toLocaleString('tr-TR') : '—'}{log.reason ? ` · ${log.reason}` : ''}</span></div>)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'accounts' && (
        <div className="folder-tabs" style={{ flexWrap: 'wrap', marginBottom: 18 }}>
          <button
            type="button"
            className={`folder-tab${accountSubTab === 'bank' ? ' active' : ''}`}
            onClick={() => setAccountSubTab('bank')}
          >
            Banka / Kasa
          </button>
          <button
            type="button"
            className={`folder-tab${accountSubTab === 'partners' ? ' active' : ''}`}
            onClick={() => setAccountSubTab('partners')}
          >
            Ortaklar
          </button>
        </div>
      )}

      {activeTab === 'accounts' && accountSubTab === 'bank' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 14px', fontSize: 18 }}>Yeni muhasebe hesabı</h3>
            <form onSubmit={handleCreateAccount} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FormField label="Hesap türü">
                <select name="type" value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}>
                  {ACCOUNTING_ACCOUNT_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              <FormField label="Hesap adı" style={{ minWidth: 190 }}>
                <input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} placeholder="Örn. Ana Banka Hesabı" required />
              </FormField>
              {accountForm.type !== 'cash' && (
                <FormField label="Banka adı">
                  <input value={accountForm.bankName} onChange={(event) => setAccountForm({ ...accountForm, bankName: event.target.value })} placeholder="Örn. İş Bankası" />
                </FormField>
              )}
              {accountForm.type !== 'cash' && (
                <FormField label="IBAN / kart bilgisi">
                  <input value={accountForm.iban} onChange={(event) => setAccountForm({ ...accountForm, iban: event.target.value })} placeholder="Opsiyonel" />
                </FormField>
              )}
              <FormField label="Para birimi">
                <select value={accountForm.currency} onChange={(event) => setAccountForm({ ...accountForm, currency: event.target.value })}>
                  {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              <FormField label="Açılış bakiyesi">
                <AmountInput id="accounting-account-opening-balance" value={accountForm.openingBalance} currency={accountForm.currency} onChange={(event) => setAccountForm({ ...accountForm, openingBalance: event.target.value })} placeholder="Örn. 170000 veya 170.000,00" />
              </FormField>
              <button type="submit" className="btn btn-primary" disabled={accountSaving}>
                {accountSaving ? 'Ekleniyor…' : '+ Hesap Ekle'}
              </button>
            </form>
            <SavedRecordNotice notice={accountSaveNotice} />
          </div>

          <div className="folder-panel">
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 14px', fontSize: 18 }}>Hesaplar ve bakiyeler</h3>
            {loading ? (
              <div className="empty-state">Yükleniyor…</div>
            ) : accounts.length === 0 ? (
              <div className="empty-state">Henüz muhasebe hesabı eklenmemiş.</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '7px 8px' }}>Hesap</th>
                      <th style={{ padding: '7px 8px' }}>Tür</th>
                      <th style={{ padding: '7px 8px' }}>Para birimi</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Güncel bakiye</th>
                      <th style={{ padding: '7px 8px' }}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} style={{ borderTop: '1px solid var(--paper-line)', opacity: account.isActive === false ? 0.55 : 1 }}>
                        <td style={{ padding: '9px 8px' }}>
                          <strong>{account.name}</strong>
                          {account.bankName && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{account.bankName}</div>}
                        </td>
                        <td style={{ padding: '9px 8px' }}>{ACCOUNTING_ACCOUNT_TYPES.find((item) => item.value === account.type)?.label || account.type}</td>
                        <td style={{ padding: '9px 8px' }}>{account.currency}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(account.currentBalance || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {formatAccountingMoney(account.currentBalance, account.currency)}
                        </td>
                        <td style={{ padding: '9px 8px' }}>
                          {account.isActive !== false && <><button type="button" className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: 11 }} disabled={masterSaving} onClick={() => handleEditAccount(account)}>Düzenle</button> <button type="button" className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: 11 }} disabled={masterSaving} onClick={() => handleArchiveAccount(account)}>Pasifleştir</button></>}
                          {account.isActive === false && <span style={{ color: 'var(--muted)', fontSize: 11 }}>Pasif</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'ledgers' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20, display: partyStatement ? 'none' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Yeni cari kart</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                  Ortak, müşteri, tedarikçi ve diğer muhatapları burada tanımlayın. Danışman kartları Danışman Yönetimi’nden otomatik gelir.
                </p>
              </div>
              <span style={{ color: 'var(--brass)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>Danışmanlar otomatik</span>
            </div>
            <form onSubmit={handleCreateParty} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FormField label="Kart türü">
                <select value={partyForm.type} onChange={(event) => setPartyForm({ ...partyForm, type: event.target.value })}>
                  {ACCOUNTING_PARTY_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              <FormField label="Ad / unvan" style={{ minWidth: 210 }}>
                <input value={partyForm.name} onChange={(event) => setPartyForm({ ...partyForm, name: event.target.value })} placeholder="Örn. ABC Elektrik" required />
              </FormField>
              <FormField label="Şirket adı" style={{ minWidth: 190 }}>
                <input value={partyForm.companyName} onChange={(event) => setPartyForm({ ...partyForm, companyName: event.target.value })} placeholder="Opsiyonel" />
              </FormField>
              <FormField label="Telefon">
                <input value={partyForm.phone} onChange={(event) => setPartyForm({ ...partyForm, phone: event.target.value })} placeholder="Opsiyonel" />
              </FormField>
              <FormField label="Para birimi">
                <select value={partyForm.currency} onChange={(event) => setPartyForm({ ...partyForm, currency: event.target.value })}>
                  {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              <FormField label="Açılış bakiyesi" style={{ minWidth: 150 }}>
                                  <AmountInput id="accounting-party-opening-balance" value={partyForm.openingBalance} currency={partyForm.currency} onChange={(event) => setPartyForm({ ...partyForm, openingBalance: event.target.value })} placeholder="Örn. 170000 veya 170.000,00" />

              </FormField>
              <FormField label="Açılış yönü">
                <select value={partyForm.openingBalanceDirection} onChange={(event) => setPartyForm({ ...partyForm, openingBalanceDirection: event.target.value })}>
                  <option value="receivable">Şirketten alacak</option>
                  <option value="payable">Şirkete borç</option>
                </select>
              </FormField>
              <button type="submit" className="btn btn-primary" disabled={partySaving || partyLoading}>
                {partySaving ? 'Kaydediliyor…' : 'Cari Kart Ekle'}
              </button>
            </form>
            <SavedRecordNotice notice={partySaveNotice} />
          </div>

          <div className="folder-panel" style={{ display: partyStatement ? 'none' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Cari kartlar ve bakiyeler</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>{currency} görünümü · Kira alacağı ve ödenecek danışman hakedişi dahil</p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{filteredParties.length} / {parties.length} kart · Sayfa {partyPage} / {partyPageCount}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
              <FormField label="Cari ara" style={{ minWidth: 250, flex: '1 1 250px' }}>
                <input value={partySearch} onChange={(event) => setPartySearch(event.target.value)} placeholder="Ad, şirket, telefon veya vergi no" />
              </FormField>
              <FormField label="Kart türü" style={{ minWidth: 170 }}>
                <select value={partyTypeFilter} onChange={(event) => setPartyTypeFilter(event.target.value)}>
                  <option value="all">Tüm kartlar</option>
                  {ACCOUNTING_PARTY_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              {(partySearch || partyTypeFilter !== 'all') && <button type="button" className="btn btn-secondary" onClick={() => { setPartySearch(''); setPartyTypeFilter('all'); }}>Filtreleri temizle</button>}
            </div>
            {partyLoading ? (
              <div className="empty-state">Cari kartlar yükleniyor…</div>
            ) : filteredParties.length === 0 ? (
              <div className="empty-state">{parties.length === 0 ? 'Henüz cari kart bulunmuyor.' : 'Arama veya filtreye uyan cari kart bulunamadı.'}</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                                              <th style={{ padding: '7px 8px' }}>Cari kart</th>
                        <th style={{ padding: '7px 8px' }}>Tür</th>
                        <th style={{ padding: '7px 8px' }}>Para birimi</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>Şirketten alacak</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>Şirkete borç</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>Net bakiye</th>
                        <th style={{ padding: '7px 8px' }}>Durum</th>
                        <th style={{ padding: '7px 8px' }}>Ekstre</th>
                        <th style={{ padding: '7px 8px' }}>İşlem</th>
                      </tr>
                    </thead>

                  <tbody>
                    {visibleParties.map((party) => {
                      const typeLabel = ACCOUNTING_PARTY_TYPES.find((item) => item.value === party.type)?.label || (party.type === 'agent' ? 'Danışman' : party.type);
                      const netBalance = Number(party.balance || 0);
                      return (
                        <tr key={party.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                          <td style={{ padding: '10px 8px' }}>
                            <strong>{party.name}</strong>
                            {party.companyName && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{party.companyName}</div>}
                          </td>
                          <td style={{ padding: '10px 8px' }}>{typeLabel}</td>
                          <td style={{ padding: '10px 8px' }}>{party.currency}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatAccountingMoney(party.receivable, party.currency)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{formatAccountingMoney(party.payable, party.currency)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(Math.abs(netBalance), party.currency)}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--muted)' }}>{netBalance > 0 ? 'Şirketten alacaklı' : netBalance < 0 ? 'Şirkete borçlu' : 'Dengede'}</td>
                          <td style={{ padding: '10px 8px' }}><button type="button" className="btn btn-secondary" onClick={() => handleViewPartyStatement(party)}>Ekstreyi Aç</button></td>
                          <td style={{ padding: '10px 8px' }}>
                            {party.linkedUserId ? <span style={{ color: 'var(--muted)', fontSize: 11 }}>Danışman kaydından yönetilir</span> : <><button type="button" className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: 11 }} disabled={masterSaving} onClick={() => handleEditParty(party)}>Düzenle</button> <button type="button" className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: 11 }} disabled={masterSaving} onClick={() => handleArchiveParty(party)}>Pasifleştir</button></>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!partyLoading && filteredParties.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--paper-line)' }}>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{(partyPage - 1) * PARTY_PAGE_SIZE + 1}–{Math.min(partyPage * PARTY_PAGE_SIZE, filteredParties.length)} / {filteredParties.length} gösteriliyor</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" disabled={partyPage <= 1} onClick={() => setPartyPage((page) => Math.max(1, page - 1))}>Önceki</button>
                  <button type="button" className="btn btn-secondary" disabled={partyPage >= partyPageCount} onClick={() => setPartyPage((page) => Math.min(partyPageCount, page + 1))}>Sonraki</button>
                </div>
              </div>
            )}
          </div>

          {partyStatement && (
            <div className="folder-panel" style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>{partyStatement.party?.name || 'Cari'} · Cari Ekstresi</h3>
                  <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                    {partyStatement.party?.currency || currency} · İptal edilen kayıtlar ekstreye dahil edilmez
                  </p>
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => setPartyStatement(null)}>Ekstreyi Kapat</button>
              </div>
              {partyStatementLoading ? (
                <div className="empty-state">Cari ekstre yükleniyor…</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
                    <div style={{ padding: 14, background: 'var(--paper-soft)', border: '1px solid var(--paper-line)' }}>
                      <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Şirketten alacak</div>
                      <strong style={{ display: 'block', marginTop: 6, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(statementReceivable, partyStatement.party?.currency || currency)}</strong>
                    </div>
                    <div style={{ padding: 14, background: 'var(--paper-soft)', border: '1px solid var(--paper-line)' }}>
                      <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Şirkete borç</div>
                      <strong style={{ display: 'block', marginTop: 6, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(statementPayable, partyStatement.party?.currency || currency)}</strong>
                    </div>
                    <div style={{ padding: 14, background: 'var(--paper-soft)', border: '1px solid var(--paper-line)' }}>
                      <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Net bakiye</div>
                      <strong style={{ display: 'block', marginTop: 6, color: statementBalance >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(Math.abs(statementBalance), partyStatement.party?.currency || currency)}</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{statementBalance > 0 ? 'Şirketten alacaklı' : statementBalance < 0 ? 'Şirkete borçlu' : 'Dengede'}</span>
                    </div>
                  </div>
                  {statementRows.length === 0 ? (
                    <div className="empty-state">Bu cari kartta henüz hareket bulunmuyor.</div>
                  ) : (
                    <div className="table-scroll">
                      <table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                            <th style={{ padding: '7px 8px' }}>Tarih</th>
                            <th style={{ padding: '7px 8px' }}>İşlem</th>
                            <th style={{ padding: '7px 8px' }}>Kategori</th>
                            <th style={{ padding: '7px 8px' }}>Hesap / açıklama</th>
                            <th style={{ padding: '7px 8px', textAlign: 'right' }}>Şirket alacağı</th>
                            <th style={{ padding: '7px 8px', textAlign: 'right' }}>Şirket borcu</th>
                            <th style={{ padding: '7px 8px', textAlign: 'right' }}>Kümülatif net</th>
                            <th style={{ padding: '7px 8px' }}>Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statementRows.map((entry) => (
                            <tr key={entry.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                              <td style={{ padding: '10px 8px' }}>{formatDate(entry.date)}</td>
                              <td style={{ padding: '10px 8px' }}>{statementTypeLabel(entry.type)}</td>
                              <td style={{ padding: '10px 8px' }}>{entry.category || '—'}</td>
                              <td style={{ padding: '10px 8px' }}>
                                {entry.accountName || entry.counterAccountName || '—'}
                                {entry.counterAccountName && entry.accountName && <span style={{ color: 'var(--muted)' }}> → {entry.counterAccountName}</span>}
                                {entry.description && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{entry.description}</div>}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{entry.receivableDelta > 0 ? formatAccountingMoney(entry.receivableDelta, entry.currency) : '—'}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{entry.payableDelta > 0 ? formatAccountingMoney(entry.payableDelta, entry.currency) : '—'}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: entry.runningBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(Math.abs(entry.runningBalance), entry.currency)}</td>
                              <td style={{ padding: '10px 8px', color: 'var(--muted)' }}>{entry.statusLabel || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
      {activeTab === 'commissions' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Yeni komisyon kapaması</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                  Brüt komisyonu kapama sırasında elle girin. Danışman payı, danışman kayıt ekranındaki güncel orandan alınır.
                </p>
              </div>
              <span style={{ color: 'var(--brass)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>Oran otomatik alınır</span>
            </div>
            <form onSubmit={handleCreateCommission} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FormField label="Danışman" style={{ minWidth: 210 }}>
                <select value={commissionForm.agentId} onChange={(event) => setCommissionForm({ ...commissionForm, agentId: event.target.value })} required>
                  <option value="">Danışman seçin</option>
                  {agents.map((agent) => (
                    <option value={agent.id} key={agent.id}>{agent.name} · %{agent.commissionSharePercentage ?? 'tanımsız'}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="İşlem tipi">
                <select value={commissionForm.transactionType} onChange={(event) => setCommissionForm({ ...commissionForm, transactionType: event.target.value })}>
                  <option value="sale">Satış</option>
                  <option value="rent">Kiralama</option>
                </select>
              </FormField>
              <FormField label="Kapama tarihi">
                <input type="date" value={commissionForm.date} onChange={(event) => setCommissionForm({ ...commissionForm, date: event.target.value })} required />
              </FormField>
              <FormField label="Brüt komisyon" style={{ minWidth: 170 }}>
                <AmountInput id="accounting-commission-gross-amount" value={commissionForm.grossAmount} currency={commissionForm.currency} onChange={(event) => setCommissionForm({ ...commissionForm, grossAmount: event.target.value })} placeholder="Örn. 170000 veya 170.000,00" required />
              </FormField>
              <FormField label="Para birimi">
                <select value={commissionForm.currency} onChange={(event) => setCommissionForm({ ...commissionForm, currency: event.target.value })}>
                  {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              <FormField label="Portföy / açıklama" style={{ minWidth: 220, flex: '1 1 220px' }}>
                <input value={commissionForm.propertyTitle} onChange={(event) => setCommissionForm({ ...commissionForm, propertyTitle: event.target.value })} placeholder="Opsiyonel" />
              </FormField>
              <button type="submit" className="btn btn-primary" disabled={commissionSaving || commissionLoading}>
                {commissionSaving ? 'Kaydediliyor…' : 'Komisyonu Kaydet'}
              </button>
            </form>
            <SavedRecordNotice notice={commissionSaveNotice} />
          </div>

          <div className="folder-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Komisyon ve hakediş listesi</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                  Önce şirkete tahsilat, ardından danışmana hakediş ödemesi kaydedilir.
                </p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{commissions.length} kayıt</span>
            </div>
            {commissionLoading ? (
              <div className="empty-state">Komisyonlar yükleniyor…</div>
            ) : commissions.length === 0 ? (
              <div className="empty-state">Henüz Muhasebe komisyonu oluşturulmamış.</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 1060, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '7px 8px' }}>Tarih</th>
                      <th style={{ padding: '7px 8px' }}>Danışman</th>
                      <th style={{ padding: '7px 8px' }}>Brüt komisyon</th>
                      <th style={{ padding: '7px 8px' }}>Oran</th>
                      <th style={{ padding: '7px 8px' }}>Danışman payı</th>
                      <th style={{ padding: '7px 8px' }}>Ofis payı</th>
                      <th style={{ padding: '7px 8px' }}>Durum / işlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((commission) => {
                      const matchingAccounts = accounts.filter((account) => account.currency === commission.currency && account.isActive !== false);
                      const isBusy = commissionActionId === commission.id;
                      const statusLabel = commission.status === 'pending_collection'
                        ? 'Tahsilat bekliyor'
                        : commission.status === 'collected'
                          ? 'Tahsil edildi · ödeme bekliyor'
                          : commission.status === 'voided'
                            ? 'İptal edildi'
                            : 'Danışmana ödendi';
                      return (
                        <tr key={commission.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                          <td style={{ padding: '10px 8px' }}>{formatDate(commission.date)}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <strong>{commission.agentNameSnapshot}</strong>
                            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{commission.propertyTitle || commission.transactionType}</div>
                          </td>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(commission.grossAmount, commission.currency)}</td>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>%{Number(commission.agentSharePercent).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{formatAccountingMoney(commission.agentGrossShare, commission.currency)}</td>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatAccountingMoney(commission.officeShare, commission.currency)}</td>
                          <td style={{ padding: '10px 8px', minWidth: 250 }}>
                            <div style={{ fontSize: 12, color: commission.status === 'agent_paid' ? 'var(--success)' : 'var(--muted)', marginBottom: 6 }}>{statusLabel}</div>
                            {commission.status !== 'agent_paid' && commission.status !== 'voided' && (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <select value={getSettlementAccount(commission.id)} onChange={(event) => setSettlementAccount(commission.id, event.target.value)} disabled={isBusy}>
                                  <option value="">Hesap seçin</option>
                                  {matchingAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}
                                </select>
                                {commission.status === 'pending_collection' && (
                                  <button type="button" className="btn btn-primary" style={{ padding: '6px 9px', fontSize: 12 }} disabled={isBusy || matchingAccounts.length === 0} onClick={() => handleCommissionAction(commission, 'collect')}>
                                    {isBusy ? '…' : 'Tahsil Et'}
                                  </button>
                                )}
                                {commission.status === 'collected' && (
                                  <button type="button" className="btn btn-primary" style={{ padding: '6px 9px', fontSize: 12 }} disabled={isBusy || matchingAccounts.length === 0} onClick={() => handleCommissionAction(commission, 'pay')}>
                                    {isBusy ? '…' : 'Danışmana Öde'}
                                  </button>
                                )}
                                {commission.status === 'pending_collection' && (
                                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 9px', fontSize: 12 }} disabled={isBusy} onClick={() => handleCommissionAction(commission, 'void')}>
                                    {isBusy ? '…' : 'İptal Et'}
                                  </button>
                                )}
                              </div>
                            )}
                            {matchingAccounts.length === 0 && commission.status !== 'agent_paid' && commission.status !== 'voided' && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 5 }}>Bu para biriminde hesap yok.</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {activeTab === 'dues' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Danışman kira tahakkukları</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                  Danışman kayıt ekranındaki aylık kira ve başlangıç tarihine göre bu dönemin tahakkuklarını oluşturun. Aynı dönem ikinci kez oluşturulmaz.
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={handleGenerateRents} disabled={rentGenerating || rentLoading || currency !== 'TRY'}>
                {rentGenerating ? 'Oluşturuluyor…' : `${periodLabel(period)} kiralarını oluştur`}
              </button>
            </div>
            {currency !== 'TRY' && (
              <div style={{ color: 'var(--muted)', background: 'var(--paper-raised)', border: '1px solid var(--paper-line)', borderRadius: 5, padding: '9px 11px', fontSize: 13 }}>
                Danışman kayıtlarındaki kira tutarı ilk sürümde TL olarak tutulur. Kira tahakkuklarını görmek için üstteki para birimi seçimini TL yapın.
              </div>
            )}
            {currency === 'TRY' && (
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                Başlangıç tarihi boş olan istisnai kayıtlar bu aydan itibaren başlar; başlangıç tarihi bulunan danışmanlar için önceki dönemler atlanır.
              </div>
            )}
          </div>

          <div className="folder-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Kira listesi</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>{periodLabel(period)} · {currency}</p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{rents.length} kayıt</span>
            </div>
            {rentLoading ? (
              <div className="empty-state">Kira kayıtları yükleniyor…</div>
            ) : rents.length === 0 ? (
              <div className="empty-state">Bu dönem için henüz kira tahakkuku yok. Üstteki düğmeyle oluşturabilirsiniz.</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '7px 8px' }}>Dönem</th>
                      <th style={{ padding: '7px 8px' }}>Danışman</th>
                      <th style={{ padding: '7px 8px' }}>Vade</th>
                      <th style={{ padding: '7px 8px' }}>Tutar</th>
                      <th style={{ padding: '7px 8px' }}>Durum / işlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rents.map((rent) => {
                      const matchingAccounts = accounts.filter((account) => account.currency === rent.currency && account.isActive !== false);
                      const isBusy = rentActionId === rent.id;
                      const statusLabel = rent.status === 'pending_collection'
                        ? 'Tahsilat bekliyor'
                        : rent.status === 'collected'
                          ? 'Tahsil edildi'
                          : 'İptal edildi';
                      return (
                        <tr key={rent.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                          <td style={{ padding: '10px 8px' }}>{periodLabel(rent.period)}</td>
                          <td style={{ padding: '10px 8px' }}><strong>{rent.agentNameSnapshot}</strong></td>
                          <td style={{ padding: '10px 8px' }}>{formatDate(rent.dueDate)}</td>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(rent.amount, rent.currency)}</td>
                          <td style={{ padding: '10px 8px', minWidth: 330 }}>
                            <div style={{ fontSize: 12, color: rent.status === 'collected' ? 'var(--success)' : rent.status === 'voided' ? 'var(--muted)' : 'var(--danger)', marginBottom: 6 }}>{statusLabel}</div>
                            {rent.status === 'pending_collection' && (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <select value={getSettlementAccount(rent.id)} onChange={(event) => setSettlementAccount(rent.id, event.target.value)} disabled={isBusy}>
                                  <option value="">Hesap seçin</option>
                                  {matchingAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}
                                </select>
                                <button type="button" className="btn btn-primary" style={{ padding: '6px 9px', fontSize: 12 }} disabled={isBusy || matchingAccounts.length === 0} onClick={() => handleRentAction(rent, 'collect')}>
                                  {isBusy ? '…' : 'Tahsil Et'}
                                </button>
                                <button type="button" className="btn btn-secondary" style={{ padding: '6px 9px', fontSize: 12 }} disabled={isBusy} onClick={() => handleRentAction(rent, 'void')}>
                                  {isBusy ? '…' : 'İptal Et'}
                                </button>
                              </div>
                            )}
                            {rent.status === 'pending_collection' && matchingAccounts.length === 0 && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 5 }}>Bu para biriminde hesap yok.</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {activeTab === 'accounts' && accountSubTab === 'partners' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Yeni ortak hareketi</h3>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                Ortak şirkete para verdiğinde giriş, şirket ortaktan para aldığında veya kâr dağıttığında çıkış hareketi oluşturun. Her hareket ortak cari kartına bağlanır.
              </p>
            </div>
            {parties.filter((party) => party.type === 'partner').length === 0 ? (
              <div style={{ color: 'var(--muted)', background: 'var(--paper-raised)', border: '1px solid var(--paper-line)', borderRadius: 5, padding: '10px 12px', fontSize: 13 }}>
                Önce Cari Kartlar sekmesinden kart türü “Ortak” olan bir cari kart oluşturun.
              </div>
            ) : (
              <>
                <form onSubmit={handleCreatePartnerMovement} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <FormField label="Ortak" style={{ minWidth: 210 }}>
                  <select value={partnerMovementForm.partyId} onChange={(event) => setPartnerMovementForm({ ...partnerMovementForm, partyId: event.target.value })} required>
                    <option value="">Ortak seçin</option>
                    {parties.filter((party) => party.type === 'partner').map((party) => <option value={party.id} key={party.id}>{party.name} · {party.currency}</option>)}
                  </select>
                </FormField>
                <FormField label="Hareket türü" style={{ minWidth: 240 }}>
                  <select value={partnerMovementForm.movementType} onChange={(event) => setPartnerMovementForm({ ...partnerMovementForm, movementType: event.target.value })}>
                    {PARTNER_MOVEMENT_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Tarih">
                  <input type="date" value={partnerMovementForm.date} onChange={(event) => setPartnerMovementForm({ ...partnerMovementForm, date: event.target.value })} required />
                </FormField>
                <FormField label="Tutar" style={{ minWidth: 150 }}>
                  <AmountInput id="accounting-partner-movement-amount" value={partnerMovementForm.amount} currency={partnerMovementForm.currency} onChange={(event) => { setPartnerSaveNotice(null); setPartnerMovementForm({ ...partnerMovementForm, amount: event.target.value }); }} placeholder="Örn. 170000 veya 170.000,00" required />
                </FormField>
                <FormField label="Para birimi">
                  <select value={partnerMovementForm.currency} onChange={(event) => setPartnerMovementForm({ ...partnerMovementForm, currency: event.target.value, accountId: '' })}>
                    {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Para hesabı" style={{ minWidth: 210 }}>
                  <select value={partnerMovementForm.accountId} onChange={(event) => setPartnerMovementForm({ ...partnerMovementForm, accountId: event.target.value })} required>
                    <option value="">Hesap seçin</option>
                    {accounts.filter((account) => account.currency === partnerMovementForm.currency && account.isActive !== false).map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}
                  </select>
                </FormField>
                <FormField label="Açıklama" style={{ minWidth: 220, flex: '1 1 220px' }}>
                  <input value={partnerMovementForm.description} onChange={(event) => setPartnerMovementForm({ ...partnerMovementForm, description: event.target.value })} placeholder="Opsiyonel" />
                </FormField>
                <button type="submit" className="btn btn-primary" disabled={partnerSaving}>
                  {partnerSaving ? 'Kaydediliyor…' : 'Ortak Hareketini Kaydet'}
                </button>
              </form>
                <SavedRecordNotice notice={partnerSaveNotice} />
              </>
            )}
          </div>

          <div className="folder-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Ortak cari bakiyeleri</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>Şirkete giren ortak parası borç, şirkete yapılan ortak ödemesi/çekişi bu borcu azaltır.</p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{parties.filter((party) => party.type === 'partner').length} ortak</span>
            </div>
            {parties.filter((party) => party.type === 'partner').length === 0 ? (
              <div className="empty-state">Henüz ortak cari kartı yok.</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '7px 8px' }}>Ortak</th>
                      <th style={{ padding: '7px 8px' }}>Para birimi</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Şirketten alacak</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Şirkete borç</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Net bakiye</th>
                      <th style={{ padding: '7px 8px' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parties.filter((party) => party.type === 'partner').map((party) => {
                      const netBalance = Number(party.balance || 0);
                      return (
                        <tr key={party.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                          <td style={{ padding: '10px 8px' }}><strong>{party.name}</strong>{party.companyName && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{party.companyName}</div>}</td>
                          <td style={{ padding: '10px 8px' }}>{party.currency}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatAccountingMoney(party.receivable, party.currency)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{formatAccountingMoney(party.payable, party.currency)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(Math.abs(netBalance), party.currency)}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--muted)' }}>{netBalance > 0 ? 'Şirketten alacaklı' : netBalance < 0 ? 'Şirkete borçlu' : 'Dengede'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {activeTab === 'reports' && (
        <>
          <div className="folder-panel accounting-report-filter" style={{ marginBottom: 20, borderLeft: '4px solid var(--brass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 19 }}>Sade Muhasebe Raporları</h3>
                <p style={{ color: 'var(--muted)', margin: '5px 0 0', fontSize: 13 }}>
                  Tarih aralığını seçin; gelir, gider, ortak hareketleri ve bunları oluşturan kayıtları aynı ekranda görün.
                </p>
              </div>
              <strong style={{ color: 'var(--ink-navy)', fontSize: 13 }}>{formatDate(reportFromDate)} – {formatDate(reportToDate)}</strong>
            </div>
            <div className="accounting-report-presets" aria-label="Hızlı tarih aralığı seçenekleri">
              {REPORT_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.value}
                  className={`btn btn-secondary${reportPreset === preset.value ? ' active' : ''}`}
                  onClick={() => handleReportPreset(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); loadManagementReport(); }} className="accounting-report-date-form">
              <FormField label="Başlangıç tarihi">
                <input type="date" value={reportFromDate} onChange={(event) => { setReportFromDate(event.target.value); setReportPreset('custom'); }} required />
              </FormField>
              <FormField label="Bitiş tarihi">
                <input type="date" value={reportToDate} onChange={(event) => { setReportToDate(event.target.value); setReportPreset('custom'); }} required />
              </FormField>
              <FormField label="Para birimi">
                <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              <button type="submit" className="btn btn-primary" disabled={managementReportLoading}>
                {managementReportLoading ? 'Rapor hazırlanıyor…' : 'Raporu Göster'}
              </button>
            </form>
            <p style={{ color: 'var(--muted)', fontSize: 12, margin: '12px 0 0' }}>
              Transferler gelir veya gider değildir. TRY, EUR ve USD raporları kur çevrimi yapılmadan ayrı gösterilir.
            </p>
          </div>

          {managementReportLoading ? (
            <div className="folder-panel"><div className="empty-state">Yönetimsel rapor hazırlanıyor…</div></div>
          ) : !managementReport ? (
            <div className="folder-panel"><div className="empty-state">Rapor verisi bulunamadı.</div></div>
          ) : (
            <>
              <div className="metric-grid accounting-report-metrics">
                <div className="metric-card">
                  <div className="metric-card__label">Dönem başı bakiye</div>
                  <div className="metric-card__value">{formatAccountingMoney((managementReport.accountBalances || []).reduce((sum, account) => sum + Number(account.openingBalance || 0), 0), currency)}</div>
                  <div className="metric-card__delta is-muted">Seçilen para birimindeki hesaplar</div>
                </div>
                <button type="button" className="metric-card metric-card--clickable" onClick={() => handleReportDrilldown('income')}>
                  <div className="metric-card__label">Toplam gelir</div>
                  <div className="metric-card__value" style={{ color: 'var(--success)' }}>{formatAccountingMoney(managementReport.summary?.totalIncome, currency)}</div>
                  <div className="metric-card__delta is-muted">Detayları görmek için tıklayın</div>
                </button>
                <button type="button" className="metric-card metric-card--clickable" onClick={() => handleReportDrilldown('expense')}>
                  <div className="metric-card__label">Toplam gider</div>
                  <div className="metric-card__value" style={{ color: 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.totalExpense, currency)}</div>
                  <div className="metric-card__delta is-muted">Detayları görmek için tıklayın</div>
                </button>
                <button type="button" className="metric-card metric-card--clickable" onClick={() => handleReportDrilldown('operation')}>
                  <div className="metric-card__label">Gelir − gider</div>
                  <div className="metric-card__value" style={{ color: Number(managementReport.summary?.netOperatingResult || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.netOperatingResult, currency)}</div>
                  <div className="metric-card__delta is-muted">{managementReport.summary?.operatingEntryCount || 0} gelir/gider hareketi</div>
                </button>
                <button type="button" className="metric-card metric-card--clickable" onClick={() => handleReportDrilldown('partner')}>
                  <div className="metric-card__label">Ortak para hareketi (net)</div>
                  <div className="metric-card__value" style={{ color: Number(managementReport.summary?.netPartnerFinancing || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.netPartnerFinancing, currency)}</div>
                  <div className="metric-card__delta is-muted">Giriş {formatAccountingMoney(managementReport.summary?.partnerInflow, currency)} · çıkış {formatAccountingMoney(managementReport.summary?.partnerOutflow, currency)}</div>
                </button>
                <button type="button" className="metric-card metric-card--clickable" onClick={() => handleReportDrilldown('cash')}>
                  <div className="metric-card__label">Net nakit hareketi</div>
                  <div className="metric-card__value" style={{ color: Number(managementReport.summary?.netCashMovement || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.netCashMovement, currency)}</div>
                  <div className="metric-card__delta is-muted">Gelir, gider ve ortak hareketleri</div>
                </button>
              </div>

              <div ref={reportDetailRef} className="folder-panel accounting-report-detail" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Giriş ve çıkış detayları</h3>
                    <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>Toplam rakamların hangi kayıtlardan oluştuğunu burada görebilir, manuel kaydı düzeltebilir veya iptal edebilirsiniz.</p>
                  </div>
                  <strong style={{ color: 'var(--ink-navy)', fontSize: 13 }}>{filteredReportMovements.length} kayıt</strong>
                </div>
                <div className="accounting-report-detail-filters">
                  <FormField label="Ara" style={{ minWidth: 220 }}>
                    <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Kategori, açıklama, hesap veya cari ara" />
                  </FormField>
                  <FormField label="Hareket">
                    <select value={reportMovementFilter} onChange={(event) => setReportMovementFilter(event.target.value)}>
                      {REPORT_MOVEMENT_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Hesap">
                    <select value={reportAccountFilter} onChange={(event) => setReportAccountFilter(event.target.value)}>
                      <option value="all">Tüm hesaplar</option>
                      {(managementReport.accountBalances || []).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Kategori">
                    <select value={reportCategoryFilter} onChange={(event) => setReportCategoryFilter(event.target.value)}>
                      <option value="all">Tüm kategoriler</option>
                      {reportCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </FormField>
                  <button type="button" className="btn btn-secondary" onClick={() => { setReportSearch(''); setReportMovementFilter('all'); setReportAccountFilter('all'); setReportCategoryFilter('all'); }}>Temizle</button>
                </div>
                {visibleReportMovements.length === 0 ? (
                  <div className="empty-state">Seçilen tarih ve filtrelerde hareket bulunamadı.</div>
                ) : (
                  <div className="table-scroll">
                    <table className="accounting-report-table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Tür</th>
                          <th>Kategori / Açıklama</th>
                          <th>Hesap / Cari</th>
                          <th>Kaynak</th>
                          <th style={{ textAlign: 'right' }}>Tutar</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleReportMovements.map((entry) => {
                          const classification = entry.classification || entry.type;
                          const isInflow = ['income', 'partner_in'].includes(classification);
                          const accountText = entry.type === 'transfer'
                            ? `${entry.accountName || '—'} → ${entry.counterAccountName || '—'}`
                            : entry.accountName || '—';
                          return (
                            <tr key={entry.id}>
                              <td>{formatDate(entry.date)}</td>
                              <td><strong>{reportMovementLabel(classification)}</strong></td>
                              <td><strong>{entry.category || 'Kategorisiz'}</strong><div className="accounting-report-subtext">{entry.description || 'Açıklama yok'}</div></td>
                              <td><strong>{accountText}</strong><div className="accounting-report-subtext">{entry.partyName || 'Cari yok'}</div></td>
                              <td>{reportSourceLabel(entry.sourceType)}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: isInflow ? 'var(--success)' : classification === 'transfer' ? 'var(--ink-navy)' : 'var(--danger)' }}>
                                {isInflow ? '+' : classification === 'transfer' ? '' : '-'}{formatAccountingMoney(entry.amount, entry.currency)}
                              </td>
                              <td>
                                <div className="accounting-report-actions">
                                  {entry.sourceType === 'manual' && <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => handleStartCorrectEntry(entry)}>Düzelt</button>}
                                  {['manual', 'manual_correction', 'accounting_recurring_expense'].includes(entry.sourceType) && <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => handleVoidEntry(entry)}>İptal</button>}
                                  <button type="button" className="btn btn-secondary" onClick={() => handleViewAudit(entry)}>Geçmiş</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {reportPageCount > 1 && (
                  <div className="accounting-report-pagination">
                    <button type="button" className="btn btn-secondary" disabled={reportPage <= 1} onClick={() => setReportPage((page) => Math.max(1, page - 1))}>Önceki</button>
                    <span>Sayfa {reportPage} / {reportPageCount}</span>
                    <button type="button" className="btn btn-secondary" disabled={reportPage >= reportPageCount} onClick={() => setReportPage((page) => Math.min(reportPageCount, page + 1))}>Sonraki</button>
                  </div>
                )}
              </div>

              <div className="folder-panel" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Hesap bazında dönem özeti</h3>
                    <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>Dönem başı, tüm nakit giriş-çıkışları ve dönem sonu bakiyesini hesap bazında gösterir. Ortak finansmanı bu tabloda banka hareketi olduğu için dahildir; operasyon sonucunda hariçtir.</p>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{managementReport.accountBalances?.length || 0} hesap</span>
                </div>
                {managementReport.accountBalances?.length === 0 ? (
                  <div className="empty-state">Bu para biriminde aktif hesap bulunmuyor.</div>
                ) : (
                  <div className="table-scroll">
                    <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                          <th style={{ padding: '7px 8px' }}>Hesap</th>
                          <th style={{ padding: '7px 8px' }}>Tür</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Dönem başı</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Hesap girişi</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Hesap çıkışı</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Transfer neti</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Dönem sonu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managementReport.accountBalances.map((account) => (
                          <tr key={account.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                            <td style={{ padding: '10px 8px' }}><strong>{account.name}</strong><div style={{ color: 'var(--muted)', fontSize: 12 }}>{account.currency}</div></td>
                            <td style={{ padding: '10px 8px' }}>{ACCOUNTING_ACCOUNT_TYPES.find((item) => item.value === account.type)?.label || account.type}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(account.openingBalance, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatAccountingMoney(account.income, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{formatAccountingMoney(account.expense, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(Number(account.transferIn || 0) - Number(account.transferOut || 0), currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(account.closingBalance || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(account.closingBalance, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="folder-panel" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Günlük nakit akışı</h3>
                    <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>Yalnız hareket olan günler gösterilir; operasyon, ortak finansmanı ve hesaplar arası transferler ayrı izlenir.</p>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{managementReport.dailyCashFlow?.length || 0} gün</span>
                </div>
                {managementReport.dailyCashFlow?.length === 0 ? (
                  <div className="empty-state">Seçilen dönemde hareket bulunmuyor.</div>
                ) : (
                  <div className="table-scroll">
                    <table style={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                          <th style={{ padding: '7px 8px' }}>Tarih</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Giriş</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Çıkış</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Net operasyon</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Ortak girişi</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Ortak çıkışı</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Net nakit</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Transfer girişi</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right' }}>Transfer çıkışı</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managementReport.dailyCashFlow.map((day) => (
                          <tr key={day.date} style={{ borderTop: '1px solid var(--paper-line)' }}>
                            <td style={{ padding: '10px 8px' }}>{formatDate(day.date)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatAccountingMoney(day.income, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{formatAccountingMoney(day.expense, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(day.netOperating || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(day.netOperating, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatAccountingMoney(day.partnerIn, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{formatAccountingMoney(day.partnerOut, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(day.netCashMovement || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(day.netCashMovement, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(day.transferIn, currency)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(day.transferOut, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="panel-grid-2" style={{ marginTop: 20 }}>
                <div className="folder-panel">
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 12px', fontSize: 18 }}>Gelir kategorileri</h3>
                  {managementReport.incomeByCategory?.length === 0 ? <div className="empty-state">Gelir hareketi yok.</div> : (
                    <div className="table-scroll">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>{managementReport.incomeByCategory.map((row) => <tr key={row.category} style={{ borderTop: '1px solid var(--paper-line)' }}><td style={{ padding: '9px 8px' }}>{row.category}</td><td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatAccountingMoney(row.amount, currency)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="folder-panel">
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 12px', fontSize: 18 }}>Gider kategorileri</h3>
                  {managementReport.expenseByCategory?.length === 0 ? <div className="empty-state">Gider hareketi yok.</div> : (
                    <div className="table-scroll">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>{managementReport.expenseByCategory.map((row) => <tr key={row.category} style={{ borderTop: '1px solid var(--paper-line)' }}><td style={{ padding: '9px 8px' }}>{row.category}</td><td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{formatAccountingMoney(row.amount, currency)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="folder-panel" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Bekleyen cari yükümlülükler</h3>
                    <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>Henüz gerçekleşmiş para hareketi olmayan, takipteki kira ve danışman hakedişleri.</p>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{managementReport.pending?.commissionCount || 0} komisyon takibi</span>
                </div>
                <div className="metric-grid">
                  <div className="metric-card"><div className="metric-card__label">Bekleyen kira alacağı</div><div className="metric-card__value" style={{ color: 'var(--success)' }}>{formatAccountingMoney(managementReport.pending?.rentReceivable, currency)}</div><div className="metric-card__delta is-muted">{managementReport.pending?.rentCount || 0} kira tahakkuku</div></div>
                  <div className="metric-card"><div className="metric-card__label">Komisyon tahsilatı bekleyen</div><div className="metric-card__value" style={{ color: 'var(--success)' }}>{formatAccountingMoney(managementReport.pending?.commissionCollection, currency)}</div><div className="metric-card__delta is-muted">{managementReport.pending?.commissionCollectionCount || 0} komisyon · brüt tutar</div></div>
                  <div className="metric-card"><div className="metric-card__label">Danışman hakedişi bekleyen</div><div className="metric-card__value" style={{ color: 'var(--danger)' }}>{formatAccountingMoney(managementReport.pending?.commissionPayable, currency)}</div><div className="metric-card__delta is-muted">{managementReport.pending?.commissionPayableCount || 0} hakediş · ödeme bekliyor</div></div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'migration' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20, borderLeft: '4px solid var(--brass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 19 }}>Finans Aktarım Önizlemesi</h3>
                <p style={{ color: 'var(--muted)', margin: '5px 0 0', fontSize: 13 }}>
                  Eski Finans kayıtlarını yeni Muhasebe’ye taşımadan önce kaynak verileri, toplamları ve olası eşleşme sorunlarını gösterir.
                </p>
              </div>
              <span style={{ color: 'var(--brass)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>Salt okunur</span>
            </div>
            <div style={{ background: '#fdf3e0', border: '1px solid #e8c477', borderRadius: 6, padding: '10px 12px', color: '#6b4a1c', fontSize: 13, marginBottom: 14 }}>
              Bu ekran yalnızca sayım ve karşılaştırma yapar. Eski Finans kayıtlarını silmez, yeni Muhasebe kaydı oluşturmaz ve mevcut bakiyeleri değiştirmez.
            </div>
            <button type="button" className="btn btn-primary" onClick={loadMigrationPreview} disabled={migrationLoading}>
              {migrationLoading ? 'Önizleme hazırlanıyor…' : migrationPreview ? 'Önizlemeyi Yenile' : 'Aktarım Önizlemesini Getir'}
            </button>
            {migrationPreview?.generatedAt && <span style={{ marginLeft: 10, color: 'var(--muted)', fontSize: 12 }}>Son okuma: {formatDate(migrationPreview.generatedAt.slice(0, 10))}</span>}
          </div>

          {migrationLoading ? (
            <div className="folder-panel"><div className="empty-state">Eski Finans tabloları okunuyor…</div></div>
          ) : !migrationPreview ? (
            <div className="folder-panel"><div className="empty-state">Önizlemeyi başlatmak için yukarıdaki düğmeye basın.</div></div>
          ) : (
            <>
              <div className="metric-grid">
                <div className="metric-card"><div className="metric-card__label">Eski hesap</div><div className="metric-card__value">{migrationPreview.sourceCounts?.bankAccounts || 0}</div><div className="metric-card__delta is-muted">Banka / kasa / kredi kartı</div></div>
                <div className="metric-card"><div className="metric-card__label">Eski para hareketi</div><div className="metric-card__value">{migrationPreview.sourceCounts?.bankTransactions || 0}</div><div className="metric-card__delta is-muted">Hesap giriş / çıkışları</div></div>
                <div className="metric-card"><div className="metric-card__label">Eski gider</div><div className="metric-card__value">{migrationPreview.sourceCounts?.expenses || 0}</div><div className="metric-card__delta is-muted">Gider kayıtları</div></div>
                <div className="metric-card"><div className="metric-card__label">Eski komisyon</div><div className="metric-card__value">{migrationPreview.sourceCounts?.commissions || 0}</div><div className="metric-card__delta is-muted">Tahakkuk kayıtları</div></div>
              </div>

              <div className="folder-panel" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Para hareketi toplamları</h3>
                    <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>Eski Finans hesaplarının kendi para birimlerine göre; kur çevrimi yapılmadan.</p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}><th style={{ padding: '7px 8px' }}>Para birimi</th><th style={{ padding: '7px 8px', textAlign: 'right' }}>Giriş</th><th style={{ padding: '7px 8px', textAlign: 'right' }}>Çıkış</th><th style={{ padding: '7px 8px', textAlign: 'right' }}>Hareket</th></tr></thead>
                    <tbody>{ACCOUNTING_CURRENCIES.map((item) => { const total = migrationPreview.totalsByCurrency?.[item.value] || {}; return <tr key={item.value} style={{ borderTop: '1px solid var(--paper-line)' }}><td style={{ padding: '9px 8px' }}><strong>{item.label}</strong></td><td style={{ padding: '9px 8px', textAlign: 'right', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(total.income, item.value)}</td><td style={{ padding: '9px 8px', textAlign: 'right', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(total.expense, item.value)}</td><td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{total.transactionCount || 0}</td></tr>; })}</tbody>
                  </table>
                </div>
              </div>

              <div className="panel-grid-2" style={{ marginTop: 20 }}>
                <div className="folder-panel">
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 12px', fontSize: 18 }}>Kaynak kayıt sayıları</h3>
                  <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                    {[
                      ['Eski gider kategorileri', migrationPreview.sourceCounts?.expenseCategories],
                      ['Tekrarlayan gider şablonları', migrationPreview.sourceCounts?.recurringExpenseTemplates],
                      ['Komisyon ödemeleri', migrationPreview.sourceCounts?.commissionPayments],
                      ['Danışman aidatları', migrationPreview.sourceCounts?.agentDues],
                      ['Ortak kartları', migrationPreview.sourceCounts?.partners],
                      ['Ortak cari hareketleri', migrationPreview.sourceCounts?.partnerLedgerEntries],
                      ['Danışman cari düzeltmeleri', migrationPreview.sourceCounts?.agentLedgerAdjustments],
                      ['Çek / senet kayıtları', migrationPreview.sourceCounts?.chequeNotes],
                    ].map(([label, count]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--paper-line)', paddingBottom: 6 }}><span>{label}</span><strong>{count || 0}</strong></div>)}
                  </div>
                </div>
                <div className="folder-panel">
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 12px', fontSize: 18 }}>Aktarım kalite kontrolü</h3>
                  <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>Hesapsız banka hareketi</span><strong style={{ color: migrationPreview.qualityChecks?.transactionsWithoutAccount ? 'var(--danger)' : 'var(--success)' }}>{migrationPreview.qualityChecks?.transactionsWithoutAccount || 0}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>Ödeme hesabı olmayan gider</span><strong style={{ color: migrationPreview.qualityChecks?.expensesWithoutBankAccount ? 'var(--danger)' : 'var(--success)' }}>{migrationPreview.qualityChecks?.expensesWithoutBankAccount || 0}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>Kategorisi eşleşmeyen gider</span><strong style={{ color: migrationPreview.qualityChecks?.orphanedExpenseCategories ? 'var(--danger)' : 'var(--success)' }}>{migrationPreview.qualityChecks?.orphanedExpenseCategories || 0}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>Ödenmiş / ödenmemiş aidat</span><strong>{migrationPreview.qualityChecks?.duesPaid || 0} / {migrationPreview.qualityChecks?.duesUnpaid || 0}</strong></div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Komisyon durumları: {Object.entries(migrationPreview.qualityChecks?.commissionStatusCounts || {}).map(([status, count]) => `${status}: ${count}`).join(' · ') || 'kayıt yok'}</div>
                  </div>
                </div>
              </div>

              <div className="folder-panel" style={{ marginTop: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 12px', fontSize: 18 }}>Aktarım eşleştirme özeti</h3>
                <div className="panel-grid-2" style={{ marginBottom: 0 }}>
                  {Object.entries(migrationPreview.mapping || {}).map(([source, target]) => <div key={source} style={{ border: '1px solid var(--paper-line)', borderRadius: 6, padding: 10, background: 'var(--paper)' }}><div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>{source}</div><div style={{ fontSize: 13 }}>{target}</div></div>)}
                </div>
                {migrationPreview.warnings?.length > 0 && <div style={{ marginTop: 14, background: '#fbe0dc', border: '1px solid #d38b7c', borderRadius: 6, padding: '10px 12px', color: 'var(--danger)', fontSize: 13 }}><strong>Aktarım öncesi dikkat edilmesi gerekenler:</strong><ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{migrationPreview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
                {migrationPreview.warnings?.length === 0 && <div style={{ marginTop: 14, background: '#e6f4ea', border: '1px solid #9bc4a5', borderRadius: 6, padding: '10px 12px', color: 'var(--success)', fontSize: 13 }}>Önizleme sırasında aktarımı engelleyen bir eşleşme uyarısı bulunmadı.</div>}
              </div>
            </>
          )}

          <div className="folder-panel" style={{ marginTop: 24, border: '1px solid #d38b7c', background: '#fffaf8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 19 }}>Muhasebe Temiz Başlangıç</h3>
                <p style={{ color: 'var(--muted)', margin: '5px 0 0', fontSize: 13 }}>
                  Excel ile gerçek veri girişinden önce yalnızca yeni Muhasebe deneme kayıtlarını güvenli biçimde temizler.
                </p>
              </div>
              <span style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>Destructive · Broker</span>
            </div>
            <div style={{ background: '#fbe0dc', border: '1px solid #d38b7c', borderRadius: 6, padding: '10px 12px', color: 'var(--danger)', fontSize: 13, marginBottom: 14 }}>
              Bu işlem geri alınamaz; ancak silme işleminden hemen önce tüm hedef Muhasebe kayıtlarının geri yüklenebilir JSON snapshot yedeği saklanır. Eski Finans ve CRM verileri bu işleme dahil değildir.
            </div>
            <button type="button" className="btn btn-secondary" onClick={loadResetPreview} disabled={resetLoading || resetting}>
              {resetLoading ? 'Sıfırlama sayımı hazırlanıyor…' : resetPreview ? 'Sıfırlama sayımını yenile' : 'Sıfırlama önizlemesini getir'}
            </button>

            {resetPreview && (
              <>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                  {Object.entries(resetPreview.counts || {}).map(([key, count]) => (
                    <div key={key} style={{ border: '1px solid var(--paper-line)', borderRadius: 6, padding: '10px 12px', background: 'var(--paper)' }}>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{RESET_COUNT_LABELS[key] || key}</div>
                      <strong style={{ display: 'block', marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 20 }}>{count}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, background: '#e6f4ea', border: '1px solid #9bc4a5', borderRadius: 6, padding: '10px 12px', color: '#245c32', fontSize: 13 }}>
                  <strong>Korunan kapsam:</strong> {(resetPreview.protectedData || []).join(' · ')}
                </div>
                <div style={{ marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>{resetPreview.message}</div>

                {resetPreview.canReset ? (
                  <form onSubmit={handleResetDemo} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                    <div className="form-field full" style={{ margin: 0 }}>
                      <label htmlFor="accounting-reset-reason">İşlem gerekçesi</label>
                      <textarea id="accounting-reset-reason" rows={3} value={resetReason} onChange={(event) => setResetReason(event.target.value)} placeholder="Örn. Excel ile gerçek veri girişinden önce deneme kayıtlarını temizleme" required />
                    </div>
                    <div className="form-field full" style={{ margin: 0 }}>
                      <label htmlFor="accounting-reset-confirmation">Güvenlik onayı</label>
                      <input id="accounting-reset-confirmation" value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder="MUHASEBE DENEME KAYITLARINI SIFIRLA" autoComplete="off" required />
                    </div>
                    <div>
                      <button type="submit" className="btn btn-danger" disabled={resetting || resetConfirmation !== 'MUHASEBE DENEME KAYITLARINI SIFIRLA' || resetReason.trim().length < 10}>
                        {resetting ? 'Sıfırlanıyor…' : 'Yeni Muhasebe deneme kayıtlarını sıfırla'}
                      </button>
                      <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>Devam etmeden önce sayımdaki kayıtların deneme verisi olduğunu kontrol edin.</div>
                    </div>
                  </form>
                ) : (
                  <div style={{ marginTop: 14, background: '#e6f4ea', border: '1px solid #9bc4a5', borderRadius: 6, padding: '10px 12px', color: '#245c32', fontSize: 13 }}>
                    Sıfırlama kilidi mevcut. İşlem kaydı ve geri yüklenebilir snapshot yedeği korunuyor.
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
