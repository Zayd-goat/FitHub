import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { Card, Input, SectionTitle, useTheme } from '../components/UI';
import { exerciseLibrary } from '../data/exerciseLibrary';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';

type PrEvent = { exercise: string; weight: number; reps: number; score: number; date: string };

type Badge = { key: string; icon: string; title: string; detail: string; unlocked: boolean };

const dateKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function ProgressScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [tracked, setTracked] = useState<string[]>([]);
  const [manage, setManage] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLift, setSelectedLift] = useState<string | null>(null);

  const load = async () => {
    const [s, w, f, t] = await Promise.all([
      supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(500),
      supabase.from('workout_sets').select('exercise_name,weight_kg,reps,created_at,session_id,set_number').eq('user_id', profile.id).not('weight_kg','is',null).order('created_at', { ascending: true }).limit(3000),
      supabase.from('food_logs').select('logged_at,calories,protein_g').eq('user_id', profile.id).order('logged_at', { ascending: false }).limit(2500),
      supabase.from('tracked_pr_exercises').select('exercise_name').eq('user_id', profile.id).order('created_at', { ascending: true })
    ]);
    setSessions(s.data ?? []); setSets(w.data ?? []); setFoods(f.data ?? []);
    if (!t.error) {
      const names = (t.data ?? []).map((x: any) => x.exercise_name);
      setTracked(names);
      Storage.setItem(`fithub_pr_lifts_${profile.id}`, JSON.stringify(names)).catch(() => {});
    } else {
      Storage.getItem(`fithub_pr_lifts_${profile.id}`).then(v => { if (v) setTracked(JSON.parse(v)); }).catch(() => {});
    }
  };
  useEffect(() => { load(); }, [profile.id]);

  const prEvents = useMemo(() => {
    const byExercise = new Map<string, any[]>();
    for (const row of sets) {
      const weight = Number(row.weight_kg ?? 0), reps = Number(row.reps ?? 0);
      if (weight <= 0 || reps <= 0) continue;
      const arr = byExercise.get(row.exercise_name) ?? []; arr.push(row); byExercise.set(row.exercise_name, arr);
    }
    const out: Record<string, PrEvent[]> = {};
    byExercise.forEach((rows, name) => {
      let best = -Infinity; const events: PrEvent[] = [];
      rows.sort((a,b) => { const dt = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); return dt || Number(a.set_number ?? 0) - Number(b.set_number ?? 0); }).forEach((r) => {
        const weight = Number(r.weight_kg), reps = Number(r.reps), score = weight * (1 + reps / 30);
        if (score > best + .01) { best = score; events.push({ exercise:name, weight, reps, score, date:r.created_at }); }
      });
      out[name] = events.reverse();
    });
    return out;
  }, [sets]);

  const allPrCount: number = (Object.values(prEvents) as PrEvent[][]).reduce((n, x) => n + x.length, 0);

  const nutritionDays = useMemo(() => {
    if ((profile.age ?? 0) < 18 || !profile.maintenance_calories || !profile.protein_target_g) return { calorie: 0, protein: 0, both: 0 };
    const days: Record<string, { calories:number; protein:number }> = {};
    for (const row of foods) {
      const k = dateKey(row.logged_at); days[k] ??= { calories:0, protein:0 };
      days[k].calories += Number(row.calories ?? 0); days[k].protein += Number(row.protein_g ?? 0);
    }
    let calorie=0, protein=0, both=0;
    Object.values(days).forEach((d) => {
      const c = d.calories >= profile.maintenance_calories! * .9 && d.calories <= profile.maintenance_calories! * 1.1;
      const p = d.protein >= profile.protein_target_g!;
      if (c) calorie++; if (p) protein++; if (c && p) both++;
    });
    return { calorie, protein, both };
  }, [foods, profile.age, profile.maintenance_calories, profile.protein_target_g]);

  const badges: Badge[] = useMemo(() => {
    const adult = (profile.age ?? 0) >= 18;
    const workoutCount = sessions.length;
    const mealCount = foods.length;
    return [
      { key:'login3', icon:'🔥', title:'3-day login streak', detail:'Open FitHub 3 days in a row', unlocked:profile.login_streak >= 3 },
      { key:'login7', icon:'🔥', title:'7-day login streak', detail:'Open FitHub 7 days in a row', unlocked:profile.login_streak >= 7 },
      { key:'login30', icon:'⚡', title:'30-day login streak', detail:'A full month of check-ins', unlocked:profile.login_streak >= 30 },
      { key:'workout1', icon:'✓', title:'First workout', detail:'Complete your first workout', unlocked:workoutCount >= 1 },
      { key:'workout10', icon:'🏋', title:'10 workouts', detail:'Complete 10 workouts', unlocked:workoutCount >= 10 },
      { key:'workout50', icon:'🏆', title:'50 workouts', detail:'Complete 50 workouts', unlocked:workoutCount >= 50 },
      { key:'streak3', icon:'⚡', title:'3-workout streak', detail:'Build a 3-day workout streak', unlocked:profile.workout_streak >= 3 },
      { key:'streak7', icon:'💪', title:'7-workout streak', detail:'Build a 7-day workout streak', unlocked:profile.workout_streak >= 7 },
      { key:'meals5', icon:'🍽', title:'Meal logger', detail:'Log 5 meals', unlocked:mealCount >= 5 },
      { key:'meals25', icon:'🍽', title:'Meal journal', detail:'Log 25 meals', unlocked:mealCount >= 25 },
      { key:'calories', icon:'◎', title:'Daily energy target', detail:adult ? 'Reach your adult energy target for a day' : 'Adult nutrition targets only', unlocked:adult && nutritionDays.calorie >= 1 },
      { key:'protein', icon:'P', title:'Protein target', detail:adult ? 'Reach your adult protein target for a day' : 'Adult nutrition targets only', unlocked:adult && nutritionDays.protein >= 1 },
      { key:'pr1', icon:'★', title:'First PR', detail:'Set your first strength personal record', unlocked:allPrCount >= 1 },
      { key:'pr10', icon:'★', title:'10 PRs', detail:'Record 10 strength personal records', unlocked:allPrCount >= 10 }
    ];
  }, [profile.login_streak, profile.workout_streak, profile.age, sessions.length, foods.length, nutritionDays, allPrCount]);

  const earned = badges.filter(b => b.unlocked).length;
  const availableLiftNames = useMemo(() => Object.keys(prEvents).sort().filter(n => n.toLowerCase().includes(search.toLowerCase())), [prEvents, search]);

  const toggleTracked = async (name: string) => {
    const next = tracked.includes(name) ? tracked.filter(x => x !== name) : [...tracked, name];
    setTracked(next); Storage.setItem(`fithub_pr_lifts_${profile.id}`, JSON.stringify(next)).catch(() => {});
    if (tracked.includes(name)) await supabase.from('tracked_pr_exercises').delete().eq('user_id', profile.id).eq('exercise_name', name);
    else await supabase.from('tracked_pr_exercises').upsert({ user_id: profile.id, exercise_name: name }, { onConflict:'user_id,exercise_name' });
  };

  if (selectedLift) {
    const history = prEvents[selectedLift] ?? [];
    return <ScrollView contentContainerStyle={styles.wrap}>
      <Header title={selectedLift} subtitle="Personal record history" onBack={() => setSelectedLift(null)} />
      <Card><Text style={styles.detailLead}>All recorded PR improvements for this lift</Text>{history.length ? history.map((x,i) => <View key={`${x.date}-${i}`} style={styles.prHistoryRow}><View style={styles.prNumber}><Text style={styles.prNumberText}>{history.length-i}</Text></View><View style={{flex:1}}><Text style={styles.prWeight}>{x.weight} kg × {x.reps} reps</Text><Text style={styles.meta}>{new Date(x.date).toLocaleDateString()}</Text></View>{i===0?<Text style={styles.currentTag}>CURRENT</Text>:null}</View>) : <Text style={styles.meta}>No PR history recorded yet.</Text>}</Card>
    </ScrollView>;
  }

  return <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <Header title="Progress" subtitle="Badges, streaks and personal records" onBack={onBack} />
    <View style={styles.stats}>
      <Summary label="Badges" value={`${earned}`} sub="earned" />
      <Summary label="Login streak" value={`${profile.login_streak}`} sub="days" />
      <Summary label="Workouts" value={`${sessions.length}`} sub="completed" />
      <Summary label="PRs" value={`${allPrCount}`} sub="recorded" />
    </View>

    <SectionTitle title="My PR lifts" subtitle="Pin the lifts you care about. Tap a lift to see every PR improvement." />
    {tracked.length ? tracked.map(name => {
      const latest = prEvents[name]?.[0];
      return <Pressable key={name} onPress={() => setSelectedLift(name)}><Card style={styles.prCard}><View style={{flex:1}}><Text style={styles.prName}>{name}</Text><Text style={styles.meta}>{latest ? `${latest.weight} kg × ${latest.reps} reps` : 'No weighted sets yet'}</Text></View><Text style={styles.chevron}>›</Text></Card></Pressable>;
    }) : <Card><Text style={styles.meta}>No PR lifts pinned yet. Choose the lifts you want to track below.</Text></Card>}
    <Pressable onPress={() => setManage(!manage)} style={styles.manageButton}><Text style={styles.manageText}>{manage ? 'Done choosing lifts' : '+ Choose PR lifts'}</Text></Pressable>
    {manage ? <Card><Input value={search} onChangeText={setSearch} placeholder="Search your recorded lifts…" />{availableLiftNames.length ? availableLiftNames.slice(0,50).map(name => <Pressable key={name} onPress={() => toggleTracked(name)} style={styles.pickRow}><Text style={styles.pickName}>{name}</Text><Text style={[styles.pickState,tracked.includes(name)&&{color:colors.green}]}>{tracked.includes(name)?'✓ Pinned':'＋ Add'}</Text></Pressable>) : <Text style={styles.meta}>Complete a weighted exercise first and it will appear here.</Text>}</Card> : null}

    <SectionTitle title="Badges & achievements" subtitle="Unlocked badges stay visible here as your history grows." />
    <View style={styles.badgeGrid}>{badges.map(b => <View key={b.key} style={[styles.badge,b.unlocked?styles.badgeUnlocked:styles.badgeLocked]}><Text style={[styles.badgeIcon,!b.unlocked&&{opacity:.35}]}>{b.icon}</Text><Text style={styles.badgeTitle}>{b.title}</Text><Text style={styles.badgeDetail}>{b.unlocked?'ACHIEVED':b.detail}</Text></View>)}</View>

    {(profile.age ?? 0) >= 18 ? <Card><SectionTitle title="Nutrition achievements" subtitle="Based on your current adult targets." /><Info label="Energy-target days" value={`${nutritionDays.calorie}`} /><Info label="Protein-target days" value={`${nutritionDays.protein}`} /><Info label="Both targets in one day" value={`${nutritionDays.both}`} /></Card> : null}
  </ScrollView>;
}

function Header({ title, subtitle, onBack }: { title:string; subtitle:string; onBack:()=>void }) { const {colors}=useTheme(); const s=createStyles(colors); return <View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><View style={{flex:1}}><Text style={s.title}>{title}</Text><Text style={s.headerSub}>{subtitle}</Text></View></View>; }
function Summary({label,value,sub}:{label:string;value:string;sub:string}) { const {colors}=useTheme(); const s=createStyles(colors); return <View style={s.summary}><Text style={s.summaryLabel}>{label}</Text><Text style={s.summaryValue}>{value}</Text><Text style={s.meta}>{sub}</Text></View>; }
function Info({label,value}:{label:string;value:string}) { const {colors}=useTheme(); const s=createStyles(colors); return <View style={s.info}><Text style={s.meta}>{label}</Text><Text style={s.infoValue}>{value}</Text></View>; }

const createStyles=(colors:any)=>StyleSheet.create({
  wrap:{padding:16,paddingTop:10,paddingBottom:34}, header:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}, back:{width:34,height:42,justifyContent:'center'}, backText:{color:colors.text,fontSize:36,fontWeight:'300'}, title:{color:colors.text,fontSize:28,fontWeight:'900'}, headerSub:{color:colors.muted,fontSize:11,marginTop:2},
  stats:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16}, summary:{width:'48%',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:13}, summaryLabel:{color:colors.muted,fontSize:10}, summaryValue:{color:colors.text,fontSize:25,fontWeight:'900',marginTop:5}, meta:{color:colors.muted,fontSize:11,marginTop:3,lineHeight:16},
  prCard:{flexDirection:'row',alignItems:'center',padding:13}, prName:{color:colors.text,fontWeight:'900',fontSize:15}, chevron:{color:colors.muted,fontSize:26}, manageButton:{borderWidth:1.5,borderColor:colors.blue,borderRadius:12,padding:12,alignItems:'center',marginBottom:14,backgroundColor:'#fff'}, manageText:{color:colors.blue,fontWeight:'900'}, pickRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.border,gap:8}, pickName:{color:colors.text,fontWeight:'800',flex:1}, pickState:{color:colors.blue,fontWeight:'900',fontSize:11},
  badgeGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16}, badge:{width:'48%',minHeight:126,borderRadius:15,padding:13,borderWidth:1}, badgeUnlocked:{backgroundColor:colors.panel,borderColor:colors.gold}, badgeLocked:{backgroundColor:colors.panel2,borderColor:colors.border,opacity:.75}, badgeIcon:{fontSize:23}, badgeTitle:{color:colors.text,fontWeight:'900',fontSize:13,marginTop:8}, badgeDetail:{color:colors.muted,fontSize:9,fontWeight:'800',marginTop:5,lineHeight:13},
  info:{flexDirection:'row',justifyContent:'space-between',paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border}, infoValue:{color:colors.text,fontWeight:'900'}, detailLead:{color:colors.muted,marginBottom:10}, prHistoryRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.border}, prNumber:{width:30,height:30,borderRadius:15,backgroundColor:colors.goldSoft,alignItems:'center',justifyContent:'center'}, prNumberText:{color:colors.gold,fontWeight:'900'}, prWeight:{color:colors.text,fontWeight:'900',fontSize:15}, currentTag:{color:colors.green,fontWeight:'900',fontSize:9,backgroundColor:colors.greenSoft,paddingHorizontal:7,paddingVertical:4,borderRadius:7}
});
