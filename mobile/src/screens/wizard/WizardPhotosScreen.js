import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { usePropertyWizard } from '../../context/PropertyWizardContext';
import { uploadFile } from '../../api/client';
import { colors } from '../../theme';

export default function WizardPhotosScreen({ navigation }) {
  const { draft, updateDraft } = usePropertyWizard();
  const [photos, setPhotos] = useState([]);

  async function uploadAndAddPhoto(asset) {
    const localUri = asset.uri;
    const tempId = `${Date.now()}-${Math.random()}`;
    setPhotos((prev) => [...prev, { id: tempId, localUri, url: null, uploading: true }]);

    try {
      const url = await uploadFile(localUri, asset.mimeType);
      setPhotos((prev) => {
        const next = prev.map((p) => (p.id === tempId ? { ...p, url, uploading: false } : p));
        updateDraft({ photoUrls: next.filter((p) => p.url).map((p) => p.url) });
        return next;
      });
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
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
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      uploadAndAddPhoto(result.assets[0]);
    }
  }

  function removePhoto(id) {
    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== id);
      updateDraft({ photoUrls: next.filter((p) => p.url).map((p) => p.url) });
      return next;
    });
  }

  function handleNext() {
    navigation.navigate('WizardPreview');
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.pickButton} onPress={pickFromLibrary}>
            <Text style={styles.pickButtonText}>📁 Galeriden Seç</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickButton} onPress={takePhoto}>
            <Text style={styles.pickButtonText}>📷 Fotoğraf Çek</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {photos.map((p) => (
            <View key={p.id} style={styles.photoWrap}>
              <Image source={{ uri: p.localUri }} style={styles.photo} />
              {p.uploading ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color={colors.white} />
                </View>
              ) : (
                <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(p.id)}>
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Devam Et</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pickButton: { flex: 1, backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.paperLine, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  pickButtonText: { fontSize: 14, fontWeight: '600', color: colors.slate },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { width: 100, height: 100, borderRadius: 8, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  removeButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  removeButtonText: { color: colors.white, fontSize: 16, lineHeight: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.paperLine },
  nextButton: { backgroundColor: colors.inkNavy, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  nextButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
