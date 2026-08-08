import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, useTheme } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { exerciseLibrary, figureImages } from '../../data/exerciseLibrary';

export default function DashboardTab({ profile, onStartWorkout, onViewProgress, onViewWorkouts }: { profile: Profile; onStartWorkout: () => void; onViewProgress: () => void; onViewWorkouts: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [todayVolume, setTodayVolume] = useState(0);
  const [todayBurned, setTodayBurned] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);
  const [dayKey, setDayKey] = useState(new Date().toDateString());
  const locked = (profile.age ?? 0) < 18;

  useEffect(() => {
    const id = setInterval(() => { const next = new Date().toDateString(); setDayKey(prev => prev === next ? prev : next); }, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const today = new Date(now); today.setHours(0,0,0,0);
      const week = new Date(now); week.setDate(now.getDate()-6); week.setHours(0,0,0,0);
      const [sessionRes, weekSetRes, allStrengthRes] = await Promise.all([
        supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id',profile.id).eq('completed',true).order('ended_at',{ascending:false}).limit(50),
        supabase.from('workout_sets').select('session_id,exercise_name,weight_kg,reps,distance_km,duration_min,created_at').eq('user_id',profile.id).gte('created_at',week.toISOString()).limit(3000),
        supabase.from('workout_sets').select('exercise_name,weight_kg,reps').eq('user_id',profile.id).not('weight_kg','is',null).gt('weight_kg',0).limit(3000)
      ]);
      const sessions = sessionRes.data ?? [], weekSets = weekSetRes.data ?? [];
      const weekSessions = sessions.filter((s:any) => new Date(s.ended_at ?? s.started_at) >= week);
      setWeekWorkouts(weekSessions.length);
      const todaySessionIds = new Set(sessions.filter((s:any)=>new Date(s.ended_at ?? s.started_at)>=today).map((s:any)=>s.id));
      const todaySets = weekSets.filter((x:any)=>todaySessionIds.has(x.session_id));
      setTodayVolume(Math.round(todaySets.reduce((sum:number,x:any)=>sum + Number(x.weight_kg ?? 0)*Number(x.reps ?? 0),0)));
      setPrCount(new Set((allStrengthRes.data ?? []).filter((x:any)=>Number(x.reps ?? 0)>0).map((x:any)=>x.exercise_name)).size);
      if (!locked && profile.weight_kg) setTodayBurned(estimateBurned(sessions.filter((s:any)=>todaySessionIds.has(s.id)), todaySets, profile.weight_kg));
      else setTodayBurned(0);
      const latest = sessions[0];
      const fresh = latest && (now.getTime()-new Date(latest.ended_at ?? latest.started_at).getTime()) <= 7*24*60*60*1000;
      setRecent(fresh ? sessions.slice(0,3) : []);
    };
    load();
  }, [profile.id, profile.tokens, profile.weight_kg, profile.age, dayKey]);

  const firstName = profile.username?.split(/[_\s]/)[0]?.toUpperCase() || profile.username?.toUpperCase();
  const recentFirstExercise = recent[0]?.summary?.split(',')?.[0]?.trim();
  const recentLib = recentFirstExercise ? exerciseLibrary.find(x=>x.name===recentFirstExercise) : undefined;
  const heroImage = recentLib?.visualKey ? figureImages[recentLib.visualKey] : figureImages.chest;
  const workoutTitle = recent.length ? sessionTitle(recent[0]?.summary) : 'Start Training';
  const workoutGroups = recentLib ? `${recentLib.targetArea} • ${recentLib.subsection}` : 'Choose exercises that fit your session';

  return <ScrollView contentContainerStyle={styles.wrap}>
    <View style={styles.header}><View><Text style={styles.greeting}>Good morning,</Text><Text style={styles.name}>{firstName}</Text></View><View style={styles.streak}><Text style={styles.streakValue}>🔥 {profile.login_streak}</Text><Text style={styles.streakLabel}>DAY STREAK</Text></View></View>

    <Card style={styles.heroCard}><View style={styles.heroLeft}><Text style={styles.smallLabel}>Today's Workout</Text><Text style={styles.heroTitle}>{workoutTitle}</Text><Text style={styles.heroMeta}>{workoutGroups}</Text><Pressable onPress={onStartWorkout} style={styles.startButton}><Text style={styles.startText}>START WORKOUT  ›</Text></Pressable></View><Image source={heroImage} style={styles.heroFigure}/></Card>

    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your Progress</Text><Pressable onPress={onViewProgress}><Text style={styles.viewAll}>View all</Text></Pressable></View>
    <View style={styles.statsRow}>
      <Stat label="Workouts" value={`${weekWorkouts}`} sub="This week" accent={colors.blue} icon="◒" />
      <Stat label="Volume" value={todayVolume>999?`${(todayVolume/1000).toFixed(1)}k`:`${todayVolume}`} sub="kg today" accent={colors.blue} icon="↗" />
      <Stat label="Calories" value={locked?'—':`${todayBurned}`} sub={locked?'18+ only':'est. kcal today'} accent={colors.primary} icon="🔥" />
      <Stat label="PR lifts" value={`${prCount}`} sub="Recorded" accent={colors.gold} icon="🏆" />
    </View>

    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Recent Workouts</Text><Pressable onPress={onViewWorkouts}><Text style={styles.viewAll}>View more</Text></Pressable></View>
    {recent.length ? recent.map((s:any) => <RecentWorkout key={s.id} session={s}/>) : <Card style={styles.recentCard}><View style={styles.recentIcon}><Image source={require('../../../assets/nav/workout.png')} style={[styles.recentIconImage,{tintColor:colors.text}]}/></View><View style={{flex:1}}><Text style={styles.recentName}>No recent workout</Text><Text style={styles.recentMeta}>This section clears after 7 days without a workout. Your full history is still saved.</Text></View></Card>}

    <Card><Text style={styles.sectionTitle}>Weekly target</Text><Text style={styles.goalText}>{weekWorkouts} of {profile.workout_days_target} planned training days complete.</Text><View style={styles.track}><View style={[styles.fill,{width:`${Math.min(100,(weekWorkouts/Math.max(1,profile.workout_days_target))*100)}%`}]} /></View></Card>
  </ScrollView>;
}

function estimateBurned(sessions:any[], sets:any[], weightKg:number) {
  let total = 0;
  for (const s of sessions) {
    const start = new Date(s.started_at).getTime(), end = new Date(s.ended_at ?? s.started_at).getTime();
    const minutes = Math.max(1,(end-start)/60000);
    const rows = sets.filter((x:any)=>x.session_id===s.id);
    const cardio = rows.some((x:any)=>exerciseLibrary.find(e=>e.name===x.exercise_name)?.targetArea==='Cardio');
    const met = cardio ? 7.5 : 5.5;
    total += met * 3.5 * weightKg / 200 * minutes;
  }
  return Math.round(total);
}
function sessionTitle(summary?:string|null) { if(!summary) return 'Workout'; const names=summary.split(',').map(x=>x.trim()).filter(Boolean); return names.length>1?`${names[0]} + ${names.length-1} more`:(names[0]||'Workout'); }
function durationText(s:any) { if(!s?.started_at||!s?.ended_at) return ''; const min=Math.max(1,Math.round((new Date(s.ended_at).getTime()-new Date(s.started_at).getTime())/60000)); return `${min} min`; }
function RecentWorkout({session}:{session:any}) { const {colors}=useTheme(); const styles=createStyles(colors); return <Card style={styles.recentCard}><View style={styles.recentIcon}><Image source={require('../../../assets/nav/workout.png')} style={[styles.recentIconImage,{tintColor:colors.text}]}/></View><View style={{flex:1}}><Text style={styles.recentName}>{sessionTitle(session.summary)}</Text><Text style={styles.recentMeta}>{new Date(session.ended_at??session.started_at).toLocaleDateString()} {durationText(session)?`• ${durationText(session)}`:''}</Text></View><View style={styles.done}><Text style={styles.doneText}>✓</Text></View></Card>; }
function Stat({label,value,sub,accent,icon}:{label:string;value:string;sub:string;accent:string;icon:string}) { const {colors}=useTheme(); const styles=createStyles(colors); return <View style={styles.stat}><Text style={[styles.statIcon,{color:accent}]}>{icon}</Text><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statSub}>{sub}</Text></View>; }

const createStyles=(colors:any)=>StyleSheet.create({
  wrap:{padding:16,paddingTop:10,paddingBottom:28}, header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}, greeting:{color:colors.muted,fontSize:12}, name:{color:colors.text,fontSize:28,fontWeight:'900',marginTop:1,letterSpacing:-.4}, streak:{alignItems:'center'}, streakValue:{color:colors.text,fontWeight:'900',fontSize:22}, streakLabel:{color:colors.muted,fontSize:9,fontWeight:'900',marginTop:1},
  heroCard:{minHeight:190,flexDirection:'row',overflow:'hidden',padding:0}, heroLeft:{flex:1,padding:16,zIndex:2}, smallLabel:{color:colors.text,fontWeight:'700',fontSize:13}, heroTitle:{color:colors.text,fontSize:24,fontWeight:'900',marginTop:20}, heroMeta:{color:colors.muted,fontSize:12,marginTop:4}, startButton:{alignSelf:'flex-start',backgroundColor:colors.primary,borderRadius:8,paddingHorizontal:14,paddingVertical:12,marginTop:17}, startText:{color:'#fff',fontWeight:'900',fontSize:12}, heroFigure:{width:155,height:190,resizeMode:'contain',alignSelf:'flex-end',marginRight:-3},
  sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:5,marginBottom:9}, sectionTitle:{color:colors.text,fontSize:18,fontWeight:'900'}, viewAll:{color:colors.blue,fontSize:11,fontWeight:'900'},
  statsRow:{flexDirection:'row',gap:7,marginBottom:16}, stat:{flex:1,minWidth:0,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:10,padding:10}, statIcon:{fontSize:15,fontWeight:'900'}, statLabel:{color:colors.muted,fontSize:9,marginTop:6}, statValue:{color:colors.text,fontSize:19,fontWeight:'900',marginTop:2}, statSub:{color:colors.muted,fontSize:8,marginTop:2},
  recentCard:{flexDirection:'row',alignItems:'center',gap:10,padding:12}, recentIcon:{width:38,height:38,borderRadius:10,backgroundColor:colors.panel2,alignItems:'center',justifyContent:'center'}, recentIconImage:{width:20,height:20,resizeMode:'contain'}, recentName:{color:colors.text,fontWeight:'900',fontSize:14}, recentMeta:{color:colors.muted,fontSize:10,marginTop:3,lineHeight:14}, done:{width:26,height:26,borderRadius:13,backgroundColor:colors.green,alignItems:'center',justifyContent:'center'}, doneText:{color:'#fff',fontWeight:'900'},
  goalText:{color:colors.muted,marginTop:4,fontSize:12}, track:{height:8,borderRadius:999,backgroundColor:colors.panel2,overflow:'hidden',marginTop:12}, fill:{height:'100%',backgroundColor:colors.green}
});
