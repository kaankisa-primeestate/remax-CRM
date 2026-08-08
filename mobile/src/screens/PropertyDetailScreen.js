import { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { propertiesApi, PROPERTY_TYPES, LISTING_TYPES, PROPERTY_STATUSES } from '../api/properties';
import { colors } from '../theme';

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

  useFocusEffect(
    useCallback(() => {
      propertiesApi.getOne(id).then(setProperty);
    }, [id]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        property ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('PropertyForm', { property })}
            style={{ marginRight: 4 }}
          >
            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>Düzenle</Text>
          </TouchableOpacity>
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
      <Text style={styles.title}>{property.title}</Text>
      <Text style={styles.subtitle}>
        {LISTING_TYPES[property.listingType]} · {PROPERTY_TYPES[property.propertyType]} · {PROPERTY_STATUSES[property.status]}
      </Text>
      {property.photoUrls?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {property.photoUrls.map((url, idx) => (
            <Image key={idx} source={{ uri: url }} style={styles.image} />
          ))}
        </ScrollView>
      )}
      <View style={styles.card}>
        <Field label="Konum" value={`${property.neighborhood}, ${property.district} / ${property.province}`} />
        <Field label="Fiyat" value={priceLabel} />
        <Field label="Metrekare" value={`${property.areaM2} m²`} />
        <Field label="Tapu Durumu" value={property.deedStatus} />
        <Field label="Krediye Uygunluk" value={property.mortgageEligible ? 'Uygun' : 'Uygun Değil'} />
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
});
