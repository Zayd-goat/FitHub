import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, Input, OutlineButton, RefreshableScrollView, SectionTitle, ThemeKey, useTheme } from '../components/UI';

const themes: Array<{ key: ThemeKey; name: string; description: string; swatches: string[] }> = [
  { key: 'fithubGraphite', name: 'FitHub Graphite', description: 'Dark graphite, red action accents and clean performance cards.', swatches: ['#111318','#FF3B30','#FFFFFF'] },
  { key: 'icePerformance', name: 'Ice Performance', description: 'Clean icy blue/cyan styling inspired by the light premium reference.', swatches: ['#EAF9FC','#19BFD9','#10252C'] },
  { key: 'electricYellow', name: 'Electric Yellow', description: 'Dark olive/graphite surfaces with vivid yellow highlights.', swatches: ['#10120D','#F2E829','#F8FAF2'] },
  { key: 'neonPerformance', name: 'Neon Performance', description: 'Black/charcoal with lime, cyan and purple performance accents.', swatches: ['#0A0B0B','#B8FF27','#9B73FF'] },
  { key: 'warmPremium', name: 'Warm Premium', description: 'Cream, beige and soft brown for a premium lifestyle feel.', swatches: ['#F4EDE4','#A66E4A','#352B25'] },
  { key: 'emberOrange', name: 'Ember', description: 'Deep charcoal/brown with energetic orange accents.', swatches: ['#120D0A','#FF6A16','#FFF7F1'] },
];

const hideOptions = [
  ['food','Food'], ['friends','Friends'], ['journey','My Fitness Journey'], ['clubs','Clubs'], ['challenges','Challenges'], ['supplements','Supplement Reminders'], ['activity','Activity Energy']
] as const;

export default function CustomizationScreen({ onBack }: { onBack: () => void }) {
  const { colors, themeMode, setThemeMode, themeKey, setThemeKey, accentColor, setAccentColor, hiddenFeatures, toggleHiddenFeature, weightUnit, distanceUnit, setMeasurementUnits } = useTheme();
  const s = styles(colors);
  const [accent, setAccent] = useState(accentColor ?? '');

  return <RefreshableScrollView onRefresh={async () => {}} contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
    <View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>‹</Text></Pressable><View><Text style={s.title}>Customize FitHub</Text><Text style={s.sub}>Change themes, colours, units and what appears in your interface.</Text></View></View>

    <Card><SectionTitle title="Light / dark behaviour" /><View style={s.chips}><Chip label="System" active={themeMode==='system'} onPress={()=>setThemeMode('system')}/><Chip label="Dark" active={themeMode==='dark'} onPress={()=>setThemeMode('dark')}/><Chip label="Light" active={themeMode==='light'} onPress={()=>setThemeMode('light')}/></View></Card>

    <SectionTitle title="Theme gallery" subtitle="Inspired by the five visual references you supplied, while keeping FitHub's layout consistent." />
    {themes.map((theme) => <Pressable key={theme.key} onPress={() => setThemeKey(theme.key)}><Card style={[s.themeCard, themeKey === theme.key && s.themeSelected]}><View style={{flex:1}}><Text style={s.themeName}>{theme.name}</Text><Text style={s.themeDesc}>{theme.description}</Text><View style={s.swatches}>{theme.swatches.map((color) => <View key={color} style={[s.swatch,{backgroundColor:color}]} />)}</View></View><Text style={[s.check, themeKey===theme.key && {color:colors.primary}]}>{themeKey===theme.key?'✓':'○'}</Text></Card></Pressable>)}

    <Card><SectionTitle title="Custom accent" subtitle="Optional. Enter a six-digit HEX colour, for example #3478F6. Clear it to return to the theme's normal accent." /><Input value={accent} onChangeText={setAccent} autoCapitalize="characters" placeholder="#3478F6"/><View style={s.two}><OutlineButton title="APPLY" onPress={() => setAccentColor(accent.trim() || null)} /><OutlineButton title="RESET" onPress={() => { setAccent(''); setAccentColor(null); }} /></View></Card>

    <Card><SectionTitle title="Exercise measurements" subtitle="FitHub stores canonical metric values and converts the display to your preference." /><Text style={s.label}>Weight</Text><View style={s.chips}><Chip label="Kilograms (kg)" active={weightUnit==='kg'} onPress={()=>setMeasurementUnits('kg',distanceUnit)}/><Chip label="Pounds (lb)" active={weightUnit==='lb'} onPress={()=>setMeasurementUnits('lb',distanceUnit)}/></View><Text style={s.label}>Distance</Text><View style={s.chips}><Chip label="Kilometres (km)" active={distanceUnit==='km'} onPress={()=>setMeasurementUnits(weightUnit,'km')}/><Chip label="Miles (mi)" active={distanceUnit==='mi'} onPress={()=>setMeasurementUnits(weightUnit,'mi')}/></View></Card>

    <Card><SectionTitle title="Feature visibility" subtitle="Hidden features keep their data. You can restore them here at any time." />{hideOptions.map(([key,label]) => { const hidden=hiddenFeatures.includes(key); return <Pressable key={key} onPress={()=>toggleHiddenFeature(key)} style={s.feature}><View><Text style={s.featureName}>{label}</Text><Text style={s.featureState}>{hidden?'Hidden from normal interface':'Visible'}</Text></View><Text style={[s.toggle,{color:hidden?colors.muted:colors.green}]}>{hidden?'○':'●'}</Text></Pressable>; })}</Card>
  </RefreshableScrollView>;
}

const styles=(colors:any)=>StyleSheet.create({wrap:{padding:16,paddingBottom:40},header:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:16},back:{color:colors.text,fontSize:38,width:28},title:{color:colors.text,fontSize:25,fontWeight:'900'},sub:{color:colors.muted,fontSize:11,marginTop:2,lineHeight:16},chips:{flexDirection:'row',flexWrap:'wrap'},themeCard:{flexDirection:'row',alignItems:'center',gap:12},themeSelected:{borderColor:colors.primary,borderWidth:2},themeName:{color:colors.text,fontSize:16,fontWeight:'900'},themeDesc:{color:colors.muted,fontSize:11,lineHeight:16,marginTop:3},swatches:{flexDirection:'row',gap:6,marginTop:9},swatch:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:colors.border},check:{fontSize:23,color:colors.muted},two:{flexDirection:'row',gap:8},label:{color:colors.muted,fontWeight:'900',fontSize:10,marginBottom:7,marginTop:4},feature:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:11,borderBottomWidth:1,borderBottomColor:colors.border},featureName:{color:colors.text,fontWeight:'900'},featureState:{color:colors.muted,fontSize:10,marginTop:2},toggle:{fontSize:24}});
