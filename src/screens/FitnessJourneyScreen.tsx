import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { formatDistance, formatPace, formatWeight } from '../lib/units';
import { profileAge } from '../lib/profileAge';

type Period = 'week' | 'month';

export default function FitnessJourneyScreen({ profile, initialPeriod = 'week', onBack }: { profile: Profile; initialPeriod?: 'week'|'month'; onBack: () => void }) {
  const { colors, weightUnit, distanceUnit } = useTheme(); const s = styles(colors);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);

  useEffect(() => { setPeriod(initialPeriod); }, [initialPeriod]);

  const load = async () => {
    const since = new Date(); since.setDate(since.getDate() - 35);
    const [a,b,c] = await Promise.all([
      supabase.from('workout_sessions').select('id,started_at,ended_at,summary').eq('user_id', profile.id).eq('completed', true).gte('ended_at', since.toISOString()).order('ended_at', { ascending: false }),
      supabase.from('workout_sets').select('session_id,exercise_name,weight_kg,reps,distance_km,duration_min,created_at').eq('user_id', profile.id).gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(5000),
      supabase.from('pr_events').select('exercise_name,metric,value_numeric,previous_value_numeric,unit,details,achieved_at').eq('user_id', profile.id).gte('achieved_at', since.toISOString()).order('achieved_at', { ascending: false }),
    ]);
    setSessions(a.data ?? []); setSets(b.data ?? []); setPrs(c.data ?? []);
  };
  useEffect(() => { load(); }, [profile.id]);

  const data = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - (period === 'week' ? 6 : 29));
    const ps = sessions.filter((x) => new Date(x.ended_at ?? x.started_at) >= start);
    const ids = new Set(ps.map((x) => x.id));
    const psets = sets.filter((x) => ids.has(x.session_id));
    const pprs = prs.filter((x) => new Date(x.achieved_at) >= start);
    const volume = psets.reduce((sum,x) => sum + Number(x.weight_kg ?? 0) * Number(x.reps ?? 0), 0);
    const distance = psets.reduce((sum,x) => sum + Number(x.distance_km ?? 0), 0);
    const duration = ps.reduce((sum,x) => sum + Math.max(0,(new Date(x.ended_at).getTime()-new Date(x.started_at).getTime())/60000),0);
    const activeDays = new Set(ps.map((x)=>new Date(x.ended_at ?? x.started_at).toDateString())).size;
    const strengthRows = psets.filter((x)=>Number(x.weight_kg ?? 0)>0 && Number(x.reps ?? 0)>0);
    const bestByExercise = new Map<string,any>();
    strengthRows.forEach((row)=>{ const prev=bestByExercise.get(row.exercise_name); if(!prev || Number(row.weight_kg)>Number(prev.weight_kg)) bestByExercise.set(row.exercise_name,row); });
    return { start, ps, psets, pprs, volume, distance, duration, activeDays, bestByExercise };
  }, [period,sessions,sets,prs]);

  const adult = (profileAge(profile) ?? 0) >= 18;
  const recommendations = useMemo(() => {
    const list:string[] = [];
    if (data.ps.length === 0) list.push('No completed sessions in this period yet. Use your saved split to make the next session easy to start.');
    else {
      if (data.activeDays < Math.min(profile.workout_days_target, period === 'week' ? 7 : 30)) list.push('Your planned training days are ahead of your completed days. Consider adjusting the split to a schedule that is easier to maintain.');
      if (data.pprs.length) list.push(`You recorded ${data.pprs.length} new personal record${data.pprs.length===1?'':'s'}. Keep technique and recovery consistent rather than chasing another jump immediately.`);
      if (data.duration / Math.max(1,data.ps.length) > 100) list.push('Your average session is quite long. If fatigue is building, shorter focused sessions can be easier to recover from.');
      if (!data.pprs.length && data.ps.length >= 2) list.push(adult ? 'Progress does not need to mean adding load every session. Reps, control, range of motion and consistency all count.' : 'Keep the focus on technique, consistency and age-appropriate coaching rather than heavier loads.');
    }
    return list.slice(0,3);
  }, [data, profile.workout_days_target, adult, period]);

  const topLifts = Array.from(data.bestByExercise.entries()).slice(0,5);

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={s.wrap}>
    <View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>‹</Text></Pressable><View><Text style={s.title}>My Fitness Journey</Text><Text style={s.sub}>Reports built from your own completed workouts and PR history.</Text></View></View>
    <View style={s.period}><Chip label="Weekly report" active={period==='week'} onPress={()=>setPeriod('week')}/><Chip label="Monthly report" active={period==='month'} onPress={()=>setPeriod('month')}/></View>

    <View style={s.metrics}><Metric label="Workouts" value={String(data.ps.length)} /><Metric label="Active days" value={String(data.activeDays)} /><Metric label="PRs" value={String(data.pprs.length)} /><Metric label="Training time" value={`${Math.round(data.duration)} min`} /></View>
    <View style={s.metrics}><Metric label="Volume" value={formatWeight(data.volume, weightUnit, 0)} /><Metric label="Cardio distance" value={formatDistance(data.distance, distanceUnit, 1)} /></View>

    <Card><SectionTitle title="Lift highlights" subtitle="Best recorded load for exercises trained in this report period." />{topLifts.length ? topLifts.map(([name,row]) => <View key={name} style={s.row}><Text style={s.rowName}>{name}</Text><Text style={s.rowValue}>{formatWeight(Number(row.weight_kg),weightUnit)} × {Number(row.reps)} reps</Text></View>) : <Text style={s.sub}>No strength sets recorded in this period.</Text>}</Card>

    <Card><SectionTitle title="Improvements" subtitle="New PR events in this report period." />{data.pprs.length ? data.pprs.slice(0,8).map((pr:any,i:number)=><View key={`${pr.achieved_at}-${i}`} style={s.pr}><Text style={s.prIcon}>★</Text><View style={{flex:1}}><Text style={s.rowName}>{pr.exercise_name}</Text><Text style={s.sub}>{prLabel(pr,weightUnit,distanceUnit)}</Text></View><Text style={s.date}>{new Date(pr.achieved_at).toLocaleDateString()}</Text></View>) : <Text style={s.sub}>No new PR events in this period. That does not mean the training was unproductive.</Text>}</Card>

    <Card><SectionTitle title="FitHub suggestions" subtitle="General training observations, not medical or coaching instructions." />{recommendations.map((item,i)=><View key={i} style={s.rec}><Text style={s.bullet}>•</Text><Text style={s.recText}>{item}</Text></View>)}</Card>
  </RefreshableScrollView>;
}

function prLabel(pr:any, weightUnit:'kg'|'lb', distanceUnit:'km'|'mi') {
  if (pr.metric === 'max_weight' || pr.metric === 'reps_at_weight') {
    const kg = pr.unit === 'kg' ? Number(pr.value_numeric) : Number(pr.details?.weight_kg ?? pr.value_numeric);
    const reps = pr.details?.reps;
    return `${pr.metric==='max_weight'?'New max':'Rep PR'} • ${formatWeight(kg,weightUnit)}${reps?` × ${reps} reps`:''}`;
  }
  if (pr.metric === 'distance') return `Distance PR • ${formatDistance(Number(pr.value_numeric),distanceUnit)}`;
  if (pr.metric === 'pace') return `Pace PR • ${formatPace(Number(pr.value_numeric),distanceUnit)}`;
  return `${pr.metric.replaceAll('_',' ')} • ${Number(pr.value_numeric).toFixed(1)} ${pr.unit}`;
}
function Metric({label,value}:{label:string;value:string}) { const {colors}=useTheme(); const s=styles(colors); return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>; }
const styles=(colors:any)=>StyleSheet.create({wrap:{padding:16,paddingBottom:40},header:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:15},back:{color:colors.text,fontSize:38,width:28},title:{color:colors.text,fontSize:25,fontWeight:'900'},sub:{color:colors.muted,fontSize:11,lineHeight:16,marginTop:2},period:{flexDirection:'row',flexWrap:'wrap',marginBottom:10},metrics:{flexDirection:'row',gap:8,marginBottom:8},metric:{flex:1,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:12},metricLabel:{color:colors.muted,fontSize:9},metricValue:{color:colors.text,fontSize:18,fontWeight:'900',marginTop:5},row:{flexDirection:'row',justifyContent:'space-between',gap:10,paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border},rowName:{color:colors.text,fontWeight:'900',flex:1},rowValue:{color:colors.primary,fontWeight:'900',fontSize:11},pr:{flexDirection:'row',gap:9,alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border},prIcon:{color:colors.gold,fontSize:18},date:{color:colors.muted,fontSize:9},rec:{flexDirection:'row',gap:8,marginBottom:9},bullet:{color:colors.primary,fontWeight:'900'},recText:{color:colors.text,flex:1,fontSize:12,lineHeight:18}});
