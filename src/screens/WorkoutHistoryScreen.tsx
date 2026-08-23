import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { formatDistance, formatWeight, kgToDisplay } from '../lib/units';

export default function WorkoutHistoryScreen({ profile, initialSessionId, onBack }: { profile: Profile; initialSessionId?: string; onBack: () => void }) {
  const { colors, weightUnit, distanceUnit } = useTheme(); const styles = createStyles(colors);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(initialSessionId ?? null);
  const [month,setMonth]=useState(()=>new Date());

  useEffect(() => { setExpandedId(initialSessionId ?? null); }, [initialSessionId]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(15);
      const rows = data ?? []; setSessions(rows);
      const ids = rows.map((x: any) => x.id);
      if (!ids.length) return setSets([]);
      const { data: setRows } = await supabase.from('workout_sets').select('session_id,exercise_name,set_number,weight_kg,reps,distance_km,duration_min').eq('user_id', profile.id).in('session_id', ids).order('created_at', { ascending: true });
      setSets(setRows ?? []);
    };
    load();
  }, [profile.id]);

  const summaries = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sets.forEach((x) => (grouped[x.session_id] ??= []).push(x));
    return sessions.map((s) => {
      const rows = grouped[s.id] ?? [];
      const exercises = new Set(rows.map((x) => x.exercise_name)).size;
      const volume = Math.round(rows.reduce((n, x) => n + Number(x.weight_kg ?? 0) * Number(x.reps ?? 0), 0));
      const distance = rows.reduce((n, x) => n + Number(x.distance_km ?? 0), 0);
      const start = new Date(s.started_at).getTime(), end = s.ended_at ? new Date(s.ended_at).getTime() : start;
      const minutes = Math.max(1, Math.round((end - start) / 60000));
      return { ...s, rows, exercises, volume, distance, minutes };
    });
  }, [sessions, sets]);

  return <ScrollView contentContainerStyle={styles.wrap}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View><Text style={styles.title}>Workout history</Text><Text style={styles.sub}>Your 15 most recent saved workouts</Text></View></View>
    <WorkoutCalendar month={month} sessions={summaries} onMonth={setMonth} onPick={setExpandedId}/>
    {summaries.length ? summaries.map((s: any, index: number) => {
      const expanded = expandedId === s.id;
      const groupedExercises = groupExerciseRows(s.rows);
      return <Pressable key={s.id} onPress={() => setExpandedId(expanded ? null : s.id)}>
        <Card>
          <View style={styles.top}><View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{sessionTitle(s.summary)}</Text><Text style={styles.meta}>{new Date(s.ended_at ?? s.started_at).toLocaleString()}</Text></View><Text style={styles.expand}>{expanded ? '⌃' : '›'}</Text></View>
          <Text style={styles.exercises} numberOfLines={expanded ? undefined : 2}>{Array.from(new Set(s.rows.map((x: any) => x.exercise_name))).join(' • ') || 'Workout'}</Text>
          <View style={styles.stats}><Mini label="Exercises" value={`${s.exercises}`} /><Mini label="Sets" value={`${s.rows.length}`} /><Mini label="Time" value={`${s.minutes}m`} /><Mini label="Volume" value={s.volume > 0 ? `${Math.round(kgToDisplay(s.volume, weightUnit)).toLocaleString()} ${weightUnit}` : s.distance > 0 ? formatDistance(s.distance, distanceUnit, 1) : '—'} /></View>
          {expanded ? <View style={styles.details}>{groupedExercises.map(({ name, rows }: any) => <View key={name} style={styles.exerciseGroup}><Text style={styles.exerciseName}>{name}</Text>{rows.map((row: any, i: number) => <View key={`${name}-${row.set_number ?? i}-${i}`} style={styles.setRow}><Text style={styles.setLabel}>{row.weight_kg != null || row.reps != null ? `Set ${row.set_number ?? i + 1}` : 'Result'}</Text><Text style={styles.setValue}>{rowText(row, weightUnit, distanceUnit)}</Text></View>)}</View>)}</View> : null}
        </Card>
      </Pressable>;
    }) : <Card><Text style={styles.meta}>No completed workouts yet.</Text></Card>}
  </ScrollView>;
}

function WorkoutCalendar({month,sessions,onMonth,onPick}:{month:Date;sessions:any[];onMonth:(d:Date)=>void;onPick:(id:string)=>void}){
 const{colors}=useTheme();const s=createStyles(colors);const y=month.getFullYear(),m=month.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
 const byDay=new Map<string,any>();sessions.forEach(x=>byDay.set(new Date(x.ended_at??x.started_at).toDateString(),x));
 const move=(n:number)=>onMonth(new Date(y,m+n,1));
 return <Card><View style={s.calendarHead}><Pressable onPress={()=>move(-1)}><Text style={s.calendarArrow}>‹</Text></Pressable><Text style={s.calendarTitle}>{month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</Text><Pressable onPress={()=>move(1)}><Text style={s.calendarArrow}>›</Text></Pressable></View><View style={s.calendarGrid}>{['S','M','T','W','T','F','S'].map((x,i)=><Text key={i} style={s.weekDay}>{x}</Text>)}{Array.from({length:first}).map((_,i)=><View key={`b${i}`} style={s.day}/>)}{Array.from({length:days}).map((_,i)=>{const d=new Date(y,m,i+1),workout=byDay.get(d.toDateString());return <Pressable key={i} onPress={()=>workout&&onPick(workout.id)} style={[s.day,workout&&s.workoutDay]}><Text style={[s.dayText,workout&&s.workoutDayText]}>{i+1}</Text>{workout?<Text style={s.dayDot}>●</Text>:null}</Pressable>})}</View><Text style={s.calendarHint}>Highlighted days contain completed workouts. Tap one to open it below.</Text></Card>
}

function groupExerciseRows(rows: any[]) {
  const map = new Map<string, any[]>();
  rows.forEach((row) => { const current = map.get(row.exercise_name) ?? []; current.push(row); map.set(row.exercise_name, current); });
  return Array.from(map.entries()).map(([name, grouped]) => ({ name, rows: grouped }));
}
function rowText(row: any, weightUnit: 'kg'|'lb', distanceUnit: 'km'|'mi') {
  if (Number(row.weight_kg ?? 0) > 0 || Number(row.reps ?? 0) > 0) return `${formatWeight(Number(row.weight_kg ?? 0), weightUnit, 2)} × ${Number(row.reps ?? 0)} reps`;
  const parts: string[] = [];
  if (Number(row.distance_km ?? 0) > 0) parts.push(formatDistance(Number(row.distance_km), distanceUnit, 2));
  if (Number(row.duration_min ?? 0) > 0) parts.push(`${Number(row.duration_min)} min`);
  return parts.join(' • ') || 'Completed';
}
function sessionTitle(summary?: string | null) {
  if (!summary) return 'Workout';
  const names = summary.split(',').map((x) => x.trim()).filter(Boolean);
  if (names.length === 1) return names[0];
  return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : 'Workout';
}
function Mini({ label, value }: { label: string; value: string }) { const { colors } = useTheme(); const s = createStyles(colors); return <View style={s.mini}><Text style={s.miniValue}>{value}</Text><Text style={s.miniLabel}>{label}</Text></View>; }

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 34 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }, back: { width: 34, height: 42, justifyContent: 'center' }, backText: { color: colors.text, fontSize: 36, fontWeight: '300' }, title: { color: colors.text, fontSize: 27, fontWeight: '900' }, sub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 }, number: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, numberText: { color: colors.blue, fontWeight: '900' }, name: { color: colors.text, fontWeight: '900', fontSize: 15 }, meta: { color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 15 }, expand: { color: colors.muted, fontSize: 24, fontWeight: '800' }, exercises: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 10 }, stats: { flexDirection: 'row', gap: 6, marginTop: 12 }, mini: { flex: 1, backgroundColor: colors.panel2, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 5, alignItems: 'center' }, miniValue: { color: colors.text, fontSize: 11, fontWeight: '900', textAlign: 'center' }, miniLabel: { color: colors.muted, fontSize: 8, marginTop: 3 },
  details: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }, exerciseGroup: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, exerciseName: { color: colors.text, fontSize: 12, fontWeight: '900', marginBottom: 4 }, setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }, setLabel: { color: colors.muted, fontSize: 9 }, setValue: { color: colors.text, fontSize: 10, fontWeight: '800' }, calendarHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},calendarArrow:{color:colors.primary,fontSize:30,fontWeight:'800',paddingHorizontal:8},calendarTitle:{color:colors.text,fontWeight:'900'},calendarGrid:{flexDirection:'row',flexWrap:'wrap',marginTop:8},weekDay:{width:'14.285%',textAlign:'center',color:colors.muted,fontSize:9,fontWeight:'900',paddingVertical:5},day:{width:'14.285%',height:42,alignItems:'center',justifyContent:'center',borderRadius:9},workoutDay:{backgroundColor:colors.blueSoft,borderWidth:1,borderColor:colors.blue},dayText:{color:colors.muted,fontSize:11},workoutDayText:{color:colors.text,fontWeight:'900'},dayDot:{color:colors.green,fontSize:7},calendarHint:{color:colors.muted,fontSize:9,marginTop:8,textAlign:'center'},
});
