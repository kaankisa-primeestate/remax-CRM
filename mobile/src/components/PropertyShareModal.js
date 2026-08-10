import { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme';

const WEB_BASE_URL = 'https://remaxbostanci.com';

export default function PropertyShareModal({ visible, propertyId, propertyTitle, onClose }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${WEB_BASE_URL}/ilan/${propertyId}`;

  async function handleCopy() {
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    try {
      await Share.share({
        message: `"${propertyTitle}" ilanına göz atın: ${shareUrl}`,
      });
    } catch (err) {
      Alert.alert('Hata', 'Paylaşım açılamadı.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>İlanı Paylaş</Text>

          <View style={styles.qrWrap}>
            <QRCode value={shareUrl} size={200} />
          </View>

          <Text style={styles.link}>{shareUrl}</Text>

          <TouchableOpacity style={styles.button} onPress={handleNativeShare}>
            <Text style={styles.buttonText}>Paylaş (WhatsApp, SMS vb.)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleCopy}>
            <Text style={styles.buttonSecondaryText}>{copied ? 'Kopyalandı ✓' : 'Linki Kopyala'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: colors.paperRaised, borderRadius: 14, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.inkNavy, marginBottom: 16 },
  qrWrap: { backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 16 },
  link: { fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: colors.inkNavy, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, width: '100%', alignItems: 'center', marginBottom: 10 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.paperLine },
  buttonSecondaryText: { color: colors.slate, fontWeight: '600', fontSize: 14 },
  closeButton: { marginTop: 4, paddingVertical: 8 },
  closeButtonText: { color: colors.muted, fontSize: 13 },
});
