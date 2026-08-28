import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { formatDistance } from '../lib/units';

type RunRecord = {
  sessionId: string;
  summary: string;
  startedAt: string;
  endedAt: string | null;
  distanceKm: number;
  durationMin: number;
  sources: string[];
};

type DistanceBest = { distanceKm: number; record: RunRecord };

export default function RunMetricsScreen({ profile, onBack, onOpenSession }: { profile: Profile; onBack: () => void; onOpenSession: (sessionId: string) => void }) {
  const { colors, distanceUnit } = useTheme();
  const styles = createStyles(colors);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);

  const load = async () => {
    const { data: sessionRows, error } = await supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).order('ended_at', { ascending: false }).limit(1000);
    if (error) return Alert.alert('Run metrics', error.message);
    const sessions = sessionRows ?? [];
    if (!sessions.length) return setRuns([]);
    const { data: setRows, error: setError } = await supabase.from('workout_sets').select('session_id,exercise_name,distance_km,duration_min').eq('user_id', profile.id).in('session_id', sessions.map((item: any) => item.id));
    if (setError) return Alert.alert('Run metrics', setError.message);
    const rowsBySession = new Map<string, any[]>();
    for (const row of setRows ?? []) {
      if (!isRunningExercise(row.exercise_name)) continue;
      const list = rowsBySession.get(row.session_id) ?? [];
      list.push(row);
      rowsBySession.set(row.session_id, list);
    }
    const records = sessions.flatMap((session: any) => {
      const rows = rowsBySession.get(session.id) ?? [];
      const distanceKm = rows.reduce((total, row) => total + positiveNumber(row.distance_km), 0);
      const durationMin = rows.reduce((total, row) => total + positiveNumber(row.duration_min), 0);
      if (!distanceKm || !durationMin) return [];
      return [{
        sessionId: session.id,
        summary: String(session.summary || rows[0]?.exercise_name || 'Recorded run'),
        startedAt: session.started_at,
        endedAt: session.ended_at,
        distanceKm,
        durationMin,
        sources: Array.from(new Set(rows.map((row) => String(row.exercise_name)))),
      } satisfies RunRecord];
    });
    setRuns(records);
  };

  useEffect(() => { load(); }, [profile.id]);

  const bests = useMemo(() => {
    const result: DistanceBest[] = [];
    const furthest = Math.floor(Math.max(0, ...runs.map((run) => run.distanceKm)) / 5) * 5;
    for (let target = 5; target <= furthest; target += 5) {
      const matching = runs.filter((run) => matchesRecordedDistance(run.distanceKm, target));
      if (!matching.length) continue;
      const record = [...matching].sort((a, b) => a.durationMin - b.durationMin)[0];
      result.push({ distanceKm: target, record });
    }
    return result;
  }, [runs]);

  useEffect(() => {
    if (selectedDistance != null && !bests.some((best) => best.distanceKm === selectedDistance)) setSelectedDistance(null);
  }, [bests, selectedDistance]);

  const selectedBest = bests.find((best) => best.distanceKm === selectedDistance);
  const selectedRuns = selectedDistance == null ? [] : runs.filter((run) => matchesRecordedDistance(run.distanceKm, selectedDistance)).sort((a, b) => a.durationMin - b.durationMin);

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap}>
    <View style={styles.header}><Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}><Text style={styles.back}>‹</Text></Pressable><View style={{ flex: 1 }}><Text style={styles.title}>Run metrics</Text><Text style={styles.subtitle}>Recorded runs and your fastest exact-distance results.</Text></View></View>

    {bests.length ? <>
      <SectionTitle title="Distance bests" subtitle="Only distances you have actually recorded appear here. Longer-run splits are not estimated." />
      <View style={styles.bestGrid}>{bests.map((best) => {
        const active = selectedDistance === best.distanceKm;
        return <Pressable key={best.distanceKm} accessibilityRole="button" accessibilityLabel={`${best.distanceKm} kilometre best`} onPress={() => setSelectedDistance(active ? null : best.distanceKm)} style={[styles.bestCard, active && styles.bestCardActive]}>
          <View style={styles.medal}><Text style={styles.medalText}>⚡</Text></View>
          <Text style={styles.bestLabel}>{best.distanceKm} km BEST</Text>
          <Text style={styles.bestTime}>{formatDuration(best.record.durationMin)}</Text>
          <Text style={styles.bestPace}>{formatPace(best.record.durationMin, best.record.distanceKm, distanceUnit)}</Text>
        </Pressable>;
      })}</View>
    </> : null}

    {selectedBest ? <Card style={styles.detailCard}>
      <View style={styles.detailHead}><View><Text style={styles.detailEyebrow}>CURRENT FASTEST</Text><Text style={styles.detailTitle}>{selectedBest.distanceKm} km • {formatDuration(selectedBest.record.durationMin)}</Text></View><Pressable onPress={() => setSelectedDistance(null)}><Text style={styles.close}>×</Text></Pressable></View>
      <Text style={styles.detailMeta}>{new Date(selectedBest.record.endedAt ?? selectedBest.record.startedAt).toLocaleString()} • {formatPace(selectedBest.record.durationMin, selectedBest.record.distanceKm, distanceUnit)}</Text>
      <Pressable onPress={() => onOpenSession(selectedBest.record.sessionId)} style={styles.openWorkout}><Text style={styles.openWorkoutText}>VIEW RECORDED WORKOUT ›</Text></Pressable>
      {selectedRuns.length > 1 ? <View style={styles.otherResults}><Text style={styles.otherTitle}>All recorded {selectedBest.distanceKm} km results</Text>{selectedRuns.map((run, index) => <Pressable key={run.sessionId} onPress={() => onOpenSession(run.sessionId)} style={styles.resultRow}><Text style={styles.resultRank}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.resultTime}>{formatDuration(run.durationMin)}</Text><Text style={styles.resultDate}>{new Date(run.endedAt ?? run.startedAt).toLocaleDateString()}</Text></View><Text style={styles.resultArrow}>›</Text></Pressable>)}</View> : null}
    </Card> : null}

    <SectionTitle title="Recorded runs" subtitle={`${runs.length} completed run${runs.length === 1 ? '' : 's'} with both distance and time saved`} />
    {runs.length ? runs.map((run) => <Pressable key={run.sessionId} onPress={() => onOpenSession(run.sessionId)} style={({ pressed }) => [styles.runCard, pressed && styles.pressed]}>
      <View style={styles.runIcon}><Text style={styles.runIconText}>🏃</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.runName}>{run.summary}</Text><Text style={styles.runDate}>{new Date(run.endedAt ?? run.startedAt).toLocaleString()}</Text><Text style={styles.runSource}>{run.sources.join(' • ')}</Text></View>
      <View style={styles.runStats}><Text style={styles.runDistance}>{formatDistance(run.distanceKm, distanceUnit, 2)}</Text><Text style={styles.runTime}>{formatDuration(run.durationMin)}</Text><Text style={styles.runPace}>{formatPace(run.durationMin, run.distanceKm, distanceUnit)}</Text></View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>) : <Card><SectionTitle title="No recorded runs yet" subtitle="A run appears here after a completed Running, Outdoor Running or Treadmill Running workout has both a distance and duration." /></Card>}
  </RefreshableScrollView>;
}

function positiveNumber(value: any) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function isRunningExercise(name: any) {
  return /(^|\b)(run|running|jog|jogging)(\b|$)/i.test(String(name ?? ''));
}

function matchesRecordedDistance(actualKm: number, targetKm: number) {
  return Math.abs(actualKm - targetKm) <= Math.max(0.15, targetKm * 0.015);
}

function formatDuration(minutes: number) {
  const seconds = Math.max(0, Math.round(minutes * 60));
  const hours = Math.floor(seconds / 3600);
  const remaining = seconds % 3600;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return hours ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatPace(durationMin: number, distanceKm: number, unit: 'km' | 'mi') {
  const minutesPerKm = durationMin / Math.max(distanceKm, 0.001);
  const displayMinutes = unit === 'mi' ? minutesPerKm * 1.609344 : minutesPerKm;
  const seconds = Math.round(displayMinutes * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /${unit}`;
}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 42 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 }, backButton: { width: 34, height: 44, justifyContent: 'center' }, back: { color: colors.text, fontSize: 38, fontWeight: '300' }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  bestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 13 }, bestCard: { width: '48%', minHeight: 142, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, padding: 14, shadowColor: colors.shadow, shadowOpacity: .12, shadowRadius: 8, elevation: 2 }, bestCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, medal: { width: 35, height: 35, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, medalText: { fontSize: 18 }, bestLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', marginTop: 10, letterSpacing: .4 }, bestTime: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 3 }, bestPace: { color: colors.primary, fontSize: 10, fontWeight: '800', marginTop: 3 },
  detailCard: { borderColor: colors.primary }, detailHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, detailEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: .6 }, detailTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 4 }, close: { color: colors.muted, fontSize: 27, lineHeight: 27 }, detailMeta: { color: colors.muted, fontSize: 10, marginTop: 6 }, openWorkout: { minHeight: 42, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 13 }, openWorkoutText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' }, otherResults: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }, otherTitle: { color: colors.text, fontSize: 11, fontWeight: '900', marginBottom: 3 }, resultRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, resultRank: { color: colors.muted, fontSize: 10, width: 18 }, resultTime: { color: colors.text, fontSize: 12, fontWeight: '900' }, resultDate: { color: colors.muted, fontSize: 8, marginTop: 2 }, resultArrow: { color: colors.muted, fontSize: 22 },
  runCard: { minHeight: 92, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 }, runIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, runIconText: { fontSize: 22 }, runName: { color: colors.text, fontSize: 12, fontWeight: '900' }, runDate: { color: colors.muted, fontSize: 8, marginTop: 3 }, runSource: { color: colors.primary, fontSize: 8, marginTop: 4 }, runStats: { alignItems: 'flex-end' }, runDistance: { color: colors.text, fontSize: 12, fontWeight: '900' }, runTime: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 3 }, runPace: { color: colors.muted, fontSize: 8, marginTop: 2 }, arrow: { color: colors.muted, fontSize: 23 }, pressed: { opacity: .68 },
});
