import { View, Text, StyleSheet } from 'react-native';

export default function OfflineBanner({ cachedAt }) {
  if (!cachedAt) return null;
  const label = new Date(cachedAt).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Çevrimdışısınız — {label} tarihli veriler gösteriliyor</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffe69c',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  text: { color: '#664d03', fontSize: 12, textAlign: 'center' },
});
