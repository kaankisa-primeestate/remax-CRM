import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function ChipSelect({ label, options, value, onChange }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.paperLine,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.inkNavy,
  },
  chipText: {
    fontSize: 13,
    color: colors.slate,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },
});
