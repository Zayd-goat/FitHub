import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

export const colors = {
  bg: '#020817', panel: '#07142c', panel2: '#0c1d3d', text: '#eef7ff', muted: '#98add0',
  cyan: '#22d3ee', blue: '#3b82f6', purple: '#a855f7', green: '#34d399', border: '#18345f', danger: '#fb7185'
};

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, disabled && { opacity: .45 }, pressed && { opacity: .8 }]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ marginBottom: 10 }}><Text style={styles.section}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, marginBottom: 12 },
  button: { backgroundColor: colors.blue, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginVertical: 5 },
  secondaryButton: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: 'white', fontWeight: '800', fontSize: 15 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#061124', color: colors.text, paddingHorizontal: 14, marginBottom: 10, fontSize: 16 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8, backgroundColor: '#061124' },
  chipActive: { backgroundColor: '#123a68', borderColor: colors.cyan },
  chipText: { color: colors.muted, fontWeight: '700' },
  section: { color: colors.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 3, lineHeight: 19 }
});
