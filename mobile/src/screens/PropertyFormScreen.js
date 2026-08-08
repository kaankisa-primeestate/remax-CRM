import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { propertiesApi } from '../api/properties';
import { uploadFile } from '../api/client';
import ChipSelect from '../components/ChipSelect';
import { colors } from '../theme';

const PROPERTY_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Konut' },
  { value: 'land', label: 'Arsa' },
  { value: 'field', label: 'Tarla' },
  { value: 'commercial', label: 'İşyeri' },
  { value: 'timeshare', label: 'Devre Mülk' },
];

const LISTING_TYPE_OPTIONS = [
  { value: 'sale', label: 'Satılık' },
  { value: 'rent', label: 'Kiralık' },
];

export default function PropertyFormScreen({ navigation }) {
  const [form, setForm] = useState({
    title: '',
    propertyType: 'apartment',
    listingType: 'sale',
    province: '',
    district: '',
    neighborhood: '',
    areaM2: '',
    price: '',
    deedStatus: '',
    mortgageEligible: false,
    rooms: '',
    bathrooms: '',
    floor: '',
    heatingType: '',
    dues: '',
    notes: '',
  });
  const [photos, setPhotos] = useState([]); // { localUri, url, uploading }
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const isResidential = form.propertyType === 'apartment' || form.propertyType === 'timeshare';

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadAndAddPhoto(asset) {
    const localUri = asset.uri;
    const tempId = `${Date.now()}-${Math.random()}`;
    setPhotos((prev) => [...prev, { id: tempId, localUri, url: null, uploading: true }]);

    try {
      const url = await uploadFile(localUri, asset.mimeType);
      setPhotos((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, url, uploading: false } : p)),
      );
    } catch (err) {
      setPhotos((prev) => prev.filter((p) => p.id !== tempId));
      Alert.alert('Yükleme Hatası', String(err?.message || err));
    }
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçebilmek için galeri izni vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      for (const asset of result.assets) {
        uploadAndAddPhoto(asset);
      }
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf çekebilmek için kamera izni vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      uploadAndAddPhoto(result.assets[0]);
    }
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSave() {
    if (!form.title || !form.province || !form.district || !form.neighborhood || !form.areaM2 || !form.price || !form.deedStatus) {
      setError('Yıldızlı (zorunlu) alanları doldurun.');
      return;
    }
    if (photos.some((p) => p.uploading)) {
      setError('Fotoğraflar yükleniyor, lütfen bitmesini bekleyin.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const photoUrls = photos.filter((p) => p.url).map((p) => p.url);
      await propertiesApi.create({
        ...form,
        areaM2: Number(form.areaM2),
        price: Number(form.price),
        dues: form.dues ? Number(form.dues) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        rooms: form.rooms || undefined,
        floor: form.floor || undefined,
        heatingType: form.heatingType || undefined,
        notes: form.notes || undefined,
        photoUrls: photoUrls.length ? photoUrls : undefined,
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
        <Text style={styles.label}>Başlık *</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(v) => set('title', v)}
          placeholder="Örn: Kadıköy 3+1 Deniz Manzaralı"
        />

        <ChipSelect
          label="Gayrimenkul Tipi *"
          options={PROPERTY_TYPE_OPTIONS}
          value={form.propertyType}
          onChange={(v) => set('propertyType', v)}
        />
        <ChipSelect
          label="Satılık / Kiralık *"
          options={LISTING_TYPE_OPTIONS}
          value={form.listingType}
          onChange={(v) => set('listingType', v)}
        />

        <Text style={styles.label}>İl *</Text>
        <TextInput style={styles.input} value={form.province} onChangeText={(v) => set('province', v)} />

        <Text style={styles.label}>İlçe *</Text>
        <TextInput style={styles.input} value={form.district} onChangeText={(v) => set('district', v)} />

        <Text style={styles.label}>Mahalle *</Text>
        <TextInput style={styles.input} value={form.neighborhood} onChangeText={(v) => set('neighborhood', v)} />

        <Text style={styles.label}>Metrekare *</Text>
        <TextInput style={styles.input} value={form.areaM2} onChangeText={(v) => set('areaM2', v)} keyboardType="numeric" />

        <Text style={styles.label}>Fiyat (₺) *</Text>
        <TextInput style={styles.input} value={form.price} onChangeText={(v) => set('price', v)} keyboardType="numeric" />

        <Text style={styles.label}>Tapu Durumu *</Text>
        <TextInput
          style={styles.input}
          value={form.deedStatus}
          onChangeText={(v) => set('deedStatus', v)}
          placeholder="Örn: Kat Mülkiyeti"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Krediye Uygun</Text>
          <Switch
            value={form.mortgageEligible}
            onValueChange={(v) => set('mortgageEligible', v)}
            trackColor={{ true: colors.brass }}
          />
        </View>

        {isResidential && (
          <>
            <Text style={styles.label}>Oda Sayısı</Text>
            <TextInput style={styles.input} value={form.rooms} onChangeText={(v) => set('rooms', v)} placeholder="Örn: 3+1" />

            <Text style={styles.label}>Banyo Sayısı</Text>
            <TextInput style={styles.input} value={form.bathrooms} onChangeText={(v) => set('bathrooms', v)} keyboardType="numeric" />

            <Text style={styles.label}>Bulunduğu Kat</Text>
            <TextInput style={styles.input} value={form.floor} onChangeText={(v) => set('floor', v)} />

            <Text style={styles.label}>Isıtma Tipi</Text>
            <TextInput style={styles.input} value={form.heatingType} onChangeText={(v) => set('heatingType', v)} />

            <Text style={styles.label}>Aidat (₺)</Text>
            <TextInput style={styles.input} value={form.dues} onChangeText={(v) => set('dues', v)} keyboardType="numeric" />
          </>
        )}

        <Text style={styles.label}>Fotoğraflar</Text>
        <View style={styles.photoRow}>
          {photos.map((p) => (
            <View key={p.id} style={styles.photoThumbWrap}>
              <Image source={{ uri: p.localUri }} style={styles.photoThumb} />
              {p.uploading && (
                <View style={styles.photoUploadingOverlay}>
                  <ActivityIndicator color={colors.white} size="small" />
                </View>
              )}
              {!p.uploading && (
                <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto(p.id)}>
                  <Text style={styles.photoRemoveBtnText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity style={styles.photoActionBtn} onPress={pickFromLibrary}>
            <Text style={styles.photoActionBtnText}>Galeriden Seç</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoActionBtn} onPress={takePhoto}>
            <Text style={styles.photoActionBtnText}>Fotoğraf Çek</Text>
          </TouchableOpacity>
        </View>

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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  switchLabel: { fontSize: 15, color: colors.slate },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.paperRaised,
  },
  photoUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,43,69,0.5)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveBtnText: { color: colors.white, fontSize: 14, fontWeight: '700', lineHeight: 16 },
  photoActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.inkNavy,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoActionBtnText: { color: colors.inkNavy, fontWeight: '600', fontSize: 13 },
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
