import { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ScrollView, Share, Alert, Linking } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme';
import { customersApi } from '../api/customers';
import { buildWhatsappUrl, buildMailtoUrl } from '../utils/contact';

const WEB_BASE_URL = 'https://remaxbostanci.com';

export default function PropertyShareModal({ visible, propertyId, propertyTitle, onClose }) {
  const [copied, setCopied] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const shareUrl = `${WEB_BASE_URL}/ilan/${propertyId}`;

  useEffect(() => {
    if (visible) {
      customersApi.list().then(setCustomers).catch(() => setCustomers([]));
    }
  }, [visible]);

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

  const filteredCustomers = search
    ? customers.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  const messageText = selectedCustomer
    ? `Merhaba ${selectedCustomer.firstName}, "${propertyTitle}" ilanına göz atmanızı isterim: ${shareUrl}`
    : '';

  function handleSelectCustomer(c) {
    setSelectedCustomer(c);
    setSearch(`${c.firstName} ${c.lastName}`);
  }

  function handleClose() {
    setSearch('');
    setSelectedCustomer(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView>
            <Text style={styles.title}>İlanı Paylaş</Text>

            <View style={styles.qrWrap}>
              <QRCode value={shareUrl} size={180} />
            </View>

            <Text style={styles.link}>{shareUrl}</Text>

            <TouchableOpacity style={styles.button} onPress={handleNativeShare}>
              <Text style={styles.buttonText}>Paylaş (WhatsApp, SMS vb.)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleCopy}>
              <Text style={styles.buttonSecondaryText}>{copied ? 'Kopyalandı ✓' : 'Linki Kopyala'}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Bu İlanı Müşteriye Gönder</Text>

            <TextInput style={styles.input} placeholder="Müşteri ara…" value={search} onChangeText={(v) => { setSearch(v); setSelectedCustomer(null); }} />

            {!selectedCustomer && search ? (
              <View style={styles.resultsBox}>
                {filteredCustomers.length === 0 ? (
                  <Text style={styles.noResults}>Müşteri bulunamadı.</Text>
                ) : (
                  filteredCustomers.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.resultRow} onPress={() => handleSelectCustomer(c)}>
                      <Text style={styles.resultText}>{c.firstName} {c.lastName}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}

            {selectedCustomer ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={styles.waButton} onPress={() => Linking.openURL(buildWhatsappUrl(selectedCustomer.phone, messageText))}>
                  <Text style={styles.waButtonText}>WhatsApp</Text>
                </TouchableOpacity>
                {selectedCustomer.email ? (
                  <TouchableOpacity style={[styles.button, styles.buttonSecondary, { flex: 1 }]} onPress={() => Linking.openURL(buildMailtoUrl(selectedCustomer.email, propertyTitle, messageText))}>
                    <Text style={styles.buttonSecondaryText}>E-posta</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Kapat</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: colors.paperRaised, borderRadius: 14, padding: 24, width: '100%', maxWidth: 360, maxHeight: '85%' },
  title: { fontSize: 18, fontWeight: '700', color: colors.inkNavy, marginBottom: 16, textAlign: 'center' },
  qrWrap: { backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 16, alignSelf: 'center' },
  link: { fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: colors.inkNavy, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, width: '100%', alignItems: 'center', marginBottom: 10 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.paperLine },
  buttonSecondaryText: { color: colors.slate, fontWeight: '600', fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.paperLine, marginVertical: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.inkNavy, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: colors.paperLine, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: colors.white, marginBottom: 8 },
  resultsBox: { maxHeight: 140, borderWidth: 1, borderColor: colors.paperLine, borderRadius: 6, marginBottom: 10 },
  noResults: { padding: 10, fontSize: 13, color: colors.muted },
  resultRow: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.paperLine },
  resultText: { fontSize: 13, color: colors.slate },
  waButton: { flex: 1, backgroundColor: '#25D366', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  waButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  closeButton: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  closeButtonText: { color: colors.muted, fontSize: 13 },
});
