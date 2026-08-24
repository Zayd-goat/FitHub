import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, OutlineButton, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { formatDistance, formatWeight, kgToDisplay } from '../lib/units';

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sessionDateKey = (session: any) => dateKey(new Date(session.ended_at ?? session.started_at));

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
    setShowManual(true);
  };

  const saveManual = async () => {
    const minutes = Number(manualMinutes);
    const chosen = new Date(`${selectedDate}T12:00:00`);
    const today = dateKey();
    if (!manualTitle.trim()) return Alert.alert('Workout name required', 'Enter a short name for this workout.');
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 300) return Alert.alert('Check duration', 'Enter a duration from 1 to 300 minutes.');
    if (selectedDate > today || Number.isNaN(chosen.getTime())) return Alert.alert('Choose a valid date', 'Past workouts can only be logged for today or an earlier day.');

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
        ? supabase.from('workout_sessions').update(payload).eq('id', manualId).eq('user_id', profile.id).eq('entry_source', 'manual')
        : supabase.from('workout_sessions').insert(payload);
      const { error } = await query;
      if (error) throw error;
      await supabase.rpc('recalculate_my_workout_streak');
      setShowManual(false);
      setManualId(null);
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 }, number: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, manualNumber: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary }, numberText: { color: colors.blue, fontWeight: '900' }, name: { color: colors.text, fontWeight: '900', fontSize: 15 }, meta: { color: colors.muted, fontSize: 10, marginTop: 3, lineHeight: 15 }, edit: { color: colors.primary, fontSize: 10, fontWeight: '900' }, expand: { color: colors.muted, fontSize: 24, fontWeight: '800' }, exercises: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 10 }, stats: { flexDirection: 'row', gap: 6, marginTop: 12 }, mini: { flex: 1, backgroundColor: colors.panel2, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 5, alignItems: 'center' }, miniValue: { color: colors.text, fontSize: 11, fontWeight: '900', textAlign: 'center' }, miniLabel: { color: colors.muted, fontSize: 8, marginTop: 3 },
  details: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }, exerciseGroup: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, exerciseName: { color: colors.text, fontSize: 12, fontWeight: '900', marginBottom: 4 }, setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }, setLabel: { color: colors.muted, fontSize: 9 }, setValue: { color: colors.text, fontSize: 10, fontWeight: '800' },
  calendarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, calendarArrow: { color: colors.primary, fontSize: 30, fontWeight: '800', paddingHorizontal: 8 }, calendarTitle: { color: colors.text, fontWeight: '900', textAlign: 'center' }, calendarSub: { color: colors.muted, fontSize: 8, marginTop: 2, textAlign: 'center' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, weekDay: { width: '14.285%', textAlign: 'center', color: colors.muted, fontSize: 9, fontWeight: '900', paddingVertical: 5 }, day: { width: '14.285%', height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, workoutDay: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: colors.blue }, selectedDay: { borderWidth: 2, borderColor: colors.primary }, futureDay: { opacity: .3 }, dayText: { color: colors.muted, fontSize: 11 }, workoutDayText: { color: colors.text, fontWeight: '900' }, dayMarkers: { height: 10, flexDirection: 'row', alignItems: 'center', gap: 3 }, dayDot: { color: colors.green, fontSize: 7 }, manualDot: { color: colors.primary, fontSize: 7, fontWeight: '900' },
});
