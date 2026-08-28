import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarIcon, DumbbellIcon, JourneyIcon, RunMetricsIcon, StopwatchIcon, WeightPlateIcon } from '../components/FitHubIcons';
import { Card, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { profileAge } from '../lib/profileAge';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { formatDistance, formatPace, formatWeight } from '../lib/units';

type Period = 'week' | 'month';
type TrendFocus = 'workouts' | 'minutes' | 'sets' | 'distance';
type Range = { start: Date; end: Date; days: number };
type Summary = {
  sessions: any[];
  sets: any[];
  prs: any[];
  activeDays: number;
  duration: number;
  distance: number;
  exerciseCount: number;
  bestByExercise: Map<string, any>;
  exerciseSets: Map<string, number>;
};

export default function FitnessJourneyScreen({ profile, initialPeriod = 'week', onBack }: { profile: Profile; initialPeriod?: Period; onBack: () => void }) {
  const { colors, weightUnit, distanceUnit, isDark } = useTheme();
  const s = styles(colors, isDark);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [trendFocus, setTrendFocus] = useState<TrendFocus>('workouts');
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);

  useEffect(() => { setPeriod(initialPeriod); }, [initialPeriod]);

  const load = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 70);
    since.setHours(0, 0, 0, 0);
    const [sessionResult, setResult, prResult] = await Promise.all([
      supabase.from('workout_sessions').select('id,started_at,ended_at,summary').eq('user_id', profile.id).eq('completed', true).gte('ended_at', since.toISOString()).order('ended_at', { ascending: false }),
      supabase.from('workout_sets').select('session_id,exercise_name,weight_kg,reps,distance_km,duration_min,created_at').eq('user_id', profile.id).gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(8000),
      supabase.from('pr_events').select('exercise_name,metric,value_numeric,previous_value_numeric,unit,details,achieved_at').eq('user_id', profile.id).gte('achieved_at', since.toISOString()).order('achieved_at', { ascending: false }),
    ]);
    setSessions(sessionResult.data ?? []);
    setSets(setResult.data ?? []);
    setPrs(prResult.data ?? []);
  };

  useEffect(() => { load(); }, [profile.id]);

  const currentRange = useMemo(() => periodRange(period, 0), [period]);
  const previousRange = useMemo(() => periodRange(period, 1), [period]);
  const current = useMemo(() => summarize(currentRange, sessions, sets, prs), [currentRange, sessions, sets, prs]);
  const previous = useMemo(() => summarize(previousRange, sessions, sets, prs), [previousRange, sessions, sets, prs]);
  const chart = useMemo(() => trendData(currentRange, current, trendFocus), [currentRange, current, trendFocus]);
  const adult = (profileAge(profile) ?? 0) >= 18;
  const previousLabel = period === 'week' ? 'previous week' : 'previous 30 days';
  const topLifts = Array.from(current.bestByExercise.entries()).slice(0, 5);
  const exerciseHighlights = Array.from(current.exerciseSets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const recommendations = useMemo(() => {
    if (!current.sessions.length) return ['No completed workouts are recorded for this period yet. Your report will build automatically as sessions are completed.'];
    const items: string[] = [];
    if (current.activeDays > 0) items.push(`You trained across ${current.activeDays} active day${current.activeDays === 1 ? '' : 's'}. Recovery days and flexible scheduling are part of a sustainable routine.`);
    if (current.exerciseCount > 0) items.push(`${current.exerciseCount} different exercise${current.exerciseCount === 1 ? '' : 's'} appear in this report. Use the trend above to compare your routine with the ${previousLabel}.`);
    if (adult && current.prs.length) items.push('Personal records are useful context, but technique, control and recovery are also meaningful signs of progress.');
    if (!adult) items.push('Keep exercise setup and controlled technique as the priority. Ask a qualified adult or coach for help when learning a new movement.');
    return items.slice(0, 3);
  }, [adult, current, previousLabel]);

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.backButton} accessibilityRole="button" accessibilityLabel="Back"><Text style={s.back}>‹</Text></Pressable>
      <View style={s.headerCopy}><Text style={s.title}>My Fitness Journey</Text><Text style={s.sub}>Private reports from your completed workouts and activity history.</Text></View>
    </View>

    <View style={s.periodSwitch}>
      <PeriodButton label="Weekly report" active={period === 'week'} onPress={() => setPeriod('week')}/>
      <PeriodButton label="Monthly report" active={period === 'month'} onPress={() => setPeriod('month')}/>
    </View>

    <View style={s.reportRange}>
      <CalendarIcon size={22} color={colors.text} accentColor={colors.primary}/>
      <View style={{ flex: 1 }}><Text style={s.rangeEyebrow}>CURRENT REPORT</Text><Text style={s.rangeText}>{formatDateRange(currentRange)}</Text></View>
      <Text style={s.privatePill}>Only you</Text>
    </View>

    <View style={s.metricsGrid}>
      <MetricCard label="Workouts" value={String(current.sessions.length)} comparison={comparisonText(current.sessions.length, previous.sessions.length)} icon={<DumbbellIcon size={27} color={colors.text}/>} active={trendFocus === 'workouts'} onPress={() => setTrendFocus('workouts')}/>
      <MetricCard label="Active days" value={String(current.activeDays)} comparison={comparisonText(current.activeDays, previous.activeDays)} icon={<CalendarIcon size={27} color={colors.text} accentColor={colors.primary}/>} />
      <MetricCard label="Training time" value={formatMinutes(current.duration)} comparison={comparisonText(Math.round(current.duration), Math.round(previous.duration), ' min')} icon={<StopwatchIcon size={32} color={colors.text} accentColor={colors.primary}/>} active={trendFocus === 'minutes'} onPress={() => setTrendFocus('minutes')}/>
      <MetricCard label="Recorded sets" value={String(current.sets.length)} comparison={comparisonText(current.sets.length, previous.sets.length)} icon={<WeightPlateIcon size={32} color={colors.text} accentColor={colors.primary}/>} active={trendFocus === 'sets'} onPress={() => setTrendFocus('sets')}/>
      <MetricCard label="Exercises" value={String(current.exerciseCount)} comparison={comparisonText(current.exerciseCount, previous.exerciseCount)} icon={<JourneyIcon size={32} color={colors.text} accentColor={colors.primary}/>} />
      <MetricCard label="Cardio distance" value={formatDistance(current.distance, distanceUnit, 1)} comparison={distanceComparison(current.distance, previous.distance, distanceUnit)} icon={<RunMetricsIcon size={34} color={colors.text} accentColor={colors.primary}/>} active={trendFocus === 'distance'} onPress={() => setTrendFocus('distance')}/>
    </View>

    <Card style={s.trendCard}>
      <View style={s.cardHeadingRow}><View style={{ flex: 1 }}><Text style={s.cardTitle}>Activity trend</Text><Text style={s.sub}>Tap a metric to compare activity across this report period.</Text></View><View style={s.trendBadge}><Text style={s.trendBadgeText}>{trendLabel(trendFocus)}</Text></View></View>
      <View style={s.focusRow}>{(['workouts', 'minutes', 'sets', 'distance'] as TrendFocus[]).map((focus) => <Pressable key={focus} onPress={() => setTrendFocus(focus)} style={[s.focusPill, trendFocus === focus && s.focusPillActive]}><Text style={[s.focusText, trendFocus === focus && s.focusTextActive]}>{trendLabel(focus)}</Text></Pressable>)}</View>
      <TrendBars values={chart.values} labels={chart.labels} focus={trendFocus}/>
    </Card>

    <Card style={s.compareCard}>
      <SectionTitle title={`Compared with the ${previousLabel}`} subtitle={`${formatDateRange(previousRange)} • Your own history only`}/>
      <ComparisonRow label="Completed workouts" current={current.sessions.length} previous={previous.sessions.length}/>
      <ComparisonRow label="Active days" current={current.activeDays} previous={previous.activeDays}/>
      <ComparisonRow label="Training minutes" current={Math.round(current.duration)} previous={Math.round(previous.duration)}/>
      <ComparisonRow label="Recorded sets" current={current.sets.length} previous={previous.sets.length}/>
    </Card>

    <Card style={s.highlightsCard}>
      <SectionTitle title={adult ? 'Lift highlights' : 'Exercise highlights'} subtitle={adult ? 'Best recorded load for exercises in this report period.' : 'Exercises recorded most often in this report period.'}/>
      {adult ? topLifts.length ? topLifts.map(([name, row]) => <View key={name} style={s.highlightRow}><View style={s.highlightIcon}><WeightPlateIcon size={27} color={colors.text} accentColor={colors.primary}/></View><Text style={s.rowName}>{name}</Text><Text style={s.rowValue}>{formatWeight(Number(row.weight_kg), weightUnit)} × {Number(row.reps)} reps</Text></View>) : <Text style={s.empty}>No strength sets were recorded in this period.</Text> : exerciseHighlights.length ? exerciseHighlights.map(([name, count]) => <View key={name} style={s.highlightRow}><View style={s.highlightIcon}><DumbbellIcon size={23} color={colors.text}/></View><Text style={s.rowName}>{name}</Text><Text style={s.rowValue}>{count} set{count === 1 ? '' : 's'}</Text></View>) : <Text style={s.empty}>No exercise sets were recorded in this period.</Text>}
    </Card>

    {adult ? <Card>
      <SectionTitle title="Improvements" subtitle="Personal-record events recorded during this report period."/>
      {current.prs.length ? current.prs.slice(0, 8).map((pr: any, index: number) => <View key={`${pr.achieved_at}-${index}`} style={s.prRow}><View style={s.prMark}><Text style={s.prMarkText}>★</Text></View><View style={{ flex: 1 }}><Text style={s.rowName}>{pr.exercise_name}</Text><Text style={s.sub}>{prLabel(pr, weightUnit, distanceUnit)}</Text></View><Text style={s.date}>{new Date(pr.achieved_at).toLocaleDateString()}</Text></View>) : <Text style={s.empty}>No new personal-record events are recorded for this period.</Text>}
    </Card> : null}

    <Card style={s.insightCard}>
      <SectionTitle title="FitHub insights" subtitle="General observations from your own report, not medical advice."/>
      {recommendations.map((item, index) => <View key={index} style={s.insightRow}><View style={s.insightDot}/><Text style={s.insightText}>{item}</Text></View>)}
    </Card>
  </RefreshableScrollView>;
}

function PeriodButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme(); const s = styles(colors, isDark);
  return <Pressable onPress={onPress} style={[s.periodButton, active && s.periodButtonActive]}><Text style={[s.periodButtonText, active && s.periodButtonTextActive]}>{label}</Text></Pressable>;
}

function MetricCard({ label, value, comparison, icon, active = false, onPress }: { label: string; value: string; comparison: string; icon: React.ReactNode; active?: boolean; onPress?: () => void }) {
  const { colors, isDark } = useTheme(); const s = styles(colors, isDark);
  return <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [s.metricCard, active && s.metricCardActive, pressed && { opacity: .72 }]}><View style={s.metricTop}><View style={s.metricIcon}>{icon}</View>{onPress ? <Text style={s.metricArrow}>›</Text> : null}</View><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text><Text style={s.metricCompare}>{comparison}</Text></Pressable>;
}

function TrendBars({ values, labels, focus }: { values: number[]; labels: string[]; focus: TrendFocus }) {
  const { colors, isDark } = useTheme(); const s = styles(colors, isDark);
  const max = Math.max(1, ...values);
  return <View style={s.chartArea}>{values.map((value, index) => <View key={`${labels[index]}-${index}`} style={s.barColumn}><Text style={s.barValue}>{formatChartValue(value, focus)}</Text><View style={s.barTrack}><View style={[s.barFill, { height: value ? Math.max(10, value / max * 112) : 3 }]}/></View><Text style={s.barLabel}>{labels[index]}</Text></View>)}</View>;
}

function ComparisonRow({ label, current, previous }: { label: string; current: number; previous: number }) {
  const { colors, isDark } = useTheme(); const s = styles(colors, isDark); const difference = current - previous;
  return <View style={s.comparisonRow}><Text style={s.comparisonLabel}>{label}</Text><View style={s.comparisonValues}><Text style={s.previousValue}>{previous}</Text><Text style={s.comparisonArrow}>→</Text><Text style={s.currentValue}>{current}</Text><View style={[s.deltaPill, difference === 0 && s.deltaPillNeutral]}><Text style={[s.deltaText, difference === 0 && s.deltaTextNeutral]}>{difference > 0 ? `+${difference}` : String(difference)}</Text></View></View></View>;
}

function periodRange(period: Period, offset: number): Range {
  const days = period === 'week' ? 7 : 30;
  const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - offset * days);
  const start = new Date(end); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0, 0);
  return { start, end, days };
}

function summarize(range: Range, sessions: any[], sets: any[], prs: any[]): Summary {
  const periodSessions = sessions.filter((session) => inRange(session.ended_at ?? session.started_at, range));
  const sessionIds = new Set(periodSessions.map((session) => session.id));
  const periodSets = sets.filter((set) => sessionIds.has(set.session_id));
  const periodPrs = prs.filter((pr) => inRange(pr.achieved_at, range));
  const exerciseSets = new Map<string, number>();
  const bestByExercise = new Map<string, any>();
  periodSets.forEach((set) => {
    const name = String(set.exercise_name ?? 'Exercise');
    exerciseSets.set(name, (exerciseSets.get(name) ?? 0) + 1);
    if (Number(set.weight_kg ?? 0) > 0 && Number(set.reps ?? 0) > 0) {
      const previous = bestByExercise.get(name);
      if (!previous || Number(set.weight_kg) > Number(previous.weight_kg)) bestByExercise.set(name, set);
    }
  });
  return {
    sessions: periodSessions,
    sets: periodSets,
    prs: periodPrs,
    activeDays: new Set(periodSessions.map((session) => new Date(session.ended_at ?? session.started_at).toDateString())).size,
    duration: periodSessions.reduce((sum, session) => sum + sessionMinutes(session), 0),
    distance: periodSets.reduce((sum, set) => sum + Number(set.distance_km ?? 0), 0),
    exerciseCount: exerciseSets.size,
    bestByExercise,
    exerciseSets,
  };
}

function trendData(range: Range, summary: Summary, focus: TrendFocus) {
  const bucketCount = range.days === 7 ? 7 : 6;
  const bucketDays = range.days / bucketCount;
  const values = Array.from({ length: bucketCount }, () => 0);
  const labels = Array.from({ length: bucketCount }, (_, index) => range.days === 7 ? shortWeekday(addDays(range.start, index)) : `W${index + 1}`);
  const sessionBucket = new Map<string, number>();
  summary.sessions.forEach((session) => {
    const stamp = new Date(session.ended_at ?? session.started_at);
    const bucket = Math.min(bucketCount - 1, Math.max(0, Math.floor(dayDifference(stamp, range.start) / bucketDays)));
    sessionBucket.set(session.id, bucket);
    if (focus === 'workouts') values[bucket] += 1;
    if (focus === 'minutes') values[bucket] += sessionMinutes(session);
  });
  if (focus === 'sets' || focus === 'distance') summary.sets.forEach((set) => {
    const bucket = sessionBucket.get(set.session_id) ?? Math.min(bucketCount - 1, Math.max(0, Math.floor(dayDifference(new Date(set.created_at), range.start) / bucketDays)));
    values[bucket] += focus === 'sets' ? 1 : Number(set.distance_km ?? 0);
  });
  return { values, labels };
}

function inRange(value: string | Date, range: Range) { const timestamp = new Date(value).getTime(); return timestamp >= range.start.getTime() && timestamp <= range.end.getTime(); }
function addDays(value: Date, days: number) { const next = new Date(value); next.setDate(next.getDate() + days); return next; }
function dayDifference(value: Date, start: Date) { return (value.getTime() - start.getTime()) / 86400000; }
function shortWeekday(value: Date) { return value.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1).toUpperCase(); }
function sessionMinutes(session: any) { const start = new Date(session.started_at).getTime(); const end = new Date(session.ended_at ?? session.started_at).getTime(); return Math.max(0, Math.round((end - start) / 60000)); }
function formatMinutes(value: number) { const minutes = Math.round(value); if (minutes < 60) return `${minutes} min`; const hours = Math.floor(minutes / 60), rest = minutes % 60; return rest ? `${hours}h ${rest}m` : `${hours}h`; }
function formatDateRange(range: Range) { const start = range.start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); const end = range.end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); return `${start} – ${end}`; }
function trendLabel(focus: TrendFocus) { return focus === 'workouts' ? 'Workouts' : focus === 'minutes' ? 'Minutes' : focus === 'sets' ? 'Sets' : 'Distance'; }
function formatChartValue(value: number, focus: TrendFocus) { return focus === 'distance' ? value.toFixed(value >= 10 ? 0 : 1) : String(Math.round(value)); }
function comparisonText(current: number, previous: number, suffix = '') { const difference = current - previous; if (!difference) return `Same as previous${suffix ? ` (${previous}${suffix})` : ''}`; return `${difference > 0 ? '+' : ''}${difference}${suffix} vs previous`; }
function distanceComparison(current: number, previous: number, distanceUnit: 'km' | 'mi') { if (Math.abs(current - previous) < .01) return 'Same as previous'; const formatted = formatDistance(Math.abs(current - previous), distanceUnit, 1); return `${current > previous ? '+' : '−'}${formatted} vs previous`; }

function prLabel(pr: any, weightUnit: 'kg' | 'lb', distanceUnit: 'km' | 'mi') {
  if (pr.metric === 'max_weight' || pr.metric === 'reps_at_weight') {
    const kg = pr.unit === 'kg' ? Number(pr.value_numeric) : Number(pr.details?.weight_kg ?? pr.value_numeric);
    const reps = pr.details?.reps;
    return `${pr.metric === 'max_weight' ? 'New max' : 'Rep PR'} • ${formatWeight(kg, weightUnit)}${reps ? ` × ${reps} reps` : ''}`;
  }
  if (pr.metric === 'distance') return `Distance PR • ${formatDistance(Number(pr.value_numeric), distanceUnit)}`;
  if (pr.metric === 'pace') return `Pace PR • ${formatPace(Number(pr.value_numeric), distanceUnit)}`;
  return `${String(pr.metric).replaceAll('_', ' ')} • ${Number(pr.value_numeric).toFixed(1)} ${pr.unit}`;
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 52 },
  header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 17 },
  backButton: { width: 38, height: 46, alignItems: 'center', justifyContent: 'center' }, back: { color: colors.text, fontSize: 40, lineHeight: 42, fontWeight: '300' }, headerCopy: { flex: 1 }, title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -.45 }, sub: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  periodSwitch: { flexDirection: 'row', gap: 9, marginBottom: 12 }, periodButton: { flex: 1, minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' }, periodButtonActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, periodButtonText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, periodButtonTextActive: { color: colors.primary, fontWeight: '900' },
  reportRange: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: 13, minHeight: 64, marginBottom: 12 }, rangeEyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .45 }, rangeText: { color: colors.text, fontSize: 12, fontWeight: '900', marginTop: 3 }, privatePill: { color: colors.muted, fontSize: 8, fontWeight: '900', backgroundColor: colors.panel2, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 12 }, metricCard: { width: '48.6%', minHeight: 142, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, padding: 13, shadowColor: colors.shadow, shadowOpacity: isDark ? .2 : .08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, metricCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, metricTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, metricIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, metricArrow: { color: colors.muted, fontSize: 20 }, metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', marginTop: 10 }, metricValue: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 }, metricCompare: { color: colors.muted, fontSize: 8, fontWeight: '700', marginTop: 4 },
  trendCard: { borderRadius: 20, padding: 15 }, cardHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, cardTitle: { color: colors.text, fontSize: 19, fontWeight: '900' }, trendBadge: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, trendBadgeText: { color: colors.primary, fontSize: 8, fontWeight: '900' }, focusRow: { flexDirection: 'row', gap: 6, marginTop: 13, marginBottom: 14 }, focusPill: { flex: 1, minHeight: 34, borderRadius: 11, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }, focusPillActive: { backgroundColor: colors.primary }, focusText: { color: colors.muted, fontSize: 8, fontWeight: '900' }, focusTextActive: { color: '#FFFFFF' },
  chartArea: { height: 154, flexDirection: 'row', alignItems: 'flex-end', gap: 7, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 }, barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }, barValue: { color: colors.text, fontSize: 8, fontWeight: '900', marginBottom: 5 }, barTrack: { width: '62%', flex: 1, borderRadius: 8, backgroundColor: colors.panel2, justifyContent: 'flex-end', overflow: 'hidden' }, barFill: { width: '100%', borderRadius: 8, backgroundColor: colors.primary }, barLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', marginTop: 6 },
  compareCard: { borderRadius: 20 }, comparisonRow: { minHeight: 48, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, comparisonLabel: { color: colors.text, flex: 1, fontSize: 11, fontWeight: '800' }, comparisonValues: { flexDirection: 'row', alignItems: 'center', gap: 6 }, previousValue: { color: colors.muted, fontSize: 10, fontWeight: '800', minWidth: 24, textAlign: 'right' }, comparisonArrow: { color: colors.muted, fontSize: 12 }, currentValue: { color: colors.text, fontSize: 12, fontWeight: '900', minWidth: 24 }, deltaPill: { minWidth: 36, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 5 }, deltaPillNeutral: { backgroundColor: colors.panel2 }, deltaText: { color: colors.primary, fontSize: 8, fontWeight: '900' }, deltaTextNeutral: { color: colors.muted },
  highlightsCard: { borderRadius: 20 }, highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58, borderTopWidth: 1, borderTopColor: colors.border }, highlightIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, rowName: { color: colors.text, fontWeight: '900', flex: 1, fontSize: 11 }, rowValue: { color: colors.primary, fontWeight: '900', fontSize: 10, textAlign: 'right' }, empty: { color: colors.muted, fontSize: 11, lineHeight: 17, paddingVertical: 9 },
  prRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }, prMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }, prMarkText: { color: colors.gold, fontSize: 17 }, date: { color: colors.muted, fontSize: 8 },
  insightCard: { borderRadius: 20, backgroundColor: isDark ? colors.panel : colors.primarySoft }, insightRow: { flexDirection: 'row', gap: 10, marginBottom: 10 }, insightDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 }, insightText: { color: colors.text, flex: 1, fontSize: 11, lineHeight: 17 },
});
