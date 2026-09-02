import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Input, RefreshableScrollView, ThemeKey, ThemeMode, useTheme } from '../components/UI';
import { FreshChevronIcon } from '../components/FitHubFreshIcons';
import { YouCardArtwork } from '../components/YouCardArtwork';

type Section = 'appearance' | 'units' | 'features';
type ThemeChoice = { key: ThemeKey; name: string; description: string; swatches: string[] };

const themes: ThemeChoice[] = [
  { key: 'fithubGraphite', name: 'FitHub Graphite', description: 'Focused dark performance style', swatches: ['#111318','#FF3B30','#FFFFFF'] },
  { key: 'icePerformance', name: 'Ice Performance', description: 'Clean cyan FitHub signature', swatches: ['#EAF9FC','#19BFD9','#10252C'] },
  { key: 'electricYellow', name: 'Electric Yellow', description: 'Graphite with vivid highlights', swatches: ['#10120D','#F2E829','#F8FAF2'] },
  { key: 'neonPerformance', name: 'Neon Performance', description: 'High-energy gym contrast', swatches: ['#0A0B0B','#B8FF27','#9B73FF'] },
  { key: 'warmPremium', name: 'Warm Premium', description: 'Soft cream and brown', swatches: ['#F4EDE4','#A66E4A','#352B25'] },
  { key: 'emberOrange', name: 'Ember', description: 'Deep charcoal and orange', swatches: ['#120D0A','#FF6A16','#FFF7F1'] },
];

const accentChoices = ['#19BFD9','#3478F6','#30B85A','#B8A000','#A66E4A','#E85A0A','#7C3AED','#D92D20'];
const hideOptions = [
  ['food','Food'], ['friends','Friends'], ['journey','My Fitness Journey'], ['clubs','Clubs'], ['challenges','Challenges'], ['supplements','Supplement Tracker'], ['activity','Activity Energy'],
] as const;

export default function CustomizationScreen({ onBack }: { onBack: () => void }) {
  const { colors, isDark, themeMode, setThemeMode, themeKey, setThemeKey, accentColor, setAccentColor, hiddenFeatures, toggleHiddenFeature, weightUnit, distanceUnit, setMeasurementUnits } = useTheme();
  const s = styles(colors, isDark);
  const [section, setSection] = useState<Section>('appearance');
  const [accent, setAccent] = useState(accentColor ?? '');
  const selectedTheme = useMemo(() => themes.find((theme) => theme.key === themeKey) ?? themes[0], [themeKey]);

  const applyAccent = (value = accent) => {
    const clean = value.trim().toUpperCase();
    if (clean && !/^#[0-9A-F]{6}$/.test(clean)) return Alert.alert('Check the colour', 'Use a six-digit HEX colour such as #19BFD9.');
    setAccent(clean);
    setAccentColor(clean || null);
  };

  const resetAppearance = () => {
    setThemeMode('system');
    setThemeKey('fithubGraphite');
    setAccent('');
    setAccentColor(null);
  };

  return <RefreshableScrollView onRefresh={async () => {}} contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.backTarget} accessibilityRole="button" accessibilityLabel="Back"><FreshChevronIcon size={27} color={colors.text} direction="left"/></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>Customize FitHub</Text><Text style={s.sub}>Make the app easier and more comfortable for you to use.</Text></View>
    </View>

    <Card style={s.hero}>
      <View style={s.heroArt}><YouCardArtwork kind="customize" width={126} height={132}/></View>
      <View style={s.heroCopy}><Text style={s.eyebrow}>YOUR FITHUB</Text><Text style={s.heroTitle}>{selectedTheme.name}</Text><Text style={s.heroText}>{themeMode === 'system' ? 'Follows your phone appearance' : `${themeMode === 'dark' ? 'Dark' : 'Light'} appearance`} · {accentColor ? 'Custom accent' : 'Theme accent'}</Text><View style={s.heroSwatches}>{selectedTheme.swatches.map((color) => <View key={color} style={[s.heroSwatch,{ backgroundColor: color }]}/>)}</View></View>
    </Card>

    <View style={s.tabs}>
      <SectionTab label="Appearance" active={section === 'appearance'} onPress={() => setSection('appearance')}/>
      <SectionTab label="Units" active={section === 'units'} onPress={() => setSection('units')}/>
      <SectionTab label="Features" active={section === 'features'} onPress={() => setSection('features')}/>
    </View>

    {section === 'appearance' ? <>
      <View style={s.sectionHead}><Text style={s.eyebrow}>DISPLAY</Text><Text style={s.sectionTitle}>Light or dark</Text><Text style={s.sectionCopy}>System changes automatically with your phone.</Text></View>
      <Card style={s.segmentCard}><View style={s.segment}>{(['system','light','dark'] as ThemeMode[]).map((mode) => <Pressable key={mode} onPress={() => setThemeMode(mode)} style={[s.segmentButton, themeMode === mode && s.segmentActive]}><Text style={[s.segmentText, themeMode === mode && s.segmentTextActive]}>{mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}</Text><Text style={[s.segmentSymbol, themeMode === mode && s.segmentTextActive]}>{mode === 'system' ? '◐' : mode === 'light' ? '☼' : '☾'}</Text></Pressable>)}</View></Card>

      <View style={s.sectionHead}><Text style={s.eyebrow}>THEME GALLERY</Text><Text style={s.sectionTitle}>Choose your style</Text><Text style={s.sectionCopy}>Tap a preview to apply it immediately across FitHub.</Text></View>
      <View style={s.themeGrid}>{themes.map((theme) => {
        const active = themeKey === theme.key;
        return <Pressable key={theme.key} onPress={() => setThemeKey(theme.key)} style={[s.themeCard, active && s.themeSelected]}>
          <View style={[s.miniPreview,{ backgroundColor: theme.swatches[0] }]}><View style={[s.miniHeader,{ backgroundColor: theme.swatches[2] }]}/><View style={s.miniRows}><View style={[s.miniBlock,{ backgroundColor: theme.swatches[2] }]}/><View style={[s.miniBlock,{ backgroundColor: theme.swatches[1] }]}/></View><View style={[s.miniButton,{ backgroundColor: theme.swatches[1] }]}/></View>
          <View style={s.themeTitleRow}><Text style={[s.themeName, active && { color: colors.primary }]}>{theme.name}</Text><View style={[s.radio, active && s.radioActive]}>{active ? <Text style={s.radioTick}>✓</Text> : null}</View></View>
          <Text style={s.themeDesc}>{theme.description}</Text>
          <View style={s.swatches}>{theme.swatches.map((color) => <View key={color} style={[s.swatch,{ backgroundColor: color }]}/>)}</View>
        </Pressable>;
      })}</View>

      <View style={s.sectionHead}><Text style={s.eyebrow}>ACCENT COLOUR</Text><Text style={s.sectionTitle}>Make it yours</Text><Text style={s.sectionCopy}>Choose a shortcut or enter any valid six-digit HEX colour.</Text></View>
      <Card style={s.accentCard}>
        <View style={s.accentChoices}>{accentChoices.map((color) => {
          const active = (accentColor ?? '').toUpperCase() === color;
          return <Pressable key={color} onPress={() => applyAccent(color)} style={[s.accentOuter, active && { borderColor: colors.text }]}><View style={[s.accentDot,{ backgroundColor: color }]}>{active ? <Text style={s.accentTick}>✓</Text> : null}</View></Pressable>;
        })}</View>
        <View style={s.accentInputRow}><Input value={accent} onChangeText={setAccent} autoCapitalize="characters" placeholder="#19BFD9" style={s.accentInput}/><Pressable onPress={() => applyAccent()} style={s.applyButton}><Text style={s.applyText}>APPLY</Text></Pressable></View>
        <View style={s.actionRow}><Pressable onPress={() => { setAccent(''); setAccentColor(null); }} style={s.textButton}><Text style={s.textButtonLabel}>Use theme colour</Text></Pressable><Pressable onPress={resetAppearance} style={s.textButton}><Text style={s.resetText}>Restore appearance defaults</Text></Pressable></View>
      </Card>
    </> : null}

    {section === 'units' ? <>
      <View style={s.sectionHead}><Text style={s.eyebrow}>MEASUREMENTS</Text><Text style={s.sectionTitle}>Units used in FitHub</Text><Text style={s.sectionCopy}>Changing units never changes your stored workout data.</Text></View>
      <Card style={s.unitCard}>
        <Text style={s.unitTitle}>Weight</Text><Text style={s.unitCopy}>Used for exercise loads and workout summaries.</Text>
        <View style={s.optionRow}><ChoiceButton label="Kilograms" detail="kg" active={weightUnit === 'kg'} onPress={() => setMeasurementUnits('kg', distanceUnit)}/><ChoiceButton label="Pounds" detail="lb" active={weightUnit === 'lb'} onPress={() => setMeasurementUnits('lb', distanceUnit)}/></View>
        <View style={s.rule}/>
        <Text style={s.unitTitle}>Distance</Text><Text style={s.unitCopy}>Used for running, walking, cycling and cardio.</Text>
        <View style={s.optionRow}><ChoiceButton label="Kilometres" detail="km" active={distanceUnit === 'km'} onPress={() => setMeasurementUnits(weightUnit, 'km')}/><ChoiceButton label="Miles" detail="mi" active={distanceUnit === 'mi'} onPress={() => setMeasurementUnits(weightUnit, 'mi')}/></View>
      </Card>
    </> : null}

    {section === 'features' ? <>
      <View style={s.sectionHead}><Text style={s.eyebrow}>HOME & NAVIGATION</Text><Text style={s.sectionTitle}>Choose what appears</Text><Text style={s.sectionCopy}>Hidden features keep all their data and can be restored here.</Text></View>
      <Card style={s.featureCard}>{hideOptions.map(([key,label], index) => {
        const visible = !hiddenFeatures.includes(key);
        return <Pressable key={key} onPress={() => toggleHiddenFeature(key)} style={[s.feature, index === hideOptions.length - 1 && { borderBottomWidth: 0 }]} accessibilityRole="switch" accessibilityState={{ checked: visible }}>
          <View style={s.featureIcon}><Text style={s.featureIconText}>{label.slice(0,1)}</Text></View>
          <View style={{ flex: 1 }}><Text style={s.featureName}>{label}</Text><Text style={s.featureState}>{visible ? 'Shown in your normal interface' : 'Hidden · data is still saved'}</Text></View>
          <View style={[s.toggle, visible && s.toggleOn]}><View style={[s.toggleKnob, visible && s.toggleKnobOn]}/></View>
        </Pressable>;
      })}</Card>
    </> : null}
  </RefreshableScrollView>;
}

function SectionTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme(); const s = styles(colors, isDark);
  return <Pressable onPress={onPress} style={[s.tab, active && s.tabActive]}><Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text></Pressable>;
}

function ChoiceButton({ label, detail, active, onPress }: { label: string; detail: string; active: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme(); const s = styles(colors, isDark);
  return <Pressable onPress={onPress} style={[s.choiceButton, active && s.choiceButtonActive]}><View style={{ flex: 1 }}><Text style={[s.choiceLabel, active && { color: colors.primary }]}>{label}</Text><Text style={s.choiceDetail}>{detail}</Text></View><View style={[s.radio, active && s.radioActive]}>{active ? <Text style={s.radioTick}>✓</Text> : null}</View></Pressable>;
}

const styles=(colors:any,isDark:boolean)=>StyleSheet.create({
  wrap:{padding:16,paddingBottom:120},header:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:14},backTarget:{width:48,height:48,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border},title:{color:colors.text,fontSize:27,fontWeight:'900',letterSpacing:-.5},sub:{color:colors.muted,fontSize:11,lineHeight:16,marginTop:2},
  hero:{minHeight:148,flexDirection:'row',alignItems:'center',padding:12,borderColor:colors.primary,backgroundColor:isDark?colors.panel:colors.panel2,overflow:'hidden'},heroArt:{width:130,height:132,alignItems:'center',justifyContent:'center'},heroCopy:{flex:1,paddingLeft:6},eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:.8},heroTitle:{color:colors.text,fontSize:19,fontWeight:'900',marginTop:5},heroText:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:4},heroSwatches:{flexDirection:'row',gap:6,marginTop:11},heroSwatch:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:colors.border},
  tabs:{flexDirection:'row',gap:6,backgroundColor:colors.panel,borderRadius:18,borderWidth:1,borderColor:colors.border,padding:5,marginTop:12},tab:{flex:1,minHeight:43,borderRadius:13,alignItems:'center',justifyContent:'center'},tabActive:{backgroundColor:colors.primary},tabText:{color:colors.muted,fontSize:10,fontWeight:'900'},tabTextActive:{color:'#FFFFFF'},
  sectionHead:{marginTop:20,marginBottom:9},sectionTitle:{color:colors.text,fontSize:21,fontWeight:'900',marginTop:3},sectionCopy:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:3},
  segmentCard:{borderRadius:20},segment:{flexDirection:'row',gap:7},segmentButton:{flex:1,minHeight:76,borderRadius:15,backgroundColor:colors.panel2,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},segmentActive:{borderColor:colors.primary,backgroundColor:colors.primarySoft},segmentText:{color:colors.muted,fontSize:11,fontWeight:'900'},segmentTextActive:{color:colors.primary},segmentSymbol:{color:colors.muted,fontSize:22,marginTop:5},
  themeGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},themeCard:{width:'48.6%',minHeight:220,borderRadius:20,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,padding:10,shadowColor:colors.shadow,shadowOpacity:isDark?.18:.07,shadowRadius:7,shadowOffset:{width:0,height:3},elevation:2},themeSelected:{borderColor:colors.primary,borderWidth:2,backgroundColor:isDark?colors.panel:colors.primarySoft},miniPreview:{height:88,borderRadius:14,padding:9,overflow:'hidden'},miniHeader:{width:'45%',height:8,borderRadius:4,opacity:.9},miniRows:{flexDirection:'row',gap:6,marginTop:10},miniBlock:{flex:1,height:36,borderRadius:8,opacity:.85},miniButton:{width:'52%',height:10,borderRadius:5,marginTop:7},themeTitleRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:9},themeName:{color:colors.text,flex:1,fontSize:11,fontWeight:'900'},themeDesc:{color:colors.muted,fontSize:9,lineHeight:13,marginTop:3,minHeight:27},swatches:{flexDirection:'row',gap:5,marginTop:7},swatch:{width:19,height:19,borderRadius:10,borderWidth:1,borderColor:colors.border},radio:{width:22,height:22,borderRadius:11,borderWidth:1.5,borderColor:colors.border,alignItems:'center',justifyContent:'center'},radioActive:{backgroundColor:colors.primary,borderColor:colors.primary},radioTick:{color:'#FFFFFF',fontSize:11,fontWeight:'900'},
  accentCard:{borderRadius:20},accentChoices:{flexDirection:'row',flexWrap:'wrap',gap:9},accentOuter:{width:43,height:43,borderRadius:22,borderWidth:2,borderColor:'transparent',alignItems:'center',justifyContent:'center'},accentDot:{width:35,height:35,borderRadius:18,alignItems:'center',justifyContent:'center'},accentTick:{color:'#FFFFFF',fontWeight:'900',textShadowColor:'rgba(0,0,0,.35)',textShadowRadius:2},accentInputRow:{flexDirection:'row',gap:8,marginTop:12},accentInput:{flex:1},applyButton:{minWidth:88,borderRadius:13,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},applyText:{color:'#FFFFFF',fontSize:10,fontWeight:'900'},actionRow:{flexDirection:'row',justifyContent:'space-between',gap:8,marginTop:7},textButton:{minHeight:40,justifyContent:'center'},textButtonLabel:{color:colors.primary,fontSize:9,fontWeight:'900'},resetText:{color:colors.muted,fontSize:9,fontWeight:'800'},
  unitCard:{borderRadius:20},unitTitle:{color:colors.text,fontSize:17,fontWeight:'900'},unitCopy:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:3,marginBottom:10},optionRow:{flexDirection:'row',gap:8},choiceButton:{flex:1,minHeight:76,borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel2,padding:12,flexDirection:'row',alignItems:'center',gap:8},choiceButtonActive:{borderColor:colors.primary,backgroundColor:colors.primarySoft},choiceLabel:{color:colors.text,fontSize:12,fontWeight:'900'},choiceDetail:{color:colors.muted,fontSize:10,marginTop:4},rule:{height:1,backgroundColor:colors.border,marginVertical:17},
  featureCard:{borderRadius:20,paddingVertical:4},feature:{minHeight:78,flexDirection:'row',alignItems:'center',gap:11,borderBottomWidth:1,borderBottomColor:colors.border},featureIcon:{width:44,height:44,borderRadius:15,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},featureIconText:{color:colors.primary,fontSize:16,fontWeight:'900'},featureName:{color:colors.text,fontSize:13,fontWeight:'900'},featureState:{color:colors.muted,fontSize:9,lineHeight:13,marginTop:3},toggle:{width:48,height:28,borderRadius:14,backgroundColor:colors.panel2,borderWidth:1,borderColor:colors.border,padding:3},toggleOn:{backgroundColor:colors.primary,borderColor:colors.primary},toggleKnob:{width:20,height:20,borderRadius:10,backgroundColor:colors.muted},toggleKnobOn:{backgroundColor:'#FFFFFF',marginLeft:20},
});
