import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { usePropertyWizard } from '../../context/PropertyWizardContext';
import { CATEGORY_FIELDS } from './categoryFields';
import { propertiesApi } from '../../api/properties';
import { colors } from '../../theme';

const CATEGORY_LABELS = {
  apartment: 'Konut',
  land: 'Arsa',
  field: 'Tarla',
  commercial: 'İşyeri',
  timeshare: 'Devre Mülk',
};

const LISTING_LABELS = { sale: 'Satılık', rent: 'Kiralık' };

export default function WizardPreviewScreen({ navigation }) {
  const { draft, resetDraft } = usePropertyWizard();
  const [saving, setSaving] = useState(false);

  const fields = CATEGORY_FIELDS[draft.propertyType] || [];
  const priceLabel = draft.price
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(draft.price))
    : '—';

  function fieldDisplayValue(field) {
    const raw = field.extra ? draft.extraAttributes?.[field.key] : draft[field.key];
    if (raw == null || raw === '') return null;
    if (field.type === 'boolean') return raw ? 'Var' : 'Yok';
    return String(raw);
  }

  async function handlePublish() {
    setSaving(true);
    try {
      const payload = {
        title: draft.title,
        propertyType: draft.propertyType,
        listingType: draft.listingType,
        province: draft.province,
        district: draft.district,
        neighborhood: draft.neighborhood,
        areaM2: Number(draft.areaM2),
        price: Number(draft.price),
        priceCurrency: draft.priceCurrency,
        deedStatus: draft.deedStatus,
        mortgageEligible: draft.mortgageEligible,
        rooms: draft.rooms || undefined,
        bathrooms: draft.bathrooms ? Number(draft.bathrooms) : undefined,
        floor: draft.floor || undefined,
        heatingType: draft.heatingType || undefined,
        dues: draft.dues ? Number(draft.dues) : undefined,
        buildingAge: draft.buildingAge ? Number(draft.buildingAge) : undefined,
        hasPool: draft.hasPool,
        hasGym: draft.hasGym,
        hasSecurity: draft.hasSecurity,
        hasParking: draft.hasParking,
        nearMetro: draft.nearMetro,
        view: draft.view || undefined,
        facade: draft.facade || undefined,
        notes: draft.notes || undefined,
        photoUrls: draft.photoUrls,
        extraAttributes: draft.extraAttributes,
      };
      await propertiesApi.create(payload);
      resetDraft();
      navigation.navigate('PropertyList');
    } catch (err) {
      const message = err?.response?.data?.message ?? 'İlan yayınlanamadı, tekrar deneyin.';
      Alert.alert('Hata', Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {draft.photoUrls?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {draft.photoUrls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.photo} />
            ))}
          </ScrollView>
        )}

        <Text style={styles.title}>{draft.title}</Text>
        <Text style={styles.subtitle}>
          {LISTING_LABELS[draft.listingType]} · {CATEGORY_LABELS[draft.propertyType]}
        </Text>

        <View style={styles.card}>
          <Field label="Fiyat" value={priceLabel} />
          <Field label="Konum" value={`${draft.neighborhood}, ${draft.district} / ${draft.province}`} />
          <Field label="Metrekare" value={`${draft.areaM2} m²`} />
          <Field label="Tapu Durumu" value={draft.deedStatus} />
          {fields.map((field) => {
            const value = fieldDisplayValue(field);
            return value ? <Field key={field.key} label={field.label} value={value} /> : null;
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.publishButton} onPress={handlePublish} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.publishButtonText}>Yayınla</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  photo: { width: 140, height: 100, borderRadius: 8, marginRight: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.inkNavy },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 14 },
  card: { backgroundColor: colors.paperRaised, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: colors.paperLine },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, textTransform: 'uppercase', color: colors.muted, marginBottom: 2 },
  fieldValue: { fontSize: 15, color: colors.slate },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.paperLine },
  publishButton: { backgroundColor: colors.inkNavy, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  publishButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
