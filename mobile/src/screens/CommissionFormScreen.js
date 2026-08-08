import { useState, useEffect } from 'react';
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

export default function CommissionFormScreen({ navigation }) {
  const { isBroker } = useAuth();
  const [form, setForm] = useState({
    transactionType: 'sale',
    propertyTitle: '',
    transactionAmount: '',
    commissionRate: '',
    agentSharePercent: '50',
    withholdingTaxPercent: '0',
    vatPercent: '0',
    penaltyAmount: '0',
    dueDate: '',
    notes: '',
    agentId: '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (
      !form.transactionAmount ||
      !form.commissionRate ||
      !form.agentSharePercent ||
      !form.dueDate ||
      (isBroker && !form.agentId)
    ) {
      setError('Yıldızlı (zorunlu) alanları doldurun. Tarihi GG.AA.YYYY formatında yazın (örn: 15.09.2026).');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const parts = form.dueDate.split('.');
      const isoDate =
        parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : form.dueDate;

      await commissionsApi.create({
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
      });
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <ChipSelect
          label="İşlem Tipi *"
          options={TRANSACTION_TYPE_OPTIONS}
          value={form.transactionType}
          onChange={(v) => set('transactionType', v)}
        />

        <Text style={styles.label}>Vade Tarihi * (GG.AA.YYYY)</Text>
        <TextInput
          style={styles.input}
          value={form.dueDate}
          onChangeText={(v) => set('dueDate', v)}
          placeholder="15.09.2026"
        />

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
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Kaydet</Text>}
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
