import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { customersApi } from '../api/customers';
import MoneyInput from '../components/MoneyInput';
import { colors } from '../theme';

// "Detayli veri topla ama kullaniciya detayli form doldurtma" prensibi:
// sahada telefonla kullanim icin -- her ekranda tek soru, istenen adimda
// "Kaydet ve Bitir" ile cikilabilir.

const TYPES = [
  { value: 'buyer', label: 'Alıcı', icon: '🔵' },
  { value: 'tenant', label: 'Kiracı', icon: '🟢' },
  { value: 'seller', label: 'Satıcı', icon: '🟠' },
  { value: 'investor', label: 'Yatırımcı', icon: '📈' },
];

const INTEREST_OPTIONS = [
  { value: 'Daire', icon: '🏠' },
  { value: 'Villa', icon: '🏡' },
  { value: 'Arsa', icon: '🌳' },
  { value: 'İş Yeri', icon: '🏢' },
  { value: 'Diğer', icon: '📦' },
];

const SALE_BUDGET_PRESETS = [5_000_000, 10_000_000, 15_000_000, 20_000_000, 25_000_000];
const RENT_BUDGET_PRESETS = [20_000, 30_000, 50_000, 75_000, 100_000];

const DISTRICT_PRESETS = ['Kadıköy', 'Ataşehir', 'Maltepe', 'Üsküdar', 'Kartal', 'Beşiktaş', 'Şişli'];

const TIMELINE_OPTIONS = [
  { value: 'immediate', label: 'Hemen', icon: '🔴' },
  { value: '1_3_months', label: '1–3 ay', icon: '🟠' },
  { value: '3_6_months', label: '3–6 ay', icon: '🟡' },
  { value: 'later', label: 'Daha sonra', icon: '🔵' },
];

function formatMoneyShort(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const TOTAL_STEPS = 5;

export default function QuickAddCustomerScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    type: '',
    propertyInterest: '',
    budget: '',
    preferredDistricts: [],
    purchaseTimeline: '',
  });
  const [customDistrict, setCustomDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function toggleDistrict(name) {
    setDraft((d) => {
      const has = d.preferredDistricts.includes(name);
      return {
        ...d,
        preferredDistricts: has
          ? d.preferredDistricts.filter((x) => x !== name)
          : [...d.preferredDistricts, name],
      };
    });
  }

  function addCustomDistrict() {
    const name = customDistrict.trim();
    if (!name) return;
    if (!draft.preferredDistricts.includes(name)) {
      update({ preferredDistricts: [...draft.preferredDistricts, name] });
    }
    setCustomDistrict('');
  }

  function buildRequirementsSummary() {
    const parts = [];
    if (draft.propertyInterest) parts.push(`${draft.propertyInterest} arıyor`);
    if (draft.preferredDistricts.length) parts.push(draft.preferredDistricts.join(', '));
    const timelineLabel = TIMELINE_OPTIONS.find((t) => t.value === draft.purchaseTimeline)?.label;
    if (timelineLabel) parts.push(`${timelineLabel} içinde`);
    return parts.length ? parts.join(' · ') + '.' : undefined;
  }

  const isStep0Valid = draft.firstName.trim() && draft.lastName.trim() && draft.phone.trim() && draft.type;

  async function handleSave() {
    if (!isStep0Valid) {
      setStep(0);
      setError('Ad, soyad, telefon ve müşteri tipi zorunludur.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await customersApi.create({
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        phone: draft.phone.trim(),
        type: draft.type,
        budget: draft.budget === '' ? undefined : Number(draft.budget),
        propertyInterest: draft.propertyInterest || undefined,
        preferredDistricts: draft.preferredDistricts.length ? draft.preferredDistricts : undefined,
        purchaseTimeline: draft.purchaseTimeline || undefined,
        requirements: buildRequirementsSummary(),
      });
      navigation.goBack();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Kaydedilemedi, tekrar deneyin.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  const isSeller = draft.type === 'seller';
  const budgetPresets = draft.type === 'tenant' ? RENT_BUDGET_PRESETS : SALE_BUDGET_PRESETS;
  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {step === 0 && (
          <View>
            <Text style={styles.title}>⚡ Hızlı Müşteri Kaydı</Text>

            <Text style={styles.label}>Ad *</Text>
            <TextInput style={styles.input} value={draft.firstName} onChangeText={(v) => update({ firstName: v })} autoFocus />

            <Text style={styles.label}>Soyad *</Text>
            <TextInput style={styles.input} value={draft.lastName} onChangeText={(v) => update({ lastName: v })} />

            <Text style={styles.label}>Telefon *</Text>
            <TextInput
              style={styles.input}
              value={draft.phone}
              onChangeText={(v) => update({ phone: v })}
              placeholder="+905XXXXXXXXX"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Alıcı / Kiracı / Satıcı / Yatırımcı?</Text>
            <View style={styles.grid2}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.choice, draft.type === t.value && styles.choiceActive]}
                  onPress={() => update({ type: t.value })}
                >
                  <Text style={styles.choiceIcon}>{t.icon}</Text>
                  <Text style={[styles.choiceLabel, draft.type === t.value && styles.choiceLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.replace('CustomerForm')}>
              <Text style={styles.linkButtonText}>📋 Detaylı Kayıt formunu kullan</Text>
            </TouchableOpacity>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                disabled={!isStep0Valid || saving}
                onPress={handleSave}
              >
                {saving ? <ActivityIndicator color={colors.inkNavy} /> : <Text style={styles.secondaryButtonText}>Hızlı Kaydet</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                disabled={!isStep0Valid}
                onPress={() => { setError(null); setStep(1); }}
              >
                <Text style={styles.primaryButtonText}>Devam Et →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.title}>{isSeller ? 'Ne satıyor?' : 'Ne arıyor?'}</Text>
            <View style={styles.grid2}>
              {INTEREST_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.choice, draft.propertyInterest === opt.value && styles.choiceActive]}
                  onPress={() => update({ propertyInterest: opt.value })}
                >
                  <Text style={styles.choiceIcon}>{opt.icon}</Text>
                  <Text style={[styles.choiceLabel, draft.propertyInterest === opt.value && styles.choiceLabelActive]}>{opt.value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            <StepNav onBack={() => setStep(0)} onSave={handleSave} onNext={() => setStep(2)} saving={saving} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>{isSeller ? 'Beklenti fiyatı ne kadar?' : 'Bütçesi ne kadar?'}</Text>
            <View style={styles.grid2}>
              {budgetPresets.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.choice, Number(draft.budget) === amount && styles.choiceActive]}
                  onPress={() => update({ budget: amount })}
                >
                  <Text style={[styles.choiceLabel, Number(draft.budget) === amount && styles.choiceLabelActive]}>
                    {formatMoneyShort(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Ya da tam tutar girin (₺)</Text>
            <MoneyInput style={styles.input} value={draft.budget} onChangeText={(v) => update({ budget: v })} />
            {error && <Text style={styles.error}>{error}</Text>}
            <StepNav onBack={() => setStep(1)} onSave={handleSave} onNext={() => setStep(3)} saving={saving} />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.title}>Nerede?</Text>
            <View style={styles.chipsWrap}>
              {DISTRICT_PRESETS.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.chip, draft.preferredDistricts.includes(name) && styles.chipActive]}
                  onPress={() => toggleDistrict(name)}
                >
                  <Text style={[styles.chipText, draft.preferredDistricts.includes(name) && styles.chipTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
              {draft.preferredDistricts.filter((d) => !DISTRICT_PRESETS.includes(d)).map((name) => (
                <TouchableOpacity key={name} style={[styles.chip, styles.chipActive]} onPress={() => toggleDistrict(name)}>
                  <Text style={[styles.chipText, styles.chipTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>+ Bölge Ekle</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={customDistrict}
                onChangeText={setCustomDistrict}
                placeholder="Örn: Şile"
                onSubmitEditing={addCustomDistrict}
              />
              <TouchableOpacity style={styles.smallButton} onPress={addCustomDistrict}>
                <Text style={styles.smallButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            <StepNav onBack={() => setStep(2)} onSave={handleSave} onNext={() => setStep(4)} saving={saving} />
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.title}>{isSeller ? 'Ne zaman satmayı planlıyor?' : 'Ne zaman alacak?'}</Text>
            <View style={styles.grid2}>
              {TIMELINE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.choice, draft.purchaseTimeline === opt.value && styles.choiceActive]}
                  onPress={() => update({ purchaseTimeline: opt.value })}
                >
                  <Text style={styles.choiceIcon}>{opt.icon}</Text>
                  <Text style={[styles.choiceLabel, draft.purchaseTimeline === opt.value && styles.choiceLabelActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setStep(3)}>
                <Text style={styles.secondaryButtonText}>← Geri</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} disabled={saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>✓ Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StepNav({ onBack, onSave, onNext, saving }) {
  return (
    <View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} disabled={saving} onPress={onSave}>
          {saving ? <ActivityIndicator color={colors.inkNavy} /> : <Text style={styles.secondaryButtonText}>Kaydet ve Bitir</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={onNext}>
          <Text style={styles.primaryButtonText}>Devam Et →</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onBack} style={{ alignItems: 'center', marginTop: 12 }}>
        <Text style={styles.backLink}>← Geri</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  progressTrack: { height: 4, backgroundColor: colors.paperLine },
  progressFill: { height: 4, backgroundColor: colors.brass },
  title: { fontSize: 20, fontWeight: '700', color: colors.inkNavy, marginBottom: 16, marginTop: 4 },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.paperLine,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: colors.white,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  choice: {
    width: '47%',
    backgroundColor: colors.paperRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.paperLine,
    paddingVertical: 20,
    alignItems: 'center',
  },
  choiceActive: {
    borderColor: colors.brass,
    backgroundColor: '#fbf3e6',
  },
  choiceIcon: { fontSize: 26, marginBottom: 6 },
  choiceLabel: { fontSize: 14, fontWeight: '600', color: colors.slate },
  choiceLabelActive: { color: colors.inkNavy },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.paperRaised,
    borderWidth: 1,
    borderColor: colors.paperLine,
  },
  chipActive: { backgroundColor: colors.inkNavy, borderColor: colors.inkNavy },
  chipText: { fontSize: 13, color: colors.slate, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  smallButton: {
    backgroundColor: colors.paperLine,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  smallButtonText: { color: colors.inkNavy, fontWeight: '600', fontSize: 13 },
  error: { color: colors.danger, marginTop: 14, fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  primaryButton: {
    backgroundColor: colors.inkNavy,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  secondaryButton: {
    backgroundColor: colors.paperRaised,
    borderWidth: 1,
    borderColor: colors.paperLine,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.inkNavy, fontWeight: '600', fontSize: 14 },
  linkButton: { alignItems: 'center', marginTop: 20 },
  linkButtonText: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
  backLink: { color: colors.muted, fontSize: 13 },
});
