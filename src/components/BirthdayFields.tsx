import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BirthDateParts } from '../lib/profileAge';
import { Input, useTheme } from './UI';

export default function BirthdayFields({ value, onChange }: { value: BirthDateParts; onChange: (value: BirthDateParts) => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const field = (key: keyof BirthDateParts, label: string, placeholder: string, maxLength: number, flex: number) => (
    <View style={{ flex }}>
      <Text style={styles.label}>{label}</Text>
      <Input
        value={value[key]}
        onChangeText={(text) => onChange({ ...value, [key]: text.replace(/\D/g, '').slice(0, maxLength) })}
        keyboardType="number-pad"
        placeholder={placeholder}
        maxLength={maxLength}
        accessibilityLabel={`Birthday ${label.toLowerCase()}`}
      />
    </View>
  );
  return <View style={styles.row}>{field('month', 'Month', 'MM', 2, 1)}{field('day', 'Day', 'DD', 2, 1)}{field('year', 'Year', 'YYYY', 4, 1.45)}</View>;
}

const createStyles = (colors: any) => StyleSheet.create({
  row: { flexDirection: 'row', gap: 9 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', marginBottom: 6, letterSpacing: .25 },
});
