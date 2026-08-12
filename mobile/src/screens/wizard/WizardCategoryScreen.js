import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePropertyWizard } from '../../context/PropertyWizardContext';
import { colors } from '../../theme';

const CATEGORIES = [
  { value: 'apartment', label: 'Konut', icon: '🏠' },
  { value: 'land', label: 'Arsa', icon: '🌳' },
  { value: 'field', label: 'Tarla', icon: '🌾' },
  { value: 'commercial', label: 'İşyeri', icon: '🏢' },
  { value: 'timeshare', label: 'Devre Mülk', icon: '🔑' },
];

export default function WizardCategoryScreen({ navigation }) {
  const { updateDraft } = usePropertyWizard();

  function handleSelect(value) {
    updateDraft({ propertyType: value });
    navigation.navigate('WizardListingType');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Ne satıyor/kiralıyorsunuz?</Text>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.value} style={styles.card} onPress={() => handleSelect(cat.value)}>
            <Text style={styles.icon}>{cat.icon}</Text>
            <Text style={styles.label}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 20 },
  question: { fontSize: 20, fontWeight: '700', color: colors.inkNavy, marginBottom: 20, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: colors.paperRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.paperLine,
    paddingVertical: 28,
    alignItems: 'center',
  },
  icon: { fontSize: 36, marginBottom: 10 },
  label: { fontSize: 15, fontWeight: '600', color: colors.slate },
});
