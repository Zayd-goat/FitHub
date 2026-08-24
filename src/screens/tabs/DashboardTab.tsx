import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { contrastText, useTheme } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import {
  BellIcon,
  DumbbellIcon,
  JourneyIcon,
  NutritionIcon,
  RunIcon,
  SettingsIcon,
  SupplementIcon,
  TrophyIcon,
} from '../../components/FitHubIcons';

export type HomeProgressFocus = 'overview' | 'prs' | 'badges' | 'streaks';
export type DailyActivityFocus = 'volume' | 'energy';

type Props = {
  profile: Profile;
  onStartWorkout: () => void;
  onViewProgress: (focus?: HomeProgressFocus) => void;
  onViewWorkouts: (sessionId?: string) => void;
  onOpenJourney: (period?: 'week' | 'month') => void;
  onOpenSupplements: () => void;
  onOpenFood: () => void;
  onOpenFriends: () => void;
  onOpenSettings: () => void;
  onOpenSplit: () => void;
  onOpenChallenges: () => void;
};

const groupArt = {
  male: {
    chest: require('../../../assets/train_v4/groups/male/chest.png'),
    back: require('../../../assets/train_v4/groups/male/back.png'),
    shoulders: require('../../../assets/train_v4/groups/male/shoulders.png'),
    arms: require('../../../assets/train_v4/groups/male/arms.png'),
    legs: require('../../../assets/train_v4/groups/male/legs.png'),
    core: require('../../../assets/train_v4/groups/male/core.png'),
    full_body: require('../../../assets/train_v4/groups/male/full_body.png'),
    cardio: require('../../../assets/train_v4/groups/male/cardio.png'),
    rest: require('../../../assets/home/rest_day_male_v2.png'),
  },
  female: {
    chest: require('../../../assets/train_v4/groups/female/chest.png'),
    back: require('../../../assets/train_v4/groups/female/back.png'),
    shoulders: require('../../../assets/train_v4/groups/female/shoulders.png'),
    arms: require('../../../assets/train_v4/groups/female/arms.png'),
    legs: require('../../../assets/train_v4/groups/female/legs.png'),
    core: require('../../../assets/train_v4/groups/female/core.png'),
    full_body: require('../../../assets/train_v4/groups/female/full_body.png'),
    cardio: require('../../../assets/train_v4/groups/female/cardio.png'),
    rest: require('../../../assets/home/rest_day_female_v2.png'),
  },
} as const;

type WeekDay = { label: string; date: Date; completed: boolean; today: boolean };

export default function DashboardTab({
  profile,
  onStartWorkout,
  onViewProgress,
  onOpenJourney,
  onOpenSupplements,
  onOpenFood,
  onOpenFriends,
  onOpenSettings,
  onOpenSplit,
  onOpenChallenges,
}: Props) {
  const { colors, hiddenFeatures, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [todayPlan, setTodayPlan] = useState<string | null>(null);
  const [todayPlanDetails, setTodayPlanDetails] = useState<any>(null);
  const [homeFriends, setHomeFriends] = useState<any[]>([]);
  const [dayKey, setDayKey] = useState(new Date().toDateString());

  useEffect(() => {
    const timer = setInterval(() => {
      const next = new Date().toDateString();
      setDayKey((previous) => previous === next ? previous : next);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const now = new Date();
      const weekStart = startOfWeek(now);
      const [sessionRes, splitRes, friendRes] = await Promise.all([
        supabase.from('workout_sessions').select('id,summary,started_at,ended_at').eq('user_id', profile.id).eq('completed', true).gte('ended_at', weekStart.toISOString()).order('ended_at', { ascending: false }).limit(100),
        supabase.from('workout_split_days').select('label,details').eq('user_id', profile.id).eq('day_of_week', now.getDay()).maybeSingle(),
        supabase.rpc('get_my_friends'),
      ]);
      if (!alive) return;
      const sessions = sessionRes.data ?? [];
      setTodayPlan(splitRes.data?.label ?? null);
      setTodayPlanDetails(splitRes.data?.details ?? null);
      setHomeFriends((friendRes.data ?? []).slice(0, 3));
      setWeekWorkouts(sessions.length);
      setWeekMinutes(sessions.reduce((total: number, session: any) => total + sessionMinutes(session), 0));
      const completedKeys = new Set(sessions.map((session: any) => localDateKey(new Date(session.ended_at ?? session.started_at))));
      setWeekDays(Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return {
          label: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][index],
          date,
          completed: completedKeys.has(localDateKey(date)),
          today: localDateKey(date) === localDateKey(now),
        };
      }));
    };
    load();
    return () => { alive = false; };
  }, [profile.id, profile.tokens, dayKey]);

  const firstName = titleCase(profile.username?.split(/[_\s]/)[0] || 'Athlete');
  const workoutTitle = todayPlan || 'Choose Today’s Workout';
  const restDay = /rest|recovery|off day/i.test(workoutTitle);
  const gender = profile.gender === 'female' ? 'female' : 'male';
  const heroImage = groupArt[gender][restDay ? 'rest' : artKeyForPlan(workoutTitle)];
  const heroMeta = useMemo(() => planMeta(todayPlanDetails, restDay), [todayPlanDetails, restDay]);

  return (
    <View style={styles.page}>
      <View pointerEvents="none" style={styles.backgroundGeometry}>
        <View style={styles.backgroundGlowOne}/><View style={styles.backgroundGlowTwo}/>
        <View style={styles.backgroundSlashOne}/><View style={styles.backgroundSlashTwo}/>
      </View>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.identityRow}>
          <View style={styles.profileCircle}>
            {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.profileImage}/> : <Text style={styles.profileInitial}>{firstName[0]}</Text>}
            <View style={styles.onlineDot}/>
          </View>
          <Text style={styles.greeting}>{greetingForHour(new Date().getHours())}, {firstName}</Text>
          <View style={styles.headerSpacer}/>
          <Pressable onPress={() => onViewProgress('streaks')} style={styles.headerIcon} accessibilityLabel="Notifications"><BellIcon size={30} color={colors.text}/><View style={styles.alertDot}/></Pressable>
          <Pressable onPress={onOpenSettings} style={styles.headerIcon} accessibilityLabel="Settings"><SettingsIcon size={31} color={colors.text}/></Pressable>
        </View>

        <Text style={styles.homeTitle}>HOME</Text>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow}/>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>TODAY’S PLAN</Text>
            <Text style={styles.heroTitle}>{workoutTitle}</Text>
            <Text style={styles.heroMeta}>{heroMeta}</Text>
            <Pressable onPress={restDay ? onOpenSplit : onStartWorkout} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
              <Text style={[styles.primaryActionText, { color: contrastText(colors.primary) }]}>{restDay ? 'VIEW RECOVERY PLAN' : 'START WORKOUT'}</Text>
            </Pressable>
            <View style={styles.heroSecondaryRow}>
              <Pressable onPress={onOpenSplit} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>↻  Change Plan</Text></Pressable>
              {!restDay ? <Pressable onPress={onOpenSplit} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>⌁  Skip to Rest</Text></Pressable> : null}
            </View>
          </View>
          <Image source={heroImage} style={[styles.heroImage, restDay && styles.restHeroImage]} accessibilityIgnoresInvertColors/>
          <Pressable onPress={onOpenSplit} style={({ pressed }) => [styles.detailsAction, pressed && styles.pressed]} accessibilityLabel="Workout details">
            <DumbbellIcon size={23} color={colors.text}/><Text style={styles.detailsText}>{restDay ? 'Rest Day\nDetails' : 'Workout\nDetails'}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>YOUR WEEK</Text>
          <Text style={styles.weekHeadline}>{weekWorkouts} workout{weekWorkouts === 1 ? '' : 's'} • {weekMinutes} active min</Text>
        </View>
        <Pressable onPress={() => onOpenJourney('week')} style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.weekCard}>
            <View style={styles.weekCalendar}>
              {weekDays.map((day) => <View key={day.label} style={styles.weekCell}>
                <Text style={[styles.weekDay, day.today && styles.weekDayToday]}>{day.label}</Text>
                <Text style={styles.weekDate}>{day.date.getDate()}</Text>
                <View style={[styles.weekRing, day.completed && styles.weekRingDone, day.today && !day.completed && styles.weekRingToday]}><Text style={[styles.weekMark, day.completed && styles.weekMarkDone]}>{day.completed ? '✓' : day.today ? '•' : ''}</Text></View>
              </View>)}
            </View>
            <View style={styles.weekSummary}>
              <View style={styles.weekSummaryIcon}><DumbbellIcon size={18} color={contrastText(colors.primary)}/></View>
              <Text style={styles.weekSummaryText}>{weekWorkouts} workout{weekWorkouts === 1 ? '' : 's'} completed</Text>
              <Text style={styles.weekSummaryLink}>View Full Journey  ›</Text>
            </View>
          </View>
        </Pressable>

        <Text style={styles.sectionHeading}>QUICK ACCESS</Text>
        <View style={styles.quickTopRow}>
          {!hiddenFeatures.includes('journey') ? <QuickCard icon={<JourneyIcon color={colors.primary}/>} label="Journey" onPress={() => onOpenJourney('week')}/> : null}
          {!hiddenFeatures.includes('food') ? <QuickCard icon={<NutritionIcon color={colors.primary}/>} label="Nutrition" onPress={onOpenFood}/> : null}
          {!hiddenFeatures.includes('supplements') ? <QuickCard icon={<SupplementIcon color={colors.primary}/>} label="Supplements" onPress={onOpenSupplements}/> : null}
        </View>
        <View style={styles.quickBottomRow}>
          <WideQuickCard icon={<TrophyIcon color={colors.primary}/>} label={'Community\nChallenges'} onPress={onOpenChallenges}/>
          <WideQuickCard icon={<RunIcon color={colors.primary}/>} label="Run Metrics" onPress={() => onViewProgress('overview')}/>
        </View>

        <View style={styles.sectionHeadingRow}><Text style={styles.sectionHeading}>FRIEND FEED</Text><Text style={styles.sectionHint}>RECENT FRIENDS’ ACTIVITY</Text></View>
        <Pressable onPress={onOpenFriends} style={({ pressed }) => [styles.feedCard, pressed && styles.pressed]}>
          <View style={styles.friendStack}>{homeFriends.length ? homeFriends.map((friend: any, index) => <View key={friend.user_id} style={[styles.friendAvatarWrap, index > 0 && styles.friendAvatarOverlap, { zIndex: 5 - index }]}>{friend.avatar_url ? <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar}/> : <Text style={styles.friendInitial}>{String(friend.username ?? '?')[0].toUpperCase()}</Text>}</View>) : <View style={styles.friendAvatarWrap}><Text style={styles.friendInitial}>+</Text></View>}</View>
          <View style={styles.feedCopy}><Text style={styles.feedTitle}>See what your friends are training</Text><Text style={styles.feedLink}>Open friend feed  ›</Text></View>
        </Pressable>

      </ScrollView>
    </View>
  );
}

function QuickCard({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { colors, isDark } = useTheme(); const styles = createStyles(colors, isDark);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>{icon}<Text style={styles.quickLabel}>{label}</Text></Pressable>;
}

function WideQuickCard({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { colors, isDark } = useTheme(); const styles = createStyles(colors, isDark);
  return <Pressable accessibilityRole="button" accessibilityLabel={label.replace('\n', ' ')} onPress={onPress} style={({ pressed }) => [styles.wideQuickCard, pressed && styles.pressed]}>{icon}<Text style={styles.wideQuickLabel}>{label}</Text></Pressable>;
}

function startOfWeek(date: Date) { const value = new Date(date); value.setHours(0, 0, 0, 0); const day = value.getDay(); value.setDate(value.getDate() - (day === 0 ? 6 : day - 1)); return value; }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function sessionMinutes(session: any) { const start = new Date(session.started_at).getTime(); const end = new Date(session.ended_at ?? session.started_at).getTime(); return Math.max(0, Math.round((end - start) / 60000)); }
function greetingForHour(hour: number) { return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }
function titleCase(value: string) { return value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : 'Athlete'; }
function sessionTitle(summary?: string | null) { if (!summary) return 'Workout'; const names = summary.split(',').map((value) => value.trim()).filter(Boolean); return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0] || 'Workout'; }

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
  if (Array.isArray(details)) return `${details.length} exercise${details.length === 1 ? '' : 's'} • Review before starting`;
  if (details && typeof details === 'object') {
    const items = Array.isArray(details.exercises) ? details.exercises.length : Number(details.exercise_count ?? 0);
    const duration = Number(details.duration_min ?? details.minutes ?? 0);
    if (items || duration) return `${items ? `${items} exercise${items === 1 ? '' : 's'}` : 'Planned workout'}${duration ? ` • ~${duration} min` : ''}`;
  }
  return 'Review exercises, sets and session details';
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg }, wrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 128 },
  backgroundGeometry: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }, backgroundGlowOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -90, top: 80, backgroundColor: colors.primarySoft, opacity: isDark ? .58 : .45 }, backgroundGlowTwo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, left: -110, top: 500, backgroundColor: colors.blueSoft, opacity: .46 }, backgroundSlashOne: { position: 'absolute', width: 520, height: 2, backgroundColor: colors.primary, opacity: isDark ? .3 : .16, transform: [{ rotate: '-34deg' }], left: -70, top: 360 }, backgroundSlashTwo: { position: 'absolute', width: 420, height: 1, backgroundColor: colors.primary, opacity: isDark ? .22 : .12, transform: [{ rotate: '-34deg' }], right: -150, top: 690 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, profileCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', position: 'relative' }, profileImage: { width: 48, height: 48, borderRadius: 24 }, profileInitial: { color: colors.text, fontSize: 18, fontWeight: '900' }, onlineDot: { position: 'absolute', right: -1, bottom: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.bg }, greeting: { color: colors.text, fontSize: 16, fontWeight: '600' }, headerSpacer: { flex: 1 }, headerIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', position: 'relative' }, alertDot: { position: 'absolute', right: 6, top: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  homeTitle: { color: colors.text, fontSize: 38, fontWeight: '900', letterSpacing: -.8, marginTop: 20, marginBottom: 16 },
  heroCard: { minHeight: 246, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, overflow: 'hidden', position: 'relative', marginBottom: 20, shadowColor: colors.shadow, shadowOpacity: isDark ? .32 : .14, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 }, heroGlow: { position: 'absolute', width: 250, height: 250, borderRadius: 125, right: -30, bottom: -108, backgroundColor: colors.primarySoft, opacity: .86 }, heroCopy: { width: '61%', padding: 18, zIndex: 3 }, eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: .35 }, heroTitle: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 14, letterSpacing: -.4 }, heroMeta: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5, minHeight: 34 }, primaryAction: { alignSelf: 'flex-start', minWidth: 155, minHeight: 48, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, marginTop: 11 }, primaryActionText: { fontSize: 12, fontWeight: '900' }, heroSecondaryRow: { flexDirection: 'row', gap: 7, marginTop: 10 }, secondaryAction: { minHeight: 48, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }, secondaryActionText: { color: colors.text, fontSize: 9, fontWeight: '800' }, heroImage: { position: 'absolute', width: '45%', height: '94%', right: 1, bottom: 0, resizeMode: 'contain', backgroundColor: 'transparent' }, restHeroImage: { width: '58%', height: '94%', right: -28, bottom: -4, resizeMode: 'contain' }, detailsAction: { position: 'absolute', right: 10, top: 10, minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', zIndex: 5, padding: 6, borderRadius: 12, backgroundColor: isDark ? 'rgba(0,0,0,.34)' : 'rgba(255,255,255,.82)' }, detailsText: { color: colors.text, fontSize: 8, fontWeight: '800', textAlign: 'center', lineHeight: 10, marginTop: 2 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4, marginBottom: 10 }, sectionHeading: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: .3, marginTop: 7, marginBottom: 10 }, sectionHint: { color: colors.muted, fontSize: 8, marginBottom: 10 }, weekHeadline: { color: colors.muted, fontSize: 10, marginBottom: 10, maxWidth: '62%', textAlign: 'right' },
  weekCard: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, padding: 14, marginBottom: 18 }, weekCalendar: { flexDirection: 'row', justifyContent: 'space-between' }, weekCell: { width: 36, alignItems: 'center' }, weekDay: { color: colors.muted, fontSize: 8, fontWeight: '900' }, weekDayToday: { color: colors.primary }, weekDate: { color: colors.muted, fontSize: 9, marginTop: 3 }, weekRing: { width: 31, height: 31, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 7 }, weekRingDone: { backgroundColor: colors.primary, borderColor: colors.primary }, weekRingToday: { borderColor: colors.primary, borderWidth: 2 }, weekMark: { color: colors.primary, fontSize: 14, fontWeight: '900' }, weekMarkDone: { color: contrastText(colors.primary) }, weekSummary: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 14, paddingTop: 12 }, weekSummaryIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, weekSummaryText: { color: colors.text, fontSize: 11, fontWeight: '800', marginLeft: 9 }, weekSummaryLink: { color: colors.text, fontSize: 9, marginLeft: 'auto', textDecorationLine: 'underline' },
  quickTopRow: { flexDirection: 'row', gap: 9, marginBottom: 9 }, quickBottomRow: { flexDirection: 'row', gap: 9, marginBottom: 18 }, quickCard: { flex: 1, minHeight: 126, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: isDark ? .2 : .08, shadowRadius: 7, elevation: 2 }, quickLabel: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 9 }, wideQuickCard: { flex: 1, minHeight: 78, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 }, wideQuickLabel: { color: colors.text, fontSize: 12, fontWeight: '800', lineHeight: 16 },
  feedCard: { minHeight: 88, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', padding: 15, marginBottom: 9 }, friendStack: { flexDirection: 'row', alignItems: 'center' }, friendAvatarWrap: { width: 45, height: 45, borderRadius: 23, borderWidth: 2, borderColor: colors.panel, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, friendAvatarOverlap: { marginLeft: -13 }, friendAvatar: { width: '100%', height: '100%' }, friendInitial: { color: colors.text, fontWeight: '900' }, feedCopy: { flex: 1, marginLeft: 13 }, feedTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, feedLink: { color: colors.muted, fontSize: 10, textDecorationLine: 'underline', marginTop: 5 },
  recentWorkout: { minHeight: 55, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 6 }, recentCopy: { flex: 1, marginLeft: 10 }, recentLabel: { color: colors.primary, fontSize: 8, fontWeight: '900' }, recentName: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 2 }, recentArrow: { color: colors.muted, fontSize: 24 }, allProgress: { color: colors.primary, fontSize: 11, fontWeight: '900', textAlign: 'center', paddingVertical: 15 }, pressed: { opacity: .68 },
});
