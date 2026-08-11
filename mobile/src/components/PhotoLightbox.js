import { useRef } from 'react';
import { Modal, View, Image, ScrollView, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PhotoLightbox({ visible, photos, initialIndex, onClose }) {
  const scrollRef = useRef(null);

  function handleLayout() {
    if (scrollRef.current && initialIndex > 0) {
      scrollRef.current.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>

        <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onLayout={handleLayout}>
          {photos.map((url, i) => (
            <View key={i} style={styles.page}>
              <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <Text style={styles.counter}>{initialIndex + 1} / {photos.length}</Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  closeButton: { position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 10 },
  closeText: { color: 'white', fontSize: 32, lineHeight: 32 },
  page: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
  counter: { position: 'absolute', bottom: 40, alignSelf: 'center', color: 'white', fontSize: 13 },
});
