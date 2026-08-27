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
  { key: 'summary', label: 'Özet' },
  { key: 'entries', label: 'Hareketler' },
  { key: 'ledgers', label: 'Cari Kartlar' },
  { key: 'commissions', label: 'Komisyonlar' },
  { key: 'dues', label: 'Danışman Kiraları' },
  { key: 'partners', label: 'Ortaklar' },
  { key: 'accounts', label: 'Hesaplar' },
  { key: 'recurring', label: 'Tekrarlayanlar' },
  { key: 'reports', label: 'Raporlar' },
];

const MODULE_AREAS = [
  {
    title: 'Komisyon ve hakediş',
    description: 'Kapama sırasında girilen brüt komisyonu, danışman kaydındaki oranla otomatik paylaştırır.',
  },
  {
    title: 'Danışman kiraları',
    description: 'Danışman kaydındaki tutar ve başlangıç ayından itibaren her dönemi tek kez oluşturur.',
  },
  {
    title: 'Cari ve ortak hareketleri',
    description: 'Danışman, ortak ve tedarikçi bakiyelerini para hesabı hareketlerinden ayrı izler.',
  },
  {
    title: 'Banka, kasa ve kredi kartı',
    description: 'TL, EUR ve USD hesaplarını birbirine karıştırmadan ayrı bakiyeler hâlinde gösterir.',
  },
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

function entryTypeLabel(type) {
  return ACCOUNTING_ENTRY_TYPES.find((item) => item.value === type)?.label || type;
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

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('summary');
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [currency, setCurrency] = useState('TRY');
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [error, setError] = useState('');
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
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
  const [commissionActionId, setCommissionActionId] = useState(null);
  const [commissionForm, setCommissionForm] = useState(EMPTY_COMMISSION_FORM);
  const [settlementAccounts, setSettlementAccounts] = useState({});
  const [rents, setRents] = useState([]);
  const [rentLoading, setRentLoading] = useState(false);
  const [rentGenerating, setRentGenerating] = useState(false);
  const [rentActionId, setRentActionId] = useState(null);
  const [parties, setParties] = useState([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [partySaving, setPartySaving] = useState(false);
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
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringGenerating, setRecurringGenerating] = useState(false);
  const [customCategories, setCustomCategories] = useState({ income: [], expense: [] });
  const [recurringForm, setRecurringForm] = useState({
    title: '',
    category: EXPENSE_CATEGORIES[2],
    customCategory: '',
    amount: '',
    currency: 'TRY',
    dueDay: '1',
    startPeriod: getCurrentPeriod(),
    endPeriod: '',
    defaultAccountId: '',
    partyId: '',
  });
  const commissionIdempotencyKeyRef = useRef(null);

  const periodParams = useMemo(() => ({ ...getPeriodBounds(period), currency }), [period, currency]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [accountList, entryList, summaryData] = await Promise.all([
        accountingApi.listAccounts(),
        accountingApi.listEntries(periodParams),
        accountingApi.getSummary(periodParams),
      ]);
      setAccounts(accountList || []);
      setEntries(entryList || []);
      setSummary(summaryData || null);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Muhasebe verileri yüklenemedi. Backend bağlantısını kontrol edin.');
    } finally {
      setLoading(false);
    }
  }, [periodParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const loadRecurringExpenses = useCallback(async () => {
    setRecurringLoading(true);
    try {
      const templateList = await accountingApi.listRecurringExpenses({ currency });
      setRecurringExpenses(templateList || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Tekrarlayan giderler yüklenemedi.');
    } finally {
      setRecurringLoading(false);
    }
  }, [currency]);

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
    if (activeTab !== 'ledgers' && activeTab !== 'partners' && activeTab !== 'entries' && activeTab !== 'recurring') return undefined;
    loadParties();
    return undefined;
  }, [activeTab, loadParties]);

  useEffect(() => {
    if (activeTab !== 'recurring') return undefined;
    loadRecurringExpenses();
    return undefined;
  }, [activeTab, loadRecurringExpenses]);

  useEffect(() => {
    if (activeTab !== 'entries' && activeTab !== 'recurring') return undefined;
    loadCategories();
    return undefined;
  }, [activeTab, loadCategories]);

  const currencyAccounts = useMemo(
    () => accounts.filter((account) => account.currency === entryForm.currency && account.isActive !== false),
    [accounts, entryForm.currency],
  );
  const entryCategoryOptions = useMemo(
    () => entryForm.type === 'expense'
      ? categoryNames(EXPENSE_CATEGORIES, customCategories.expense)
      : categoryNames(INCOME_CATEGORIES, customCategories.income),
    [entryForm.type, customCategories],
  );
  const recurringCategoryOptions = useMemo(
    () => categoryNames(EXPENSE_CATEGORIES, customCategories.expense),
    [customCategories],
  );

  function handleEntryChange(event) {
    const { name, value } = event.target;
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
    if (!partnerMovementForm.amount || Number(partnerMovementForm.amount) <= 0) {
      setError('Ortak hareket tutarı sıfırdan büyük olmalıdır.');
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
        amount: Number(partnerMovementForm.amount),
        currency: partnerMovementForm.currency,
        accountId: partnerMovementForm.accountId,
        category: movement.category,
        partyType: 'partner',
        partyId: party.id,
        partyName: party.name,
        description: partnerMovementForm.description.trim() || movement.label,
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
    setPartySaving(true);
    setError('');
    try {
      await accountingApi.createParty({
        ...partyForm,
        name: partyForm.name.trim(),
        companyName: partyForm.companyName.trim() || undefined,
        phone: partyForm.phone.trim() || undefined,
        taxId: partyForm.taxId.trim() || undefined,
        openingBalance: partyForm.openingBalance ? Number(partyForm.openingBalance) : 0,
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

  async function handleCreateRecurringExpense(event) {
    event.preventDefault();
    if (!recurringForm.title.trim()) {
      setError('Tekrarlayan gider adı boş bırakılamaz.');
      return;
    }
    if (!recurringForm.amount || Number(recurringForm.amount) <= 0) {
      setError('Tekrarlayan gider tutarı sıfırdan büyük olmalıdır.');
      return;
    }
    if (!recurringForm.defaultAccountId) {
      setError('Tekrarlayan gider için varsayılan ödeme hesabı seçin.');
      return;
    }
    const selectedCategory = recurringForm.category === NEW_CATEGORY_VALUE
      ? recurringForm.customCategory.trim()
      : recurringForm.category;
    if (!selectedCategory) {
      setError('Yeni kategori adı boş bırakılamaz.');
      return;
    }
    setRecurringSaving(true);
    setError('');
    try {
      if (!EXPENSE_CATEGORIES.includes(selectedCategory)) {
        await accountingApi.createCategory({ type: 'expense', name: selectedCategory });
        await loadCategories();
      }
      await accountingApi.createRecurringExpense({
        title: recurringForm.title.trim(),
        category: selectedCategory,
        amount: Number(recurringForm.amount),
        currency: recurringForm.currency,
        dueDay: Number(recurringForm.dueDay),
        startPeriod: recurringForm.startPeriod,
        endPeriod: recurringForm.endPeriod || undefined,
        defaultAccountId: recurringForm.defaultAccountId,
        partyId: recurringForm.partyId || undefined,
      });
      setRecurringForm({
        title: '',
        category: EXPENSE_CATEGORIES[2],
        customCategory: '',
        amount: '',
        currency,
        dueDay: '1',
        startPeriod: period,
        endPeriod: '',
        defaultAccountId: '',
        partyId: '',
      });
      await loadRecurringExpenses();
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Tekrarlayan gider şablonu oluşturulamadı.');
    } finally {
      setRecurringSaving(false);
    }
  }

  async function handleGenerateRecurringExpenses() {
    if (!window.confirm(`${periodLabel(period)} dönemi için ${currency} tekrarlayan giderleri oluşturulsun mu? Aynı gider ikinci kez oluşturulmaz.`)) return;
    setRecurringGenerating(true);
    setError('');
    try {
      const result = await accountingApi.generateRecurringExpenses({ period, currency });
      await Promise.all([loadRecurringExpenses(), loadData()]);
      window.alert(`${result.created || 0} gider oluşturuldu, ${result.skipped || 0} kayıt atlandı.`);
    } catch (generateError) {
      setError(generateError.response?.data?.message || 'Tekrarlayan giderler oluşturulamadı.');
    } finally {
      setRecurringGenerating(false);
    }
  }

  async function handleCreateEntry(event) {
    event.preventDefault();
    if (!entryForm.amount || Number(entryForm.amount) <= 0) {
      setError('Tutar sıfırdan büyük olmalıdır.');
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
      if (entryForm.type !== 'transfer' && ![...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].includes(selectedCategory)) {
        await accountingApi.createCategory({ type: entryForm.type, name: selectedCategory });
        await loadCategories();
      }
      const { customCategory: _customCategory, ...entryPayload } = entryForm;
      await accountingApi.createEntry({
        ...entryPayload,
        amount: Number(entryForm.amount),
        category: entryForm.type === 'transfer' ? 'Hesaplar Arası Transfer' : selectedCategory,
        partyType: entryForm.type === 'transfer' ? undefined : selectedParty?.type,
        partyId: entryForm.type === 'transfer' ? undefined : selectedParty ? (selectedParty.linkedUserId || selectedParty.id) : undefined,
        partyName: entryForm.type === 'transfer' ? undefined : selectedParty?.name || entryForm.partyName || undefined,
        counterAccountId: entryForm.type === 'transfer' ? entryForm.counterAccountId : undefined,
        referenceNo: entryForm.referenceNo || undefined,
      });
      setEntryForm({ ...EMPTY_ENTRY_FORM, date: new Date().toISOString().slice(0, 10), currency });
      setActiveTab('entries');
      // Kayıt POST isteği başarılı olduktan sonra ekran yenilemesini
      // kullanıcıyı bekletmeden arka planda yap.
      loadData().catch(() => undefined);
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
        await accountingApi.voidRent(rent.id);
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
    if (!commissionForm.agentId || !commissionForm.grossAmount || Number(commissionForm.grossAmount) <= 0) {
      setError('Danışman ve sıfırdan büyük brüt komisyon tutarı seçilmelidir.');
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
        grossAmount: Number(commissionForm.grossAmount),
        propertyTitle: commissionForm.propertyTitle.trim() || undefined,
        notes: commissionForm.notes.trim() || undefined,
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
        await accountingApi.voidCommission(commission.id);
      }
      Promise.all([loadCommissionData(), loadData()]).catch(() => undefined);
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Komisyon işlemi kaydedilemedi.');
    } finally {
      setCommissionActionId(null);
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    if (!accountForm.name.trim()) {
      setError('Hesap adı zorunludur.');
      return;
    }
    setAccountSaving(true);
    setError('');
    try {
      await accountingApi.createAccount({
        ...accountForm,
        name: accountForm.name.trim(),
        bankName: accountForm.bankName.trim() || undefined,
        iban: accountForm.iban.trim() || undefined,
        openingBalance: accountForm.openingBalance ? Number(accountForm.openingBalance) : 0,
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 className="dossier__name" style={{ margin: 0 }}>Muhasebe</h2>
          <p style={{ color: 'var(--muted)', margin: '6px 0 0', maxWidth: 720, fontSize: 14 }}>
            Mevcut Finans bölümünden bağımsız, yönetimsel muhasebe ve cari takip alanı.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ color: 'var(--muted)', fontSize: 12 }} htmlFor="accounting-period">Dönem</label>
          <input
            id="accounting-period"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            style={{ minWidth: 150 }}
          />
          <label style={{ color: 'var(--muted)', fontSize: 12 }} htmlFor="accounting-currency">Para birimi</label>
          <select id="accounting-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {ACCOUNTING_CURRENCIES.map((item) => (
              <option value={item.value} key={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="folder-panel" style={{ marginBottom: 20, borderLeft: '4px solid var(--brass)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink-navy)', marginBottom: 5 }}>
          Bağımsız çalışma alanı
        </div>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>
          Bu modül mevcut Finans ekranını değiştirmez. Buradaki kayıtlar kendi muhasebe akışında tutulur; danışman komisyonu, aylık kira ve ortak hareketleri sonraki adımlarda kontrollü biçimde CRM verileriyle ilişkilendirilecektir.
        </p>
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

      {activeTab === 'summary' && (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-card__label">Dönem</div>
              <div className="metric-card__value" style={{ fontSize: 20 }}>{periodLabel(period)}</div>
              <div className="metric-card__delta is-muted">{currency} görünümü</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Toplam tahsilat</div>
              <div className="metric-card__value">{loading ? '…' : formatAccountingMoney(summary?.totalIncome, currency)}</div>
              <div className="metric-card__delta is-muted">Gelir / tahsilat hareketleri</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Toplam gider</div>
              <div className="metric-card__value">{loading ? '…' : formatAccountingMoney(summary?.totalExpense, currency)}</div>
              <div className="metric-card__delta is-muted">Gider / ödeme hareketleri</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Net operasyon sonucu</div>
              <div className="metric-card__value" style={{ color: Number(summary?.netOperatingResult || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {loading ? '…' : formatAccountingMoney(summary?.netOperatingResult, currency)}
              </div>
              <div className="metric-card__delta is-muted">{summary?.entryCount || 0} hareket</div>
            </div>
          </div>

          <div className="folder-panel" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Hızlı başlangıç</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                  Önce bir banka, kasa veya kredi kartı hesabı oluşturun; ardından Hareketler sekmesinden kayıt ekleyin.
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setActiveTab('entries')}>+ Hareket Ekle</button>
            </div>
            <div className="panel-grid-2">
              {MODULE_AREAS.map((area) => (
                <div key={area.title} style={{ border: '1px solid var(--paper-line)', borderRadius: 6, padding: 15, background: 'var(--paper-raised)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink-navy)', marginBottom: 5 }}>{area.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>{area.description}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'entries' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Yeni muhasebe hareketi</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                  Gelir/tahsilat, gider/ödeme veya aynı para birimindeki iki hesap arasında transfer kaydedin.
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
              <FormField label="Tarih">
                <input type="date" name="date" value={entryForm.date} onChange={handleEntryChange} required />
              </FormField>
              <FormField label="Tutar">
                <input type="number" name="amount" min="0.01" step="0.01" value={entryForm.amount} onChange={handleEntryChange} placeholder="0,00" required />
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
                <FormField label="Kategori" style={{ minWidth: 220 }}>
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
              <button type="submit" className="btn btn-primary" disabled={saving || currencyAccounts.length === 0}>
                {saving ? 'Kaydediliyor…' : 'Hareketi Kaydet'}
              </button>
            </form>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'accounts' && (
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
                <input type="number" min="0" step="0.01" value={accountForm.openingBalance} onChange={(event) => setAccountForm({ ...accountForm, openingBalance: event.target.value })} placeholder="0,00" />
              </FormField>
              <button type="submit" className="btn btn-primary" disabled={accountSaving}>
                {accountSaving ? 'Ekleniyor…' : '+ Hesap Ekle'}
              </button>
            </form>
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
          <div className="folder-panel" style={{ marginBottom: 20 }}>
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
                <input type="number" min="0" step="0.01" value={partyForm.openingBalance} onChange={(event) => setPartyForm({ ...partyForm, openingBalance: event.target.value })} placeholder="0" />
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
          </div>

          <div className="folder-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Cari kartlar ve bakiyeler</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>{currency} görünümü · Kira alacağı ve ödenecek danışman hakedişi dahil</p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{parties.length} kart</span>
            </div>
            {partyLoading ? (
              <div className="empty-state">Cari kartlar yükleniyor…</div>
            ) : parties.length === 0 ? (
              <div className="empty-state">Henüz cari kart bulunmuyor.</div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {parties.map((party) => {
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
                <input type="number" min="0.01" step="0.01" value={commissionForm.grossAmount} onChange={(event) => setCommissionForm({ ...commissionForm, grossAmount: event.target.value })} placeholder="Örn. 100" required />
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
      {activeTab === 'partners' && (
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
                  <input type="number" min="0.01" step="0.01" value={partnerMovementForm.amount} onChange={(event) => setPartnerMovementForm({ ...partnerMovementForm, amount: event.target.value })} placeholder="Örn. 10.000" required />
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
      {activeTab === 'recurring' && (
        <>
          <div className="folder-panel" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Yeni tekrarlayan gider</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
                  Kira, elektrik, su, internet gibi düzenli giderleri şablon olarak tanımlayın. Gerçek gider seçilen dönemde bir kez oluşturulur.
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleGenerateRecurringExpenses} disabled={recurringGenerating}>
                {recurringGenerating ? 'Oluşturuluyor…' : `${periodLabel(period)} giderlerini oluştur`}
              </button>
            </div>
            <form onSubmit={handleCreateRecurringExpense} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FormField label="Gider adı" style={{ minWidth: 210 }}>
                <input value={recurringForm.title} onChange={(event) => setRecurringForm({ ...recurringForm, title: event.target.value })} placeholder="Örn. Ofis kirası" required />
              </FormField>
              <FormField label="Kategori" style={{ minWidth: 210 }}>
                <select value={recurringForm.category} onChange={(event) => setRecurringForm({ ...recurringForm, category: event.target.value, customCategory: event.target.value === NEW_CATEGORY_VALUE ? recurringForm.customCategory : '' })}>
                  {recurringCategoryOptions.map((category) => <option value={category} key={category}>{category}</option>)}
                  <option value={NEW_CATEGORY_VALUE}>+ Yeni kategori ekle</option>
                </select>
              </FormField>
              {recurringForm.category === NEW_CATEGORY_VALUE && (
                <FormField label="Yeni kategori adı" style={{ minWidth: 210 }}>
                  <input value={recurringForm.customCategory} onChange={(event) => setRecurringForm({ ...recurringForm, customCategory: event.target.value })} placeholder="Örn. Reklam gideri" required />
                </FormField>
              )}
              <FormField label="Aylık tutar" style={{ minWidth: 140 }}>
                <input type="number" min="0.01" step="0.01" value={recurringForm.amount} onChange={(event) => setRecurringForm({ ...recurringForm, amount: event.target.value })} placeholder="0,00" required />
              </FormField>
              <FormField label="Para birimi">
                <select value={recurringForm.currency} onChange={(event) => setRecurringForm({ ...recurringForm, currency: event.target.value, defaultAccountId: '', partyId: '' })}>
                  {ACCOUNTING_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </FormField>
              <FormField label="Vade günü" style={{ minWidth: 110 }}>
                <input type="number" min="1" max="31" value={recurringForm.dueDay} onChange={(event) => setRecurringForm({ ...recurringForm, dueDay: event.target.value })} required />
              </FormField>
              <FormField label="Başlangıç ayı">
                <input type="month" value={recurringForm.startPeriod} onChange={(event) => setRecurringForm({ ...recurringForm, startPeriod: event.target.value })} required />
              </FormField>
              <FormField label="Bitiş ayı">
                <input type="month" value={recurringForm.endPeriod} onChange={(event) => setRecurringForm({ ...recurringForm, endPeriod: event.target.value })} />
              </FormField>
              <FormField label="Varsayılan hesap" style={{ minWidth: 210 }}>
                <select value={recurringForm.defaultAccountId} onChange={(event) => setRecurringForm({ ...recurringForm, defaultAccountId: event.target.value })} required>
                  <option value="">Hesap seçin</option>
                  {accounts.filter((account) => account.currency === recurringForm.currency && account.isActive !== false).map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}
                </select>
              </FormField>
              <FormField label="Cari kart" style={{ minWidth: 210 }}>
                <select value={recurringForm.partyId} onChange={(event) => setRecurringForm({ ...recurringForm, partyId: event.target.value })}>
                  <option value="">Cari kart seçmeden devam et</option>
                  {parties.filter((party) => party.currency === recurringForm.currency || party.type === 'agent').map((party) => {
                    const typeLabel = ACCOUNTING_PARTY_TYPES.find((item) => item.value === party.type)?.label || (party.type === 'agent' ? 'Danışman' : party.type);
                    return <option value={party.id} key={party.id}>{party.name} · {typeLabel}</option>;
                  })}
                </select>
              </FormField>
              <button type="submit" className="btn btn-primary" disabled={recurringSaving}>
                {recurringSaving ? 'Kaydediliyor…' : 'Şablonu Kaydet'}
              </button>
            </form>
            {accounts.filter((account) => account.currency === recurringForm.currency && account.isActive !== false).length === 0 && (
              <p style={{ color: 'var(--danger)', fontSize: 13, margin: '12px 0 0' }}>Bu para biriminde hesap yok. Önce Hesaplar sekmesinden hesap oluşturun.</p>
            )}
          </div>

          <div className="folder-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 18 }}>Gider şablonları</h3>
                <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>{currency} görünümü · Dönem üretimi tekrar çalıştırıldığında aynı kayıt ikinci kez oluşmaz</p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{recurringExpenses.length} şablon</span>
            </div>
            {recurringLoading ? (
              <div className="empty-state">Tekrarlayan giderler yükleniyor…</div>
            ) : recurringExpenses.length === 0 ? (
              <div className="empty-state">Henüz tekrarlayan gider şablonu oluşturulmamış.</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 930, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '7px 8px' }}>Gider</th>
                      <th style={{ padding: '7px 8px' }}>Kategori</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Tutar</th>
                      <th style={{ padding: '7px 8px' }}>Vade</th>
                      <th style={{ padding: '7px 8px' }}>Dönem</th>
                      <th style={{ padding: '7px 8px' }}>Ödeme hesabı</th>
                      <th style={{ padding: '7px 8px' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurringExpenses.map((template) => (
                      <tr key={template.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                        <td style={{ padding: '10px 8px' }}><strong>{template.title}</strong>{template.partyName && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{template.partyName}</div>}</td>
                        <td style={{ padding: '10px 8px' }}>{template.category}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatAccountingMoney(template.amount, template.currency)}</td>
                        <td style={{ padding: '10px 8px' }}>{template.dueDay}. gün</td>
                        <td style={{ padding: '10px 8px' }}>{periodLabel(template.startPeriod)}{template.endPeriod ? ` – ${periodLabel(template.endPeriod)}` : ' sonrası'}</td>
                        <td style={{ padding: '10px 8px' }}>{template.accountName || '—'}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--success)' }}>Aktif</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {activeTab === 'reports' && (
        <EmptyTab title="Muhasebe raporları" description="Cari ekstre, gelir-gider, nakit akış, danışman hakediş ve ortak hareket raporları burada hazırlanacak." />
      )}
    </div>
  );
}
