import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';

export default function WorkoutHistoryScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(15);
      const rows = data ?? []; setSessions(rows);
      const ids = rows.map((x:any) => x.id);
      if (!ids.length) return setSets([]);
      const { data: setRows } = await supabase.from('workout_sets').select('session_id,exercise_name,weight_kg,reps,distance_km,duration_min').eq('user_id', profile.id).in('session_id', ids).order('created_at', { ascending: true });
      setSets(setRows ?? []);
    };
    load();
  }, [profile.id]);

  const summaries = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sets.forEach(x => (grouped[x.session_id] ??= []).push(x));
    return sessions.map(s => {
      const rows = grouped[s.id] ?? [];
      const exercises = new Set(rows.map(x => x.exercise_name)).size;
      const volume = Math.round(rows.reduce((n,x) => n + Number(x.weight_kg ?? 0) * Number(x.reps ?? 0), 0));
      const distance = rows.reduce((n,x) => n + Number(x.distance_km ?? 0), 0);
      const start = new Date(s.started_at).getTime(), end = s.ended_at ? new Date(s.ended_at).getTime() : start;
      const minutes = Math.max(1, Math.round((end-start)/60000));
      return { ...s, rows, exercises, volume, distance, minutes };
    });
  }, [sessions, sets]);

  return <ScrollView contentContainerStyle={styles.wrap}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View><Text style={styles.title}>Workout history</Text><Text style={styles.sub}>Your 15 most recent saved workouts</Text></View></View>
    {summaries.length ? summaries.map((s:any, index:number) => <Card key={s.id}>
      <View style={styles.top}><View style={styles.number}><Text style={styles.numberText}>{index+1}</Text></View><View style={{flex:1}}><Text style={styles.name}>{sessionTitle(s.summary)}</Text><Text style={styles.meta}>{new Date(s.ended_at ?? s.started_at).toLocaleString()}</Text></View><Text style={styles.done}>✓</Text></View>
      <Text style={styles.exercises} numberOfLines={2}>{Array.from(new Set(s.rows.map((x:any)=>x.exercise_name))).join(' • ') || 'Workout'}</Text>
      <View style={styles.stats}><Mini label="Exercises" value={`${s.exercises}`} /><Mini label="Sets" value={`${s.rows.length}`} /><Mini label="Time" value={`${s.minutes}m`} /><Mini label="Volume" value={s.volume > 0 ? `${s.volume.toLocaleString()} kg` : s.distance > 0 ? `${s.distance.toFixed(1)} km` : '—'} /></View>
    </Card>) : <Card><Text style={styles.meta}>No completed workouts yet.</Text></Card>}
  </ScrollView>;
}

function sessionTitle(summary?: string | null) {
  if (!summary) return 'Workout';
  const names = summary.split(',').map(x=>x.trim()).filter(Boolean);
  if (names.length === 1) return names[0];
  return names.length > 1 ? `${names[0]} + ${names.length-1} more` : 'Workout';
}
function Mini({label,value}:{label:string;value:string}) { const {colors}=useTheme(); const s=createStyles(colors); return <View style={s.mini}><Text style={s.miniValue}>{value}</Text><Text style={s.miniLabel}>{label}</Text></View>; }

const createStyles=(colors:any)=>StyleSheet.create({
  wrap:{padding:16,paddingTop:10,paddingBottom:34}, header:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}, back:{width:34,height:42,justifyContent:'center'}, backText:{color:colors.text,fontSize:36,fontWeight:'300'}, title:{color:colors.text,fontSize:27,fontWeight:'900'}, sub:{color:colors.muted,fontSize:11,marginTop:2},
  top:{flexDirection:'row',alignItems:'center',gap:10}, number:{width:34,height:34,borderRadius:10,backgroundColor:colors.blueSoft,alignItems:'center',justifyContent:'center'}, numberText:{color:colors.blue,fontWeight:'900'}, name:{color:colors.text,fontWeight:'900',fontSize:15}, meta:{color:colors.muted,fontSize:10,marginTop:3,lineHeight:15}, done:{color:colors.green,fontSize:20,fontWeight:'900'}, exercises:{color:colors.muted,fontSize:11,lineHeight:16,marginTop:10}, stats:{flexDirection:'row',gap:6,marginTop:12}, mini:{flex:1,backgroundColor:colors.panel2,borderRadius:9,paddingVertical:8,paddingHorizontal:5,alignItems:'center'}, miniValue:{color:colors.text,fontSize:11,fontWeight:'900',textAlign:'center'}, miniLabel:{color:colors.muted,fontSize:8,marginTop:3}
});
