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
// Rapor Türü seçenekleri: her biri, aynı yönetimsel rapor verisinin (movements)
// farklı bir alt kümesini gösterir. Yeni bir backend endpoint'i gerekmez.
const REPORT_TYPES = [
  { value: 'summary', label: 'Genel Özet', description: 'Seçilen dönemdeki tüm gelir, gider ve ortak hareketlerini tek listede gösterir.' },
  { value: 'commission', label: 'Komisyon Gelirleri', description: 'Satış ve kiralama işlemlerinden elde edilen komisyon tahsilatları.' },
  { value: 'dues', label: 'Danışman Aidat / Masa Kirası', description: 'Danışmanlardan tahsil edilen aidat ve masa kirası gelirleri.' },
  { value: 'other_income', label: 'Diğer Gelirler', description: 'Manuel olarak kaydedilen diğer gelir kaynakları (ek hizmet ücretleri, faiz vb.).' },
  { value: 'expenses', label: 'Ofis Masraf ve Giderleri', description: 'Kira, fatura, pazarlama gibi şirket giderleri, kategoriye göre gruplanmış.' },
  { value: 'partners', label: 'Ortak Cari Hareketleri', description: 'Ortakların şirkete koyduğu sermaye/borç ile şirketten çektiği tutarlar.' },
];
// Bu kategori adları, backend'de komisyon/aidat tahsilatı yapıldığında
// otomatik olarak yazılan sabit kategori adlarıyla birebir eşleşir
// (bkz. accounting.service.ts: 'Komisyon Tahsilatı', 'Danışman Kirası Tahsilatı').
const COMMISSION_INCOME_CATEGORIES = new Set(['Komisyon Tahsilatı']);
const DUES_INCOME_CATEGORIES = new Set(['Danışman Kirası Tahsilatı']);
const OTHER_INCOME_CATEGORIES = new Set(['Diğer Gelir']);
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
  { value: 'loan_out', label: 'Ortağa borç geri ödemesi', type: 'expense', category: 'Ortağa Borç Geri Ödemesi' },
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

// "2026-08" gibi bir ay anahtarini "Ağustos 2026" olarak okunabilir hale getirir.
function formatMonthLabel(monthKey) {
  if (!monthKey) return '—';
  const [year, month] = monthKey.split('-');
  return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1));
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

// "Yazarak ara" özellikli basit bir seçim kutusu. Danışman/ortak/kategori
// listeleri uzun olabileceği için düz <select> yerine kullanılır.
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

// Yazarken canli binlik nokta bicimlendirmesi (örn. "1200000" -> "1.200.000").
// Sadece rakam ve tek bir virgülü (ondalik ayraci) kabul eder; her yeni
// tuşta tam sayi kismi 3'erli gruplanip yeniden noktalanir.
function formatAmountKeystroke(raw) {
  const str = String(raw ?? '');
  const isNegative = str.trimStart().startsWith('-');
  let digitsAndComma = str.replace(/[^0-9,]/g, '');
  const firstComma = digitsAndComma.indexOf(',');
  if (firstComma !== -1) {
    digitsAndComma = digitsAndComma.slice(0, firstComma + 1) + digitsAndComma.slice(firstComma + 1).replace(/,/g, '');
  }
  const [intPartRaw = '', decimalPart] = digitsAndComma.split(',');
  const grouped = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = isNegative ? '-' : '';
  if (decimalPart === undefined) return `${sign}${grouped}`;
  return `${sign}${grouped},${decimalPart.slice(0, 2)}`;
}

// Backend'den gelen ham sayisal bir tutari (örn. 1200000 veya 170000.5),
// forma ilk yuklendigi anda ayni binlik noktali gorunume cevirir --
// aksi halde bir kaydi duzeltirken tutar alani noktasiz gorunurdu.
function formatAmountFromNumber(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '';
  const value = Number(num);
  const isNegative = value < 0;
  const [intPart, decPart] = Math.abs(value).toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-' : ''}${grouped}${decPart === '00' ? '' : `,${decPart}`}`;
}

function AmountInput({ value, currency: _currency, onChange, id, ...props }) {
  function handleChange(event) {
    const input = event.target;
    const oldValue = input.value;
    const oldCursor = input.selectionStart ?? oldValue.length;
    const digitsBeforeCursor = oldValue.slice(0, oldCursor).replace(/[^0-9]/g, '').length;
    const formatted = formatAmountKeystroke(oldValue);
    input.value = formatted;
    let newCursor = formatted.length;
    if (digitsBeforeCursor === 0) {
      newCursor = 0;
    } else {
      let seen = 0;
      for (let i = 0; i < formatted.length; i += 1) {
        if (/[0-9]/.test(formatted[i])) {
          seen += 1;
          if (seen === digitsBeforeCursor) {
            newCursor = i + 1;
            break;
          }
        }
      }
    }
    input.setSelectionRange(newCursor, newCursor);
    onChange(event);
  }

  return (
    <input
      {...props}
      id={id}
      type="text"
      inputMode="decimal"
      value={value ?? ''}
      onChange={handleChange}
    />
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
  const [reportType, setReportType] = useState('summary'); // summary | commission | dues | expenses | partners
  const [reportSubFilter, setReportSubFilter] = useState('ALL'); // 'ALL' | danışman/kategori/ortak id'si
  // "Getir"e basılana kadar ekranda görünen sonucu değiştirmemek için, seçim
  // kutularındaki (taslak) değerlerden ayrı bir "uygulanmış" durum tutuyoruz.
  const [appliedReportType, setAppliedReportType] = useState('summary');
  const [appliedReportSubFilter, setAppliedReportSubFilter] = useState('ALL');
  const [openReportBox, setOpenReportBox] = useState(null); // 'type' | 'scope' | 'date' | null — 3 butonun hangisi açık
  const [reportScopeQuery, setReportScopeQuery] = useState(''); // 2. buton içindeki arama kutusu
  const reportBoxRef = useRef(null);
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
    loadAgents(); // Komisyon/Aidat raporlarının 2. kutusu (danışman listesi) için gerekli
    return undefined;
  }, [activeTab, loadManagementReport, loadAgents]);

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
  // 2. kutu (dinamik alt seçim), rapor türüne göre farklı gerçek veri
  // kaynağından beslenir — hiçbiri uydurma/sabit isim değildir.
  const reportSubFilterOptions = useMemo(() => {
    if (reportType === 'expenses') {
      return categoryNames(EXPENSE_CATEGORIES, customCategories.expense).map((name) => ({ value: name, label: name }));
    }
    if (reportType === 'commission' || reportType === 'dues') {
      return agents
        .slice()
        .sort((left, right) => (left.name || '').localeCompare(right.name || '', 'tr-TR', { sensitivity: 'base' }))
        .map((agent) => ({ value: agent.id, label: agent.name }));
    }
    if (reportType === 'partners') {
      return parties
        .filter((party) => party.type === 'partner')
        .slice()
        .sort((left, right) => (left.name || '').localeCompare(right.name || '', 'tr-TR', { sensitivity: 'base' }))
        .map((party) => ({ value: party.id, label: party.name }));
    }
    return [];
  }, [reportType, customCategories, agents, parties]);
  // Seçilen "Rapor Türü"ne (ve varsa 2. kutudaki seçime) göre, zaten gelen tek
  // yönetimsel rapor cevabından (movements) ilgili alt kümeyi süzer. Her rapor
  // türü/kişi için ayrı bir backend çağrısı gerekmez. "Getir"e basılana kadar
  // görünen sonuç değişmesin diye "applied" (uygulanmış) değerler kullanılır.
  const reportRows = useMemo(() => {
    return reportMovements.filter((entry) => {
      const classification = entry.classification || entry.type;
      let matchesType;
      if (appliedReportType === 'commission') matchesType = classification === 'income' && COMMISSION_INCOME_CATEGORIES.has(entry.category);
      else if (appliedReportType === 'dues') matchesType = classification === 'income' && DUES_INCOME_CATEGORIES.has(entry.category);
      else if (appliedReportType === 'other_income') matchesType = classification === 'income' && OTHER_INCOME_CATEGORIES.has(entry.category);
      else if (appliedReportType === 'expenses') matchesType = classification === 'expense';
      else if (appliedReportType === 'partners') matchesType = classification === 'partner_in' || classification === 'partner_out';
      else matchesType = classification !== 'transfer'; // summary: transferler haricinde tüm gelir/gider/ortak hareketleri
      if (!matchesType) return false;
      if (appliedReportSubFilter && appliedReportSubFilter !== 'ALL') {
        if (appliedReportType === 'expenses') {
          if (entry.category !== appliedReportSubFilter) return false;
        } else if (appliedReportType === 'commission' || appliedReportType === 'dues' || appliedReportType === 'other_income' || appliedReportType === 'partners') {
          if (entry.partyId !== appliedReportSubFilter) return false;
        }
      }
      return true;
    });
  }, [reportMovements, appliedReportType, appliedReportSubFilter];
  // Homojen türler (komisyon/aidat/gider) için basit toplam; tüm tutarlar zaten
  // pozitif saklanır, yön "classification" ile belirlenir.
  const reportRowsTotal = useMemo(
    () => reportRows.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [reportRows],
  );
  // Karma türler (özet/ortak cari) için net (giriş - çıkış) toplam.
  const reportRowsNet = useMemo(
    () => reportRows.reduce((sum, entry) => {
      const classification = entry.classification || entry.type;
      const amount = Number(entry.amount || 0);
      return sum + (['income', 'partner_in'].includes(classification) ? amount : -amount);
    }, 0),
    [reportRows],
  );
  const reportPageCount = Math.max(1, Math.ceil(reportRows.length / REPORT_PAGE_SIZE));
  const visibleReportRows = useMemo(
    () => reportRows.slice((reportPage - 1) * REPORT_PAGE_SIZE, reportPage * REPORT_PAGE_SIZE),
    [reportRows, reportPage],
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
  }, [appliedReportType, appliedReportSubFilter]);

  // Rapor türü (1. buton) değiştiğinde, 2. buton seçimini "Tümü"ne sıfırla —
  // bir önceki türden kalan danışman/kategori seçimi yeni türe taşınmasın.
  useEffect(() => {
    setReportSubFilter('ALL');
    setReportScopeQuery('');
  }, [reportType]);

  // 3 rapor butonundan biri açıkken dışarı tıklanırsa kapat.
  useEffect(() => {
    function handleClickOutsideReportBox(event) {
      if (reportBoxRef.current && !reportBoxRef.current.contains(event.target)) setOpenReportBox(null);
    }
    document.addEventListener('mousedown', handleClickOutsideReportBox);
    return () => document.removeEventListener('mousedown', handleClickOutsideReportBox);
  }, []);

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
      amount: formatAmountFromNumber(entry.amount),
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 19, color: 'var(--ink-navy)' }}>{editingEntry ? 'Muhasebe hareketini düzelt' : 'Yeni muhasebe hareketi'}</h3>
              {editingEntry && (
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>
                  Eski kayıt silinmez ve geçmişte korunur. Yeni değerler ayrı bir düzeltme kaydı olarak oluşturulur.
                </p>
              )}
            </div>
            <form onSubmit={handleCreateEntry}>
              <div className="accounting-entry-form-grid">
              <FormField label="Hareket türü">
                <select name="type" value={entryForm.type} onChange={handleEntryChange}>
                  {ACCOUNTING_ENTRY_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              {entryForm.type !== 'transfer' && (
                <FormField label="Cari kartlar" style={{ gridColumn: 'span 2' }}>
                  <select name="category" value={entryForm.category} onChange={handleEntryChange} required>
                    {entryCategoryOptions.map((category) => <option value={category} key={category}>{category}</option>)}
                    <option value={NEW_CATEGORY_VALUE}>+ Yeni kalem ekle</option>
                  </select>
                </FormField>
              )}
              {entryForm.type !== 'transfer' && entryForm.category === NEW_CATEGORY_VALUE && (
                <FormField label="Yeni kalem adı">
                  <input name="customCategory" value={entryForm.customCategory} onChange={handleEntryChange} placeholder="Örn. Reklam gideri" required />
                </FormField>
              )}
              <FormField label={entryForm.type === 'transfer' ? 'Kaynak hesap' : 'Para hesabı'}>
                <select name="accountId" value={entryForm.accountId} onChange={handleEntryChange} required>
                  <option value="">Hesap seçin</option>
                  {currencyAccounts.map((account) => (
                    <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>
                  ))}
                </select>
              </FormField>
              {entryForm.type === 'transfer' && (
                <FormField label="Hedef hesap">
                  <select name="counterAccountId" value={entryForm.counterAccountId} onChange={handleEntryChange} required>
                    <option value="">Hesap seçin</option>
                    {currencyAccounts.filter((account) => account.id !== entryForm.accountId).map((account) => (
                      <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>
                    ))}
                  </select>
                </FormField>
              )}
              <FormField label="Tarih">
                <input type="date" name="date" value={entryForm.date} onChange={handleEntryChange} required />
              </FormField>
              <FormField label="Tutar">
                <AmountInput id="accounting-entry-amount" name="amount" value={entryForm.amount} currency={entryForm.currency} onChange={handleEntryChange} placeholder="Örn. 170000 veya 170.000,00" required />
              </FormField>
              <div style={{ gridColumn: 'span 4', display: 'flex', gap: 16 }}>
                <FormField label="Para birimi" style={{ minWidth: 0, width: 100, flex: '0 0 auto' }}>
                  <select name="currency" value={entryForm.currency} onChange={handleEntryChange}>
                    {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Açıklama" style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <input name="description" value={entryForm.description} onChange={handleEntryChange} placeholder="İşlem açıklaması" />
                </FormField>
              </div>
              {editingEntry && (
                <FormField label="Düzeltme nedeni" style={{ gridColumn: 'span 2' }}>
                  <input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Örn. Tutar yanlış girildi" required />
                </FormField>
              )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" disabled={saving || currencyAccounts.length === 0}>
                  {saving ? 'Kaydediliyor…' : editingEntry ? 'Düzeltmeyi Kaydet' : 'Hareketi Kaydet'}
                </button>
                {editingEntry && <button type="button" className="btn btn-secondary" onClick={cancelCorrection} disabled={saving}>Düzeltmeden Çık</button>}
              </div>
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
            <div ref={reportBoxRef} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* 1. buton: Rapor Türü */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpenReportBox(openReportBox === 'type' ? null : 'type')}
                >
                  Rapor Türü: <strong>{REPORT_TYPES.find((type) => type.value === reportType)?.label}</strong> ▾
                </button>
                {openReportBox === 'type' && (
                  <div className="report-dropdown-panel">
                    {REPORT_TYPES.map((type) => (
                      <div
                        key={type.value}
                        className={`report-dropdown-item${reportType === type.value ? ' active' : ''}`}
                        onClick={() => { setReportType(type.value); setOpenReportBox(null); }}
                      >
                        {type.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. buton: Kapsam (rapor türüne göre danışman / kategori / ortak) */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={reportType === 'summary'}
                  onClick={() => setOpenReportBox(openReportBox === 'scope' ? null : 'scope')}
                >
                  {reportType === 'expenses' ? 'Kategori' : reportType === 'partners' ? 'Ortak' : reportType === 'summary' ? 'Kapsam' : 'Danışman'}:{' '}
                  <strong>{reportType === 'summary' ? 'Tümü' : (reportSubFilter === 'ALL' ? 'Tümü' : (reportSubFilterOptions.find((o) => o.value === reportSubFilter)?.label || 'Tümü'))}</strong> ▾
                </button>
                {openReportBox === 'scope' && reportType !== 'summary' && (
                  <div className="report-dropdown-panel" style={{ minWidth: 220 }}>
                    <input
                      type="text"
                      value={reportScopeQuery}
                      onChange={(event) => setReportScopeQuery(event.target.value)}
                      placeholder="Ara…"
                      autoFocus
                      style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
                    />
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      <div className="report-dropdown-item" onClick={() => { setReportSubFilter('ALL'); setOpenReportBox(null); setReportScopeQuery(''); }}>Tümü</div>
                      {reportSubFilterOptions
                        .filter((o) => o.label.toLocaleLowerCase('tr-TR').includes(reportScopeQuery.trim().toLocaleLowerCase('tr-TR')))
                        .map((o) => (
                          <div
                            key={o.value}
                            className={`report-dropdown-item${reportSubFilter === o.value ? ' active' : ''}`}
                            onClick={() => { setReportSubFilter(o.value); setOpenReportBox(null); setReportScopeQuery(''); }}
                          >
                            {o.label}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. buton: Tarih */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpenReportBox(openReportBox === 'date' ? null : 'date')}
                >
                  Tarih: <strong>{reportPreset === 'custom' ? `${formatDate(reportFromDate)} – ${formatDate(reportToDate)}` : REPORT_PRESETS.find((p) => p.value === reportPreset)?.label}</strong> ▾
                </button>
                {openReportBox === 'date' && (
                  <div className="report-dropdown-panel" style={{ minWidth: 240 }}>
                    {REPORT_PRESETS.map((preset) => (
                      <div
                        key={preset.value}
                        className={`report-dropdown-item${reportPreset === preset.value ? ' active' : ''}`}
                        onClick={() => { handleReportPreset(preset.value); setOpenReportBox(null); }}
                      >
                        {preset.label}
                      </div>
                    ))}
                    <div
                      className={`report-dropdown-item${reportPreset === 'custom' ? ' active' : ''}`}
                      onClick={() => setReportPreset('custom')}
                    >
                      Tarih aralığı seç…
                    </div>
                    {reportPreset === 'custom' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, padding: '0 4px 4px' }}>
                        <input type="date" value={reportFromDate} onChange={(event) => setReportFromDate(event.target.value)} />
                        <input type="date" value={reportToDate} onChange={(event) => setReportToDate(event.target.value)} />
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--paper-line)', marginTop: 6, paddingTop: 6, paddingLeft: 4 }}>
                      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Para birimi</label>
                      <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                        {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={managementReportLoading}
                onClick={() => {
                  loadManagementReport();
                  setAppliedReportType(reportType);
                  setAppliedReportSubFilter(reportSubFilter);
                  setOpenReportBox(null);
                }}
              >
                {managementReportLoading ? 'Hazırlanıyor…' : '🚀 Getir'}
              </button>
            </div>

            {managementReportLoading ? (
              <div className="empty-state" style={{ marginTop: 16 }}>Yönetimsel rapor hazırlanıyor…</div>
            ) : !managementReport ? (
              <div className="empty-state" style={{ marginTop: 16 }}>Rapor verisi bulunamadı.</div>
            ) : (
              <div className="accounting-report-section">
                <div className="accounting-report-section-label">Sonuç</div>

                {appliedReportType === 'summary' && (
                  <div className="metric-grid accounting-report-metrics" style={{ marginBottom: 16 }}>
                    <div className="metric-card">
                      <div className="metric-card__label">Toplam Gelir</div>
                      <div className="metric-card__value" style={{ color: 'var(--success)' }}>{formatAccountingMoney(managementReport.summary?.totalIncome, currency)}</div>
                      <div className="metric-card__delta is-muted">Komisyon, aidat ve diğer gelirler</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card__label">Toplam Gider</div>
                      <div className="metric-card__value" style={{ color: 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.totalExpense, currency)}</div>
                      <div className="metric-card__delta is-muted">Ofis masrafları</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card__label">Ortak Cari (net)</div>
                      <div className="metric-card__value" style={{ color: Number(managementReport.summary?.netPartnerFinancing || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.netPartnerFinancing, currency)}</div>
                      <div className="metric-card__delta is-muted">Giriş {formatAccountingMoney(managementReport.summary?.partnerInflow, currency)} · Çıkış {formatAccountingMoney(managementReport.summary?.partnerOutflow, currency)}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card__label">Net Durum</div>
                      <div className="metric-card__value" style={{ color: Number(managementReport.summary?.netCashMovement || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.netCashMovement, currency)}</div>
                      <div className="metric-card__delta is-muted">Gelir − gider + ortak hareketleri</div>
                    </div>
                  </div>
                )}

                {appliedReportType === 'commission' && (
                  <div className="metric-grid accounting-report-metrics" style={{ marginBottom: 16 }}>
                    <div className="metric-card">
                      <div className="metric-card__label">Toplam Komisyon Geliri</div>
                      <div className="metric-card__value" style={{ color: 'var(--success)' }}>{formatAccountingMoney(reportRowsTotal, currency)}</div>
                      <div className="metric-card__delta is-muted">{reportRows.length} tahsilat</div>
                    </div>
                  </div>
                )}

                {appliedReportType === 'dues' && (
                  <div className="metric-grid accounting-report-metrics" style={{ marginBottom: 16 }}>
                    <div className="metric-card">
                      <div className="metric-card__label">Toplam Aidat / Masa Kirası Geliri</div>
                      <div className="metric-card__value" style={{ color: 'var(--success)' }}>{formatAccountingMoney(reportRowsTotal, currency)}</div>
                      <div className="metric-card__delta is-muted">{reportRows.length} tahsilat</div>
                    </div>
                  </div>
                )}

                {appliedReportType === 'other_income' && (
                  <div className="metric-grid accounting-report-metrics" style={{ marginBottom: 16 }}>
                    <div className="metric-card">
                      <div className="metric-card__label">Toplam Diğer Gelir</div>
                      <div className="metric-card__value" style={{ color: 'var(--cl-success)' }}>{formatAccountingMoney(reportRowsTotal, currency)}</div>
                      <div className="metric-card__delta is-muted">{reportRows.length} gelir kaydı</div>
                    </div>
                  </div>
                )}

                {appliedReportType === 'expenses' && (
                  <>
                    <div className="metric-grid accounting-report-metrics" style={{ marginBottom: 16 }}>
                      <div className="metric-card">
                        <div className="metric-card__label">Toplam Ofis Gideri</div>
                        <div className="metric-card__value" style={{ color: 'var(--danger)' }}>{formatAccountingMoney(reportRowsTotal, currency)}</div>
                        <div className="metric-card__delta is-muted">{reportRows.length} gider kaydı</div>
                      </div>
                    </div>
                    {appliedReportSubFilter === 'ALL' && (managementReport.expenseByCategory || []).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="accounting-report-section-label">Kategoriye göre dağılım</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {managementReport.expenseByCategory.map((row) => (
                            <div key={row.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--paper)', borderRadius: 6 }}>
                              <span>{row.category}</span>
                              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{formatAccountingMoney(row.amount, currency)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {appliedReportType === 'partners' && (
                  <div className="metric-grid accounting-report-metrics" style={{ marginBottom: 16 }}>
                    <div className="metric-card">
                      <div className="metric-card__label">Ortak Girişi</div>
                      <div className="metric-card__value" style={{ color: 'var(--success)' }}>{formatAccountingMoney(managementReport.summary?.partnerInflow, currency)}</div>
                      <div className="metric-card__delta is-muted">Sermaye katkısı / borç girişi</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card__label">Ortak Çıkışı</div>
                      <div className="metric-card__value" style={{ color: 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.partnerOutflow, currency)}</div>
                      <div className="metric-card__delta is-muted">Çekiş / borç ödemesi / kâr dağıtımı</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card__label">Net</div>
                      <div className="metric-card__value" style={{ color: Number(managementReport.summary?.netPartnerFinancing || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatAccountingMoney(managementReport.summary?.netPartnerFinancing, currency)}</div>
                      <div className="metric-card__delta is-muted">Giriş − çıkış</div>
                    </div>
                  </div>
                )}

                <div className="accounting-report-view accounting-report-detail">
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 10 }}>
                    <strong style={{ color: 'var(--ink-navy)', fontSize: 13 }}>{reportRows.length} kayıt</strong>
                  </div>
                  {visibleReportRows.length === 0 ? (
                    <div className="empty-state">Seçilen tarih aralığında bu rapor türü için kayıt bulunamadı.</div>
                  ) : (
                    <div className="table-scroll">
                      <table className="accounting-report-table">
                        <colgroup>
                          <col className="col-date" />
                          <col className="col-main" />
                          <col className="col-account" />
                          <col className="col-type" />
                          <col className="col-amount" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Tarih</th>
                            <th>Kategori / Açıklama</th>
                            <th>Hesap / Cari</th>
                            <th>Hareket Türü</th>
                            <th style={{ textAlign: 'right' }}>Tutar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleReportRows.map((entry) => {
                            const classification = entry.classification || entry.type;
                            const isInflow = ['income', 'partner_in'].includes(classification);
                            const accountText = entry.type === 'transfer'
                              ? `${entry.accountName || '—'} → ${entry.counterAccountName || '—'}`
                              : entry.accountName || '—';
                            return (
                              <tr key={entry.id}>
                                <td>{formatDate(entry.date)}</td>
                                <td><strong>{entry.category || 'Kategorisiz'}</strong><div className="accounting-report-subtext">{entry.description || 'Açıklama yok'}</div></td>
                                <td><strong>{accountText}</strong><div className="accounting-report-subtext">{entry.partyName || 'Cari yok'}</div></td>
                                <td>{reportMovementLabel(classification)}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: isInflow ? 'var(--success)' : 'var(--danger)' }}>
                                  {isInflow ? '+' : '-'}{formatAccountingMoney(entry.amount, entry.currency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {reportRows.length > 0 && (() => {
                    const isMixed = appliedReportType === 'summary' || appliedReportType === 'partners';
                    const displayValue = isMixed ? reportRowsNet : reportRowsTotal;
                    const color = appliedReportType === 'expenses'
                      ? 'var(--danger)'
                      : isMixed
                        ? (displayValue >= 0 ? 'var(--success)' : 'var(--danger)')
                        : 'var(--success)'; // commission / dues: her zaman gelir
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--paper-line)' }}>
                        <strong>Toplam ({reportRows.length} kayıt)</strong>
                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color }}>
                          {appliedReportType === 'expenses' ? '-' : ''}{formatAccountingMoney(Math.abs(displayValue), currency)}
                        </strong>
                      </div>
                    );
                  })()}
                  {reportPageCount > 1 && (
                    <div className="accounting-report-pagination">
                      <button type="button" className="btn btn-secondary" disabled={reportPage <= 1} onClick={() => setReportPage((page) => Math.max(1, page - 1))}>Önceki</button>
                      <span>Sayfa {reportPage} / {reportPageCount}</span>
                      <button type="button" className="btn btn-secondary" disabled={reportPage >= reportPageCount} onClick={() => setReportPage((page) => Math.min(reportPageCount, page + 1))}>Sonraki</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {managementReport && !managementReportLoading && (
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
