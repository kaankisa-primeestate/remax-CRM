import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { colors } from '../theme';

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

export default function CustomerDetailScreen({ route }) {
  const { id } = route.params;
  const [customer, setCustomer] = useState(null);

  useFocusEffect(
    useCallback(() => {
      customersApi.getOne(id).then(setCustomer);
    }, [id]),
  );

  if (!customer) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.inkNavy} />;
  }

  const budgetLabel = customer.budget
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: customer.budgetCurrency || 'TRY', maximumFractionDigits: 0 }).format(customer.budget)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.name}>{customer.firstName} {customer.lastName}</Text>
      <Text style={styles.type}>{CUSTOMER_TYPES[customer.type] || customer.type}</Text>

      <TouchableOpacity onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
        <Text style={styles.phoneLink}>📞 {customer.phone}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Field label="E-posta" value={customer.email} />
        <Field label="Adres" value={customer.address} />
        <Field label="Bütçe" value={budgetLabel} />
        <Field label="Aradığı Özellikler" value={customer.requirements} />
        <Field label="Notlar" value={customer.notes} />
      </View>

      <Text style={styles.sectionTitle}>Görüşme Geçmişi</Text>
      {(!customer.interactions || customer.interactions.length === 0) && (
        <Text style={styles.empty}>Henüz görüşme kaydı yok.</Text>
      )}
      {customer.interactions?.map((entry) => (
        <View key={entry.id} style={styles.interactionCard}>
          <Text style={styles.interactionDate}>
            {new Date(entry.occurredAt).toLocaleString('tr-TR')}
          </Text>
          <Text style={styles.interactionNotes}>{entry.notes}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  name: { fontSize: 24, fontWeight: '700', color: colors.inkNavy },
  type: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 10 },
  phoneLink: { fontSize: 15, color: colors.brass, fontWeight: '600', marginBottom: 16 },
  card: {
    backgroundColor: colors.paperRaised,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.paperLine,
  },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, textTransform: 'uppercase', color: colors.muted, marginBottom: 2 },
  fieldValue: { fontSize: 15, color: colors.slate },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.inkNavy, marginTop: 24, marginBottom: 10 },
  empty: { color: colors.muted, fontSize: 14 },
  interactionCard: {
    backgroundColor: colors.paperRaised,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.brass,
  },
  interactionDate: { fontSize: 11, color: colors.muted, marginBottom: 4 },
  interactionNotes: { fontSize: 14, color: colors.slate },
});
