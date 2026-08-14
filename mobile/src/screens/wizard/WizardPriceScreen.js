import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { usePropertyWizard } from '../../context/PropertyWizardContext';
import MoneyInput from '../../components/MoneyInput';
import { colors } from '../../theme';

export default function WizardPriceScreen({ navigation }) {
  const { draft, updateDraft } = usePropertyWizard();
  const [price, setPrice] = useState(draft.price);
  const [deedStatus, setDeedStatus] = useState(draft.deedStatus);
  const [mortgageEligible, setMortgageEligible] = useState(draft.mortgageEligible);
  const [dues, setDues] = useState(draft.dues);
  const [contractEndDate, setContractEndDate] = useState(draft.contractEndDate || '');

  function handleNext() {
    updateDraft({ price, deedStatus, mortgageEligible, dues, contractEndDate });
    navigation.navigate('WizardPhotos');
  }

  const canProceed = price.toString().trim() && deedStatus.trim();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.label}>Fiyat (₺) *</Text>
        <MoneyInput style={styles.input} value={price} onChangeText={setPrice} />

        <Text style={styles.label}>Tapu Durumu *</Text>
        <TextInput style={styles.input} value={deedStatus} onChangeText={setDeedStatus} placeholder="Örn: Kat Mülkiyeti" />

        <Text style={styles.label}>Aidat (₺)</Text>
        <MoneyInput style={styles.input} value={dues} onChangeText={setDues} />

        {draft.listingType === 'rent' && (
          <>
            <Text style={styles.label}>Sözleşme Bitiş Tarihi</Text>
            <TextInput
              style={styles.input}
              value={contractEndDate}
              onChangeText={setContractEndDate}
              placeholder="YYYY-AA-GG (örn: 2026-12-31)"
              keyboardType="numbers-and-punctuation"
            />
          </>
        )}

        <View style={styles.switchField}>
          <Text style={styles.label}>Krediye Uygun</Text>
          <Switch value={mortgageEligible} onValueChange={setMortgageEligible} />
        </View>
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
  switchField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.paperLine },
  nextButton: { backgroundColor: colors.inkNavy, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.4 },
  nextButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
