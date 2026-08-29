import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { contrastText, RefreshableScrollView, useTheme } from '../../components/UI';
import {
  ReferenceBellIcon, ReferenceChevronIcon, ReferenceCommunityIcon,
  ReferenceFeedIcon, ReferenceHeartIcon, ReferenceJourneyIcon,
  ReferenceNutritionIcon, ReferencePlayIcon, ReferenceRunMetricsIcon,
  ReferenceSettingsIcon, ReferenceSupplementsIcon, ReferenceWeekActiveIcon,
  ReferenceWeekWorkoutsIcon,
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

const approvedPushEquipment = require('../../../assets/home/todays_plan_equipment_v1.png');

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
  const heroMeta = useMemo(() => planMeta(todayPlanDetails, restDay), [todayPlanDetails, restDay]);

  return <View style={styles.page}>
    <View pointerEvents="none" style={styles.backgroundGeometry}><View style={styles.backgroundGlowOne}/><View style={styles.backgroundGlowTwo}/><View style={styles.backgroundSlashOne}/></View>
    <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
      <View style={styles.identityRow}>
        <View style={styles.profileCircle}>{profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.profileImage}/> : <Text style={styles.profileInitial}>{firstName[0]}</Text>}<View style={styles.onlineDot}/></View>
        <View style={styles.identityCopy}><Text style={styles.greeting}>{greetingForHour(new Date().getHours())}</Text></View>
        <Pressable onPress={onOpenNotifications} style={styles.headerIcon} accessibilityRole="button" accessibilityLabel={unreadNotifications ? `${unreadNotifications} new notifications` : 'Notifications, no new notifications'}><ReferenceBellIcon size={29} color={colors.text}/>{unreadNotifications ? <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text></View> : null}</Pressable>
        <Pressable onPress={onOpenSettings} style={styles.headerIcon} accessibilityRole="button" accessibilityLabel="Settings"><ReferenceSettingsIcon size={29} color={colors.text} accentColor={colors.primary}/></Pressable>
      </View>

      <View style={styles.heroCard}>
        <View pointerEvents="none" style={styles.heroGlow}/>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>TODAY’S PLAN</Text>
          <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>{workoutTitle}</Text>
          <Text style={styles.heroMeta} numberOfLines={2}>{heroMeta}</Text>
          <Pressable onPress={restDay ? onOpenSplit : onStartWorkout} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]} accessibilityRole="button"><ReferencePlayIcon size={19} color={contrastText(colors.primary)}/><Text style={[styles.primaryActionText, { color: contrastText(colors.primary) }]}>{restDay ? 'VIEW RECOVERY' : 'START WORKOUT'}</Text></Pressable>
          <Pressable onPress={onOpenSplit} hitSlop={3} style={({ pressed }) => [styles.planAction, pressed && styles.pressed]} accessibilityRole="button"><Text style={styles.planActionText}>{restDay ? 'Recovery details' : 'View plan'}</Text><ReferenceChevronIcon size={17} color={colors.text}/></Pressable>
        </View>
        <Image source={heroImage} style={[styles.heroImage, restDay && styles.restHeroImage, equipmentHero && styles.equipmentHeroImage]} accessibilityIgnoresInvertColors/>
      </View>

      <View style={styles.sectionHeadingRow}><Text style={styles.sectionHeading}>YOUR WEEK</Text></View>
      <Pressable onPress={() => onViewWorkouts()} style={({ pressed }) => [styles.weekCard, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Open workout calendar and add a past workout">
        <View style={styles.weekCalendar}>{weekDays.map((day) => <View key={day.label} style={[styles.weekCell, day.today && styles.weekCellToday]}><Text style={[styles.weekDay, day.today && styles.weekDayToday]}>{day.label}</Text><Text style={[styles.weekDate, day.today && styles.weekDateToday]}>{day.date.getDate()}</Text><View style={[styles.weekRing, day.completed && styles.weekRingDone, day.today && !day.completed && styles.weekRingToday]}><Text style={[styles.weekMark, day.completed && styles.weekMarkDone]}>{day.completed ? '✓' : day.today ? '•' : ''}</Text></View></View>)}</View>
        <View style={styles.weekProgressRow}>
          <WeekMetric compact={compact} value={`${weekWorkouts}`} label="workouts" icon={<ReferenceWeekWorkoutsIcon size={39} color={colors.text} accentColor={colors.primary}/>}/>
          <WeekMetric compact={compact} value={`${weekMinutes}`} label="active min" icon={<ReferenceWeekActiveIcon size={39} color={colors.text} accentColor={colors.primary}/>}/>
        </View>
      </Pressable>

      <Text style={styles.sectionHeading}>QUICK ACCESS</Text>
      <View style={styles.quickGrid}>
        {!hiddenFeatures.includes('journey') ? <QuickTile compact={compact} icon={<ReferenceJourneyIcon size={52} color={colors.text} accentColor={colors.primary}/>} label="Journey" onPress={() => onOpenJourney('week')}/> : null}
        {!hiddenFeatures.includes('food') ? <QuickTile compact={compact} icon={<ReferenceNutritionIcon size={52} color={colors.text} accentColor={colors.primary}/>} label="Nutrition" onPress={onOpenFood}/> : null}
        {!hiddenFeatures.includes('supplements') ? <QuickTile compact={compact} icon={<ReferenceSupplementsIcon size={52} color={colors.text} accentColor={colors.primary}/>} label="Supplements" onPress={onOpenSupplements}/> : null}
        <QuickTile compact={compact} icon={<ReferenceCommunityIcon size={52} color={colors.text} accentColor={colors.primary}/>} label="Community Challenges" onPress={onOpenChallenges}/>
        <QuickTile compact={compact} wide icon={<ReferenceRunMetricsIcon size={54} color={colors.text} accentColor={colors.primary}/>} label="Run Metrics" onPress={onOpenRunMetrics}/>
      </View>

      <View style={styles.sectionHeadingRow}><Text style={styles.sectionHeading}>FRIEND FEED</Text><Text style={styles.sectionHint}>RECENT ACTIVITY</Text></View>
      <Pressable onPress={onOpenFriends} style={({ pressed }) => [styles.feedCard, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Open friend activity">
        {(homeActivities.length ? homeActivities.slice(0, 3) : homeFriends.slice(0, 3)).map((item: any, index: number, items: any[]) => <ActivityRow key={item.id ?? item.user_id ?? index} item={item} showDivider={index < items.length - 1}/>) }
        {!homeActivities.length && !homeFriends.length ? <Text style={styles.feedEmpty}>Add friends to see their latest workouts here.</Text> : null}
        <View style={styles.openFeedRow}><ReferenceFeedIcon size={21} color={colors.text} accentColor={colors.primary}/><Text style={styles.feedLink}>View all friend activity</Text><ReferenceChevronIcon size={17} color={colors.text}/></View>
      </Pressable>
    </RefreshableScrollView>
  </View>;
}

function WeekMetric({ compact, value, label, icon }: { compact: boolean; value: string; label: string; icon: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark, compact);
  return <View style={styles.weekMetric}><View style={styles.weekMetricIcon}>{icon}</View><Text style={styles.weekMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{value}</Text><Text style={styles.weekMetricLabel} numberOfLines={1}>{label}</Text></View>;
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
  return <View style={[styles.activityRow, showDivider && styles.activityDivider]}><View style={styles.activityAvatar}>{item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.friendAvatar}/> : <Text style={styles.friendInitial}>{username[0]?.toUpperCase()}</Text>}<View style={[styles.activityDot, { backgroundColor: item.summary ? colors.primary : colors.gold }]}/></View><Text style={styles.activityText} numberOfLines={2}><Text style={styles.activityName}>{username} </Text>{item.summary ? `finished ${sessionTitle(item.summary)}` : 'is ready to train'}{item.created_at ? <Text style={styles.activityTime}>  {relativeTime(item.created_at)}</Text> : null}</Text><View style={styles.reactionTarget}><ReferenceHeartIcon size={23} color={colors.muted} accentColor={colors.primary}/></View></View>;
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

function planMeta(details: any, restDay: boolean) {
  if (restDay) return 'Recovery, mobility and time to recharge';
  if (typeof details === 'string' && details.trim()) { try { return planMeta(JSON.parse(details), false); } catch { return details.trim(); } }
  if (Array.isArray(details)) return `${details.length} exercise${details.length === 1 ? '' : 's'} · Review before starting`;
  if (details && typeof details === 'object') { const items = Array.isArray(details.exercises) ? details.exercises.length : Number(details.exercise_count ?? 0); const duration = Number(details.duration_min ?? details.minutes ?? 0); if (items || duration) return `${items ? `${items} exercise${items === 1 ? '' : 's'}` : 'Planned workout'}${duration ? ` · ~${duration} min` : ''}`; }
  return 'Review exercises, sets and session details';
}

const createStyles = (colors: any, isDark: boolean, compact: boolean) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg }, wrap: { paddingHorizontal: compact ? 13 : 16, paddingTop: 15, paddingBottom: 96 },
  backgroundGeometry: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }, backgroundGlowOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -100, top: 50, backgroundColor: colors.primarySoft, opacity: isDark ? .5 : .36 }, backgroundGlowTwo: { position: 'absolute', width: 230, height: 230, borderRadius: 115, left: -130, top: 610, backgroundColor: colors.blueSoft, opacity: .35 }, backgroundSlashOne: { position: 'absolute', width: 560, height: 2, backgroundColor: colors.primary, opacity: isDark ? .25 : .11, transform: [{ rotate: '-34deg' }], left: -110, top: 510 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 }, profileCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: colors.primary }, profileImage: { width: 46, height: 46, borderRadius: 23 }, profileInitial: { color: colors.text, fontSize: 17, fontWeight: '900' }, onlineDot: { position: 'absolute', right: -1, bottom: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#19C58B', borderWidth: 2, borderColor: colors.bg }, identityCopy: { flex: 1, minWidth: 0 }, greeting: { color: colors.text, fontSize: 15, fontWeight: '900' },
  headerIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative' }, alertBadge: { position: 'absolute', right: 2, top: 2, minWidth: 10, height: 10, borderRadius: 5, paddingHorizontal: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.bg }, alertBadgeText: { color: 'transparent', fontSize: 0 },
  heroCard: { minHeight: compact ? 226 : 242, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, overflow: 'hidden', position: 'relative', marginBottom: 21, shadowColor: colors.shadow, shadowOpacity: isDark ? .3 : .13, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 }, heroGlow: { position: 'absolute', width: 230, height: 230, borderRadius: 115, right: -45, bottom: -70, backgroundColor: colors.primarySoft, opacity: .9 }, heroCopy: { width: compact ? '63%' : '60%', padding: compact ? 15 : 19, zIndex: 3 }, eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: .8 }, heroTitle: { color: colors.text, fontSize: compact ? 25 : 29, lineHeight: compact ? 28 : 32, fontWeight: '900', marginTop: 7, letterSpacing: -.4 }, heroMeta: { color: colors.text, fontSize: 11, lineHeight: 16, marginTop: 4, minHeight: 30 }, primaryAction: { minHeight: 50, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, marginTop: 9 }, primaryActionText: { fontSize: 11, fontWeight: '900', letterSpacing: .2 }, planAction: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, paddingHorizontal: 1, alignSelf: 'flex-start' }, planActionText: { color: colors.text, fontSize: 10, fontWeight: '900' }, heroImage: { position: 'absolute', width: compact ? '45%' : '47%', height: '91%', right: -2, bottom: -1, resizeMode: 'contain', backgroundColor: 'transparent' }, equipmentHeroImage: { width: compact ? '57%' : '58%', height: compact ? '74%' : '78%', right: compact ? -10 : -7, bottom: 7 }, restHeroImage: { width: compact ? '50%' : '56%', right: compact ? -22 : -28, bottom: -5 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginTop: 3, marginBottom: 10 }, sectionHeading: { color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: .3, marginTop: 8, marginBottom: 10 }, sectionHint: { color: colors.muted, fontSize: 8, fontWeight: '700', marginBottom: 11 }, weekHeadline: { color: colors.muted, fontSize: 10, marginBottom: 11, flexShrink: 1, textAlign: 'right' },
  weekCard: { borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: compact ? 11 : 14, paddingTop: 14, paddingBottom: 9, marginBottom: 22, shadowColor: colors.shadow, shadowOpacity: isDark ? .27 : .12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, weekCalendar: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 }, weekCell: { flex: 1, minWidth: 0, minHeight: 74, paddingTop: 7, borderRadius: 18, alignItems: 'center' }, weekCellToday: { backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary }, weekDay: { color: colors.muted, fontSize: compact ? 7 : 8, fontWeight: '900' }, weekDayToday: { color: colors.primary }, weekDate: { color: colors.muted, fontSize: 10, marginTop: 3 }, weekDateToday: { color: colors.text, fontWeight: '800' }, weekRing: { width: 31, height: 31, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, weekRingDone: { backgroundColor: colors.primary, borderColor: colors.primary }, weekRingToday: { borderColor: colors.primary, borderWidth: 2.2 }, weekMark: { color: colors.primary, fontSize: 14, fontWeight: '900' }, weekMarkDone: { color: contrastText(colors.primary) },
  weekProgressRow: { flexDirection: 'row', gap: 0, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 13, paddingBottom: 4 }, weekMetric: { flex: 1, minWidth: 0, minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: compact ? 5 : 10, borderRightWidth: .5, borderRightColor: colors.border }, weekMetricIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: compact ? 5 : 9 }, weekMetricValue: { color: colors.text, fontSize: compact ? 20 : 23, fontWeight: '900', marginRight: 5 }, weekMetricLabel: { color: colors.muted, fontSize: compact ? 9 : 10, fontWeight: '800', flex: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 21 }, quickTile: { width: compact ? '48.3%' : '48.5%', minHeight: 104, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: compact ? 9 : 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', shadowColor: colors.shadow, shadowOpacity: isDark ? .2 : .09, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, quickTileWide: { width: '100%', minHeight: 96 }, quickIconStage: { width: compact ? 57 : 66, height: 66, alignItems: 'center', justifyContent: 'center' }, quickCopy: { flex: 1, minWidth: 0 }, quickLabel: { color: colors.text, fontSize: compact ? 12 : 13, lineHeight: 17, fontWeight: '900', paddingRight: 20 }, quickArrow: { position: 'absolute', right: 5, top: 0, bottom: 0, width: 30, alignItems: 'center', justifyContent: 'center' },
  feedCard: { minHeight: 148, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: 13, paddingTop: 6, marginBottom: 10, shadowColor: colors.shadow, shadowOpacity: isDark ? .2 : .1, shadowRadius: 9, elevation: 3 }, activityRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 }, activityDivider: { borderBottomWidth: 1, borderBottomColor: colors.border }, activityAvatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', position: 'relative' }, friendAvatar: { width: '100%', height: '100%', borderRadius: 999 }, friendInitial: { color: colors.text, fontWeight: '900' }, activityDot: { position: 'absolute', right: -1, bottom: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.panel }, activityText: { color: colors.muted, fontSize: 10, lineHeight: 15, flex: 1 }, activityName: { color: colors.text, fontSize: 11, fontWeight: '900' }, activityTime: { color: colors.muted, fontSize: 8, fontStyle: 'italic' }, reactionTarget: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, feedEmpty: { color: colors.muted, fontSize: 10, lineHeight: 15, paddingVertical: 20 }, openFeedRow: { borderTopWidth: 1, borderTopColor: colors.border, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, feedLink: { color: colors.text, fontSize: 10, fontWeight: '900' }, pressed: { opacity: .68, transform: [{ scale: .99 }] },
});
