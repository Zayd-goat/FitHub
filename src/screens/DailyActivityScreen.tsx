import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle, useTheme } from '../components/UI';
import { estimateActivityEnergyBySession } from '../lib/calories';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';

type Focus = 'volume' | 'energy';

export default function DailyActivityScreen({ profile, focus, onBack }: { profile: Profile; focus: Focus; onBack: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const locked = (profile.age ?? 0) < 18;

  useEffect(() => {
    const load = async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const { data: sessionRows } = await supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).gte('ended_at', today.toISOString()).order('ended_at', { ascending: false });
      const rows = sessionRows ?? [];
      setSessions(rows);
      const ids = rows.map((x:any) => x.id);
      if (!ids.length) return setSets([]);
      const { data: setRows } = await supabase.from('workout_sets').select('session_id,exercise_name,weight_kg,reps,distance_km,duration_min,created_at').eq('user_id', profile.id).in('session_id', ids).order('created_at', { ascending: true });
      setSets(setRows ?? []);
    };
    load();
  }, [profile.id]);

  const volume = useMemo(() => Math.round(sets.reduce((sum, row:any) => sum + Number(row.weight_kg ?? 0) * Number(row.reps ?? 0), 0)), [sets]);
  const energy = useMemo(() => {
    if (locked || !profile.weight_kg) return { total: 0, breakdown: [] as any[] };
    return estimateActivityEnergyBySession(sessions, sets, profile.weight_kg);
  }, [sessions, sets, profile.weight_kg, locked]);

  const bySession = useMemo(() => {
    return sessions.map((session:any) => {
      const rows = sets.filter((x:any) => x.session_id === session.id);
      return {
        ...session,
        rows,
        volume: Math.round(rows.reduce((sum:number, x:any) => sum + Number(x.weight_kg ?? 0) * Number(x.reps ?? 0), 0)),
        distance: rows.reduce((sum:number, x:any) => sum + Number(x.distance_km ?? 0), 0),
      };
    });
  }, [sessions, sets]);

  return <ScrollView contentContainerStyle={styles.wrap}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View style={{flex:1}}><Text style={styles.title}>{focus === 'volume' ? 'Today’s volume' : 'Today’s activity energy'}</Text><Text style={styles.sub}>{focus === 'volume' ? 'Where today’s training volume came from' : locked ? 'Energy estimates are not shown for under-18 accounts' : 'Exercise-energy estimate based on activity, duration, pace and body mass'}</Text></View></View>

    <Card style={styles.hero}>
      <Text style={styles.heroLabel}>{focus === 'volume' ? 'TOTAL VOLUME TODAY' : 'ESTIMATED EXERCISE ENERGY'}</Text>
      <Text style={styles.heroValue}>{focus === 'volume' ? `${volume.toLocaleString()} kg` : locked ? '—' : `~${energy.total} kcal`}</Text>
      <Text style={styles.heroHint}>{focus === 'volume' ? 'Weight × completed reps across today’s saved strength sets.' : locked ? 'Use workout time, distance and progress instead.' : 'Estimate only — not a medical or wearable-grade measurement.'}</Text>
    </Card>

    <SectionTitle title="Today’s workouts" subtitle={sessions.length ? `${sessions.length} completed session${sessions.length === 1 ? '' : 's'}` : 'Nothing completed yet today'} />
    {bySession.map((session:any) => {
      const e = energy.breakdown.find((x:any) => x.sessionId === session.id);
      return <Card key={session.id}>
        <Text style={styles.sessionTitle}>{sessionTitle(session.summary)}</Text>
        <Text style={styles.sessionMeta}>{new Date(session.ended_at ?? session.started_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
        <View style={styles.metrics}><Metric label="Volume" value={session.volume ? `${session.volume.toLocaleString()} kg` : '—'} /><Metric label="Distance" value={session.distance ? `${session.distance.toFixed(2)} km` : '—'} /><Metric label="Energy" value={locked ? '—' : e ? `~${e.kcal} kcal` : '—'} /></View>
        {focus === 'energy' && !locked && e?.lines?.length ? <View style={styles.breakdown}>{e.lines.map((line:any, index:number) => <View key={`${line.exercise}-${index}`} style={styles.breakdownRow}><View style={{flex:1}}><Text style={styles.breakdownName}>{line.exercise}</Text><Text style={styles.breakdownMeta}>{Math.round(line.minutes)} min • MET {line.met.toFixed(1)}</Text></View><Text style={styles.breakdownValue}>~{Math.round(line.kcal)} kcal</Text></View>)}</View> : null}
        {focus === 'volume' ? <View style={styles.breakdown}>{session.rows.filter((x:any)=>Number(x.weight_kg ?? 0)>0 && Number(x.reps ?? 0)>0).map((row:any,index:number)=><View key={`${row.exercise_name}-${index}`} style={styles.breakdownRow}><View style={{flex:1}}><Text style={styles.breakdownName}>{row.exercise_name}</Text><Text style={styles.breakdownMeta}>{Number(row.weight_kg)} kg × {Number(row.reps)} reps</Text></View><Text style={styles.breakdownValue}>{Math.round(Number(row.weight_kg)*Number(row.reps)).toLocaleString()} kg</Text></View>)}</View> : null}
      </Card>;
    })}
    {!sessions.length ? <Card><Text style={styles.empty}>Complete a workout and today’s breakdown will appear here.</Text></Card> : null}
  </ScrollView>;
}

function sessionTitle(summary?:string|null) { const names=(summary??'').split(',').map(x=>x.trim()).filter(Boolean); return names.length>1?`${names[0]} + ${names.length-1} more`:(names[0]||'Workout'); }
function Metric({label,value}:{label:string;value:string}) { const {colors}=useTheme(); const styles=createStyles(colors); return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
const createStyles=(colors:any)=>StyleSheet.create({
  wrap:{padding:16,paddingTop:10,paddingBottom:34}, header:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14}, back:{width:34,height:42,justifyContent:'center'}, backText:{color:colors.text,fontSize:36,fontWeight:'300'}, title:{color:colors.text,fontSize:26,fontWeight:'900'}, sub:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:2},
  hero:{borderColor:colors.blue,padding:16}, heroLabel:{color:colors.blue,fontSize:10,fontWeight:'900'}, heroValue:{color:colors.text,fontSize:31,fontWeight:'900',marginTop:5}, heroHint:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:4}, sessionTitle:{color:colors.text,fontSize:16,fontWeight:'900'}, sessionMeta:{color:colors.muted,fontSize:10,marginTop:2}, metrics:{flexDirection:'row',gap:6,marginTop:12}, metric:{flex:1,backgroundColor:colors.panel2,borderRadius:9,padding:8,alignItems:'center'}, metricValue:{color:colors.text,fontWeight:'900',fontSize:11,textAlign:'center'}, metricLabel:{color:colors.muted,fontSize:8,marginTop:3}, breakdown:{borderTopWidth:1,borderTopColor:colors.border,marginTop:12,paddingTop:5}, breakdownRow:{flexDirection:'row',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:colors.border}, breakdownName:{color:colors.text,fontWeight:'800',fontSize:11}, breakdownMeta:{color:colors.muted,fontSize:9,marginTop:2}, breakdownValue:{color:colors.blue,fontWeight:'900',fontSize:10}, empty:{color:colors.muted,fontSize:11}
});
