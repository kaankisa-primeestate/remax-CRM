import { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { commissionsApi, COMMISSION_STATUSES, TRANSACTION_TYPES } from '../api/commissions';
import { useAuth } from '../context/AuthContext';
import { colors, statusColors } from '../theme';

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value ?? '—'}</Text>
    </View>
  );
}

function Badge({ value }) {
  const c = statusColors[value] || statusColors.pending;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{COMMISSION_STATUSES[value] || value}</Text>
    </View>
  );
}

const formatMoney = (n) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('tr-TR') : '—');

export default function CommissionDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { isBroker } = useAuth();
  const [commission, setCommission] = useState(null);

  useFocusEffect(
    useCallback(() => {
      commissionsApi.getOne(id).then(setCommission);
    }, [id]),
  );

  function handleDelete() {
    Alert.alert('Komisyonu Sil', 'Bu komisyon kaydı kalıcı olarak silinecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await commissionsApi.remove(id);
          navigation.goBack();
        },
      },
    ]);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        commission ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('CommissionForm', { commission })} style={{ marginRight: 16 }}>
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Text style={{ color: colors.dangerLight || '#ffb4b4', fontWeight: '700', fontSize: 14 }}>Sil</Text>
            </TouchableOpacity>
          </View>
        ) : null,
    });
  }, [navigation, commission]);

  if (!commission) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.inkNavy} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={{ marginBottom: 12 }}>
        <Badge value={commission.status} />
      </View>

      <Text style={styles.title}>
        {commission.propertyTitle || (commission.transactionType === 'sale' ? 'Satış İşlemi' : 'Kiralama İşlemi')}
      </Text>
      <Text style={styles.subtitle}>{TRANSACTION_TYPES[commission.transactionType]}</Text>

      <View style={styles.card}>
        <Field label="Vade Tarihi" value={formatDate(commission.dueDate)} />
        <Field label="İşlem Bedeli" value={formatMoney(commission.transactionAmount)} />
        <Field label="Komisyon Oranı" value={`%${commission.commissionRate}`} />
        <Field label="Brüt Komisyon" value={formatMoney(commission.grossCommission)} />
        <Field label="Danışman Payı" value={`%${commission.agentSharePercent}`} />
        <Field label="Danışman Brüt Payı" value={formatMoney(commission.agentGrossShare)} />
        <Field label="Stopaj" value={`%${commission.withholdingTaxPercent}`} />
        <Field label="KDV" value={`%${commission.vatPercent}`} />
        <Field label="Ceza" value={formatMoney(commission.penaltyAmount)} />
      </View>

      <View style={styles.previewBox}>
        <Text style={styles.previewTextStrong}>Net Ödenecek: {formatMoney(commission.netPayable)}</Text>
      </View>

      {commission.notes ? (
        <View style={styles.card}>
          <Field label="Notlar" value={commission.notes} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 20, fontWeight: '700', color: colors.inkNavy },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 14 },
  card: {
    backgroundColor: colors.paperRaised,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.paperLine,
    marginTop: 14,
  },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, textTransform: 'uppercase', color: colors.muted, marginBottom: 2 },
  fieldValue: { fontSize: 15, color: colors.slate },
  previewBox: {
    backgroundColor: colors.paperRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.paperLine,
    padding: 14,
    marginTop: 14,
  },
  previewTextStrong: { fontSize: 16, color: colors.inkNavy, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
});
