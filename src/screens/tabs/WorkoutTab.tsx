import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, useTheme } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { progressionSuggestion } from '../../lib/progression';
import { recordWorkoutDay } from '../../lib/streaks';
import { exerciseLibrary, figureImages, LibraryExercise, muscleCards, muscleGroupFilters, summarizeTargets } from '../../data/exerciseLibrary';

type StrengthSet = { id: string; weight: string; reps: string; done?: boolean };
type BuilderItem = { id: string; exercise: LibraryExercise; strengthSets: StrengthSet[]; distance: string; duration: string; load: string; done?: boolean; suggestion?: string };
type ScreenMode = 'browse' | 'detail' | 'active';
type DetailTab = 'sets' | 'about';

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const makeSets = (ex: LibraryExercise, count = 3): StrengthSet[] => Array.from({ length: count }, () => ({ id: makeId(), weight: '', reps: String(ex.rep_max ? Math.min(10, ex.rep_max) : 10), done: false }));
const makeItem = (ex: LibraryExercise): BuilderItem => ({ id: `${ex.slug}-${makeId()}`, exercise: ex, strengthSets: ex.metric_type === 'strength' ? makeSets(ex) : [], distance: '', duration: '', load: '', done: false });

export default function WorkoutTab({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [screen, setScreen] = useState<ScreenMode>('browse');
  const [detailTab, setDetailTab] = useState<DetailTab>('sets');
  const [detailExercise, setDetailExercise] = useState<LibraryExercise | null>(null);
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<(typeof muscleGroupFilters)[number]>('All');
  const [builder, setBuilder] = useState<BuilderItem[]>([]);
  const [lastWorkout, setLastWorkout] = useState<BuilderItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exerciseLibrary.filter((ex) => {
      if (muscleFilter !== 'All' && ex.targetArea !== muscleFilter) return false;
      if (!q) return true;
      return `${ex.name} ${ex.targetArea} ${ex.subsection} ${ex.equipment}`.toLowerCase().includes(q);
    });
  }, [query, muscleFilter]);

  useEffect(() => {
    const fetchLastWorkout = async () => {
      const { data: session } = await supabase.from('workout_sessions').select('id').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(1).maybeSingle();
      if (!session?.id) return;
      const { data: sets } = await supabase.from('workout_sets').select('exercise_name,set_number,weight_kg,reps,distance_km,duration_min').eq('session_id', session.id).order('created_at', { ascending: true });
      if (!sets?.length) return;
      const map = new Map<string, any[]>();
      for (const row of sets) { const list = map.get(row.exercise_name) ?? []; list.push(row); map.set(row.exercise_name, list); }
      const template: BuilderItem[] = [];
      for (const [name, rows] of map.entries()) {
        const ex = exerciseLibrary.find((x) => x.name === name); if (!ex) continue;
        template.push({
          id: `${ex.slug}-${makeId()}`, exercise: ex,
          strengthSets: ex.metric_type === 'strength' ? rows.map((r) => ({ id: makeId(), weight: r.weight_kg == null ? '' : String(r.weight_kg), reps: r.reps == null ? '' : String(r.reps), done: false })) : [],
          distance: rows[0]?.distance_km == null ? '' : String(rows[0].distance_km), duration: rows[0]?.duration_min == null ? '' : String(rows[0].duration_min), load: rows[0]?.weight_kg == null ? '' : String(rows[0].weight_kg), done: false
        });
      }
      setLastWorkout(template);
    };
    fetchLastWorkout();
  }, [profile.id]);

  useEffect(() => {
    if (screen !== 'active' || !activeStartedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - activeStartedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [screen, activeStartedAt]);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const id = setInterval(() => setRestSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [restSeconds]);

  const builderItem = (ex: LibraryExercise | null) => ex ? builder.find((x) => x.exercise.slug === ex.slug) : undefined;

  const addExercise = async (ex: LibraryExercise) => {
    if (builder.some((x) => x.exercise.slug === ex.slug)) return;
    const item = makeItem(ex);
    if (ex.metric_type === 'strength') {
      const { data } = await supabase.from('workout_sets').select('weight_kg,reps,created_at').eq('user_id', profile.id).eq('exercise_name', ex.name).not('weight_kg','is',null).order('created_at',{ ascending:false }).limit(2);
      if (data?.length) {
        if ((profile.age ?? 18) < 18) item.suggestion = 'Prioritize consistent technique and age-appropriate coaching before increasing load.';
        else item.suggestion = progressionSuggestion([...data].reverse().map((x: any) => ({ weight_kg: Number(x.weight_kg), reps: Number(x.reps) })), ex.rep_min ?? 8, ex.rep_max ?? 12);
      }
    }
    setBuilder((prev) => [...prev, item]);
  };

  const openDetail = (ex: LibraryExercise) => { setDetailExercise(ex); setDetailTab('sets'); setScreen('detail'); };
  const removeExercise = (slug: string) => setBuilder((p) => p.filter((x) => x.exercise.slug !== slug));
  const updateItem = (id: string, patch: Partial<BuilderItem>) => setBuilder((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
  const updateSet = (itemId: string, setId: string, patch: Partial<StrengthSet>) => setBuilder((p) => p.map((x) => x.id === itemId ? { ...x, strengthSets: x.strengthSets.map((s) => s.id === setId ? { ...s, ...patch } : s) } : x));
  const addSet = (itemId: string) => setBuilder((p) => p.map((x) => x.id === itemId ? { ...x, strengthSets: [...x.strengthSets, { id: makeId(), weight: x.strengthSets.at(-1)?.weight ?? '', reps: x.strengthSets.at(-1)?.reps ?? '10', done: false }] } : x));
  const removeSet = (itemId: string, setId: string) => setBuilder((p) => p.map((x) => x.id === itemId && x.strengthSets.length > 1 ? { ...x, strengthSets: x.strengthSets.filter((s) => s.id !== setId) } : x));

  const repeatLast = () => setBuilder(lastWorkout.map((x) => ({ ...x, id: `${x.exercise.slug}-${makeId()}`, done:false, strengthSets: x.strengthSets.map((s) => ({ ...s, id: makeId(), done:false })) })));

  const validateBuilder = () => {
    if (!builder.length) { Alert.alert('Add exercises', 'Choose at least one exercise first.'); return false; }
    for (const item of builder) {
      if (item.exercise.metric_type === 'strength') {
        for (const set of item.strengthSets) if (!set.reps || Number(set.reps) <= 0) { Alert.alert('Check reps', `Enter reps for ${item.exercise.name}.`); return false; }
      } else if (item.exercise.metric_type === 'distance' && !item.distance && !item.duration) { Alert.alert('Add distance or time', `Enter a distance or duration for ${item.exercise.name}.`); return false; }
      else if (item.exercise.metric_type === 'time' && !item.duration) { Alert.alert('Add duration', `Enter a duration for ${item.exercise.name}.`); return false; }
    }
    return true;
  };

  const startActive = () => {
    if (!validateBuilder()) return;
    setBuilder((p) => p.map((x) => ({ ...x, done:false, strengthSets: x.strengthSets.map((s) => ({ ...s, done:false })) })));
    setActiveExerciseIndex(0); setActiveSetIndex(0); setElapsed(0); setRestSeconds(0); setActiveStartedAt(Date.now()); setScreen('active');
  };

  const findNext = (exIndex: number, setIndex: number) => {
    const current = builder[exIndex];
    if (!current) return null;
    if (current.exercise.metric_type === 'strength' && setIndex + 1 < current.strengthSets.length) return { ex: exIndex, set: setIndex + 1 };
    for (let i = exIndex + 1; i < builder.length; i++) return { ex: i, set: 0 };
    return null;
  };

  const completeCurrent = () => {
    const current = builder[activeExerciseIndex]; if (!current) return;
    if (current.exercise.metric_type === 'strength') {
      const set = current.strengthSets[activeSetIndex]; if (!set) return;
      updateSet(current.id, set.id, { done:true });
    } else updateItem(current.id, { done:true });
    const next = findNext(activeExerciseIndex, activeSetIndex);
    if (next) { setActiveExerciseIndex(next.ex); setActiveSetIndex(next.set); setRestSeconds(90); }
    else setRestSeconds(0);
  };

  const allComplete = builder.length > 0 && builder.every((x) => x.exercise.metric_type === 'strength' ? x.strengthSets.every((s) => s.done) : x.done);

  const saveWorkout = async () => {
    if (!allComplete) return Alert.alert('Workout still in progress', 'Complete each set or exercise first.');
    setBusy(true);
    try {
      const summary = builder.map((x) => x.exercise.name).join(', ');
      const { data: session, error } = await supabase.from('workout_sessions').insert({ user_id: profile.id, completed: true, started_at: new Date(activeStartedAt ?? Date.now()).toISOString(), ended_at: new Date().toISOString(), summary }).select('id').single();
      if (error) throw error;
      const rows: any[] = [];
      builder.forEach((item) => {
        if (item.exercise.metric_type === 'strength') item.strengthSets.forEach((s, i) => rows.push({ session_id:session.id,user_id:profile.id,exercise_id:null,exercise_name:item.exercise.name,set_number:i+1,weight_kg:s.weight === '' ? 0 : Number(s.weight),reps:Number(s.reps),distance_km:null,duration_min:null }));
        else rows.push({ session_id:session.id,user_id:profile.id,exercise_id:null,exercise_name:item.exercise.name,set_number:1,weight_kg:item.load ? Number(item.load) : null,reps:null,distance_km:item.distance ? Number(item.distance) : null,duration_min:item.duration ? Number(item.duration) : null });
      });
      const { error: setError } = await supabase.from('workout_sets').insert(rows); if (setError) throw setError;
      await supabase.from('workout_posts').insert({ user_id: profile.id, session_id: session.id, summary: `Completed: ${summary}` });
      await recordWorkoutDay(profile.id); await supabase.rpc('apply_workout_to_challenges',{ p_session_id:session.id });
      setLastWorkout(builder.map((x) => ({ ...x, done:false, strengthSets:x.strengthSets.map((s) => ({ ...s, done:false })) })));
      setBuilder([]); setScreen('browse'); setActiveStartedAt(null); setElapsed(0); setRestSeconds(0); onProfileChanged();
      Alert.alert('Workout complete', 'Your workout was saved and shared with your accepted friends.');
    } catch (e:any) { Alert.alert('Could not save workout', e?.message ?? 'Please try again.'); }
    finally { setBusy(false); }
  };

  if (screen === 'detail' && detailExercise) {
    const item = builderItem(detailExercise);
    const img = detailExercise.visualKey ? figureImages[detailExercise.visualKey] : undefined;
    return <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.detailHeader}><Pressable onPress={() => setScreen('browse')}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.detailTitle}>{detailExercise.name}</Text><Text style={styles.more}>•••</Text></View>
      <View style={styles.detailHero}>
        {img ? <Image source={img} style={styles.detailFigure} /> : <View style={styles.detailFigureBlank} />}
        <View style={styles.muscleBox}><Text style={styles.muscleBoxTitle}>Primary Muscles</Text><Text style={styles.muscleLine}>• {detailExercise.targetArea}</Text><Text style={styles.muscleLine}>• {detailExercise.subsection}</Text><Text style={styles.muscleLine}>• {summarizeTargets(detailExercise)}</Text></View>
      </View>
      <View style={styles.tabs}><Pressable onPress={() => setDetailTab('sets')} style={[styles.tab,detailTab==='sets'&&styles.tabActive]}><Text style={[styles.tabText,detailTab==='sets'&&styles.tabTextActive]}>SETS</Text></Pressable><Pressable onPress={() => setDetailTab('about')} style={[styles.tab,detailTab==='about'&&styles.tabActive]}><Text style={[styles.tabText,detailTab==='about'&&styles.tabTextActive]}>ABOUT</Text></Pressable></View>
      {detailTab === 'about' ? <Card><Text style={styles.aboutLabel}>Target</Text><Text style={styles.aboutText}>{detailExercise.targetArea} • {detailExercise.subsection}</Text><Text style={styles.aboutLabel}>Equipment</Text><Text style={styles.aboutText}>{detailExercise.equipment}</Text><Text style={styles.aboutLabel}>Training format</Text><Text style={styles.aboutText}>{detailExercise.metric_type === 'strength' ? `${detailExercise.rep_min ?? 6}-${detailExercise.rep_max ?? 12} rep guidance` : detailExercise.metric_type === 'distance' ? 'Distance and/or time' : 'Timed exercise'}</Text></Card> :
      !item ? <Button title="ADD TO WORKOUT" onPress={async () => { await addExercise(detailExercise); }} /> : <Card>
        {item.suggestion ? <View style={styles.suggest}><Text style={styles.suggestTitle}>TRAINING NOTE</Text><Text style={styles.suggestText}>{item.suggestion}</Text></View> : null}
        {item.exercise.metric_type === 'strength' ? <>
          <View style={styles.tableHead}><Text style={styles.setCol}>SET</Text><Text style={styles.flexCol}>WEIGHT (kg)</Text><Text style={styles.flexCol}>REPS</Text><View style={{width:30}} /></View>
          {item.strengthSets.map((s,i) => <View key={s.id} style={styles.tableRow}><Text style={styles.setCol}>{i+1}</Text><Input style={styles.tableInput} value={s.weight} onChangeText={(v) => updateSet(item.id,s.id,{weight:v})} keyboardType="decimal-pad" placeholder="0" /><Input style={styles.tableInput} value={s.reps} onChangeText={(v) => updateSet(item.id,s.id,{reps:v})} keyboardType="number-pad" placeholder="10" /><Pressable onPress={() => removeSet(item.id,s.id)}><Text style={styles.remove}>−</Text></Pressable></View>)}
          <Button title="＋ ADD SET" onPress={() => addSet(item.id)} />
        </> : <><Input value={item.load} onChangeText={(v)=>updateItem(item.id,{load:v})} keyboardType="decimal-pad" placeholder="Load (kg), if used" /><View style={styles.two}>{item.exercise.metric_type==='distance'?<Input style={{flex:1}} value={item.distance} onChangeText={(v)=>updateItem(item.id,{distance:v})} keyboardType="decimal-pad" placeholder="Distance (km)" />:null}<Input style={{flex:1}} value={item.duration} onChangeText={(v)=>updateItem(item.id,{duration:v})} keyboardType="decimal-pad" placeholder="Minutes" /></View></>}
        <Button title="REMOVE FROM WORKOUT" onPress={() => removeExercise(item.exercise.slug)} secondary />
      </Card>}
    </ScrollView></KeyboardAvoidingView>;
  }

  if (screen === 'active') {
    const current = builder[activeExerciseIndex];
    const currentSet = current?.exercise.metric_type === 'strength' ? current.strengthSets[activeSetIndex] : undefined;
    const next = findNext(activeExerciseIndex, activeSetIndex);
    const nextName = next ? builder[next.ex]?.exercise.name : 'Workout complete';
    const format = (sec:number) => `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
    return <ScrollView contentContainerStyle={styles.activeWrap}>
      <View style={styles.activeHeader}><Pressable onPress={() => setScreen('browse')}><Text style={styles.exit}>‹ Exit</Text></Pressable><Text style={styles.activeTitle}>Workout</Text><Text style={styles.more}>•••</Text></View>
      <Text style={styles.timer}>{format(elapsed)}</Text><Text style={styles.timerLabel}>Workout Time</Text>
      {current ? <Card style={styles.activeCard}><View style={styles.currentHead}><Text style={styles.currentName}>{current.exercise.name}</Text><Text style={styles.currentCounter}>{current.exercise.metric_type==='strength' ? `Set ${activeSetIndex+1} of ${current.strengthSets.length}` : `Exercise ${activeExerciseIndex+1} of ${builder.length}`}</Text></View>
        {current.exercise.metric_type==='strength' && currentSet ? <View style={styles.metrics}><Metric label="WEIGHT (kg)" value={currentSet.weight || '0'} /><Metric label="REPS" value={currentSet.reps || '0'} /><Metric label="REST" value={restSeconds ? format(restSeconds) : '01:30'} blue /></View> : <View style={styles.metrics}><Metric label="DISTANCE" value={current.distance ? `${current.distance} km` : '—'} /><Metric label="TIME" value={current.duration ? `${current.duration} min` : '—'} /><Metric label="REST" value={restSeconds ? format(restSeconds) : '01:30'} blue /></View>}
        <View style={styles.next}><Text style={styles.nextText}>Next: {nextName}</Text></View>
      </Card> : null}
      {!allComplete ? <Button title="COMPLETE SET  ✓" onPress={completeCurrent} disabled={restSeconds>0} /> : <Button title={busy ? 'SAVING…' : 'FINISH WORKOUT  ✓'} onPress={saveWorkout} disabled={busy} />}
      {restSeconds>0 ? <Button title="SKIP REST" onPress={() => setRestSeconds(0)} secondary /> : null}
    </ScrollView>;
  }

  return <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <View style={styles.browseHeader}><View><Text style={styles.browseTitle}>New Workout</Text><Text style={styles.browseSub}>{builder.length ? `${builder.length} exercise${builder.length===1?'':'s'} selected` : 'Build your session'}</Text></View><Text style={styles.stopwatch}>◷</Text></View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muscleScroller}>
      <Pressable onPress={() => setMuscleFilter('All')} style={styles.muscleChoice}><View style={[styles.circle,muscleFilter==='All'&&styles.circleActive]}><Image source={require('../../../assets/nav/workout.png')} style={[styles.circleIcon,{ tintColor:muscleFilter==='All'?colors.primary:colors.muted }]} /></View><Text style={[styles.choiceLabel,muscleFilter==='All'&&styles.choiceLabelActive]}>All</Text></Pressable>
      {muscleCards.map((m) => <Pressable key={m.label} onPress={() => setMuscleFilter(m.label as any)} style={styles.muscleChoice}><View style={[styles.circle,muscleFilter===m.label&&styles.circleActive]}><Image source={m.image} style={styles.circleAnatomy} /></View><Text style={[styles.choiceLabel,muscleFilter===m.label&&styles.choiceLabelActive]}>{m.label}</Text></Pressable>)}
    </ScrollView>

    <Input value={query} onChangeText={setQuery} placeholder="Search exercises…" />

    {builder.length ? <Card style={styles.selectedCard}><View style={{flex:1}}><Text style={styles.selectedTitle}>{builder.length} exercise{builder.length===1?'':'s'} ready</Text><Text style={styles.selectedMeta}>Review sets or start your workout.</Text></View><Pressable onPress={startActive} style={styles.startSmall}><Text style={styles.startSmallText}>START</Text></Pressable></Card> : null}
    {lastWorkout.length ? <Pressable onPress={repeatLast} style={styles.repeat}><Text style={styles.repeatText}>↻ Repeat last workout</Text></Pressable> : null}

    <View style={styles.exerciseList}>
      {filtered.map((ex) => { const img=ex.visualKey?figureImages[ex.visualKey]:undefined; const selected=builder.some((x)=>x.exercise.slug===ex.slug); return <Pressable key={ex.slug} onPress={() => openDetail(ex)} style={styles.exerciseRow}>
        {img ? <Image source={img} style={styles.thumb} /> : <View style={styles.blankThumb} />}
        <View style={{flex:1}}><Text style={styles.target}>{ex.targetArea}</Text><Text style={styles.exName}>{ex.name}</Text><Text style={styles.exMeta}>{ex.equipment}</Text></View>
        <Pressable onPress={() => selected ? removeExercise(ex.slug) : addExercise(ex)} style={[styles.plus,selected&&styles.plusSelected]}><Text style={[styles.plusText,{color:selected?'#fff':colors.primary}]}>{selected?'✓':'+'}</Text></Pressable>
      </Pressable>; })}
    </View>
  </ScrollView></KeyboardAvoidingView>;
}

function Metric({ label, value, blue }: { label:string; value:string; blue?:boolean }) { const { colors }=useTheme(); const s=createStyles(colors); return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={[s.metricValue,blue&&{color:colors.blue}]}>{value}</Text></View>; }

const createStyles = (colors:any) => StyleSheet.create({
  wrap:{padding:16,paddingBottom:34}, browseHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}, browseTitle:{color:colors.text,fontSize:24,fontWeight:'900'}, browseSub:{color:colors.muted,fontSize:11,marginTop:2}, stopwatch:{color:colors.text,fontSize:24},
  muscleScroller:{gap:10,paddingBottom:14}, muscleChoice:{alignItems:'center',width:58}, circle:{width:48,height:48,borderRadius:24,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,alignItems:'center',justifyContent:'center',overflow:'hidden'}, circleActive:{borderColor:colors.primary}, circleIcon:{width:22,height:22,resizeMode:'contain'}, circleAnatomy:{width:46,height:46,resizeMode:'contain'}, choiceLabel:{color:colors.muted,fontSize:9,marginTop:5}, choiceLabelActive:{color:colors.primary,fontWeight:'900'},
  selectedCard:{flexDirection:'row',alignItems:'center',gap:10,padding:12}, selectedTitle:{color:colors.text,fontWeight:'900'}, selectedMeta:{color:colors.muted,fontSize:10,marginTop:3}, startSmall:{backgroundColor:colors.primary,borderRadius:8,paddingHorizontal:14,paddingVertical:10}, startSmallText:{color:'#fff',fontWeight:'900',fontSize:11}, repeat:{alignSelf:'flex-start',paddingVertical:8}, repeatText:{color:colors.blue,fontWeight:'800',fontSize:11},
  exerciseList:{gap:7}, exerciseRow:{minHeight:78,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:12,padding:9}, thumb:{width:58,height:58,resizeMode:'contain'}, blankThumb:{width:58,height:58}, target:{color:colors.primary,fontWeight:'900',fontSize:10}, exName:{color:colors.text,fontWeight:'900',fontSize:14,marginTop:1}, exMeta:{color:colors.muted,fontSize:10,marginTop:3}, plus:{width:30,height:30,borderRadius:15,borderWidth:1.5,borderColor:colors.primary,alignItems:'center',justifyContent:'center'}, plusSelected:{backgroundColor:colors.green,borderColor:colors.green}, plusText:{fontWeight:'900',fontSize:20,lineHeight:22},
  detailHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9}, back:{color:colors.text,fontSize:36,fontWeight:'300'}, detailTitle:{color:colors.text,fontSize:19,fontWeight:'900'}, more:{color:colors.text,fontSize:16,fontWeight:'900'}, detailHero:{flexDirection:'row',minHeight:250,alignItems:'center'}, detailFigure:{flex:1,height:250,resizeMode:'contain'}, detailFigureBlank:{flex:1,height:250}, muscleBox:{width:145,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:12,padding:11}, muscleBoxTitle:{color:colors.text,fontWeight:'900',fontSize:12,marginBottom:7}, muscleLine:{color:colors.muted,fontSize:10,lineHeight:17}, tabs:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:colors.border,marginBottom:12}, tab:{flex:1,alignItems:'center',paddingVertical:11}, tabActive:{borderBottomWidth:2,borderBottomColor:colors.primary}, tabText:{color:colors.muted,fontWeight:'800',fontSize:11}, tabTextActive:{color:colors.primary}, aboutLabel:{color:colors.muted,fontSize:10,fontWeight:'900',marginTop:7}, aboutText:{color:colors.text,fontSize:14,fontWeight:'700',marginTop:2}, suggest:{backgroundColor:colors.blueSoft,borderRadius:10,padding:10,marginBottom:10}, suggestTitle:{color:colors.blue,fontWeight:'900',fontSize:9}, suggestText:{color:colors.text,fontSize:11,marginTop:3,lineHeight:16}, tableHead:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:7,borderBottomWidth:1,borderBottomColor:colors.border}, tableRow:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:5,borderBottomWidth:1,borderBottomColor:colors.border}, setCol:{width:34,color:colors.text,fontWeight:'800',fontSize:11,textAlign:'center'}, flexCol:{flex:1,color:colors.muted,fontWeight:'900',fontSize:9,textAlign:'center'}, tableInput:{flex:1,marginBottom:0,minHeight:38,textAlign:'center'}, remove:{color:colors.muted,fontSize:22,width:30,textAlign:'center'}, two:{flexDirection:'row',gap:8},
  activeWrap:{padding:16,paddingBottom:34}, activeHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, exit:{color:colors.text,fontSize:14}, activeTitle:{color:colors.text,fontWeight:'900',fontSize:18}, timer:{color:colors.text,fontSize:46,fontWeight:'800',textAlign:'center',marginTop:26}, timerLabel:{color:colors.muted,textAlign:'center',fontSize:12,marginBottom:22}, activeCard:{padding:14}, currentHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}, currentName:{color:colors.text,fontWeight:'900',fontSize:15}, currentCounter:{color:colors.text,fontSize:10}, metrics:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border,paddingVertical:12}, metric:{flex:1,alignItems:'center'}, metricLabel:{color:colors.muted,fontSize:9,fontWeight:'800'}, metricValue:{color:colors.text,fontSize:24,fontWeight:'900',marginTop:6}, next:{backgroundColor:colors.panel2,borderRadius:8,padding:9,marginTop:12}, nextText:{color:colors.muted,textAlign:'center',fontSize:11}
});
