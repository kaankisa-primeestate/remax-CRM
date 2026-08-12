import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { customersApi } from '../api/customers';
import { colors } from '../theme';

const formatDateTime = (d) =>
  new Date(d).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function VoiceNoteList({ customerId, notes, onDeleted }) {
  const [playingId, setPlayingId] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  async function handlePlay(note) {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    if (playingId === note.id) {
      setPlayingId(null);
      return;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: note.url });
    soundRef.current = sound;
    setPlayingId(note.id);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        setPlayingId(null);
      }
    });
    await sound.playAsync();
  }

  function handleDelete(note) {
    Alert.alert('Sesli Notu Sil', 'Bu sesli not kalıcı olarak silinecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await customersApi.removeVoiceNote(customerId, note.id);
          if (onDeleted) onDeleted();
        },
      },
    ]);
  }

  if (!notes || notes.length === 0) {
    return <Text style={styles.empty}>Henüz sesli not yok.</Text>;
  }

  return (
    <View>
      {notes.map((note) => (
        <View key={note.id} style={styles.row}>
          <TouchableOpacity style={styles.playButton} onPress={() => handlePlay(note)}>
            <Text style={styles.playButtonText}>{playingId === note.id ? '⏸' : '▶️'}</Text>
          </TouchableOpacity>
          <Text style={styles.date}>{formatDateTime(note.createdAt)}</Text>
          <TouchableOpacity onPress={() => handleDelete(note)}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paperRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.paperLine,
    padding: 12,
    marginBottom: 8,
  },
  playButton: { marginRight: 12 },
  playButtonText: { fontSize: 20 },
  date: { flex: 1, fontSize: 13, color: colors.slate },
  deleteText: { fontSize: 18, marginLeft: 12 },
  empty: { color: colors.muted, fontSize: 13, marginTop: 8 },
});
