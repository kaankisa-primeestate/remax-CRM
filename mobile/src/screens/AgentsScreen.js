import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { usersApi } from '../api/users';
import { colors } from '../theme';

export default function AgentsScreen() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await usersApi.listAgents();
    setAgents(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleAdd() {
    if (!form.name || !form.email || form.password.length < 6) {
      setError('Ad Soyad, e-posta ve en az 6 haneli şifre zorunludur.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await usersApi.createAgent(form);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Danışman eklenemedi.';
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
      <FlatList
        style={styles.container}
        contentContainerStyle={{ padding: 16 }}
        data={agents}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Yeni Danışman Ekle</Text>

            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => set('name', v)} />

            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(v) => set('email', v)}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={(v) => set('password', v)}
              secureTextEntry
              autoCapitalize="none"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>+ Danışman Ekle</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Danışmanlar</Text>
            {loading && <ActivityIndicator color={colors.inkNavy} style={{ marginTop: 12 }} />}
          </View>
        }
        ListEmptyComponent={
          !loading && <Text style={styles.empty}>Henüz danışman eklenmemiş.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSubtitle}>{item.email}</Text>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  formCard: {
    backgroundColor: colors.paperRaised,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.paperLine,
    marginBottom: 16,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.inkNavy, marginBottom: 8 },
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
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
  button: {
    backgroundColor: colors.inkNavy,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.inkNavy,
    marginTop: 24,
    marginBottom: 4,
  },
  row: {
    backgroundColor: colors.paperRaised,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.paperLine,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.slate },
  rowSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 12, fontSize: 14 },
});
