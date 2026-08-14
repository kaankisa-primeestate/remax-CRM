import { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { propertiesApi, PROPERTY_TYPES, LISTING_TYPES, PROPERTY_STATUSES } from '../api/properties';
import { colors } from '../theme';
import PropertyShareModal from '../components/PropertyShareModal';
import PhotoLightbox from '../components/PhotoLightbox';
import { fetchWithCache } from '../utils/offlineCache';
import OfflineBanner from '../components/OfflineBanner';

const formatMoney = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0);

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value ?? '—'}</Text>
    </View>
  );
}

export default function PropertyDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [property, setProperty] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [offlineCachedAt, setOfflineCachedAt] = useState(null);
  const [matches, setMatches] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchWithCache(`property:${id}`, () => propertiesApi.getOne(id))
        .then((result) => {
          setProperty(result.data);
          setOfflineCachedAt(result.fromCache ? result.cachedAt : null);
        })
        .catch(() => {});
      propertiesApi.matchingCustomers(id).then(setMatches).catch(() => setMatches([]));
    }, [id]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        property ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowShare(true)} style={{ marginRight: 16 }}>
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>Paylaş</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('PropertyForm', { property })}
              style={{ marginRight: 4 }}
            >
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>Düzenle</Text>
            </TouchableOpacity>
          </View>
        ) : null,
    });
  }, [navigation, property]);

  if (!property) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.inkNavy} />;
  }

  const priceLabel = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: property.priceCurrency || 'TRY',
    maximumFractionDigits: 0,
  }).format(property.price);

  const isResidential = property.propertyType === 'apartment' || property.propertyType === 'timeshare';
  const extras = [
    property.hasPool && 'Havuz',
    property.hasGym && 'Spor Salonu',
    property.hasSecurity && 'Güvenlik',
    property.hasParking && 'Otopark',
  ].filter(Boolean).join(', ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <OfflineBanner cachedAt={offlineCachedAt} />
      <Text style={styles.title}>{property.title}</Text>
      <Text style={styles.subtitle}>
        {LISTING_TYPES[property.listingType]} · {PROPERTY_TYPES[property.propertyType]} · {PROPERTY_STATUSES[property.status]}
      </Text>
      {property.photoUrls?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {property.photoUrls.map((url, idx) => (
            <TouchableOpacity key={idx} onPress={() => setLightboxIndex(idx)}>
              <Image source={{ uri: url }} style={styles.image} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <View style={styles.card}>
        <Field label="Konum" value={`${property.neighborhood}, ${property.district} / ${property.province}`} />
        <Field label="Fiyat" value={priceLabel} />
        <Field label="Metrekare" value={`${property.areaM2} m²`} />
        <Field label="Tapu Durumu" value={property.deedStatus} />
        <Field label="Krediye Uygunluk" value={property.mortgageEligible ? 'Uygun' : 'Uygun Değil'} />
        {property.contractEndDate && (
          <Field label="Sözleşme Bitiş Tarihi" value={new Date(property.contractEndDate).toLocaleDateString('tr-TR')} />
        )}
        {isResidential && (
          <>
            <Field label="Oda Sayısı" value={property.rooms} />
            <Field label="Banyo Sayısı" value={property.bathrooms} />
            <Field label="Bulunduğu Kat" value={property.floor} />
            <Field label="Isıtma Tipi" value={property.heatingType} />
            <Field label="Aidat" value={property.dues ? `₺${property.dues}` : null} />
          </>
        )}
        <Field label="Ek Özellikler" value={extras || null} />
        {property.notes ? <Field label="Notlar" value={property.notes} /> : null}
      </View>

      {matches.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Uygun Müşteriler</Text>
          {matches.map((m) => (
            <View key={m.customer.id} style={styles.matchCard}>
              <Text style={styles.matchTitle}>{m.customer.firstName} {m.customer.lastName}</Text>
              <Text style={styles.matchSubtitle}>
                {m.customer.budget ? formatMoney(m.customer.budget) : ''}{m.agentName ? ` · ${m.agentName}` : ''}
              </Text>
              <Text style={styles.matchScore}>{m.matchedCount}/{m.totalCount} kelime eşleşti (%{m.score})</Text>
            </View>
          ))}
        </>
      )}

      <PropertyShareModal
        visible={showShare}
        propertyId={property.id}
        propertyTitle={property.title}
        onClose={() => setShowShare(false)}
      />
      <PhotoLightbox
        visible={lightboxIndex !== null}
        photos={property.photoUrls || []}
        initialIndex={lightboxIndex || 0}
        onClose={() => setLightboxIndex(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 22, fontWeight: '700', color: colors.inkNavy },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 14 },
  image: { width: 160, height: 140, borderRadius: 10, marginRight: 10, backgroundColor: colors.paperLine },
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
