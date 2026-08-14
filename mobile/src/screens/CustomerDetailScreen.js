import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { colors } from '../theme';
import { fetchWithCache } from '../utils/offlineCache';
import OfflineBanner from '../components/OfflineBanner';
import VoiceNoteRecorder from '../components/VoiceNoteRecorder';
import VoiceNoteList from '../components/VoiceNoteList';
import { buildWhatsappUrl, buildMailtoUrl } from '../utils/contact';

const formatMoney = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0);

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
  const [offlineCachedAt, setOfflineCachedAt] = useState(null);
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [matches, setMatches] = useState([]);

  const loadVoiceNotes = useCallback(() => {
    customersApi.listVoiceNotes(id).then(setVoiceNotes).catch(() => {});
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchWithCache(`customer:${id}`, () => customersApi.getOne(id))
        .then((result) => {
          setCustomer(result.data);
          setOfflineCachedAt(result.fromCache ? result.cachedAt : null);
        })
        .catch(() => {});
      loadVoiceNotes();
      customersApi.matchingProperties(id).then(setMatches).catch(() => setMatches([]));
    }, [id, loadVoiceNotes]),
  );

  if (!customer) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.inkNavy} />;
  }

  const budgetLabel = customer.budget
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: customer.budgetCurrency || 'TRY', maximumFractionDigits: 0 }).format(customer.budget)
    : null;

  // "Talep tamamlanma orani" -- Hizli Kayit'tan gelen musterilerde eksik
  // kalabilecek alanlari danismana hatirlatir (web ile ayni mantik)
  const completionChecklist = [
    { label: 'Bütçe', filled: !!customer.budget },
    { label: 'Ne aradığı', filled: !!customer.propertyInterest },
    { label: 'Bölge tercihi', filled: !!(customer.preferredDistricts && customer.preferredDistricts.length) },
    { label: 'Zaman çizelgesi', filled: !!customer.purchaseTimeline },
    { label: 'E-posta', filled: !!customer.email },
    { label: 'Adres', filled: !!customer.address },
    { label: 'Detaylı aradığı özellikler', filled: !!customer.requirements },
  ];
  const filledCount = completionChecklist.filter((c) => c.filled).length;
  const completionPct = Math.round((filledCount / completionChecklist.length) * 100);
  const missingFields = completionChecklist.filter((c) => !c.filled);

  const timelineLabels = {
    immediate: 'Hemen',
    '1_3_months': '1–3 ay içinde',
    '3_6_months': '3–6 ay içinde',
    later: 'Daha sonra',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <OfflineBanner cachedAt={offlineCachedAt} />
      <Text style={styles.name}>{customer.firstName} {customer.lastName}</Text>
      <Text style={styles.type}>{CUSTOMER_TYPES[customer.type] || customer.type}</Text>

      <TouchableOpacity onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
        <Text style={styles.phoneLink}>📞 {customer.phone}</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() =>
            Linking.openURL(
              buildWhatsappUrl(customer.phone, `Merhaba ${customer.firstName}, size ulaşmak istedim.`),
            )
          }
        >
          <Text style={styles.contactButtonText}>WhatsApp</Text>
        </TouchableOpacity>
        {customer.email ? (
          <TouchableOpacity
            style={[styles.contactButton, styles.contactButtonSecondary]}
            onPress={() =>
              Linking.openURL(buildMailtoUrl(customer.email, 'Merhaba', `Merhaba ${customer.firstName},\n\n`))
            }
          >
            <Text style={styles.contactButtonSecondaryText}>E-posta</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {completionPct < 100 && (
        <View style={styles.completionBox}>
          <View style={styles.completionRow}>
            <Text style={styles.completionLabel}>Talep %{completionPct} tamamlandı</Text>
          </View>
          <View style={styles.completionTrack}>
            <View style={[styles.completionFill, { width: `${completionPct}%` }]} />
          </View>
          <View style={styles.completionMissingWrap}>
            {missingFields.map((f) => (
              <View key={f.label} style={styles.completionChip}>
                <Text style={styles.completionChipText}>+ {f.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Field label="E-posta" value={customer.email} />
        <Field label="Adres" value={customer.address} />
        <Field label="Bütçe" value={budgetLabel} />
        <Field label="Ne Arıyor" value={customer.propertyInterest} />
        <Field label="Bölge Tercihi" value={customer.preferredDistricts && customer.preferredDistricts.join(', ')} />
        <Field label="Zaman Çizelgesi" value={customer.purchaseTimeline ? timelineLabels[customer.purchaseTimeline] : null} />
        <Field label="Aradığı Özellikler" value={customer.requirements} />
        <Field label="Notlar" value={customer.notes} />
      </View>

      {matches.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Uygun Portföyler</Text>
          {matches.map((m) => (
            <View key={m.property.id} style={styles.matchCard}>
              <Text style={styles.matchTitle}>{m.property.title} — {m.property.district}</Text>
              <Text style={styles.matchSubtitle}>
                {formatMoney(m.property.price)}{m.agentName ? ` · ${m.agentName}` : ''}
              </Text>
              <Text style={styles.matchScore}>{m.matchedCount}/{m.totalCount} kelime eşleşti (%{m.score})</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Sesli Notlar</Text>
      <VoiceNoteRecorder customerId={id} onSaved={loadVoiceNotes} />
      <View style={{ marginTop: 12 }}>
        <VoiceNoteList customerId={id} notes={voiceNotes} onDeleted={loadVoiceNotes} />
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
  phoneLink: { fontSize: 15, color: colors.brass, fontWeight: '600', marginBottom: 10 },
  contactButton: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactButtonText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  contactButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.paperLine,
  },
  contactButtonSecondaryText: { color: colors.slate, fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: colors.paperRaised,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.paperLine,
  },
  completionBox: {
    backgroundColor: '#fbf7ec',
    borderWidth: 1,
    borderColor: colors.brassLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  completionLabel: { fontSize: 12, fontWeight: '700', color: colors.inkNavy },
  completionTrack: { height: 6, backgroundColor: colors.paperLine, borderRadius: 3, overflow: 'hidden' },
  completionFill: { height: 6, backgroundColor: colors.brass },
  completionMissingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  completionChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperLine,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completionChipText: { fontSize: 11, color: colors.inkNavy },
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
  matchCard: {
    backgroundColor: colors.paperRaised,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.inkNavy,
  },
  matchTitle: { fontSize: 14, fontWeight: '600', color: colors.slate },
  matchSubtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  matchScore: { fontSize: 11, color: colors.inkNavy, marginTop: 4, fontWeight: '600' },
});
