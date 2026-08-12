import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { uploadFile } from '../api/client';
import { customersApi } from '../api/customers';
import { colors } from '../theme';

export default function VoiceNoteRecorder({ customerId, onSaved }) {
  const [status, setStatus] = useState('idle');
  const recordingRef = useRef(null);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('İzin Gerekli', 'Sesli not kaydetmek için mikrofon izni vermeniz gerekiyor.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setStatus('recording');
    } catch (err) {
      Alert.alert('Hata', 'Kayıt başlatılamadı.');
    }
  }

  async function stopRecording() {
    try {
      await recordingRef.current.stopAndUnloadAsync();
      setStatus('stopped');
    } catch (err) {
      Alert.alert('Hata', 'Kayıt durdurulamadı.');
    }
  }

  async function handleSave() {
    setStatus('uploading');
    try {
      const uri = recordingRef.current.getURI();
      const url = await uploadFile(uri, 'audio/m4a', `voice-note-${Date.now()}.m4a`);
      await customersApi.addVoiceNote(customerId, url);
      recordingRef.current = null;
      setStatus('idle');
      if (onSaved) onSaved();
    } catch (err) {
      Alert.alert('Hata', 'Sesli not kaydedilemedi. Tekrar deneyin.');
      setStatus('idle');
    }
  }

  function handleDiscard() {
    recordingRef.current = null;
    setStatus('idle');
  }

  if (status === 'uploading') {
    return (
      <View style={styles.row}>
        <ActivityIndicator color={colors.inkNavy} />
        <Text style={styles.uploadingText}>Yükleniyor…</Text>
      </View>
    );
  }

  if (status === 'stopped') {
    return (
      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.discardButton]} onPress={handleDiscard}>
          <Text style={styles.discardButtonText}>Sil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'recording') {
    return (
      <TouchableOpacity style={[styles.button, styles.recordingButton]} onPress={stopRecording}>
        <Text style={styles.recordingButtonText}>⏹ Durdur (Kayıt Yapılıyor…)</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.button, styles.idleButton]} onPress={startRecording}>
      <Text style={styles.idleButtonText}>🎙️ Sesli Not Ekle</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  idleButton: { backgroundColor: colors.inkNavy },
  idleButtonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  recordingButton: { backgroundColor: colors.danger },
  recordingButtonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  saveButton: { backgroundColor: colors.inkNavy, flex: 1 },
  saveButtonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  discardButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.paperLine, flex: 1 },
  discardButtonText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  uploadingText: { color: colors.muted, fontSize: 13 },
});
