import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, OutlineButton, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { displayToKg, displayToKm, formatDistance, formatWeight, kgToDisplay, kmToDisplay } from '../lib/units';
import { exerciseLibrary, LibraryExercise } from '../data/exerciseLibrary';

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sessionDateKey = (session: any) => dateKey(new Date(session.ended_at ?? session.started_at));
type ManualSet = { id: string; weight: string; reps: string };
type ManualExercise = { id: string; exercise: LibraryExercise; sets: ManualSet[]; distance: string; duration: string };
type ManualWorkoutSetPayload = {
  user_id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  distance_km: number | null;
  duration_min: number | null;
  created_at: string;
};
const newManualId = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export default function WorkoutHistoryScreen({ profile, initialSessionId, onBack }: { profile: Profile; initialSessionId?: string; onBack: () => void }) {
  const { colors, weightUnit, distanceUnit } = useTheme();
  const styles = createStyles(colors);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(initialSessionId ?? null);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [showManual, setShowManual] = useState(false);
  const [manualId, setManualId] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState('Workout');
  const [manualMinutes, setManualMinutes] = useState('45');
  const [manualNotes, setManualNotes] = useState('');
  const [manualExercises, setManualExercises] = useState<ManualExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setExpandedId(initialSessionId ?? null); }, [initialSessionId]);

  const load = async () => {
    const { data, error } = await supabase.from('workout_sessions').select('id,summary,started_at,ended_at,entry_source,manual_notes,updated_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(250);
    if (error) return Alert.alert('Workout history', error.message);
    const rows = data ?? [];
    setSessions(rows);
    const ids = rows.map((row: any) => row.id);
    if (!ids.length) return setSets([]);
    const { data: setRows } = await supabase.from('workout_sets').select('session_id,exercise_name,set_number,weight_kg,reps,distance_km,duration_min').eq('user_id', profile.id).in('session_id', ids).order('created_at', { ascending: true });
    setSets(setRows ?? []);
  };
  useEffect(() => { load(); }, [profile.id]);

  const summaries = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sets.forEach((row) => (grouped[row.session_id] ??= []).push(row));
    return sessions.map((session) => {
      const rows = grouped[session.id] ?? [];
      const exercises = new Set(rows.map((row) => row.exercise_name)).size;
      const volume = Math.round(rows.reduce((total, row) => total + Number(row.weight_kg ?? 0) * Number(row.reps ?? 0), 0));
      const distance = rows.reduce((total, row) => total + Number(row.distance_km ?? 0), 0);
      const start = new Date(session.started_at).getTime();
      const end = session.ended_at ? new Date(session.ended_at).getTime() : start;
      const minutes = Math.max(1, Math.round((end - start) / 60000));
      return { ...session, rows, exercises, volume, distance, minutes };
    });
  }, [sessions, sets]);

  const openManualForDate = (key: string) => {
    setSelectedDate(key);
    const existing = summaries.find((session) => sessionDateKey(session) === key && session.entry_source === 'manual');
    setManualId(existing?.id ?? null);
    setManualTitle(existing?.summary || 'Workout');
    setManualMinutes(String(existing?.minutes || 45));
    setManualNotes(existing?.manual_notes || '');
    const grouped = groupExerciseRows(existing?.rows ?? []);
    setManualExercises(grouped.map(({name,rows}) => {
      const match = exerciseLibrary.find((exercise) => exercise.name.toLowerCase() === String(name).toLowerCase()) ?? fallbackExercise(name, rows);
      return { id: newManualId(), exercise: match, sets: match.metric_type === 'strength' ? rows.map((row:any) => ({ id: newManualId(), weight: row.weight_kg == null ? '' : String(Number(kgToDisplay(Number(row.weight_kg), weightUnit).toFixed(2))), reps: row.reps == null ? '' : String(row.reps) })) : [], distance: rows[0]?.distance_km == null ? '' : String(Number(kmToDisplay(Number(rows[0].distance_km), distanceUnit).toFixed(2))), duration: rows[0]?.duration_min == null ? '' : String(rows[0].duration_min) };
    }));
    setExerciseSearch('');
    setShowManual(true);
  };

  const addManualExercise = (exercise: LibraryExercise) => {
    if (manualExercises.some((item) => item.exercise.name === exercise.name)) return Alert.alert('Exercise already added', `${exercise.name} is already in this workout.`);
    setManualExercises((current) => [...current, { id: newManualId(), exercise, sets: exercise.metric_type === 'strength' ? [{ id: newManualId(), weight: '', reps: '' }] : [], distance: '', duration: '' }]);
    setExerciseSearch('');
  };
  const updateManualExercise = (id:string, patch:Partial<ManualExercise>) => setManualExercises((current)=>current.map((item)=>item.id===id?{...item,...patch}:item));
  const updateManualSet = (exerciseId:string,setId:string,patch:Partial<ManualSet>) => setManualExercises((current)=>current.map((item)=>item.id===exerciseId?{...item,sets:item.sets.map((set)=>set.id===setId?{...set,...patch}:set)}:item));
  const addManualSet = (exerciseId:string) => setManualExercises((current)=>current.map((item)=>item.id===exerciseId?{...item,sets:[...item.sets,{id:newManualId(),weight:'',reps:''}]}:item));
  const removeManualSet = (exerciseId:string,setId:string) => setManualExercises((current)=>current.map((item)=>item.id===exerciseId?{...item,sets:item.sets.filter((set)=>set.id!==setId)}:item));

  const saveManual = async () => {
    const minutes = Number(manualMinutes);
    const chosen = new Date(`${selectedDate}T12:00:00`);
    const today = dateKey();
    if (!manualTitle.trim()) return Alert.alert('Workout name required', 'Enter a short name for this workout.');
    if (!manualExercises.length) return Alert.alert('Add an exercise', 'Add at least one exercise and its completed result.');
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 300) return Alert.alert('Check duration', 'Enter a duration from 1 to 300 minutes.');
    if (selectedDate > today || Number.isNaN(chosen.getTime())) return Alert.alert('Choose a valid date', 'Past workouts can only be logged for today or an earlier day.');
    for (const item of manualExercises) {
      if (item.exercise.metric_type === 'strength') {
        if (!item.sets.length || item.sets.some((set) => !Number.isFinite(Number(set.reps)) || Number(set.reps) < 1 || Number(set.reps) > 100 || (set.weight.trim() !== '' && (!Number.isFinite(Number(set.weight)) || Number(set.weight) < 0)))) return Alert.alert('Check exercise sets', `Enter valid reps and an optional non-negative weight for ${item.exercise.name}.`);
      } else if ((!Number.isFinite(Number(item.duration)) || Number(item.duration) <= 0) && (item.exercise.metric_type !== 'distance' || !Number.isFinite(Number(item.distance)) || Number(item.distance) <= 0)) return Alert.alert('Check cardio result', `Enter a duration${item.exercise.metric_type === 'distance' ? ' or distance' : ''} for ${item.exercise.name}.`);
    }

    let endedAt = new Date(chosen.getTime() + minutes * 60000);
    let startedAt = chosen;
    if (selectedDate === today && endedAt.getTime() > Date.now()) {
      endedAt = new Date();
      startedAt = new Date(endedAt.getTime() - minutes * 60000);
    }
    setSaving(true);
    try {
      const payload = {
        user_id: profile.id,
        completed: true,
        summary: manualTitle.trim(),
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        entry_source: 'manual',
        manual_notes: manualNotes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const query = manualId
        ? supabase.from('workout_sessions').update(payload).eq('id', manualId).eq('user_id', profile.id).eq('entry_source', 'manual').select('id').single()
        : supabase.from('workout_sessions').insert(payload).select('id').single();
      const { data: savedSession, error } = await query;
      if (error) throw error;
      const sessionId = String(savedSession?.id ?? manualId ?? '');
      if (!sessionId) throw new Error('The workout was saved without a session identifier.');
      await supabase.from('workout_sets').delete().eq('session_id', sessionId).eq('user_id', profile.id);
      const setPayload: ManualWorkoutSetPayload[] = manualExercises.flatMap((item): ManualWorkoutSetPayload[] => item.exercise.metric_type === 'strength'
        ? item.sets.map((set,index) => ({ user_id:profile.id,session_id:sessionId,exercise_name:item.exercise.name,set_number:index+1,weight_kg:set.weight.trim()===''?0:displayToKg(Number(set.weight),weightUnit),reps:Number(set.reps),distance_km:null,duration_min:null,created_at:endedAt.toISOString() }))
        : [{ user_id:profile.id,session_id:sessionId,exercise_name:item.exercise.name,set_number:1,weight_kg:null,reps:null,distance_km:item.exercise.metric_type==='distance'&&Number(item.distance)>0?displayToKm(Number(item.distance),distanceUnit):null,duration_min:Number(item.duration)>0?Number(item.duration):null,created_at:endedAt.toISOString() }]);
      const { error:setError } = await supabase.from('workout_sets').insert(setPayload);
      if (setError) throw setError;
      await Promise.all([supabase.rpc('recalculate_my_workout_streak'),supabase.rpc('apply_workout_to_challenges',{p_session_id:sessionId}),supabase.rpc('refresh_my_current_clubs')]);
      setShowManual(false);
      setManualId(null);
      setManualExercises([]);
      await load();
    } catch (error: any) {
      Alert.alert('Manual workout', error?.message ?? 'Could not save this workout.');
    } finally { setSaving(false); }
  };

  const deleteManual = () => {
    if (!manualId) return;
    Alert.alert('Delete manual workout?', 'This removes the selected manual entry. Other workouts are not affected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('workout_sessions').delete().eq('id', manualId).eq('user_id', profile.id).eq('entry_source', 'manual');
        if (error) return Alert.alert('Delete workout', error.message);
        await supabase.rpc('recalculate_my_workout_streak');
        setShowManual(false);
        setManualId(null);
        await load();
      } },
    ]);
  };

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><View style={{ flex: 1 }}><Text style={styles.title}>Workout history</Text><Text style={styles.sub}>Review workouts or add one you completed without your phone.</Text></View><OutlineButton compact title="+ LOG" onPress={() => openManualForDate(dateKey())} /></View>
    <WorkoutCalendar month={month} sessions={summaries} selectedDate={selectedDate} onMonth={setMonth} onPick={openManualForDate} />

    {showManual ? <Card style={styles.manualCard}>
      <SectionTitle title={manualId ? 'Edit manual workout' : 'Log a completed workout'} subtitle={`${new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • live workouts are never overwritten.`} />
      <Input value={manualTitle} onChangeText={setManualTitle} placeholder="Workout name" maxLength={80} />
      <Input value={manualMinutes} onChangeText={setManualMinutes} placeholder="Duration in minutes" keyboardType="number-pad" />
      <Input value={manualNotes} onChangeText={setManualNotes} placeholder="Optional notes" multiline maxLength={500} style={styles.notes} />
      <SectionTitle title="Exercises and results" subtitle="Add every exercise you completed, then record its sets or cardio result." />
      <Input value={exerciseSearch} onChangeText={setExerciseSearch} placeholder="Search exercises to add" />
      {exerciseSearch.trim().length >= 2 ? <View style={styles.exerciseResults}>{exerciseLibrary.filter((exercise)=>exercise.name.toLowerCase().includes(exerciseSearch.trim().toLowerCase())).slice(0,12).map((exercise)=><Pressable key={exercise.slug} onPress={()=>addManualExercise(exercise)} style={styles.exerciseResult}><View style={{flex:1}}><Text style={styles.exerciseResultName}>{exercise.name}</Text><Text style={styles.exerciseResultMeta}>{exercise.category} • {exercise.equipment}</Text></View><Text style={styles.exerciseResultAdd}>＋ ADD</Text></Pressable>)}</View> : null}
      {manualExercises.map((item,index)=><View key={item.id} style={styles.manualExercise}><View style={styles.manualExerciseHead}><View style={styles.manualExerciseNumber}><Text style={styles.manualExerciseNumberText}>{index+1}</Text></View><View style={{flex:1}}><Text style={styles.manualExerciseName}>{item.exercise.name}</Text><Text style={styles.exerciseResultMeta}>{item.exercise.metric_type==='strength'?'Sets, weight and reps':item.exercise.metric_type==='distance'?`Distance (${distanceUnit}) and time`:'Duration'}</Text></View><Pressable onPress={()=>setManualExercises((current)=>current.filter((exercise)=>exercise.id!==item.id))}><Text style={styles.removeExercise}>REMOVE</Text></Pressable></View>
        {item.exercise.metric_type==='strength'?<>{item.sets.map((set,setIndex)=><View key={set.id} style={styles.manualSetRow}><View style={styles.setNumber}><Text style={styles.setNumberText}>{setIndex+1}</Text></View><Input style={styles.manualSetInput} value={set.weight} onChangeText={(weight)=>updateManualSet(item.id,set.id,{weight})} keyboardType="decimal-pad" placeholder={`Weight ${weightUnit}`}/><Input style={styles.manualSetInput} value={set.reps} onChangeText={(reps)=>updateManualSet(item.id,set.id,{reps})} keyboardType="number-pad" placeholder="Reps"/><Pressable disabled={item.sets.length===1} onPress={()=>removeManualSet(item.id,set.id)} style={styles.removeSet}><Text style={[styles.removeSetText,item.sets.length===1&&{opacity:.3}]}>×</Text></Pressable></View>)}<OutlineButton compact title="+ ADD SET" onPress={()=>addManualSet(item.id)}/></>:<View style={styles.manualSetRow}>{item.exercise.metric_type==='distance'?<Input style={styles.manualSetInput} value={item.distance} onChangeText={(distance)=>updateManualExercise(item.id,{distance})} keyboardType="decimal-pad" placeholder={`Distance ${distanceUnit}`}/>:null}<Input style={styles.manualSetInput} value={item.duration} onChangeText={(duration)=>updateManualExercise(item.id,{duration})} keyboardType="decimal-pad" placeholder="Minutes"/></View>}
      </View>)}
      <Button title={saving ? 'SAVING…' : manualId ? 'SAVE CHANGES' : 'ADD COMPLETED WORKOUT'} onPress={saveManual} disabled={saving} />
      <View style={styles.manualActions}><OutlineButton compact title="CANCEL" onPress={() => setShowManual(false)} />{manualId ? <Pressable onPress={deleteManual}><Text style={styles.delete}>DELETE MANUAL ENTRY</Text></Pressable> : null}</View>
    </Card> : null}

    <SectionTitle title="Saved workouts" subtitle="Tap a workout for its exercises and recorded sets." />
    {summaries.length ? summaries.map((session: any, index: number) => {
      const expanded = expandedId === session.id;
      const groupedExercises = groupExerciseRows(session.rows);
      return <Pressable key={session.id} onPress={() => setExpandedId(expanded ? null : session.id)}>
        <Card>
          <View style={styles.top}><View style={[styles.number, session.entry_source === 'manual' && styles.manualNumber]}><Text style={styles.numberText}>{session.entry_source === 'manual' ? 'M' : index + 1}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{sessionTitle(session.summary)}</Text><Text style={styles.meta}>{new Date(session.ended_at ?? session.started_at).toLocaleString()}{session.entry_source === 'manual' ? ' • Manually logged' : ''}</Text></View>{session.entry_source === 'manual' ? <Pressable onPress={() => openManualForDate(sessionDateKey(session))}><Text style={styles.edit}>EDIT</Text></Pressable> : null}<Text style={styles.expand}>{expanded ? '⌃' : '›'}</Text></View>
          {session.manual_notes ? <Text style={styles.exercises}>{session.manual_notes}</Text> : null}
          <Text style={styles.exercises} numberOfLines={expanded ? undefined : 2}>{Array.from(new Set(session.rows.map((row: any) => row.exercise_name))).join(' • ') || (session.entry_source === 'manual' ? 'Completed workout' : 'Workout')}</Text>
          <View style={styles.stats}><Mini label="Exercises" value={`${session.exercises || '—'}`} /><Mini label="Sets" value={`${session.rows.length || '—'}`} /><Mini label="Time" value={`${session.minutes}m`} /><Mini label="Volume" value={session.volume > 0 ? `${Math.round(kgToDisplay(session.volume, weightUnit)).toLocaleString()} ${weightUnit}` : session.distance > 0 ? formatDistance(session.distance, distanceUnit, 1) : '—'} /></View>
          {expanded && groupedExercises.length ? <View style={styles.details}>{groupedExercises.map(({ name, rows }: any) => <View key={name} style={styles.exerciseGroup}><Text style={styles.exerciseName}>{name}</Text>{rows.map((row: any, rowIndex: number) => <View key={`${name}-${row.set_number ?? rowIndex}-${rowIndex}`} style={styles.setRow}><Text style={styles.setLabel}>{row.weight_kg != null || row.reps != null ? `Set ${row.set_number ?? rowIndex + 1}` : 'Result'}</Text><Text style={styles.setValue}>{rowText(row, weightUnit, distanceUnit)}</Text></View>)}</View>)}</View> : null}
        </Card>
      </Pressable>;
    }) : <Card><Text style={styles.meta}>No completed workouts yet.</Text></Card>}
  </RefreshableScrollView>;
}

function WorkoutCalendar({ month, sessions, selectedDate, onMonth, onPick }: { month: Date; sessions: any[]; selectedDate: string; onMonth: (d: Date) => void; onPick: (date: string) => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const year = month.getFullYear(), monthIndex = month.getMonth(), first = new Date(year, monthIndex, 1).getDay(), days = new Date(year, monthIndex + 1, 0).getDate();
  const byDay = new Map<string, any[]>();
  sessions.forEach((session) => { const key = sessionDateKey(session); byDay.set(key, [...(byDay.get(key) ?? []), session]); });
  const move = (offset: number) => onMonth(new Date(year, monthIndex + offset, 1));
  const today = dateKey();
  return <Card>
    <View style={styles.calendarHead}><Pressable onPress={() => move(-1)}><Text style={styles.calendarArrow}>‹</Text></Pressable><View><Text style={styles.calendarTitle}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text><Text style={styles.calendarSub}>Tap any past day to add or edit a manual entry</Text></View><Pressable onPress={() => move(1)} disabled={dateKey(new Date(year, monthIndex + 1, 1)) > today}><Text style={styles.calendarArrow}>›</Text></Pressable></View>
    <View style={styles.calendarGrid}>{['S','M','T','W','T','F','S'].map((label, index) => <Text key={index} style={styles.weekDay}>{label}</Text>)}{Array.from({ length: first }).map((_, index) => <View key={`blank-${index}`} style={styles.day} />)}{Array.from({ length: days }).map((_, index) => {
      const day = new Date(year, monthIndex, index + 1);
      const key = dateKey(day);
      const workouts = byDay.get(key) ?? [];
      const future = key > today;
      const hasManual = workouts.some((workout) => workout.entry_source === 'manual');
      return <Pressable key={key} disabled={future} onPress={() => onPick(key)} style={[styles.day, workouts.length ? styles.workoutDay : null, selectedDate === key ? styles.selectedDay : null, future ? styles.futureDay : null]}><Text style={[styles.dayText, workouts.length ? styles.workoutDayText : null]}>{index + 1}</Text><View style={styles.dayMarkers}>{workouts.length ? <Text style={styles.dayDot}>●</Text> : null}{hasManual ? <Text style={styles.manualDot}>M</Text> : null}</View></Pressable>;
    })}</View>
  </Card>;
}

function groupExerciseRows(rows: any[]) {
  const map = new Map<string, any[]>();
  rows.forEach((row) => { const current = map.get(row.exercise_name) ?? []; current.push(row); map.set(row.exercise_name, current); });
  return Array.from(map.entries()).map(([name, grouped]) => ({ name, rows: grouped }));
}
function fallbackExercise(name:string,rows:any[]):LibraryExercise {
  const hasDistance=rows.some((row)=>Number(row.distance_km??0)>0);
  const hasDuration=rows.some((row)=>Number(row.duration_min??0)>0);
  return {name:String(name||'Exercise'),category:hasDistance||hasDuration?'Cardio':'Other',equipment:'Other',metric_type:hasDistance?'distance':hasDuration?'time':'strength',icon_emoji:'•',rep_min:null,rep_max:null,slug:`manual-${String(name||'exercise').toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,section:hasDistance||hasDuration?'Cardio':'Other',subsection:'Manual',targetArea:hasDistance||hasDuration?'Cardio':'Other',targetMuscles:[]};
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
  const names = summary.split(',').map((value) => value.trim()).filter(Boolean);
  if (names.length === 1) return names[0];
  return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : 'Workout';
}
function Mini({ label, value }: { label: string; value: string }) { const { colors } = useTheme(); const styles = createStyles(colors); return <View style={styles.mini}><Text style={styles.miniValue}>{value}</Text><Text style={styles.miniLabel}>{label}</Text></View>; }

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 34 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }, back: { width: 34, height: 42, justifyContent: 'center' }, backText: { color: colors.text, fontSize: 36, fontWeight: '300' }, title: { color: colors.text, fontSize: 27, fontWeight: '900' }, sub: { color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 15 },
  manualCard: { borderColor: colors.primary }, notes: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }, manualActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }, delete: { color: colors.danger, fontSize: 10, fontWeight: '900' },
  exerciseResults:{borderWidth:1,borderColor:colors.border,borderRadius:13,overflow:'hidden',marginTop:-7,marginBottom:12},exerciseResult:{minHeight:54,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:11,borderBottomWidth:1,borderBottomColor:colors.border,backgroundColor:colors.panel2},exerciseResultName:{color:colors.text,fontSize:12,fontWeight:'900'},exerciseResultMeta:{color:colors.muted,fontSize:9,marginTop:2},exerciseResultAdd:{color:colors.primary,fontSize:9,fontWeight:'900'},
  manualExercise:{borderWidth:1,borderColor:colors.border,borderRadius:14,backgroundColor:colors.panel2,padding:11,marginBottom:10},manualExerciseHead:{flexDirection:'row',alignItems:'center',gap:9,marginBottom:9},manualExerciseNumber:{width:29,height:29,borderRadius:10,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},manualExerciseNumberText:{color:colors.primary,fontWeight:'900'},manualExerciseName:{color:colors.text,fontSize:13,fontWeight:'900'},removeExercise:{color:colors.danger,fontSize:8,fontWeight:'900'},manualSetRow:{flexDirection:'row',alignItems:'center',gap:6},setNumber:{width:24,height:35,borderRadius:8,backgroundColor:colors.panel,alignItems:'center',justifyContent:'center'},setNumberText:{color:colors.muted,fontSize:9,fontWeight:'900'},manualSetInput:{flex:1,minWidth:0},removeSet:{width:29,height:38,alignItems:'center',justifyContent:'center'},removeSetText:{color:colors.danger,fontSize:24},
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 }, number: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, manualNumber: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary }, numberText: { color: colors.blue, fontWeight: '900' }, name: { color: colors.text, fontWeight: '900', fontSize: 15 }, meta: { color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 15 }, edit: { color: colors.primary, fontSize: 10, fontWeight: '900' }, expand: { color: colors.muted, fontSize: 24, fontWeight: '800' }, exercises: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 10 }, stats: { flexDirection: 'row', gap: 6, marginTop: 12 }, mini: { flex: 1, backgroundColor: colors.panel2, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 5, alignItems: 'center' }, miniValue: { color: colors.text, fontSize: 11, fontWeight: '900', textAlign: 'center' }, miniLabel: { color: colors.muted, fontSize: 8, marginTop: 3 },
  details: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }, exerciseGroup: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, exerciseName: { color: colors.text, fontSize: 12, fontWeight: '900', marginBottom: 4 }, setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }, setLabel: { color: colors.muted, fontSize: 9 }, setValue: { color: colors.text, fontSize: 10, fontWeight: '800' },
  calendarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, calendarArrow: { color: colors.primary, fontSize: 30, fontWeight: '800', paddingHorizontal: 8 }, calendarTitle: { color: colors.text, fontWeight: '900', textAlign: 'center' }, calendarSub: { color: colors.muted, fontSize: 8, marginTop: 2, textAlign: 'center' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, weekDay: { width: '14.285%', textAlign: 'center', color: colors.muted, fontSize: 9, fontWeight: '900', paddingVertical: 5 }, day: { width: '14.285%', height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, workoutDay: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: colors.blue }, selectedDay: { borderWidth: 2, borderColor: colors.primary }, futureDay: { opacity: .3 }, dayText: { color: colors.muted, fontSize: 11 }, workoutDayText: { color: colors.text, fontWeight: '900' }, dayMarkers: { height: 10, flexDirection: 'row', alignItems: 'center', gap: 3 }, dayDot: { color: colors.green, fontSize: 7 }, manualDot: { color: colors.primary, fontSize: 7, fontWeight: '900' },
});
