import React, { useEffect, useMemo, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert, BackHandler, Image, Linking, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Profile } from '../lib/types';
import { useTheme } from '../components/UI';
import { supabase } from '../lib/supabase';
import DashboardTab, { DailyActivityFocus, HomeProgressFocus } from './tabs/DashboardTab';
import FoodTab from './tabs/FoodTab';
import WorkoutTab from './tabs/WorkoutTab';
import FriendsTab from './tabs/FriendsTab';
import ProfileTab from './tabs/ProfileTab';
import ProgressScreen, { ProgressFocus } from './ProgressScreen';
import WorkoutHistoryScreen from './WorkoutHistoryScreen';
import DailyActivityScreen from './DailyActivityScreen';
import FitnessJourneyScreen from './FitnessJourneyScreen';
import ClubsScreen from './ClubsScreen';
import SupplementRemindersScreen from './SupplementRemindersScreen';
import WorkoutSplitScreen from './WorkoutSplitScreen';
import CustomizationScreen from './CustomizationScreen';
import SharedGymScreen from './SharedGymScreen';

const allTabs = [
  ['home', require('../../assets/nav/home.png'), 'Home'],
  ['friends', require('../../assets/nav/friends.png'), 'Friends'],
  ['workout', require('../../assets/nav/workout.png'), 'Train'],
  ['food', require('../../assets/nav/food.png'), 'Food'],
  ['profile', require('../../assets/nav/profile.png'), 'You'],
] as const;

type Tab = typeof allTabs[number][0];
type Page = 'main' | 'progress' | 'history' | 'daily' | 'journey' | 'clubs' | 'supplements' | 'split' | 'customize' | 'sharedGym';
const localDateKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

export default function MainApp({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const { colors, hiddenFeatures } = useTheme();
  const [tab, setTab] = useState<Tab>('home');
  const [page, setPage] = useState<Page>('main');
  const [progressFocus, setProgressFocus] = useState<ProgressFocus>('overview');
  const [dailyFocus, setDailyFocus] = useState<DailyActivityFocus>('volume');
  const [historySessionId, setHistorySessionId] = useState<string | undefined>();
  const [journeyPeriod, setJourneyPeriod] = useState<'week'|'month'>('week');
  const [friendsBadge, setFriendsBadge] = useState(0);
  const styles = createStyles(colors);

  const tabs = useMemo(() => allTabs.filter(([key]) => key !== 'food' || !hiddenFeatures.includes('food')).filter(([key]) => key !== 'friends' || !hiddenFeatures.includes('friends')), [hiddenFeatures]);

  useEffect(() => {
    const sub=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(page!=='main'){setPage('main');return true;}
      if(tab!=='home'){setTab('home');return true;}
      return false;
    });
    return()=>sub.remove();
  },[page,tab]);

  useEffect(() => {
    if ((tab === 'food' && hiddenFeatures.includes('food')) || (tab === 'friends' && hiddenFeatures.includes('friends'))) setTab('home');
  }, [hiddenFeatures, tab]);

  useEffect(() => {
    const handleUrl = (url?: string | null) => {
      if (!url) return;
      if (url.startsWith('fithub://pr')) { setProgressFocus('prs'); setPage('progress'); }
      else if (url.startsWith('fithub://journey')) { setJourneyPeriod(url.includes('month') ? 'month' : 'week'); setPage('journey'); }
      else if (url.startsWith('fithub://clubs')) setPage('clubs');
      else if (url.startsWith('fithub://workout')) { setPage('main'); setTab('workout'); }
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);
  useEffect(()=>{const sub=Notifications.addNotificationResponseReceivedListener((response)=>{const data:any=response.notification.request.content.data;if(data?.type==='supplement_reminder')setPage('supplements');});return()=>sub.remove();},[]);

  useEffect(() => {
    const showSchedule = async () => {
      const date = localDateKey();
      const day = new Date().getDay();
      const [{ data: split }, { data: seen }] = await Promise.all([
        supabase.from('workout_split_days').select('label,details').eq('user_id', profile.id).eq('day_of_week', day).maybeSingle(),
        supabase.from('daily_schedule_seen').select('seen_at').eq('user_id', profile.id).eq('local_date', date).maybeSingle(),
      ]);
      if (!split?.label || seen) return;
      try { await supabase.from('daily_schedule_seen').upsert({ user_id: profile.id, local_date: date, seen_at: new Date().toISOString() }, { onConflict: 'user_id,local_date' }); } catch {}
      const rest = /rest/i.test(split.label);
      Alert.alert(`Today: ${split.label}`, rest ? 'This is the session you planned for today. Recovery days count too.' : 'This is the workout you planned for today.', rest ? [{ text: 'Got it' }] : [{ text: 'Later', style: 'cancel' }, { text: 'Open Train', onPress: () => { setPage('main'); setTab('workout'); } }]);
    };
    showSchedule();
  }, [profile.id]);

  useEffect(() => {
    let alive = true;
    const loadBadge = async () => {
      const { count } = await supabase
        .from('friend_requests')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', profile.id)
        .eq('status', 'pending');
      if (alive) setFriendsBadge(Math.min(99, count ?? 0));
    };
    loadBadge();
    const channel = supabase.channel(`nav-feed-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `addressee_id=eq.${profile.id}` }, loadBadge)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [profile.id]);

  const chooseTab = (next: Tab) => { setTab(next); setPage('main'); };
  const openProgress = (focus: HomeProgressFocus = 'overview') => { setProgressFocus(focus); setPage('progress'); };
  const openHistory = (sessionId?: string) => { setHistorySessionId(sessionId); setPage('history'); };
  const openDaily = (focus: DailyActivityFocus) => { setDailyFocus(focus); setPage('daily'); };
  const openJourney = (period: 'week'|'month' = 'week') => { setJourneyPeriod(period); setPage('journey'); };

  return <View style={styles.safe}>
    <StatusBar hidden translucent backgroundColor="transparent" />
    <View style={styles.content}>
      {page === 'progress' ? <ProgressScreen profile={profile} focus={progressFocus} onBack={() => setPage('main')} /> :
       page === 'history' ? <WorkoutHistoryScreen profile={profile} initialSessionId={historySessionId} onBack={() => setPage('main')} /> :
       page === 'daily' ? <DailyActivityScreen profile={profile} focus={dailyFocus} onBack={() => setPage('main')} /> :
       page === 'journey' ? <FitnessJourneyScreen profile={profile} initialPeriod={journeyPeriod} onBack={() => setPage('main')} /> :
       page === 'clubs' ? <ClubsScreen profile={profile} onBack={() => setPage('main')} /> :
       page === 'supplements' ? <SupplementRemindersScreen profile={profile} onBack={() => setPage('main')} /> :
       page === 'split' ? <WorkoutSplitScreen profile={profile} onBack={() => setPage('main')} /> :
       page === 'customize' ? <CustomizationScreen onBack={() => setPage('main')} /> :
       page === 'sharedGym' ? <SharedGymScreen profile={profile} onBack={()=>setPage('main')} /> : <>
        {tab === 'home' && <DashboardTab profile={profile} onStartWorkout={() => chooseTab('workout')} onViewProgress={openProgress} onViewWorkouts={openHistory} onViewDailyActivity={openDaily} onOpenJourney={openJourney} />}
        {tab === 'food' && <FoodTab profile={profile} />}
        {tab === 'workout' && <WorkoutTab profile={profile} onProfileChanged={onProfileChanged} />}
        {tab === 'friends' && <FriendsTab profile={profile} />}
        {tab === 'profile' && <ProfileTab profile={profile} onProfileChanged={onProfileChanged} onOpenCustomization={() => setPage('customize')} onOpenSupplements={() => setPage('supplements')} onOpenSplit={() => setPage('split')} onOpenClubs={() => setPage('clubs')} onOpenJourney={openJourney} onOpenSharedGym={()=>setPage('sharedGym')} />}
      </>}
    </View>
    <View style={styles.nav}>{tabs.map(([key, icon, label]) => {
      const active = page === 'main' && tab === key;
      const primary = key === 'workout';
      return <Pressable key={key} onPress={() => chooseTab(key)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} style={({pressed})=>[styles.navItem,pressed&&styles.navPressed]}>
        {active && !primary ? <View style={styles.activeBar}/> : null}
        <View style={[styles.iconWrap, primary && styles.trainButton, primary && active && styles.trainButtonActive]}>
          <Image source={icon} style={[styles.navIcon, primary && styles.trainIcon, { tintColor: primary ? '#FFFFFF' : active ? colors.primary : colors.muted }]} />
          {key === 'friends' && friendsBadge > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{friendsBadge > 9 ? '9+' : friendsBadge}</Text></View> : null}
        </View>
        <Text style={[styles.navLabel, primary && styles.trainLabel, active && { color: colors.primary, fontWeight: '900' }]}>{label}</Text>
      </Pressable>;
    })}</View>
  </View>;
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  nav: { minHeight: 76, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.nav, paddingBottom: 7, paddingTop: 5, overflow: 'visible' },
  navItem: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navPressed: { opacity: 0.68 },
  activeBar: { position: 'absolute', top: -5, width: 30, height: 3, borderRadius: 999, backgroundColor: colors.primary },
  iconWrap: { width: 42, height: 34, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  trainButton: { width: 54, height: 54, borderRadius: 27, marginTop: -24, backgroundColor: colors.primary, borderWidth: 4, borderColor: colors.nav, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 9 },
  trainButtonActive: { transform: [{ scale: 1.04 }] },
  navIcon: { width: 23, height: 23, resizeMode: 'contain' },
  trainIcon: { width: 26, height: 26 },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  trainLabel: { marginTop: 1, color: colors.text, fontWeight: '900' },
  badge: { position: 'absolute', right: 0, top: -3, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.nav, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
});
