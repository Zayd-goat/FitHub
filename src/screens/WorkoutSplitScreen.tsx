import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, RefreshableScrollView, useTheme } from '../components/UI';
import { FreshChevronIcon } from '../components/FitHubFreshIcons';
import { YouCardArtwork } from '../components/YouCardArtwork';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const quick = ['Push Day','Pull Day','Leg Day','Upper Body','Lower Body','Full Body','Cardio','Rest Day'];

const splitImages: Record<string, ImageSourcePropType> = {
  'Push Day': require('../../assets/home/todays_plan_equipment_v2.png'),
  'Pull Day': require('../../assets/home/todays_plan_pull_equipment_v1.png'),
  'Leg Day': require('../../assets/home/todays_plan_legs_equipment_v1.png'),
  'Upper Body': require('../../assets/home/todays_plan_upper_equipment_v1.png'),
  'Lower Body': require('../../assets/home/todays_plan_legs_equipment_v1.png'),
  'Full Body': require('../../assets/home/todays_plan_full_body_equipment_v1.png'),
  Cardio: require('../../assets/home/todays_plan_cardio_equipment_v1.png'),
  'Rest Day': require('../../assets/home/todays_plan_recovery_equipment_v1.png'),
};

const imageForLabel = (label?: string) => splitImages[label ?? ''] ?? require('../../assets/home/todays_plan_equipment_v1.png');

export default function WorkoutSplitScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const { colors, isDark } = useTheme();
  const s = styles(colors, isDark);
  const [selected, setSelected] = useState(new Date().getDay());
  const [labels, setLabels] = useState<Record<number,string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from('workout_split_days').select('day_of_week,label,details').eq('user_id', profile.id).order('day_of_week');
    if (error) return Alert.alert('Workout split', error.message);
    const next: Record<number,string> = {};
    (data ?? []).forEach((row:any) => { next[row.day_of_week] = row.label; });
    setLabels(next);
  };

  useEffect(() => { load(); }, [profile.id]);

  const save = async () => {
    const label = (labels[selected] ?? '').trim();
    if (!label) return Alert.alert('Add a day label', 'Choose a workout type or enter your own label.');
    setBusy(true);
    const { error } = await supabase.from('workout_split_days').upsert({ user_id: profile.id, day_of_week: selected, label, details: {}, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day_of_week' });
    setBusy(false);
    if (error) Alert.alert('Workout split', error.message);
    else Alert.alert('Day saved', `${days[selected]} is now set to ${label}.`);
  };

  const clear = async () => {
    const { error } = await supabase.from('workout_split_days').delete().eq('user_id', profile.id).eq('day_of_week', selected);
    if (error) return Alert.alert('Workout split', error.message);
    setLabels((previous) => { const next = { ...previous }; delete next[selected]; return next; });
  };

  const scheduled = Object.keys(labels).length;
  const currentLabel = labels[selected] ?? '';
  const progress = Math.round(scheduled / 7 * 100);
  const summary = useMemo(() => days.map((day, index) => ({ day, label: labels[index] ?? 'Not planned' })), [labels]);

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.backTarget} accessibilityRole="button" accessibilityLabel="Back"><FreshChevronIcon size={27} color={colors.text} direction="left"/></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>Weekly split</Text><Text style={s.sub}>Build a clear training and recovery plan for your week.</Text></View>
    </View>

    <Card style={s.hero}>
      <View style={s.heroArt}><YouCardArtwork kind="weeklySplit" width={150} height={106}/></View>
      <View style={s.heroCopy}><Text style={s.eyebrow}>YOUR TRAINING WEEK</Text><Text style={s.heroTitle}>{scheduled} of 7 days planned</Text><Text style={s.heroSub}>{scheduled ? 'Tap any day below to update it.' : 'Start with the day you usually train next.'}</Text><View style={s.track}><View style={[s.fill, { width: `${progress}%` }]}/></View></View>
    </Card>

    <View style={s.sectionHeading}><View><Text style={s.eyebrow}>SCHEDULE</Text><Text style={s.sectionTitle}>Your week</Text></View><Text style={s.sectionHint}>Tap a day to edit</Text></View>
    <Card style={s.weekCard}>
      {summary.map(({ day, label }, index) => {
        const active = selected === index;
        return <Pressable key={day} onPress={() => setSelected(index)} style={[s.dayRow, active && s.dayRowActive]}>
          <View style={[s.dayImageFrame, active && s.dayImageFrameActive]}><Image source={imageForLabel(labels[index])} style={s.dayImage} resizeMode="contain"/></View>
          <View style={s.dayCopy}><Text style={[s.dayName, active && s.dayNameActive]}>{day}</Text><Text numberOfLines={1} style={s.dayLabel}>{label}</Text></View>
          {index === new Date().getDay() ? <View style={s.todayPill}><Text style={s.todayText}>TODAY</Text></View> : null}
          <Text style={[s.chevron, active && { color: colors.primary }]}>›</Text>
        </Pressable>;
      })}
    </Card>

    <View style={s.sectionHeading}><View><Text style={s.eyebrow}>EDIT DAY</Text><Text style={s.sectionTitle}>{days[selected]}</Text></View><Text style={s.sectionHint}>{currentLabel || 'Not planned'}</Text></View>
    <Card style={s.editorCard}>
      <View style={s.editorPreview}>
        <View style={s.editorArt}><Image source={imageForLabel(currentLabel)} style={s.editorImage} resizeMode="contain"/></View>
        <View style={{ flex: 1 }}><Text style={s.editorTitle}>{currentLabel || 'Choose a workout type'}</Text><Text style={s.heroSub}>This label appears on Home and in your daily training prompt.</Text></View>
      </View>
      <Text style={s.fieldLabel}>QUICK CHOICES</Text>
      <View style={s.presetGrid}>{quick.map((item) => {
        const active = currentLabel === item;
        return <Pressable key={item} onPress={() => setLabels({ ...labels, [selected]: item })} style={[s.preset, active && s.presetActive]}>
          <Image source={imageForLabel(item)} style={s.presetImage} resizeMode="contain"/>
          <Text style={[s.presetText, active && s.presetTextActive]}>{item}</Text>
          {active ? <View style={s.check}><Text style={s.checkText}>✓</Text></View> : null}
        </Pressable>;
      })}</View>
      <Text style={s.fieldLabel}>CUSTOM NAME</Text>
      <Input value={currentLabel} onChangeText={(value) => setLabels({ ...labels, [selected]: value })} placeholder="For example: Mobility + Core" maxLength={60}/>
      <Button title={busy ? 'SAVING…' : `SAVE ${days[selected].toUpperCase()}`} onPress={save} disabled={busy}/>
      {currentLabel ? <Pressable onPress={clear} style={s.clearButton}><Text style={s.clearText}>Clear this day</Text></Pressable> : null}
    </Card>

    <View style={s.infoCard}><Text style={s.infoMark}>i</Text><Text style={s.infoText}>Rest days remain part of your plan and do not break workout streaks. You can change any day at any time.</Text></View>
  </RefreshableScrollView>;
}

const styles = (colors:any, isDark:boolean) => StyleSheet.create({
  wrap:{padding:16,paddingBottom:120},
  header:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:14},
  backTarget:{width:48,height:48,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border},
  title:{color:colors.text,fontSize:27,fontWeight:'900',letterSpacing:-.4},
  sub:{color:colors.muted,fontSize:11,lineHeight:16,marginTop:2},
  eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:.8},
  hero:{minHeight:148,flexDirection:'row',alignItems:'center',padding:12,borderColor:colors.primary,backgroundColor:isDark?colors.panel:colors.panel2,overflow:'hidden'},
  heroArt:{width:152,height:108,borderRadius:22,overflow:'hidden',backgroundColor:'#0B0D0F',alignItems:'center',justifyContent:'center'},
  heroCopy:{flex:1,paddingLeft:10},heroTitle:{color:colors.text,fontSize:19,fontWeight:'900',marginTop:5},heroSub:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:4},
  track:{height:7,borderRadius:99,backgroundColor:colors.panel2,overflow:'hidden',marginTop:10},fill:{height:'100%',borderRadius:99,backgroundColor:colors.primary},
  sectionHeading:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginTop:18,marginBottom:8},sectionTitle:{color:colors.text,fontSize:21,fontWeight:'900',marginTop:3},sectionHint:{color:colors.muted,fontSize:9,fontWeight:'700'},
  weekCard:{paddingVertical:5,borderRadius:22},dayRow:{minHeight:76,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:7,borderBottomWidth:1,borderBottomColor:colors.border},dayRowActive:{marginHorizontal:-5,paddingHorizontal:5,borderRadius:17,borderWidth:1,borderColor:colors.primary,backgroundColor:colors.primarySoft},
  dayImageFrame:{width:66,height:58,borderRadius:15,overflow:'hidden',backgroundColor:isDark?'#FFFFFF':colors.panel2,alignItems:'center',justifyContent:'center'},dayImageFrameActive:{backgroundColor:isDark?'#FFFFFF':colors.panel},dayImage:{width:'100%',height:'100%'},dayCopy:{flex:1},dayName:{color:colors.text,fontSize:13,fontWeight:'900'},dayNameActive:{color:colors.primary},dayLabel:{color:colors.muted,fontSize:11,marginTop:3},
  todayPill:{borderRadius:999,backgroundColor:colors.panel2,paddingHorizontal:7,paddingVertical:5},todayText:{color:colors.muted,fontSize:7,fontWeight:'900'},chevron:{color:colors.muted,fontSize:25,fontWeight:'300'},
  editorCard:{borderRadius:22},editorPreview:{flexDirection:'row',alignItems:'center',gap:11,paddingBottom:12,borderBottomWidth:1,borderBottomColor:colors.border},editorArt:{width:112,height:84,borderRadius:18,overflow:'hidden',backgroundColor:isDark?'#FFFFFF':colors.panel2},editorImage:{width:'100%',height:'100%'},editorTitle:{color:colors.text,fontSize:16,fontWeight:'900'},
  fieldLabel:{color:colors.muted,fontSize:9,fontWeight:'900',letterSpacing:.6,marginTop:13,marginBottom:7},presetGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},preset:{width:'48.5%',minHeight:72,borderRadius:16,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel2,flexDirection:'row',alignItems:'center',padding:7,gap:5},presetActive:{borderColor:colors.primary,backgroundColor:colors.primarySoft},presetImage:{width:48,height:48},presetText:{color:colors.text,flex:1,fontSize:10,fontWeight:'800'},presetTextActive:{color:colors.primary,fontWeight:'900'},check:{width:20,height:20,borderRadius:10,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},checkText:{color:'#FFFFFF',fontSize:10,fontWeight:'900'},
  clearButton:{minHeight:44,alignItems:'center',justifyContent:'center',marginTop:4},clearText:{color:colors.danger,fontSize:11,fontWeight:'900'},
  infoCard:{flexDirection:'row',gap:10,borderRadius:17,backgroundColor:colors.primarySoft,padding:13,marginTop:12},infoMark:{width:24,height:24,borderRadius:12,backgroundColor:colors.primary,color:'#FFFFFF',fontWeight:'900',textAlign:'center',lineHeight:24},infoText:{flex:1,color:colors.text,fontSize:10,lineHeight:16},
});
