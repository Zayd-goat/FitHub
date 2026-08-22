import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const quick = ['Push Day','Pull Day','Leg Day','Upper Body','Lower Body','Full Body','Cardio','Rest Day'];

type SplitDay = { id?: string; day_of_week: number; label: string; details?: any };

export default function WorkoutSplitScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const { colors } = useTheme(); const s = styles(colors);
  const [selected, setSelected] = useState(1);
  const [labels, setLabels] = useState<Record<number,string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('workout_split_days').select('day_of_week,label,details').eq('user_id', profile.id).order('day_of_week');
    const next: Record<number,string> = {};
    (data ?? []).forEach((row:any) => next[row.day_of_week] = row.label);
    setLabels(next);
  };
  useEffect(() => { load(); }, [profile.id]);

  const save = async () => {
    const label = (labels[selected] ?? '').trim();
    if (!label) return Alert.alert('Add a day label', 'Choose something like Push Day, Rest Day, or enter your own label.');
    setBusy(true);
    const { error } = await supabase.from('workout_split_days').upsert({ user_id: profile.id, day_of_week: selected, label, details: {}, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day_of_week' });
    setBusy(false);
    if (error) Alert.alert('Workout split', error.message); else Alert.alert('Saved', `${days[selected]} is now ${label}.`);
  };
  const clear = async () => {
    await supabase.from('workout_split_days').delete().eq('user_id', profile.id).eq('day_of_week', selected);
    setLabels((prev) => { const next = { ...prev }; delete next[selected]; return next; });
  };

  return <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
    <View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>‹</Text></Pressable><View><Text style={s.title}>Workout split</Text><Text style={s.sub}>Plan what FitHub should show you on each day.</Text></View></View>
    <Card><SectionTitle title="Your week" subtitle="Tap a day to set or change it." />
      <View style={s.week}>{days.map((day,i) => <Pressable key={day} onPress={() => setSelected(i)} style={[s.day, selected === i && s.dayActive]}><Text style={[s.dayName, selected === i && s.dayNameActive]}>{day.slice(0,3)}</Text><Text numberOfLines={1} style={s.dayLabel}>{labels[i] || 'Not set'}</Text></Pressable>)}</View>
    </Card>
    <Card><SectionTitle title={days[selected]} subtitle="Pick a quick label or type your own." />
      <View style={s.chips}>{quick.map((item) => <Chip key={item} label={item} active={labels[selected] === item} onPress={() => setLabels({ ...labels, [selected]: item })} />)}</View>
      <Input value={labels[selected] ?? ''} onChangeText={(v) => setLabels({ ...labels, [selected]: v })} placeholder="Custom label" />
      <Button title={busy ? 'SAVING…' : 'SAVE DAY'} onPress={save} disabled={busy} />
      {labels[selected] ? <Button title="CLEAR THIS DAY" onPress={clear} secondary /> : null}
    </Card>
    <Card><SectionTitle title="Daily message" subtitle="When you first open FitHub on a scheduled day, it will tell you what you planned, such as “Today: Push Day” or “Today: Rest Day”." /></Card>
  </ScrollView>;
}
const styles = (colors:any) => StyleSheet.create({
  wrap:{padding:16,paddingBottom:40}, header:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:16}, back:{color:colors.text,fontSize:38,width:28}, title:{color:colors.text,fontSize:25,fontWeight:'900'}, sub:{color:colors.muted,fontSize:11,marginTop:2}, week:{gap:7}, day:{borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel2,borderRadius:12,padding:11,flexDirection:'row',alignItems:'center'}, dayActive:{borderColor:colors.primary,backgroundColor:colors.primarySoft}, dayName:{color:colors.text,fontWeight:'900',width:48}, dayNameActive:{color:colors.primary}, dayLabel:{color:colors.muted,flex:1}, chips:{flexDirection:'row',flexWrap:'wrap'}
});
