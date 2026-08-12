import { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { usePropertyWizard } from '../../context/PropertyWizardContext';
import { CATEGORY_FIELDS } from './categoryFields';
import { colors } from '../../theme';

export default function WizardDetailsScreen({ navigation }) {
  const { draft, updateDraft, updateExtra } = usePropertyWizard();
  const [title, setTitle] = useState(draft.title);
  const [areaM2, setAreaM2] = useState(draft.areaM2);

  const fields = CATEGORY_FIELDS[draft.propertyType] || [];

  function handleFieldChange(field, value) {
    if (field.extra) {
      updateExtra({ [field.key]: value });
    } else {
      updateDraft({ [field.key]: value });
    }
  }

  function getFieldValue(field) {
    return field.extra ? draft.extraAttributes?.[field.key] : draft[field.key];
  }

  function handleNext() {
    updateDraft({ title, areaM2 });
    navigation.navigate('WizardLocation');
  }

  const canProceed = title.trim().length > 0 && areaM2.trim().length > 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.label}>İlan Başlığı *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn: Kadıköy 3+1 Deniz Manzaralı" />

        <Text style={styles.label}>Metrekare *</Text>
        <TextInput style={styles.input} value={areaM2} onChangeText={setAreaM2} keyboardType="numeric" placeholder="Örn: 120" />

        {fields.map((field) => (
          <View key={field.key}>
            <Text style={styles.label}>{field.label}</Text>
            {field.type === 'boolean' ? (
              <View style={styles.switchRow}>
                <Switch value={!!getFieldValue(field)} onValueChange={(v) => handleFieldChange(field, v)} />
              </View>
            ) : (
              <TextInput style={styles.input} value={getFieldValue(field) != null ? String(getFieldValue(field)) : ''} onChangeText={(v) => handleFieldChange(field, v)} placeholder={field.placeholder} keyboardType={field.type === 'number' ? 'numeric' : 'default'} />
            )}
          </View>
        ))}
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
  switchRow: { flexDirection: 'row' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.paperLine },
  nextButton: { backgroundColor: colors.inkNavy, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.4 },
  nextButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
