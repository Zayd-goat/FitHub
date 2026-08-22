import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, useColorScheme, View, ViewStyle } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { supabase } from '../lib/supabase';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ThemeKey = 'fithubGraphite' | 'icePerformance' | 'electricYellow' | 'neonPerformance' | 'warmPremium' | 'emberOrange';
export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';

const graphiteDark = {
  bg: '#111318', panel: '#1C1F26', panel2: '#23262D', input: '#202329', text: '#FFFFFF', muted: '#A7AAB3',
  primary: '#FF3B30', blue: '#3478F6', green: '#30D158', gold: '#FFD60A', border: '#30343D', danger: '#FF453A',
  cyan: '#5AC8FA', purple: '#AF52DE', primarySoft: '#3A1F20', blueSoft: '#1B2944', greenSoft: '#183522', goldSoft: '#3A3314',
  nav: '#14171C', shadow: '#000000'
};
const graphiteLight = {
  bg: '#F6F7F9', panel: '#FFFFFF', panel2: '#F3F4F6', input: '#F5F6F8', text: '#111827', muted: '#6B7280',
  primary: '#FF3B30', blue: '#3478F6', green: '#30B85A', gold: '#C99B00', border: '#E1E4E9', danger: '#D92D20',
  cyan: '#1687C8', purple: '#7C3AED', primarySoft: '#FFE7E5', blueSoft: '#EAF1FF', greenSoft: '#EAF8EF', goldSoft: '#FFF4C2',
  nav: '#FFFFFF', shadow: '#C9CED6'
};

const themeFamilies: Record<ThemeKey, { dark: typeof graphiteDark; light: typeof graphiteDark }> = {
  fithubGraphite: { dark: graphiteDark, light: graphiteLight },
  icePerformance: {
    dark: { ...graphiteDark, bg: '#0B1418', panel: '#122127', panel2: '#172B33', input: '#14272E', primary: '#57DDF3', blue: '#73CFF5', cyan: '#8EEBFA', green: '#45D7B3', gold: '#F4D46B', border: '#29414A', nav: '#0D181D', primarySoft: '#15343C', blueSoft: '#16303D', shadow: '#000000' },
    light: { ...graphiteLight, bg: '#EAF9FC', panel: '#F8FEFF', panel2: '#DFF5FA', input: '#EFFBFD', text: '#10252C', muted: '#66838C', primary: '#19BFD9', blue: '#2C9DCE', cyan: '#19BFD9', green: '#20B890', gold: '#B89024', border: '#C9EAF1', nav: '#F8FEFF', primarySoft: '#D7F6FB', blueSoft: '#DDF2FA', shadow: '#A9D4DE' },
  },
  electricYellow: {
    dark: { ...graphiteDark, bg: '#10120D', panel: '#1C2117', panel2: '#292F20', input: '#242A1C', text: '#F8FAF2', muted: '#A7AE98', primary: '#F2E829', blue: '#B5D83C', cyan: '#A7E054', green: '#B6E43A', gold: '#F2E829', border: '#3A422B', nav: '#14180F', primarySoft: '#353617', blueSoft: '#28351E', greenSoft: '#2B361B', goldSoft: '#373515', shadow: '#000000' },
    light: { ...graphiteLight, bg: '#F7F8EE', panel: '#FFFFFF', panel2: '#EFF2DF', input: '#F5F6EB', text: '#1B2116', muted: '#6E765F', primary: '#A89E00', blue: '#758F16', cyan: '#709C24', green: '#6E9C1B', gold: '#A89E00', border: '#DDE2C8', nav: '#FFFFFF', primarySoft: '#F4F0B4', blueSoft: '#ECF1D2', greenSoft: '#EDF4D2', goldSoft: '#F5F0BE', shadow: '#CED4B7' },
  },
  neonPerformance: {
    dark: { ...graphiteDark, bg: '#0A0B0B', panel: '#151718', panel2: '#1D2021', input: '#1B1E1F', text: '#F7FFF9', muted: '#9CA5A0', primary: '#B8FF27', blue: '#9B73FF', cyan: '#55E7FF', green: '#B8FF27', gold: '#F7FF5A', purple: '#DF63FF', border: '#2D3430', nav: '#0E1010', primarySoft: '#27331A', blueSoft: '#261F3A', greenSoft: '#243517', goldSoft: '#343517', shadow: '#000000' },
    light: { ...graphiteLight, bg: '#F4F8EF', panel: '#FFFFFF', panel2: '#ECF4E4', input: '#F2F7ED', text: '#151B15', muted: '#687267', primary: '#75A900', blue: '#7658CF', cyan: '#008BA6', green: '#75A900', gold: '#9DA800', purple: '#9A3EB3', border: '#D8E4D0', nav: '#FFFFFF', primarySoft: '#E6F6C3', blueSoft: '#ECE6FA', greenSoft: '#E5F5C2', goldSoft: '#F3F5C9', shadow: '#C6D3BF' },
  },
  warmPremium: {
    dark: { ...graphiteDark, bg: '#1A1512', panel: '#2A211C', panel2: '#352A24', input: '#302620', text: '#FFF8F1', muted: '#B8A79A', primary: '#C8906D', blue: '#9A887B', cyan: '#BFA58F', green: '#A5B083', gold: '#D7B271', border: '#493A31', nav: '#211A16', primarySoft: '#493127', blueSoft: '#3A322D', greenSoft: '#343829', goldSoft: '#443923', shadow: '#000000' },
    light: { ...graphiteLight, bg: '#F4EDE4', panel: '#FFF9F3', panel2: '#EEE1D4', input: '#F8F0E7', text: '#352B25', muted: '#87766B', primary: '#A66E4A', blue: '#8E7768', cyan: '#A38370', green: '#7E8F68', gold: '#A97F3A', border: '#E0CFC0', nav: '#FFF9F3', primarySoft: '#F2DCCE', blueSoft: '#EDE1D9', greenSoft: '#E5E9DB', goldSoft: '#F1E3C9', shadow: '#D2BFB0' },
  },
  emberOrange: {
    dark: { ...graphiteDark, bg: '#120D0A', panel: '#221813', panel2: '#302019', input: '#2B1C16', text: '#FFF7F1', muted: '#B39E92', primary: '#FF6A16', blue: '#E7955D', cyan: '#FF9B5C', green: '#8CCB6A', gold: '#F7B341', border: '#493127', nav: '#180F0C', primarySoft: '#442016', blueSoft: '#3E2B20', greenSoft: '#2B3824', goldSoft: '#44301B', shadow: '#000000' },
    light: { ...graphiteLight, bg: '#FFF4EC', panel: '#FFFFFF', panel2: '#FBE5D7', input: '#FFF7F1', text: '#34231B', muted: '#8B6B5C', primary: '#E85A0A', blue: '#B96D3E', cyan: '#D86A29', green: '#649B49', gold: '#B67A19', border: '#F0D2C1', nav: '#FFFFFF', primarySoft: '#FFE1CF', blueSoft: '#F6E1D5', greenSoft: '#E8F1DF', goldSoft: '#F8E9CC', shadow: '#E2C1B0' },
  },
};

type ThemeColors = { [K in keyof typeof graphiteDark]: string };

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  accentColor: string | null;
  setAccentColor: (color: string | null) => void;
  hiddenFeatures: string[];
  toggleHiddenFeature: (feature: string) => void;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  setMeasurementUnits: (weight: WeightUnit, distance: DistanceUnit) => void;
  syncUserPreferences: (userId: string) => Promise<void>;
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system', setThemeMode: () => {}, themeKey: 'fithubGraphite', setThemeKey: () => {}, accentColor: null, setAccentColor: () => {}, hiddenFeatures: [], toggleHiddenFeature: () => {}, weightUnit: 'kg', distanceUnit: 'km', setMeasurementUnits: () => {}, syncUserPreferences: async () => {}, isDark: true, colors: graphiteDark,
});

const validTheme = (value: any): value is ThemeKey => ['fithubGraphite','icePerformance','electricYellow','neonPerformance','warmPremium','emberOrange'].includes(value);
const safeAccent = (value: string | null | undefined) => value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : null;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setMode] = useState<ThemeMode>('system');
  const [themeKey, setKey] = useState<ThemeKey>('fithubGraphite');
  const [accentColor, setAccent] = useState<string | null>(null);
  const [hiddenFeatures, setHidden] = useState<string[]>([]);
  const [weightUnit, setWeight] = useState<WeightUnit>('kg');
  const [distanceUnit, setDistance] = useState<DistanceUnit>('km');
  const [boundUser, setBoundUser] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      Storage.getItem('fithub_theme_mode'), Storage.getItem('fithub_theme_key'), Storage.getItem('fithub_accent_color'),
      Storage.getItem('fithub_hidden_features'), Storage.getItem('fithub_weight_unit'), Storage.getItem('fithub_distance_unit'),
    ]).then(([mode,key,accent,hidden,wu,du]) => {
      if (mode === 'system' || mode === 'dark' || mode === 'light') setMode(mode);
      if (validTheme(key)) setKey(key);
      setAccent(safeAccent(accent));
      try { const parsed = JSON.parse(hidden || '[]'); if (Array.isArray(parsed)) setHidden(parsed.filter((x) => typeof x === 'string')); } catch {}
      if (wu === 'kg' || wu === 'lb') setWeight(wu);
      if (du === 'km' || du === 'mi') setDistance(du);
    }).catch(() => {});
  }, []);

  const persistRemote = async (patch: Record<string, any>) => {
    if (!boundUser) return;
    try { await supabase.from('user_app_preferences').upsert({ user_id: boundUser, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); } catch {}
  };

  const setThemeMode = (mode: ThemeMode) => { setMode(mode); Storage.setItem('fithub_theme_mode', mode).catch(() => {}); };
  const setThemeKey = (key: ThemeKey) => { setKey(key); Storage.setItem('fithub_theme_key', key).catch(() => {}); persistRemote({ theme_key: key }); };
  const setAccentColor = (color: string | null) => { const clean = safeAccent(color); setAccent(clean); clean ? Storage.setItem('fithub_accent_color', clean).catch(() => {}) : Storage.removeItem('fithub_accent_color').catch(() => {}); persistRemote({ accent_color: clean }); };
  const toggleHiddenFeature = (feature: string) => {
    setHidden((previous) => {
      const next = previous.includes(feature) ? previous.filter((x) => x !== feature) : [...previous, feature];
      Storage.setItem('fithub_hidden_features', JSON.stringify(next)).catch(() => {});
      persistRemote({ hidden_features: next });
      return next;
    });
  };
  const setMeasurementUnits = (weight: WeightUnit, distance: DistanceUnit) => {
    setWeight(weight); setDistance(distance);
    Storage.setItem('fithub_weight_unit', weight).catch(() => {}); Storage.setItem('fithub_distance_unit', distance).catch(() => {});
    persistRemote({ weight_unit: weight, distance_unit: distance });
  };

  const syncUserPreferences = async (userId: string) => {
    setBoundUser(userId);
    const { data, error } = await supabase.from('user_app_preferences').select('theme_key,accent_color,weight_unit,distance_unit,hidden_features').eq('user_id', userId).maybeSingle();
    if (error) return;
    if (!data) {
      try { await supabase.from('user_app_preferences').upsert({ user_id: userId, theme_key: themeKey, accent_color: accentColor, weight_unit: weightUnit, distance_unit: distanceUnit, hidden_features: hiddenFeatures }, { onConflict: 'user_id' }); } catch {}
      return;
    }
    if (validTheme(data.theme_key)) { setKey(data.theme_key); Storage.setItem('fithub_theme_key', data.theme_key).catch(() => {}); }
    const accent = safeAccent(data.accent_color); setAccent(accent); if (accent) Storage.setItem('fithub_accent_color', accent).catch(() => {});
    if (data.weight_unit === 'kg' || data.weight_unit === 'lb') { setWeight(data.weight_unit); Storage.setItem('fithub_weight_unit', data.weight_unit).catch(() => {}); }
    if (data.distance_unit === 'km' || data.distance_unit === 'mi') { setDistance(data.distance_unit); Storage.setItem('fithub_distance_unit', data.distance_unit).catch(() => {}); }
    if (Array.isArray(data.hidden_features)) { setHidden(data.hidden_features); Storage.setItem('fithub_hidden_features', JSON.stringify(data.hidden_features)).catch(() => {}); }
  };

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme !== 'light');
  const colors = useMemo(() => {
    const base = { ...(isDark ? themeFamilies[themeKey].dark : themeFamilies[themeKey].light) } as ThemeColors;
    if (accentColor) {
      base.primary = accentColor;
      base.cyan = accentColor;
      base.primarySoft = isDark ? `${accentColor}2B` : `${accentColor}1F`;
    }
    return base;
  }, [isDark, themeKey, accentColor]);

  const value = useMemo(() => ({ themeMode, setThemeMode, themeKey, setThemeKey, accentColor, setAccentColor, hiddenFeatures, toggleHiddenFeature, weightUnit, distanceUnit, setMeasurementUnits, syncUserPreferences, isDark, colors }), [themeMode, themeKey, accentColor, hiddenFeatures, weightUnit, distanceUnit, isDark, colors, boundUser]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

export function contrastText(hex: string) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return '#FFFFFF';
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#111318' : '#FFFFFF';
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) { const { colors } = useTheme(); const s = shared(colors); return <View style={[s.card, style]}>{children}</View>; }
export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) { const { colors } = useTheme(); const s = shared(colors); return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.button, secondary && s.secondaryButton, disabled && { opacity: .45 }, pressed && { opacity: .84 }]}><Text style={[s.buttonText, { color: secondary ? colors.text : contrastText(colors.primary) }]}>{title}</Text></Pressable>; }
export function OutlineButton({ title, onPress, disabled = false, compact = false }: { title: string; onPress: () => void; disabled?: boolean; compact?: boolean }) { const { colors } = useTheme(); const s = shared(colors); return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.outlineButton, compact && s.outlineButtonCompact, disabled && { opacity: .45 }, pressed && { opacity: .78 }]}><Text style={s.outlineButtonText}>{title}</Text></Pressable>; }
export function Input(props: TextInputProps) { const { colors } = useTheme(); const s = shared(colors); return <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.style]} />; }
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) { const { colors } = useTheme(); const s = shared(colors); return <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text></Pressable>; }
export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) { const { colors } = useTheme(); const s = shared(colors); return <View style={{ marginBottom: 10 }}><Text style={s.section}>{title}</Text>{subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}</View>; }

const shared = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, marginBottom: 12 },
  button: { backgroundColor: colors.primary, minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginVertical: 5 },
  secondaryButton: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border },
  outlineButton: { backgroundColor: colors.panel, minHeight: 46, borderRadius: 11, borderWidth: 1.5, borderColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, marginVertical: 5 },
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
