import { useState, useEffect, useLayoutEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { commissionsApi } from '../api/commissions';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';
import ChipSelect from '../components/ChipSelect';
import MoneyInput from '../components/MoneyInput';
import { colors } from '../theme';

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'sale', label: 'Satış' },
  { value: 'rent', label: 'Kiralama' },
];

function calculatePreview(form) {
  const amount = Number(form.transactionAmount) || 0;
  const rate = Number(form.commissionRate) || 0;
  const sharePct = Number(form.agentSharePercent) || 0;
  const withholdingPct = Number(form.withholdingTaxPercent) || 0;
  const vatPct = Number(form.vatPercent) || 0;
  const penalty = Number(form.penaltyAmount) || 0;

  const gross = (amount * rate) / 100;
  const agentGross = (gross * sharePct) / 100;
  const withholding = (agentGross * withholdingPct) / 100;
  const vat = (agentGross * vatPct) / 100;
  const net = agentGross - withholding - vat - penalty;

  return { gross, net };
}

const formatMoney = (n) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n || 0);

// Bugunun tarihini GG.AA.YYYY formatinda dondurur -- yeni kayit acildiginda
// varsayilan olarak bu deger gelir, kullanici degistirmek isterse takvimden secer.
function todayFormatted() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// GG.AA.YYYY formatindaki metni gercek bir Date nesnesine cevirir
// (takvim widget'ini acarken hangi tarihte baslayacagini bilmek icin).
function parseFormatted(str) {
  const parts = (str || '').split('.');
  if (parts.length !== 3) return new Date();
  const [dd, mm, yyyy] = parts;
  const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// ISO (YYYY-MM-DD) formatindaki tarihi GG.AA.YYYY formatina cevirir
// (duzenleme modunda backend'den gelen tarihi forma yerlestirmek icin).
function isoToFormatted(iso) {
  if (!iso) return todayFormatted();
  const parts = iso.slice(0, 10).split('-');
  if (parts.length !== 3) return todayFormatted();
  const [yyyy, mm, dd] = parts;
  return `${dd}.${mm}.${yyyy}`;
}

export default function CommissionFormScreen({ navigation, route }) {
  const { isBroker } = useAuth();
  const editingCommission = route.params?.commission || null;
  const isEdit = Boolean(editingCommission);

  const [form, setForm] = useState(
    editingCommission
      ? {
          transactionType: editingCommission.transactionType || 'sale',
          propertyTitle: editingCommission.propertyTitle || '',
          transactionAmount: String(editingCommission.transactionAmount ?? ''),
          commissionRate: String(editingCommission.commissionRate ?? ''),
          agentSharePercent: String(editingCommission.agentSharePercent ?? '50'),
          withholdingTaxPercent: String(editingCommission.withholdingTaxPercent ?? '0'),
          vatPercent: String(editingCommission.vatPercent ?? '0'),
          penaltyAmount: String(editingCommission.penaltyAmount ?? '0'),
          dueDate: isoToFormatted(editingCommission.dueDate),
          notes: editingCommission.notes || '',
          agentId: editingCommission.agentId || '',
        }
      : {
          transactionType: 'sale',
          propertyTitle: '',
          transactionAmount: '',
          commissionRate: '',
          agentSharePercent: '50',
          withholdingTaxPercent: '0',
          vatPercent: '0',
          penaltyAmount: '0',
          dueDate: todayFormatted(),
          notes: '',
          agentId: '',
        },
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Komisyonu Düzenle' : 'Yeni Komisyon Kaydı' });
  }, [navigation, isEdit]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleDateChange(event, selectedDate) {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const yyyy = selectedDate.getFullYear();
      set('dueDate', `${dd}.${mm}.${yyyy}`);
    }
  }

  async function handleSave() {
    if (
      !form.transactionAmount ||
      !form.commissionRate ||
      !form.agentSharePercent ||
      !form.dueDate ||
      (isBroker && !form.agentId)
    ) {
      setError('Yıldızlı (zorunlu) alanları doldurun.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const parts = form.dueDate.split('.');
      const isoDate =
        parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : form.dueDate;

      const payload = {
        ...form,
        transactionAmount: Number(form.transactionAmount),
        commissionRate: Number(form.commissionRate),
        agentSharePercent: Number(form.agentSharePercent),
        withholdingTaxPercent: Number(form.withholdingTaxPercent) || 0,
        vatPercent: Number(form.vatPercent) || 0,
        penaltyAmount: Number(form.penaltyAmount) || 0,
        dueDate: isoDate,
        propertyTitle: form.propertyTitle || undefined,
        notes: form.notes || undefined,
        agentId: form.agentId || undefined,
      };

      if (isEdit) {
        await commissionsApi.update(editingCommission.id, payload);
      } else {
        await commissionsApi.create(payload);
      }
      navigation.goBack();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Kaydedilemedi, tekrar deneyin.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  const preview = calculatePreview(form);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <ChipSelect
          label="İşlem Tipi *"
          options={TRANSACTION_TYPE_OPTIONS}
          value={form.transactionType}
          onChange={(v) => set('transactionType', v)}
        />

        <Text style={styles.label}>Vade Tarihi *</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{form.dueDate}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={parseFormatted(form.dueDate)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />
        )}

        <Text style={styles.label}>Portföy / İşlem Açıklaması</Text>
        <TextInput
          style={styles.input}
          value={form.propertyTitle}
          onChangeText={(v) => set('propertyTitle', v)}
          placeholder="Örn: Kadıköy 3+1 Deniz Manzaralı"
        />

        <Text style={styles.label}>İşlem Bedeli (₺) *</Text>
        <MoneyInput
          style={styles.input}
          value={form.transactionAmount}
          onChangeText={(v) => set('transactionAmount', v)}
        />

        <Text style={styles.label}>Komisyon Oranı (%) *</Text>
        <TextInput
          style={styles.input}
          value={form.commissionRate}
          onChangeText={(v) => set('commissionRate', v)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Danışman Payı (%) *</Text>
        <TextInput
          style={styles.input}
          value={form.agentSharePercent}
          onChangeText={(v) => set('agentSharePercent', v)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Stopaj (%)</Text>
        <TextInput
          style={styles.input}
          value={form.withholdingTaxPercent}
          onChangeText={(v) => set('withholdingTaxPercent', v)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>KDV (%)</Text>
        <TextInput
          style={styles.input}
          value={form.vatPercent}
          onChangeText={(v) => set('vatPercent', v)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Ceza (₺)</Text>
        <MoneyInput
          style={styles.input}
          value={form.penaltyAmount}
          onChangeText={(v) => set('penaltyAmount', v)}
        />

        {isBroker && (
          <ChipSelect
            label="Danışman *"
            options={agents.map((a) => ({ value: a.id, label: a.name }))}
            value={form.agentId}
            onChange={(v) => set('agentId', v)}
          />
        )}

        <Text style={styles.label}>Notlar</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
          multiline
        />

        <View style={styles.previewBox}>
          <Text style={styles.previewText}>Brüt Komisyon: {formatMoney(preview.gross)}</Text>
          <Text style={styles.previewTextStrong}>Net Ödenecek: {formatMoney(preview.net)}</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{isEdit ? 'Güncelle' : 'Kaydet'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 6,
    marginTop: 12,
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
  dateText: { fontSize: 15, color: colors.slate },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  previewBox: {
    backgroundColor: colors.paperRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.paperLine,
    padding: 14,
    marginTop: 20,
  },
  previewText: { fontSize: 13, color: colors.slate, marginBottom: 4 },
  previewTextStrong: { fontSize: 15, color: colors.inkNavy, fontWeight: '700' },
  error: { color: colors.danger, marginTop: 14, fontSize: 13 },
  button: {
    backgroundColor: colors.inkNavy,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
