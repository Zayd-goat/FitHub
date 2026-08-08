import React from 'react';
import { Appearance, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

const darkColors = {
  bg: '#111318', panel: '#1C1F26', panel2: '#242832', input: '#171A20', text: '#FFFFFF', muted: '#A7AAB3',
  primary: '#FF3B30', blue: '#3478F6', green: '#30D158', gold: '#FFD60A', border: '#343841', danger: '#FF453A',
  cyan: '#3478F6', purple: '#FFD60A', primarySoft: '#3B2022', blueSoft: '#1D2B47', greenSoft: '#193522', goldSoft: '#3A3314'
};

const lightColors = {
  bg: '#F7F8FA', panel: '#FFFFFF', panel2: '#F0F2F5', input: '#F2F4F7', text: '#111318', muted: '#686D78',
  primary: '#FF3B30', blue: '#3478F6', green: '#30B957', gold: '#C99B00', border: '#D9DDE4', danger: '#D92D20',
  cyan: '#3478F6', purple: '#C99B00', primarySoft: '#FFE7E5', blueSoft: '#E8F0FF', greenSoft: '#E7F8EC', goldSoft: '#FFF4C2'
};

// FitHub follows the phone's light/dark appearance. Dark remains the intended default brand look.
export const colors = Appearance.getColorScheme() === 'light' ? lightColors : darkColors;

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, disabled && { opacity: .45 }, pressed && { opacity: .82 }]}>
      <Text style={[styles.buttonText, secondary && { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ marginBottom: 10 }}><Text style={styles.section}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, marginBottom: 12 },
  button: { backgroundColor: colors.primary, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginVertical: 5 },
  secondaryButton: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.text, paddingHorizontal: 14, marginBottom: 10, fontSize: 16 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8, backgroundColor: colors.input },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: '700' },
  chipTextActive: { color: colors.primary, fontWeight: '900' },
  section: { color: colors.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 3, lineHeight: 19 }
});
