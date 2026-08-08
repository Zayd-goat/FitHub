import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, useColorScheme, View, ViewStyle } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

export const darkColors = {
  bg: '#111318', panel: '#1C1F26', panel2: '#23262D', input: '#202329', text: '#FFFFFF', muted: '#A7AAB3',
  primary: '#FF3B30', blue: '#3478F6', green: '#30D158', gold: '#FFD60A', border: '#30343D', danger: '#FF453A',
  cyan: '#3478F6', purple: '#FFD60A', primarySoft: '#3A1F20', blueSoft: '#1B2944', greenSoft: '#183522', goldSoft: '#3A3314',
  nav: '#14171C', shadow: '#000000'
};

export const lightColors = {
  bg: '#F6F7F9', panel: '#FFFFFF', panel2: '#F3F4F6', input: '#F5F6F8', text: '#111827', muted: '#6B7280',
  primary: '#FF3B30', blue: '#3478F6', green: '#30D158', gold: '#FFD60A', border: '#E1E4E9', danger: '#D92D20',
  cyan: '#3478F6', purple: '#C99B00', primarySoft: '#FFE7E5', blueSoft: '#EAF1FF', greenSoft: '#EAF8EF', goldSoft: '#FFF4C2',
  nav: '#FFFFFF', shadow: '#C9CED6'
};

type ThemeMode = 'system' | 'dark' | 'light';
type ThemeColors = { [K in keyof typeof darkColors]: string };

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({ themeMode: 'system', setThemeMode: () => {}, isDark: true, colors: darkColors });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    Storage.getItem('fithub_theme_mode').then((value) => {
      if (value === 'system' || value === 'dark' || value === 'light') setMode(value);
    }).catch(() => {});
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setMode(mode);
    Storage.setItem('fithub_theme_mode', mode).catch(() => {});
  };

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme !== 'light');
  const value = useMemo(() => ({ themeMode, setThemeMode, isDark, colors: (isDark ? darkColors : lightColors) as ThemeColors }), [themeMode, isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const s = shared(colors);
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  const s = shared(colors);
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.button, secondary && s.secondaryButton, disabled && { opacity: .45 }, pressed && { opacity: .84 }]}>
      <Text style={[s.buttonText, secondary && { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function OutlineButton({ title, onPress, disabled = false, compact = false }: { title: string; onPress: () => void; disabled?: boolean; compact?: boolean }) {
  const { colors } = useTheme();
  const s = shared(colors);
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.outlineButton, compact && s.outlineButtonCompact, disabled && { opacity: .45 }, pressed && { opacity: .78 }]}>
      <Text style={s.outlineButtonText}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const { colors } = useTheme();
  const s = shared(colors);
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.style]} />;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const s = shared(colors);
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  const s = shared(colors);
  return <View style={{ marginBottom: 10 }}><Text style={s.section}>{title}</Text>{subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}</View>;
}

const shared = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, marginBottom: 12 },
  button: { backgroundColor: colors.primary, minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginVertical: 5 },
  secondaryButton: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  outlineButton: { backgroundColor: '#FFFFFF', minHeight: 46, borderRadius: 11, borderWidth: 1.5, borderColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, marginVertical: 5 },
  outlineButtonCompact: { minHeight: 36, paddingHorizontal: 12, marginVertical: 0 },
  outlineButtonText: { color: colors.blue, fontWeight: '900', fontSize: 13 },
  buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: .2 },
  input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.text, paddingHorizontal: 13, marginBottom: 10, fontSize: 15 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, marginRight: 7, marginBottom: 7, backgroundColor: colors.panel },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: colors.primary, fontWeight: '900' },
  section: { color: colors.text, fontSize: 19, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 3, lineHeight: 18, fontSize: 12 }
});
