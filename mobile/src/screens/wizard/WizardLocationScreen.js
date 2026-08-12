import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { usePropertyWizard } from '../../context/PropertyWizardContext';
import { colors } from '../../theme';

export default function WizardLocationScreen({ navigation }) {
  const { draft, updateDraft } = usePropertyWizard();
  const [province, setProvince] = useState(draft.province);
  const [district, setDistrict] = useState(draft.district);
  const [neighborhood, setNeighborhood] = useState(draft.neighborhood);

  function handleNext() {
    updateDraft({ province, district, neighborhood });
    navigation.navigate('WizardPrice');
  }

  const canProceed = province.trim() && district.trim() && neighborhood.trim();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.label}>İl *</Text>
        <TextInput style={styles.input} value={province} onChangeText={setProvince} />

        <Text style={styles.label}>İlçe *</Text>
        <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="Örn: Kadıköy" />

        <Text style={styles.label}>Mahalle *</Text>
        <TextInput style={styles.input} value={neighborhood} onChangeText={setNeighborhood} placeholder="Örn: Göztepe" />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]} onPress={handleNext} disabled={!canProceed}>
          <Text style={styles.nextButtonText}>Devam Et</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  label: { fontSize: 12, textTransform: 'uppercase', color: colors.muted, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: colors.paperLine, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, backgroundColor: colors.white },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.paperLine },
  nextButton: { backgroundColor: colors.inkNavy, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.4 },
  nextButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
