import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { contrastText, RefreshableScrollView, useTheme } from '../../components/UI';
import {
  ReferenceBellIcon, ReferenceChevronIcon, ReferenceCommunityIcon,
  ReferenceHomeBackdrop, ReferenceJourneyIcon, ReferenceNutritionIcon,
  ReferenceRunMetricsIcon, ReferenceSettingsIcon, ReferenceSupplementsIcon,
  ReferenceWeekActiveIcon, ReferenceWeekWorkoutsIcon,
} from '../../components/FitHubReferenceIcons';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export type HomeProgressFocus = 'overview' | 'prs' | 'badges' | 'streaks';
export type DailyActivityFocus = 'volume' | 'energy';

type Props = {
  profile: Profile;
  onStartWorkout: () => void;
  onViewWorkouts: (sessionId?: string) => void;
  onOpenJourney: (period?: 'week' | 'month') => void;
  onOpenSupplements: () => void;
  onOpenFood: () => void;
  onOpenFriends: () => void;
  onOpenSettings: () => void;
  onOpenSplit: () => void;
  onOpenChallenges: () => void;
  onOpenRunMetrics: () => void;
  onOpenNotifications: () => void;
  unreadNotifications: number;
};

const groupArt = {
  male: {
    chest: require('../../../assets/train_v4/groups/male/chest.png'), back: require('../../../assets/train_v4/groups/male/back.png'), shoulders: require('../../../assets/train_v4/groups/male/shoulders.png'), arms: require('../../../assets/train_v4/groups/male/arms.png'), legs: require('../../../assets/train_v4/groups/male/legs.png'), core: require('../../../assets/train_v4/groups/male/core.png'), full_body: require('../../../assets/train_v4/groups/male/full_body.png'), cardio: require('../../../assets/train_v4/groups/male/cardio.png'), rest: require('../../../assets/home/rest_day_male_v2.png'),
  },
  female: {
    chest: require('../../../assets/train_v4/groups/female/chest.png'), back: require('../../../assets/train_v4/groups/female/back.png'), shoulders: require('../../../assets/train_v4/groups/female/shoulders.png'), arms: require('../../../assets/train_v4/groups/female/arms.png'), legs: require('../../../assets/train_v4/groups/female/legs.png'), core: require('../../../assets/train_v4/groups/female/core.png'), full_body: require('../../../assets/train_v4/groups/female/full_body.png'), cardio: require('../../../assets/train_v4/groups/female/cardio.png'), rest: require('../../../assets/home/rest_day_female_v2.png'),
  },
} as const;

const approvedPushEquipment = require('../../../assets/home/todays_plan_equipment_v2.png');

type WeekDay = { label: string; date: Date; completed: boolean; today: boolean };

export default function DashboardTabV2({ profile, onStartWorkout, onViewWorkouts, onOpenJourney, onOpenSupplements, onOpenFood, onOpenFriends, onOpenSettings, onOpenSplit, onOpenChallenges, onOpenRunMetrics, onOpenNotifications, unreadNotifications }: Props) {
  const { colors, hiddenFeatures, isDark } = useTheme();
  const compact = useWindowDimensions().width < 390;
  const styles = createStyles(colors, isDark, compact);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [todayPlan, setTodayPlan] = useState<string | null>(null);
  const [todayPlanDetails, setTodayPlanDetails] = useState<any>(null);
  const [homeFriends, setHomeFriends] = useState<any[]>([]);
  const [homeActivities, setHomeActivities] = useState<any[]>([]);
  const [dayKey, setDayKey] = useState(new Date().toDateString());

  useEffect(() => {
    const timer = setInterval(() => {
      const next = new Date().toDateString();
      setDayKey((previous) => previous === next ? previous : next);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const load = async () => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const [sessionRes, splitRes, friendRes, feedRes] = await Promise.all([
      supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).gte('ended_at', weekStart.toISOString()).order('ended_at', { ascending: false }).limit(100),
      supabase.from('workout_split_days').select('day_of_week,label,details').eq('user_id', profile.id),
      supabase.rpc('get_my_friends'),
      supabase.rpc('get_friend_feed_v3'),
    ]);
    const sessions = sessionRes.data ?? [];
    const splitDays = splitRes.data ?? [];
    const todaySplit = splitDays.find((day: any) => Number(day.day_of_week) === now.getDay());
    setTodayPlan(todaySplit?.label ?? null);
    setTodayPlanDetails(todaySplit?.details ?? null);
    setHomeFriends((friendRes.data ?? []).slice(0, 3));
    setHomeActivities((feedRes.data ?? []).slice(0, 4));
    setWeekWorkouts(sessions.length);
    setWeekMinutes(sessions.reduce((total: number, session: any) => total + sessionMinutes(session), 0));
    const completedKeys = new Set(sessions.map((session: any) => localDateKey(new Date(session.ended_at ?? session.started_at))));
    setWeekDays(Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return { label: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][index], date, completed: completedKeys.has(localDateKey(date)), today: localDateKey(date) === localDateKey(now) };
    }));
  };

  useEffect(() => { load(); }, [profile.id, profile.tokens, dayKey]);

  const firstName = titleCase(profile.username?.split(/[_\s]/)[0] || 'Athlete');
  const workoutTitle = todayPlan || 'Choose Today’s Workout';
  const restDay = /rest|recovery|off day/i.test(workoutTitle);
  const gender = profile.gender === 'female' ? 'female' : 'male';
  const artKey = restDay ? 'rest' : artKeyForPlan(workoutTitle);
  const heroImage = !restDay && artKey === 'chest' ? approvedPushEquipment : groupArt[gender][artKey];
  const equipmentHero = heroImage === approvedPushEquipment;
  const heroMeta = useMemo(() => planMeta(workoutTitle, todayPlanDetails, restDay), [workoutTitle, todayPlanDetails, restDay]);

  return <View style={styles.page}>
    <View pointerEvents="none" style={styles.backgroundGeometry}><ReferenceHomeBackdrop color={colors.primary} accentColor={colors.text}/></View>
    <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
      <View style={styles.identityRow}>
        <View style={styles.profileCircle}>{profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.profileImage}/> : <Text style={styles.profileInitial}>{firstName[0]}</Text>}<View style={styles.onlineDot}/></View>
        <View style={styles.identityCopy}><Text style={styles.greeting}>{greetingForHour(new Date().getHours())}</Text></View>
        <Pressable onPress={onOpenNotifications} hitSlop={4} style={styles.headerIcon} accessibilityRole="button" accessibilityLabel={unreadNotifications ? `${unreadNotifications} new notifications` : 'Notifications, no new notifications'}><ReferenceBellIcon size={29} color={colors.text}/>{unreadNotifications ? <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text></View> : null}</Pressable>
        <Pressable onPress={onOpenSettings} hitSlop={4} style={styles.headerIcon} accessibilityRole="button" accessibilityLabel="Settings"><ReferenceSettingsIcon size={29} color={colors.text} accentColor={colors.primary}/></Pressable>
      </View>

      <View style={styles.heroCard}>
        <View pointerEvents="none" style={styles.heroGlow}/>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>TODAY’S PLAN</Text>
          <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>{workoutTitle}</Text>
          <Text style={styles.heroMeta} numberOfLines={2}>{heroMeta}</Text>
          <Pressable onPress={restDay ? onOpenSplit : onStartWorkout} hitSlop={3} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]} accessibilityRole="button"><Text style={[styles.primaryActionText, { color: contrastText(colors.primary) }]}>{restDay ? 'VIEW RECOVERY' : 'START WORKOUT'}</Text><ReferenceChevronIcon size={18} color={contrastText(colors.primary)}/></Pressable>
          <Pressable onPress={onOpenSplit} hitSlop={6} style={({ pressed }) => [styles.planAction, pressed && styles.pressed]} accessibilityRole="button"><Text style={styles.planActionText}>{restDay ? 'Recovery details' : 'View plan'}</Text><ReferenceChevronIcon size={16} color={colors.primary}/></Pressable>
        </View>
        <Image source={heroImage} style={[styles.heroImage, restDay && styles.restHeroImage, equipmentHero && styles.equipmentHeroImage]} accessibilityIgnoresInvertColors/>
      </View>

      <Pressable onPress={() => onViewWorkouts()} style={({ pressed }) => [styles.weekCard, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Open workout calendar and add a past workout">
        <Text style={styles.weekCardHeading}>YOUR WEEK</Text>
        <View style={styles.weekCalendar}>{weekDays.map((day) => <View key={day.label} style={styles.weekCell}><View style={[styles.weekCellInner, day.today && styles.weekCellToday]}><Text style={[styles.weekDay, day.today && styles.weekDayToday]}>{day.label}</Text><Text style={[styles.weekDate, day.today && styles.weekDateToday]}>{day.date.getDate()}</Text><View style={[styles.weekRing, day.completed && styles.weekRingDone, day.today && !day.completed && styles.weekRingToday]}><Text style={[styles.weekMark, day.completed && styles.weekMarkDone]}>{day.completed ? '✓' : day.today ? '•' : ''}</Text></View></View></View>)}</View>
        <View style={styles.weekProgressRow}>
          <WeekMetric compact={compact} divider value={`${weekWorkouts}`} label="workouts" icon={<ReferenceWeekWorkoutsIcon size={38} color={colors.text} accentColor={colors.primary}/>}/>
          <WeekMetric compact={compact} value={`${weekMinutes}`} label="active min" icon={<ReferenceWeekActiveIcon size={38} color={colors.text} accentColor={colors.primary}/>}/>
        </View>
      </Pressable>

      <Text style={styles.sectionHeading}>QUICK ACCESS</Text>
      <View style={styles.quickGrid}>
        {!hiddenFeatures.includes('journey') ? <QuickTile compact={compact} icon={<ReferenceJourneyIcon size={46} color={colors.text} accentColor={colors.primary}/>} label="Journey" onPress={() => onOpenJourney('week')}/> : null}
        {!hiddenFeatures.includes('food') ? <QuickTile compact={compact} icon={<ReferenceNutritionIcon size={46} color={colors.text} accentColor={colors.primary}/>} label="Nutrition" onPress={onOpenFood}/> : null}
        {!hiddenFeatures.includes('supplements') ? <QuickTile compact={compact} icon={<ReferenceSupplementsIcon size={46} color={colors.text} accentColor={colors.primary}/>} label="Supplements" onPress={onOpenSupplements}/> : null}
        <QuickTile compact={compact} icon={<ReferenceCommunityIcon size={46} color={colors.text} accentColor={colors.primary}/>} label="Community Challenges" onPress={onOpenChallenges}/>
        <QuickTile compact={compact} wide icon={<ReferenceRunMetricsIcon size={48} color={colors.text} accentColor={colors.primary}/>} label="Run Metrics" onPress={onOpenRunMetrics}/>
      </View>

      <View style={styles.sectionHeadingRow}><Text style={styles.sectionHeading}>FRIEND FEED</Text><Text style={styles.sectionHint}>RECENT ACTIVITY</Text></View>
      <Pressable onPress={onOpenFriends} style={({ pressed }) => [styles.feedCard, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Open friend activity">
        {(homeActivities.length ? homeActivities.slice(0, 1) : homeFriends.slice(0, 1)).map((item: any, index: number) => <ActivityRow key={item.id ?? item.user_id ?? index} item={item}/>) }
        {!homeActivities.length && !homeFriends.length ? <Text style={styles.feedEmpty}>Add friends to see their latest workouts here.</Text> : null}
      </Pressable>
    </RefreshableScrollView>
  </View>;
}

function WeekMetric({ compact, value, label, icon, divider = false }: { compact: boolean; value: string; label: string; icon: React.ReactNode; divider?: boolean }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark, compact);
  return <View style={[styles.weekMetric, divider && styles.weekMetricDivider]}><View style={styles.weekMetricIcon}>{icon}</View><Text style={styles.weekMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{value}</Text><Text style={styles.weekMetricLabel} numberOfLines={1}>{label}</Text></View>;
}

function QuickTile({ compact, icon, label, onPress, wide = false }: { compact: boolean; icon: React.ReactNode; label: string; onPress: () => void; wide?: boolean }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark, compact);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.quickTile, wide && styles.quickTileWide, pressed && styles.pressed]}><View style={styles.quickIconStage}>{icon}</View><View style={styles.quickCopy}><Text style={styles.quickLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>{label}</Text></View><View style={styles.quickArrow}><ReferenceChevronIcon size={18} color={colors.muted}/></View></Pressable>;
}

function ActivityRow({ item, showDivider = false }: { item: any; showDivider?: boolean }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark, false);
  const username = String(item.username ?? 'Friend');
  return <View style={[styles.activityRow, showDivider && styles.activityDivider]}><View style={styles.activityAvatar}>{item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.friendAvatar}/> : <Text style={styles.friendInitial}>{username[0]?.toUpperCase()}</Text>}<View style={[styles.activityDot, { backgroundColor: item.summary ? colors.primary : colors.gold }]}/></View><Text style={styles.activityText} numberOfLines={2}><Text style={styles.activityName}>{username}{'\n'}</Text>{item.summary ? `Completed ${sessionTitle(item.summary)}` : 'Ready to train'}{item.created_at ? <Text style={styles.activityTime}>  {relativeTime(item.created_at)}</Text> : null}</Text><View style={styles.reactionTarget}><ReferenceWeekWorkoutsIcon size={28} color={colors.text} accentColor={colors.primary}/></View></View>;
}

function startOfWeek(date: Date) { const value = new Date(date); value.setHours(0, 0, 0, 0); const day = value.getDay(); value.setDate(value.getDate() - (day === 0 ? 6 : day - 1)); return value; }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function sessionMinutes(session: any) { const start = new Date(session.started_at).getTime(); const end = new Date(session.ended_at ?? session.started_at).getTime(); return Math.max(0, Math.round((end - start) / 60000)); }
function greetingForHour(hour: number) { return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }
function titleCase(value: string) { return value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : 'Athlete'; }
function sessionTitle(summary?: string | null) { if (!summary) return 'Workout'; const names = summary.split(',').map((value) => value.trim()).filter(Boolean); return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0] || 'Workout'; }
function relativeTime(value: string) { const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }

function artKeyForPlan(label: string): Exclude<keyof typeof groupArt.male, 'rest'> {
  const value = label.toLowerCase();
  if (/cardio|run|walk|cycle|conditioning/.test(value)) return 'cardio';
  if (/leg|lower|glute|quad|hamstring/.test(value)) return 'legs';
  if (/pull|back|lat/.test(value)) return 'back';
  if (/push|chest|bench/.test(value)) return 'chest';
  if (/upper/.test(value)) return 'full_body';
  if (/shoulder|delt/.test(value)) return 'shoulders';
  if (/arm|bicep|tricep/.test(value)) return 'arms';
  if (/core|ab/.test(value)) return 'core';
  return 'full_body';
}

function planMeta(label: string, details: any, restDay: boolean) {
  if (restDay) return 'Recovery, mobility and time to recharge';
  const value = label.toLowerCase();
  if (/push/.test(value)) return 'Chest, shoulders & triceps';
  if (/pull/.test(value)) return 'Back & biceps';
  if (/leg|lower|glute/.test(value)) return 'Quads, hamstrings & glutes';
  if (/upper/.test(value)) return 'Upper-body strength';
  if (/cardio|run|conditioning/.test(value)) return 'Cardio, pace & conditioning';
  if (typeof details === 'string' && details.trim()) { try { return planMeta(label, JSON.parse(details), false); } catch { return details.trim(); } }
  if (Array.isArray(details)) return `${details.length} exercise${details.length === 1 ? '' : 's'} · Review before starting`;
  if (details && typeof details === 'object') { const items = Array.isArray(details.exercises) ? details.exercises.length : Number(details.exercise_count ?? 0); const duration = Number(details.duration_min ?? details.minutes ?? 0); if (items || duration) return `${items ? `${items} exercise${items === 1 ? '' : 's'}` : 'Planned workout'}${duration ? ` · ~${duration} min` : ''}`; }
  return 'Review exercises, sets and session details';
}

const createStyles = (colors: any, isDark: boolean, compact: boolean) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  wrap: { paddingHorizontal: compact ? 14 : 16, paddingTop: 14, paddingBottom: 92 },
  backgroundGeometry: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', opacity: isDark ? .38 : 1 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  profileCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1.5, borderColor: colors.primary },
  profileImage: { width: 41, height: 41, borderRadius: 21 },
  profileInitial: { color: colors.text, fontSize: 16, fontWeight: '900' },
  onlineDot: { position: 'absolute', right: -1, bottom: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#19C58B', borderWidth: 2, borderColor: colors.bg },
  identityCopy: { flex: 1, minWidth: 0 },
  greeting: { color: colors.text, fontSize: compact ? 15 : 16, fontWeight: '900' },
  headerIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  alertBadge: { position: 'absolute', right: 0, top: 0, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.bg },
  alertBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  heroCard: { minHeight: compact ? 180 : 190, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, overflow: 'hidden', position: 'relative', marginBottom: 14, shadowColor: colors.shadow, shadowOpacity: isDark ? .3 : .12, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  heroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -42, bottom: -55, backgroundColor: colors.primarySoft, opacity: .72 },
  heroCopy: { width: compact ? '51%' : '50%', paddingHorizontal: compact ? 14 : 17, paddingTop: 14, paddingBottom: 10, zIndex: 3 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: .55 },
  heroTitle: { color: colors.text, fontSize: compact ? 25 : 28, lineHeight: compact ? 28 : 31, fontWeight: '900', marginTop: 5, letterSpacing: -.4 },
  heroMeta: { color: colors.muted, fontSize: compact ? 10 : 11, lineHeight: 15, marginTop: 2, minHeight: 18 },
  primaryAction: { minHeight: 43, borderRadius: 11, backgroundColor: colors.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 8 },
  primaryActionText: { fontSize: compact ? 10 : 11, fontWeight: '900', letterSpacing: .2 },
  planAction: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingHorizontal: 1, alignSelf: 'flex-start' },
  planActionText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  heroImage: { position: 'absolute', width: '48%', height: '91%', right: -2, bottom: -1, resizeMode: 'contain', backgroundColor: 'transparent' },
  equipmentHeroImage: { width: compact ? '60%' : '59%', height: compact ? '88%' : '90%', right: compact ? -18 : -12, bottom: -2 },
  restHeroImage: { width: compact ? '49%' : '53%', right: compact ? -20 : -24, bottom: -4 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 },
  sectionHeading: { color: colors.text, fontSize: compact ? 15 : 16, fontWeight: '900', letterSpacing: .2, marginTop: 8, marginBottom: 8 },
  sectionHint: { color: colors.muted, fontSize: 8, fontWeight: '700', marginBottom: 9 },
  weekCard: { borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: compact ? 11 : 14, paddingTop: 11, paddingBottom: 7, marginBottom: 12, shadowColor: colors.shadow, shadowOpacity: isDark ? .27 : .11, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  weekCardHeading: { color: colors.text, fontSize: compact ? 15 : 16, fontWeight: '900', letterSpacing: .2, marginBottom: 5, paddingLeft: 2 },
  weekCalendar: { flexDirection: 'row', justifyContent: 'space-between', gap: 1 },
  weekCell: { flex: 1, minWidth: 0, minHeight: 67, alignItems: 'center' },
  weekCellInner: { width: compact ? 38 : 42, minHeight: 67, paddingTop: 4, borderRadius: 18, alignItems: 'center' },
  weekCellToday: { backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary },
  weekDay: { color: colors.muted, fontSize: compact ? 7 : 8, fontWeight: '900' },
  weekDayToday: { color: colors.primary },
  weekDate: { color: colors.muted, fontSize: 10, marginTop: 2 },
  weekDateToday: { color: colors.text, fontWeight: '900' },
  weekRing: { width: 29, height: 29, borderRadius: 15, borderWidth: 1.4, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  weekRingDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekRingToday: { borderColor: colors.primary, borderWidth: 2 },
  weekMark: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  weekMarkDone: { color: contrastText(colors.primary) },
  weekProgressRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8, paddingBottom: 2 },
  weekMetric: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: compact ? 5 : 10 },
  weekMetricDivider: { borderRightWidth: 1, borderRightColor: colors.border },
  weekMetricIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: compact ? 4 : 8 },
  weekMetricValue: { color: colors.text, fontSize: compact ? 20 : 22, fontWeight: '900', marginRight: 5 },
  weekMetricLabel: { color: colors.muted, fontSize: compact ? 8 : 9, fontWeight: '800', flex: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 11 },
  quickTile: { width: compact ? '48.7%' : '48.8%', minHeight: 70, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: compact ? 8 : 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', shadowColor: colors.shadow, shadowOpacity: isDark ? .2 : .09, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  quickTileWide: { width: '100%', minHeight: 58 },
  quickIconStage: { width: compact ? 54 : 58, height: 56, alignItems: 'center', justifyContent: 'center' },
  quickCopy: { flex: 1, minWidth: 0 },
  quickLabel: { color: colors.text, fontSize: compact ? 11 : 12, lineHeight: 15, fontWeight: '900', paddingRight: 18 },
  quickArrow: { position: 'absolute', right: 4, top: 0, bottom: 0, width: 28, alignItems: 'center', justifyContent: 'center' },
  feedCard: { minHeight: 62, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: 12, paddingVertical: 3, marginBottom: 7, shadowColor: colors.shadow, shadowOpacity: isDark ? .2 : .1, shadowRadius: 8, elevation: 3 },
  activityRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 4 },
  activityDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  activityAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: colors.primary },
  friendAvatar: { width: '100%', height: '100%', borderRadius: 999 },
  friendInitial: { color: colors.text, fontWeight: '900' },
  activityDot: { position: 'absolute', right: -1, bottom: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.panel },
  activityText: { color: colors.muted, fontSize: 9, lineHeight: 13, flex: 1 },
  activityName: { color: colors.text, fontSize: 11, fontWeight: '900' },
  activityTime: { color: colors.muted, fontSize: 8 },
  reactionTarget: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  feedEmpty: { color: colors.muted, fontSize: 10, lineHeight: 15, paddingVertical: 16 },
  pressed: { opacity: .68, transform: [{ scale: .99 }] },
});
