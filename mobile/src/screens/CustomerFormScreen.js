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
import ChipSelect from '../components/ChipSelect';
import MoneyInput from '../components/MoneyInput';
import { colors } from '../theme';

const CUSTOMER_TYPE_OPTIONS = [
  { value: 'buyer', label: 'Alıcı' },
  { value: 'seller', label: 'Satıcı' },
  { value: 'tenant', label: 'Kiracı' },
  { value: 'landlord', label: 'Ev Sahibi' },
];

export default function CustomerFormScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    type: 'buyer',
    budget: '',
    requirements: '',
    notes: '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.firstName || !form.lastName || !form.phone) {
      setError('Ad, soyad ve telefon zorunludur.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await customersApi.create({
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        requirements: form.requirements || undefined,
        notes: form.notes || undefined,
      });
      navigation.goBack();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Kaydedilemedi, tekrar deneyin.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.label}>Ad *</Text>
        <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => set('firstName', v)} />

        <Text style={styles.label}>Soyad *</Text>
        <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => set('lastName', v)} />

        <Text style={styles.label}>Telefon *</Text>
        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={(v) => set('phone', v)}
          placeholder="+905XXXXXXXXX"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>E-posta</Text>
        <TextInput
          style={styles.input}
          value={form.email}
          onChangeText={(v) => set('email', v)}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <ChipSelect
          label="Müşteri Tipi *"
          options={CUSTOMER_TYPE_OPTIONS}
          value={form.type}
          onChange={(v) => set('type', v)}
        />

        <Text style={styles.label}>Bütçe (₺)</Text>
        <MoneyInput
          style={styles.input}
          value={form.budget}
          onChangeText={(v) => set('budget', v)}
        />

        <Text style={styles.label}>Adres</Text>
        <TextInput style={styles.input} value={form.address} onChangeText={(v) => set('address', v)} />

        <Text style={styles.label}>Aradığı Özellikler</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.requirements}
          onChangeText={(v) => set('requirements', v)}
          multiline
          placeholder="Örn: 3+1, Kadıköy, deniz manzaralı"
        />

        <Text style={styles.label}>Notlar</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
          multiline
        />

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
