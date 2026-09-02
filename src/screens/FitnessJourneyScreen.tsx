import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Circle, Defs, LinearGradient as SvgGradient, Line, Path, Stop, Svg } from 'react-native-svg';
import {
  CalendarIcon,
  DumbbellIcon,
  JourneyIcon,
  RunMetricsIcon,
  StopwatchIcon,
  WeightPlateIcon,
} from '../components/FitHubIcons';
import { Card, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { FitHubSpriteArt } from '../components/FitHubSpriteArt';
import { FreshChevronIcon } from '../components/FitHubFreshIcons';
import { ReferenceHomeBackdrop } from '../components/FitHubReferenceIcons';
import { YouCardArtwork } from '../components/YouCardArtwork';
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

const homeQuickSprites = require('../../assets/home_ui_v4/home_quick_sprites.png');
const homeWeekRunSprites = require('../../assets/home_ui_v4/home_week_run_sprites.png');

export default function FitnessJourneyScreen({
  profile,
  initialPeriod = 'week',
  onBack,
}: {
  profile: Profile;
  initialPeriod?: Period;
  onBack: () => void;
}) {
  const { colors, weightUnit, distanceUnit, isDark } = useTheme();
  const compact = useWindowDimensions().width < 390;
  const s = styles(colors, isDark, compact);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [rangeOffset, setRangeOffset] = useState(0);
  const [trendFocus, setTrendFocus] = useState<TrendFocus>('workouts');
  const [sessions, setSessions] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);

  useEffect(() => {
    setPeriod(initialPeriod);
    setRangeOffset(0);
  }, [initialPeriod]);

  const load = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 100);
    since.setHours(0, 0, 0, 0);
    const [sessionResult, setResult, prResult] = await Promise.all([
      supabase
        .from('workout_sessions')
        .select('id,started_at,ended_at,summary')
        .eq('user_id', profile.id)
        .eq('completed', true)
        .gte('ended_at', since.toISOString())
        .order('ended_at', { ascending: false }),
      supabase
        .from('workout_sets')
        .select('session_id,exercise_name,weight_kg,reps,distance_km,duration_min,created_at')
        .eq('user_id', profile.id)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(8000),
      supabase
        .from('pr_events')
        .select('exercise_name,metric,value_numeric,previous_value_numeric,unit,details,achieved_at')
        .eq('user_id', profile.id)
        .gte('achieved_at', since.toISOString())
        .order('achieved_at', { ascending: false }),
    ]);
    setSessions(sessionResult.data ?? []);
    setSets(setResult.data ?? []);
    setPrs(prResult.data ?? []);
  };

  useEffect(() => {
    load();
  }, [profile.id]);

  const currentRange = useMemo(() => periodRange(period, rangeOffset), [period, rangeOffset]);
  const previousRange = useMemo(() => periodRange(period, rangeOffset + 1), [period, rangeOffset]);
  const current = useMemo(() => summarize(currentRange, sessions, sets, prs), [currentRange, sessions, sets, prs]);
  const previous = useMemo(() => summarize(previousRange, sessions, sets, prs), [previousRange, sessions, sets, prs]);
  const chart = useMemo(() => trendData(currentRange, current, trendFocus), [currentRange, current, trendFocus]);

  const adult = (profileAge(profile) ?? 0) >= 18;
  const previousLabel = period === 'week' ? 'previous week' : 'previous 30 days';
  const topLifts = Array.from(current.bestByExercise.entries()).slice(0, 5);
  const exerciseHighlights = Array.from(current.exerciseSets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const workoutDelta = current.sessions.length - previous.sessions.length;
  const periodTarget = Math.max(1, Number(profile.workout_days_target ?? 3)) * (period === 'month' ? 4 : 1);
  const completionProgress = Math.min(100, current.sessions.length / periodTarget * 100);
  const maxRangeOffset = period === 'week' ? 8 : 1;
  const trendValue = trendDisplayValue(current, trendFocus, distanceUnit);

  const recommendations = useMemo(() => {
    if (!current.sessions.length) {
      return ['No completed workouts are recorded for this period yet. This report will build automatically as sessions are completed.'];
    }
    const items: string[] = [];
    if (current.activeDays > 0) {
      items.push('You trained across ' + current.activeDays + ' active day' + (current.activeDays === 1 ? '' : 's') + '. Rest and flexible scheduling are part of a balanced routine.');
    }
    if (current.exerciseCount > 0) {
      items.push(current.exerciseCount + ' different exercise' + (current.exerciseCount === 1 ? '' : 's') + ' appear in this report. Use the chart to compare the pattern with the ' + previousLabel + '.');
    }
    if (adult && current.prs.length) {
      items.push('Personal records add useful context, while technique, control and recovery remain meaningful signs of progress.');
    }
    if (!adult) {
      items.push('Keep exercise setup and controlled technique as the priority. Ask a qualified adult or coach for help with unfamiliar movements.');
    }
    return items.slice(0, 3);
  }, [adult, current, previousLabel]);

  return (
    <View style={s.page}>
      <View pointerEvents="none" style={s.backgroundGeometry}>
        <ReferenceHomeBackdrop color={colors.primary} accentColor={colors.text} />
      </View>

      <RefreshableScrollView
        onRefresh={load}
        contentContainerStyle={s.wrap}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Pressable
            onPress={onBack}
            style={s.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={s.back}>‹</Text>
          </Pressable>
          <View style={s.headerCopy}>
            <Text style={s.title}>Fitness Journey</Text>
            <Text style={s.sub}>Your private training progress, clearly compared over time.</Text>
          </View>
        </View>

        <View style={s.heroCard}>
          <View pointerEvents="none" style={s.heroGlow} />
          <View style={s.heroCopy}>
            <Text style={s.heroEyebrow}>
              {rangeOffset === 0 ? 'YOUR CURRENT ' + period.toUpperCase() : 'SELECTED ' + period.toUpperCase()}
            </Text>
            <Text style={s.heroTitle}>
              {current.sessions.length} workout{current.sessions.length === 1 ? '' : 's'}
            </Text>
            <Text style={s.heroSub}>
              {formatMinutes(current.duration)} training · {current.activeDays} active day{current.activeDays === 1 ? '' : 's'}
            </Text>
            <View style={s.heroTrack}>
              <View style={[s.heroFill, { width: (completionProgress + '%') as any }]} />
            </View>
            <Text style={s.heroCompare}>
              {workoutDelta === 0
                ? 'Same number as the previous period'
                : (workoutDelta > 0 ? '+' : '') + workoutDelta + ' vs previous'}
            </Text>
          </View>
          <View style={s.heroArtStage}>
            <YouCardArtwork kind="journey" width={compact ? 170 : 194} height={compact ? 142 : 158} />
          </View>
        </View>

        <View style={s.controlsCard}>
          <View style={s.periodSwitch}>
            <PeriodButton
              label="Weekly"
              active={period === 'week'}
              onPress={() => {
                setPeriod('week');
                setRangeOffset(0);
              }}
            />
            <PeriodButton
              label="Monthly"
              active={period === 'month'}
              onPress={() => {
                setPeriod('month');
                setRangeOffset(0);
              }}
            />
          </View>

          <View style={s.controlDivider} />

          <View style={s.rangeRow}>
            <Pressable
              disabled={rangeOffset >= maxRangeOffset}
              onPress={() => setRangeOffset((value) => Math.min(maxRangeOffset, value + 1))}
              style={[s.rangeArrow, rangeOffset >= maxRangeOffset && s.rangeArrowDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Earlier report"
            >
              <FreshChevronIcon size={18} color={colors.text} direction="left" />
            </Pressable>
            <View style={s.rangeCenter}>
              <Text style={s.rangeEyebrow}>{rangeOffset === 0 ? 'CURRENT REPORT' : 'PAST REPORT'}</Text>
              <Text style={s.rangeText}>{formatDateRange(currentRange)}</Text>
            </View>
            <View style={s.privatePill}>
              <Text style={s.privateText}>Only you</Text>
            </View>
            <Pressable
              disabled={rangeOffset === 0}
              onPress={() => setRangeOffset((value) => Math.max(0, value - 1))}
              style={[s.rangeArrow, rangeOffset === 0 && s.rangeArrowDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Newer report"
            >
              <FreshChevronIcon size={18} color={colors.text} direction="right" />
            </Pressable>
          </View>
        </View>

        <View style={s.sectionHeading}>
          <View>
            <Text style={s.sectionEyebrow}>PROGRESS AT A GLANCE</Text>
            <Text style={s.sectionTitle}>Performance overview</Text>
          </View>
          <Text style={s.sectionHint}>Tap a metric to chart it</Text>
        </View>

        <View style={s.overviewCard}>
          <View style={s.overviewHeading}>
            <View style={s.overviewArt}>
              <FitHubSpriteArt source={homeQuickSprites} quadrant={0} size={64} />
            </View>
            <View style={s.overviewHeadingCopy}>
              <Text style={s.overviewEyebrow}>{period === 'week' ? 'THIS WEEK' : 'THIS MONTH'}</Text>
              <Text style={s.overviewTitle}>Your training summary</Text>
              <Text style={s.overviewSub}>Select a metric to explore its pattern below.</Text>
            </View>
          </View>

          <View style={s.metricGrid}>
            <MetricCell
              label="Workouts"
              value={String(current.sessions.length)}
              comparison={comparisonText(current.sessions.length, previous.sessions.length)}
              art={<FitHubSpriteArt source={homeWeekRunSprites} quadrant={0} size={54} />}
              active={trendFocus === 'workouts'}
              onPress={() => setTrendFocus('workouts')}
            />
            <MetricCell
              label="Training time"
              value={formatMinutes(current.duration)}
              comparison={comparisonText(Math.round(current.duration), Math.round(previous.duration), ' min')}
              art={<FitHubSpriteArt source={homeWeekRunSprites} quadrant={1} size={54} />}
              active={trendFocus === 'minutes'}
              onPress={() => setTrendFocus('minutes')}
            />
            <MetricCell
              label="Recorded sets"
              value={String(current.sets.length)}
              comparison={comparisonText(current.sets.length, previous.sets.length)}
              art={<WeightPlateIcon size={32} color={colors.text} accentColor={colors.primary} />}
              active={trendFocus === 'sets'}
              onPress={() => setTrendFocus('sets')}
            />
            <MetricCell
              label="Cardio distance"
              value={formatDistance(current.distance, distanceUnit, 1)}
              comparison={distanceComparison(current.distance, previous.distance, distanceUnit)}
              art={<FitHubSpriteArt source={homeWeekRunSprites} quadrant={2} size={54} />}
              active={trendFocus === 'distance'}
              onPress={() => setTrendFocus('distance')}
            />
          </View>

          <View style={s.overviewFooter}>
            <MiniStat
              icon={<CalendarIcon size={25} color={colors.text} accentColor={colors.primary} />}
              label="Active days"
              value={String(current.activeDays)}
            />
            <View style={s.footerDivider} />
            <MiniStat
              icon={<JourneyIcon size={27} color={colors.text} accentColor={colors.primary} />}
              label="Exercises"
              value={String(current.exerciseCount)}
            />
          </View>
        </View>

        <View style={s.trendCard}>
          <View style={s.trendHeading}>
            <View style={s.trendTitleCopy}>
              <Text style={s.sectionEyebrow}>ACTIVITY TREND</Text>
              <Text style={s.cardTitle}>{trendLabel(trendFocus)} over time</Text>
              <Text style={s.cardSub}>See when your activity was recorded within this report.</Text>
            </View>
            <View style={s.trendValueBox}>
              <Text style={s.trendValue}>{trendValue}</Text>
              <Text style={s.trendValueLabel}>TOTAL</Text>
            </View>
          </View>

          <View style={s.focusRow}>
            {(['workouts', 'minutes', 'sets', 'distance'] as TrendFocus[]).map((focus) => (
              <Pressable
                key={focus}
                onPress={() => setTrendFocus(focus)}
                style={[s.focusPill, trendFocus === focus && s.focusPillActive]}
              >
                <Text style={[s.focusText, trendFocus === focus && s.focusTextActive]}>
                  {trendLabel(focus)}
                </Text>
              </Pressable>
            ))}
          </View>

          <TrendChart values={chart.values} labels={chart.labels} focus={trendFocus} />
        </View>

        <View style={s.sectionHeading}>
          <View>
            <Text style={s.sectionEyebrow}>PERIOD COMPARISON</Text>
            <Text style={s.sectionTitle}>Current vs previous</Text>
          </View>
          <Text style={s.sectionHint}>{formatDateRange(previousRange)}</Text>
        </View>

        <View style={s.compareCard}>
          <View style={s.compareLegend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, s.legendDotCurrent]} />
              <Text style={s.legendText}>Current</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, s.legendDotPrevious]} />
              <Text style={s.legendText}>Previous</Text>
            </View>
          </View>
          <ComparisonBar label="Completed workouts" current={current.sessions.length} previous={previous.sessions.length} />
          <ComparisonBar label="Active days" current={current.activeDays} previous={previous.activeDays} />
          <ComparisonBar label="Training minutes" current={Math.round(current.duration)} previous={Math.round(previous.duration)} />
          <ComparisonBar label="Recorded sets" current={current.sets.length} previous={previous.sets.length} last />
        </View>

        <Card style={s.highlightsCard}>
          <View style={s.cardHeaderWithArt}>
            <View style={s.cardHeaderIcon}>
              {adult
                ? <WeightPlateIcon size={34} color={colors.text} accentColor={colors.primary} />
                : <DumbbellIcon size={31} color={colors.text} />}
            </View>
            <View style={s.cardHeaderCopy}>
              <Text style={s.cardTitle}>{adult ? 'Lift highlights' : 'Exercise highlights'}</Text>
              <Text style={s.cardSub}>
                {adult
                  ? 'Best recorded loads from this report period.'
                  : 'Exercises recorded most often in this report period.'}
              </Text>
            </View>
          </View>

          {adult ? (
            topLifts.length ? (
              topLifts.map(([name, row], index) => (
                <View key={name} style={s.highlightRow}>
                  <View style={s.rankBadge}><Text style={s.rankText}>{index + 1}</Text></View>
                  <Text style={s.rowName}>{name}</Text>
                  <Text style={s.rowValue}>
                    {formatWeight(Number(row.weight_kg), weightUnit)} × {Number(row.reps)}
                  </Text>
                </View>
              ))
            ) : <Text style={s.empty}>No strength sets were recorded in this period.</Text>
          ) : (
            exerciseHighlights.length ? (
              exerciseHighlights.map(([name, count], index) => (
                <View key={name} style={s.highlightRow}>
                  <View style={s.rankBadge}><Text style={s.rankText}>{index + 1}</Text></View>
                  <Text style={s.rowName}>{name}</Text>
                  <Text style={s.rowValue}>{count} set{count === 1 ? '' : 's'}</Text>
                </View>
              ))
            ) : <Text style={s.empty}>No exercise sets were recorded in this period.</Text>
          )}
        </Card>

        {adult ? (
          <Card style={s.improvementsCard}>
            <SectionTitle
              title="Recent improvements"
              subtitle="Personal-record events saved during this report period."
            />
            {current.prs.length ? (
              current.prs.slice(0, 8).map((pr: any, index: number) => (
                <View key={String(pr.achieved_at) + '-' + index} style={s.prRow}>
                  <View style={s.prMark}><Text style={s.prMarkText}>★</Text></View>
                  <View style={s.prCopy}>
                    <Text style={s.rowName}>{pr.exercise_name}</Text>
                    <Text style={s.cardSub}>{prLabel(pr, weightUnit, distanceUnit)}</Text>
                  </View>
                  <Text style={s.date}>{new Date(pr.achieved_at).toLocaleDateString()}</Text>
                </View>
              ))
            ) : <Text style={s.empty}>No new personal-record events are recorded for this period.</Text>}
          </Card>
        ) : null}

        <View style={s.insightCard}>
          <View style={s.insightHeading}>
            <View style={s.insightIcon}>
              <StopwatchIcon size={34} color={colors.text} accentColor={colors.primary} />
            </View>
            <View style={s.insightCopy}>
              <Text style={s.cardTitle}>FitHub insights</Text>
              <Text style={s.cardSub}>Simple observations from your own activity history.</Text>
            </View>
          </View>
          {recommendations.map((item, index) => (
            <View key={index} style={s.insightRow}>
              <View style={s.insightDot} />
              <Text style={s.insightText}>{item}</Text>
            </View>
          ))}
        </View>
      </RefreshableScrollView>
    </View>
  );
}

function PeriodButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const s = styles(colors, isDark, false);
  return (
    <Pressable onPress={onPress} style={[s.periodButton, active && s.periodButtonActive]}>
      <Text style={[s.periodButtonText, active && s.periodButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MetricCell({
  label,
  value,
  comparison,
  art,
  active,
  onPress,
}: {
  label: string;
  value: string;
  comparison: string;
  art: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const s = styles(colors, isDark, false);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.metricCell,
        active && s.metricCellActive,
        pressed && s.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={'Chart ' + label}
    >
      <View style={s.metricCellTop}>
        <View style={s.metricArt}>{art}</View>
        <View style={[s.metricCheck, active && s.metricCheckActive]}>
          <Text style={[s.metricCheckText, active && s.metricCheckTextActive]}>{active ? '✓' : '›'}</Text>
        </View>
      </View>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{value}</Text>
      <Text style={s.metricCompare} numberOfLines={2}>{comparison}</Text>
    </Pressable>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const { colors, isDark } = useTheme();
  const s = styles(colors, isDark, false);
  return (
    <View style={s.miniStat}>
      <View style={s.miniStatIcon}>{icon}</View>
      <View>
        <Text style={s.miniStatValue}>{value}</Text>
        <Text style={s.miniStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

function TrendChart({ values, labels, focus }: { values: number[]; labels: string[]; focus: TrendFocus }) {
  const { colors, isDark } = useTheme();
  const s = styles(colors, isDark, false);
  const width = 320;
  const top = 14;
  const baseline = 118;
  const max = Math.max(1, ...values);
  const step = (width - 28) / Math.max(1, values.length - 1);
  const points = values.map((value, index) => ({
    x: 14 + step * index,
    y: baseline - (Number(value) / max) * (baseline - top),
    value,
  }));
  const linePath = points.map((point, index) => (index ? 'L ' : 'M ') + point.x + ' ' + point.y).join(' ');
  const areaPath = points.length
    ? 'M ' + points[0].x + ' ' + baseline + ' ' + linePath + ' L ' + points[points.length - 1].x + ' ' + baseline + ' Z'
    : '';

  return (
    <View style={s.chartWrap}>
      <Svg width="100%" height={138} viewBox="0 0 320 132">
        <Defs>
          <SvgGradient id="journeyTrendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={isDark ? 0.42 : 0.3} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0.02} />
          </SvgGradient>
        </Defs>
        {[24, 55, 86, 118].map((y) => (
          <Line key={y} x1="14" y1={y} x2="306" y2={y} stroke={colors.border} strokeWidth="1" />
        ))}
        {areaPath ? <Path d={areaPath} fill="url(#journeyTrendFill)" /> : null}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={colors.primary}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={point.value ? 5 : 3}
            fill={point.value ? colors.primary : colors.panel2}
            stroke={point.value ? colors.panel : colors.border}
            strokeWidth="2"
          />
        ))}
      </Svg>
      <View style={s.chartLabels}>
        {labels.map((label, index) => (
          <View key={label + '-' + index} style={s.chartLabelCell}>
            <Text style={s.chartValueText}>{formatChartValue(values[index] ?? 0, focus)}</Text>
            <Text style={s.chartLabelText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ComparisonBar({
  label,
  current,
  previous,
  last = false,
}: {
  label: string;
  current: number;
  previous: number;
  last?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const s = styles(colors, isDark, false);
  const max = Math.max(1, current, previous);
  const delta = current - previous;
  return (
    <View style={[s.compareRow, last && s.compareRowLast]}>
      <View style={s.compareRowHeading}>
        <Text style={s.compareLabel}>{label}</Text>
        <View style={[s.deltaPill, delta === 0 && s.deltaPillNeutral]}>
          <Text style={[s.deltaText, delta === 0 && s.deltaTextNeutral]}>
            {delta > 0 ? '+' + delta : String(delta)}
          </Text>
        </View>
      </View>
      <View style={s.barLine}>
        <Text style={s.barName}>NOW</Text>
        <View style={s.compareTrack}>
          <View style={[s.currentBar, { width: ((current / max) * 100 + '%') as any }]} />
        </View>
        <Text style={s.barNumber}>{current}</Text>
      </View>
      <View style={s.barLine}>
        <Text style={s.barName}>PAST</Text>
        <View style={s.compareTrack}>
          <View style={[s.previousBar, { width: ((previous / max) * 100 + '%') as any }]} />
        </View>
        <Text style={s.barNumber}>{previous}</Text>
      </View>
    </View>
  );
}

function periodRange(period: Period, offset: number): Range {
  const days = period === 'week' ? 7 : 30;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offset * days);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
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
      if (!previous || Number(set.weight_kg) > Number(previous.weight_kg)) {
        bestByExercise.set(name, set);
      }
    }
  });

  return {
    sessions: periodSessions,
    sets: periodSets,
    prs: periodPrs,
    activeDays: new Set(
      periodSessions.map((session) => new Date(session.ended_at ?? session.started_at).toDateString())
    ).size,
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
  const labels = Array.from({ length: bucketCount }, (_, index) =>
    range.days === 7 ? shortWeekday(addDays(range.start, index)) : 'W' + (index + 1)
  );
  const sessionBucket = new Map<string, number>();

  summary.sessions.forEach((session) => {
    const stamp = new Date(session.ended_at ?? session.started_at);
    const bucket = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(dayDifference(stamp, range.start) / bucketDays))
    );
    sessionBucket.set(session.id, bucket);
    if (focus === 'workouts') values[bucket] += 1;
    if (focus === 'minutes') values[bucket] += sessionMinutes(session);
  });

  if (focus === 'sets' || focus === 'distance') {
    summary.sets.forEach((set) => {
      const fallbackBucket = Math.min(
        bucketCount - 1,
        Math.max(0, Math.floor(dayDifference(new Date(set.created_at), range.start) / bucketDays))
      );
      const bucket = sessionBucket.get(set.session_id) ?? fallbackBucket;
      values[bucket] += focus === 'sets' ? 1 : Number(set.distance_km ?? 0);
    });
  }
  return { values, labels };
}

function inRange(value: string | Date, range: Range) {
  const timestamp = new Date(value).getTime();
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function dayDifference(value: Date, start: Date) {
  return (value.getTime() - start.getTime()) / 86400000;
}

function shortWeekday(value: Date) {
  return value.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1).toUpperCase();
}

function sessionMinutes(session: any) {
  const start = new Date(session.started_at).getTime();
  const end = new Date(session.ended_at ?? session.started_at).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

function formatMinutes(value: number) {
  const minutes = Math.round(value);
  if (minutes < 60) return minutes + ' min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? hours + 'h ' + rest + 'm' : hours + 'h';
}

function formatDateRange(range: Range) {
  const start = range.start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const end = range.end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return start + ' – ' + end;
}

function trendLabel(focus: TrendFocus) {
  if (focus === 'workouts') return 'Workouts';
  if (focus === 'minutes') return 'Minutes';
  if (focus === 'sets') return 'Sets';
  return 'Distance';
}

function trendDisplayValue(summary: Summary, focus: TrendFocus, distanceUnit: 'km' | 'mi') {
  if (focus === 'workouts') return String(summary.sessions.length);
  if (focus === 'minutes') return formatMinutes(summary.duration);
  if (focus === 'sets') return String(summary.sets.length);
  return formatDistance(summary.distance, distanceUnit, 1);
}

function formatChartValue(value: number, focus: TrendFocus) {
  return focus === 'distance' ? value.toFixed(value >= 10 ? 0 : 1) : String(Math.round(value));
}

function comparisonText(current: number, previous: number, suffix = '') {
  const difference = current - previous;
  if (!difference) return 'Same as previous';
  return (difference > 0 ? '+' : '') + difference + suffix + ' vs previous';
}

function distanceComparison(current: number, previous: number, distanceUnit: 'km' | 'mi') {
  if (Math.abs(current - previous) < 0.01) return 'Same as previous';
  const formatted = formatDistance(Math.abs(current - previous), distanceUnit, 1);
  return (current > previous ? '+' : '−') + formatted + ' vs previous';
}

function prLabel(pr: any, weightUnit: 'kg' | 'lb', distanceUnit: 'km' | 'mi') {
  if (pr.metric === 'max_weight' || pr.metric === 'reps_at_weight') {
    const kg = pr.unit === 'kg'
      ? Number(pr.value_numeric)
      : Number(pr.details?.weight_kg ?? pr.value_numeric);
    const reps = pr.details?.reps;
    return (pr.metric === 'max_weight' ? 'New max' : 'Rep PR') +
      ' • ' + formatWeight(kg, weightUnit) + (reps ? ' × ' + reps + ' reps' : '');
  }
  if (pr.metric === 'distance') {
    return 'Distance PR • ' + formatDistance(Number(pr.value_numeric), distanceUnit);
  }
  if (pr.metric === 'pace') {
    return 'Pace PR • ' + formatPace(Number(pr.value_numeric), distanceUnit);
  }
  return String(pr.metric).replaceAll('_', ' ') + ' • ' +
    Number(pr.value_numeric).toFixed(1) + ' ' + pr.unit;
}

const styles = (colors: any, isDark: boolean, compact: boolean) => StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backgroundGeometry: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    opacity: isDark ? 0.34 : 0.78,
  },
  wrap: {
    paddingHorizontal: compact ? 14 : 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  back: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '300',
  },
  headerCopy: {
    flex: 1,
    paddingTop: 3,
  },
  title: {
    color: colors.text,
    fontSize: compact ? 27 : 30,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  sub: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  heroCard: {
    minHeight: compact ? 184 : 194,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 13,
    shadowColor: colors.shadow,
    shadowOpacity: isDark ? 0.34 : 0.13,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  heroGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    right: -55,
    bottom: -60,
    backgroundColor: colors.primarySoft,
    opacity: isDark ? 0.38 : 0.8,
  },
  heroCopy: {
    width: compact ? '59%' : '57%',
    paddingLeft: compact ? 15 : 18,
    paddingRight: 5,
    paddingTop: compact ? 18 : 20,
    paddingBottom: 15,
    zIndex: 3,
  },
  heroEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: colors.text,
    fontSize: compact ? 26 : 29,
    lineHeight: compact ? 29 : 32,
    fontWeight: '900',
    letterSpacing: -0.55,
    marginTop: 7,
  },
  heroSub: {
    color: colors.muted,
    fontSize: compact ? 9 : 10,
    lineHeight: 15,
    marginTop: 4,
  },
  heroTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.panel2,
    overflow: 'hidden',
    marginTop: 15,
  },
  heroFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  heroCompare: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 12,
    marginTop: 7,
  },
  heroArtStage: {
    position: 'absolute',
    right: compact ? -31 : -23,
    top: compact ? 21 : 18,
    width: compact ? 171 : 196,
    height: compact ? 143 : 160,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    backgroundColor: '#090D10',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: -4, height: 4 },
    elevation: 4,
  },
  controlsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 10,
    marginBottom: 18,
    shadowColor: colors.shadow,
    shadowOpacity: isDark ? 0.2 : 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  periodSwitch: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel2,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  controlDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  rangeRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rangeArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeArrowDisabled: {
    opacity: 0.25,
  },
  rangeCenter: {
    flex: 1,
    minWidth: 0,
  },
  rangeEyebrow: {
    color: colors.primary,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.55,
  },
  rangeText: {
    color: colors.text,
    fontSize: compact ? 10 : 11,
    fontWeight: '900',
    marginTop: 3,
  },
  privatePill: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: compact ? 7 : 9,
    paddingVertical: 6,
  },
  privateText: {
    color: colors.primary,
    fontSize: 7,
    fontWeight: '900',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
  },
  sectionEyebrow: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: compact ? 19 : 21,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 3,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: '800',
    maxWidth: '39%',
    textAlign: 'right',
  },
  overviewCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOpacity: isDark ? 0.28 : 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  overviewHeading: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: isDark ? colors.panel : colors.primarySoft,
  },
  overviewArt: {
    width: 72,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  overviewHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  overviewEyebrow: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  overviewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  overviewSub: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 9,
    gap: 8,
  },
  metricCell: {
    width: '48.7%',
    minHeight: compact ? 135 : 142,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: 11,
  },
  metricCellActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  metricCellTop: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  metricArt: {
    width: 55,
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCheck: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCheckActive: {
    backgroundColor: colors.primary,
  },
  metricCheckText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '900',
  },
  metricCheckTextActive: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
    marginTop: 4,
  },
  metricValue: {
    color: colors.text,
    fontSize: compact ? 18 : 20,
    fontWeight: '900',
    letterSpacing: -0.25,
    marginTop: 3,
  },
  metricCompare: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: '800',
    lineHeight: 10,
    marginTop: 4,
  },
  overviewFooter: {
    minHeight: 72,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },
  miniStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  miniStatIcon: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStatValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  miniStatLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
  },
  footerDivider: {
    width: 1,
    height: 42,
    backgroundColor: colors.border,
    marginHorizontal: 11,
  },
  trendCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14,
    marginBottom: 18,
    shadowColor: colors.shadow,
    shadowOpacity: isDark ? 0.26 : 0.09,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  trendHeading: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  trendTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.25,
    marginTop: 2,
  },
  cardSub: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  trendValueBox: {
    minWidth: 68,
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  trendValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  trendValueLabel: {
    color: colors.primary,
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  focusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  focusPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 11,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusPillActive: {
    backgroundColor: colors.primary,
  },
  focusText: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: '900',
  },
  focusTextActive: {
    color: '#FFFFFF',
  },
  chartWrap: {
    minHeight: 172,
    borderRadius: 16,
    backgroundColor: isDark ? colors.bg : colors.panel,
    overflow: 'hidden',
    paddingTop: 2,
  },
  chartLabels: {
    flexDirection: 'row',
    paddingHorizontal: 2,
    marginTop: -8,
  },
  chartLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  chartValueText: {
    color: colors.text,
    fontSize: 7,
    fontWeight: '900',
  },
  chartLabelText: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: '800',
    marginTop: 2,
  },
  compareCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
    paddingTop: 12,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOpacity: isDark ? 0.24 : 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  compareLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotCurrent: {
    backgroundColor: colors.primary,
  },
  legendDotPrevious: {
    backgroundColor: colors.muted,
    opacity: 0.45,
  },
  legendText: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: '800',
  },
  compareRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compareRowLast: {
    borderBottomWidth: 0,
  },
  compareRowHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compareLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '900',
    flex: 1,
  },
  deltaPill: {
    minWidth: 35,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  deltaPillNeutral: {
    backgroundColor: colors.panel2,
  },
  deltaText: {
    color: colors.primary,
    fontSize: 7,
    fontWeight: '900',
  },
  deltaTextNeutral: {
    color: colors.muted,
  },
  barLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 5,
  },
  barName: {
    color: colors.muted,
    width: 29,
    fontSize: 6,
    fontWeight: '900',
  },
  compareTrack: {
    flex: 1,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.panel2,
    overflow: 'hidden',
  },
  currentBar: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  previousBar: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.muted,
    opacity: 0.42,
  },
  barNumber: {
    color: colors.text,
    width: 31,
    textAlign: 'right',
    fontSize: 8,
    fontWeight: '900',
  },
  highlightsCard: {
    borderRadius: 22,
    padding: 14,
  },
  cardHeaderWithArt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingBottom: 8,
  },
  cardHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  highlightRow: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  rowName: {
    color: colors.text,
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
  },
  rowValue: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'right',
  },
  empty: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    paddingVertical: 10,
  },
  improvementsCard: {
    borderRadius: 22,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prMark: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prMarkText: {
    color: colors.gold,
    fontSize: 18,
  },
  prCopy: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    color: colors.muted,
    fontSize: 7,
  },
  insightCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: isDark ? colors.panel : colors.primarySoft,
    padding: 14,
    marginBottom: 8,
  },
  insightHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 12,
  },
  insightIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCopy: {
    flex: 1,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 9,
  },
  insightDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  insightText: {
    color: colors.text,
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.72,
  },
});

