import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePropertyWizard } from '../../context/PropertyWizardContext';
import { colors } from '../../theme';

export default function WizardListingTypeScreen({ navigation }) {
  const { updateDraft } = usePropertyWizard();

  function handleSelect(value) {
    updateDraft({ listingType: value });
    navigation.navigate('WizardDetails');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.question}>İlanınız ne için?</Text>
      <TouchableOpacity style={[styles.button, styles.saleButton]} onPress={() => handleSelect('sale')}>
        <Text style={styles.buttonText}>🟢 Satılık</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.rentButton]} onPress={() => handleSelect('rent')}>
        <Text style={styles.buttonText}>🔵 Kiralık</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 20, justifyContent: 'center' },
  question: { fontSize: 20, fontWeight: '700', color: colors.inkNavy, marginBottom: 24, textAlign: 'center' },
  button: { borderRadius: 14, paddingVertical: 28, alignItems: 'center', marginBottom: 16 },
  saleButton: { backgroundColor: '#e6f7ec', borderWidth: 1, borderColor: '#34a853' },
  rentButton: { backgroundColor: '#e8f0fe', borderWidth: 1, borderColor: '#4285f4' },
  buttonText: { fontSize: 20, fontWeight: '700', color: colors.inkNavy },
});
