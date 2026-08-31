import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import { Alert, BackHandler, Linking, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Profile } from '../lib/types';
import { useTheme } from '../components/UI';
import { supabase } from '../lib/supabase';
import DashboardTab, { DailyActivityFocus, HomeProgressFocus } from './tabs/DashboardTabV2';
import FoodTab, { FoodTabHandle } from './tabs/FoodTab';
import WorkoutTab, { WorkoutTabHandle } from './tabs/WorkoutTab';
import FriendsTab, { FriendsTabHandle } from './tabs/FriendsTab';
import ProfileTab, { ProfileTabHandle } from './tabs/ProfileTab';
import ProgressScreen, { ProgressFocus } from './ProgressScreen';
import WorkoutHistoryScreen from './WorkoutHistoryScreen';
import DailyActivityScreen from './DailyActivityScreen';
import FitnessJourneyScreen from './FitnessJourneyScreen';
import CommunityHubScreen, { CommunityHubTab } from './CommunityHubScreenV2';
import RunMetricsScreen from './RunMetricsScreen';
import SupplementRemindersScreen from './SupplementRemindersScreen';
import WorkoutSplitScreen from './WorkoutSplitScreen';
import CustomizationScreen from './CustomizationScreen';
import SharedGymScreen from './SharedGymScreen';
import NotificationsScreen from './NotificationsScreen';
import { SharedWorkoutLaunch } from '../lib/sharedGym';
import { FreshChevronIcon } from '../components/FitHubFreshIcons';
import {
  FitHubFoodNavIcon, FitHubFriendsNavIcon, FitHubHomeNavIcon,
  FitHubProfileNavIcon, FitHubTrainNavIcon,
} from '../components/FitHubNavIcons';
import {
  cancelSameDaySupplementReschedule,
  GYM_INVITE_ACCEPT_ACTION,
  GYM_INVITE_DECLINE_ACTION,
  scheduleAcceptedGymReminderForInvite,
  scheduleOneTimeSupplementReminder,
  SUPPLEMENT_RESCHEDULE_ACTION,
  SUPPLEMENT_TAKEN_ACTION,
} from '../lib/notifications';

const allTabs = [
  ['home', 'Home'],
  ['friends', 'Friends'],
  ['workout', 'Train'],
  ['food', 'Food'],
  ['profile', 'You'],
] as const;

type Tab = typeof allTabs[number][0];
type Page = 'main' | 'progress' | 'history' | 'daily' | 'journey' | 'community' | 'runMetrics' | 'supplements' | 'split' | 'customize' | 'sharedGym' | 'notifications';
type ActiveWorkoutBar = { startedAt:number; name:string; exercise:string };
const localDateKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

export default function MainApp({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const { colors, hiddenFeatures } = useTheme();
  const [tab, setTab] = useState<Tab>('home');
  const [page, setPage] = useState<Page>('main');
  const [progressFocus, setProgressFocus] = useState<ProgressFocus>('overview');
  const [dailyFocus, setDailyFocus] = useState<DailyActivityFocus>('volume');
  const [historySessionId, setHistorySessionId] = useState<string | undefined>();
  const [journeyPeriod, setJourneyPeriod] = useState<'week'|'month'>('week');
  const [communityTab, setCommunityTab] = useState<CommunityHubTab>('challenges');
  const [friendsBadge, setFriendsBadge] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activeWorkoutBar,setActiveWorkoutBar]=useState<ActiveWorkoutBar|null>(null);
  const [activeWorkoutElapsed,setActiveWorkoutElapsed]=useState(0);
  const [sharedWorkoutLaunch,setSharedWorkoutLaunch]=useState<SharedWorkoutLaunch|null>(null);
  const foodRef = useRef<FoodTabHandle>(null);
  const workoutRef = useRef<WorkoutTabHandle>(null);
  const friendsRef = useRef<FriendsTabHandle>(null);
  const profileRef = useRef<ProfileTabHandle>(null);
  const tabHistory = useRef<Tab[]>([]);
  const styles = createStyles(colors);

  const loadUnreadNotifications = useCallback(async () => {
    const { count, error } = await supabase.from('user_notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).is('read_at', null);
    if (!error) setUnreadNotifications(Math.min(99, count ?? 0));
  }, [profile.id]);

  useEffect(() => {
    loadUnreadNotifications();
    const channel = supabase.channel(`home-notifications-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${profile.id}` }, () => { loadUnreadNotifications(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id, loadUnreadNotifications]);

  const tabs = useMemo(() => allTabs.filter(([key]) => key !== 'food' || !hiddenFeatures.includes('food')).filter(([key]) => key !== 'friends' || !hiddenFeatures.includes('friends')), [hiddenFeatures]);

  useEffect(()=>{
    let alive=true;
    const readActive=async()=>{
      const raw=await Storage.getItem(`fithub_active_workout_${profile.id}`).catch(()=>null);
      if(!alive)return;
      if(!raw){setActiveWorkoutBar(null);return;}
      try{
        const saved=JSON.parse(raw);
        const items=Array.isArray(saved?.items)?saved.items:[];
        const current=items[Math.min(Number(saved?.active_index??0),Math.max(0,items.length-1))];
        const startedAt=Number(saved?.started_at??0);
        if(!startedAt||!items.length){setActiveWorkoutBar(null);return;}
        setActiveWorkoutBar({startedAt,name:String(saved?.template_name||'Workout'),exercise:String(current?.exercise_name||'In progress')});
        setActiveWorkoutElapsed(Math.max(0,Math.floor((Date.now()-startedAt)/1000)));
      }catch{setActiveWorkoutBar(null);}
    };
    readActive();
    const id=setInterval(readActive,1000);
    return()=>{alive=false;clearInterval(id);};
  },[profile.id]);

  useEffect(() => {
    const sub=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(page==='main'&&tab==='food'&&foodRef.current?.goBack())return true;
      if(page==='main'&&tab==='workout'&&workoutRef.current?.goBack())return true;
      if(page==='main'&&tab==='friends'&&friendsRef.current?.goBack())return true;
      if(page==='main'&&tab==='profile'&&profileRef.current?.goBack())return true;
      if(page!=='main'){setPage('main');return true;}
      const previous=tabHistory.current.pop();
      if(previous){setTab(previous);return true;}
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
      else if (url.startsWith('fithub://clubs')) { setCommunityTab('clubs'); setPage('community'); }
      else if (url.startsWith('fithub://challenges')) { setCommunityTab('challenges'); setPage('community'); }
      else if (url.startsWith('fithub://run-metrics')) setPage('runMetrics');
      else if (url.startsWith('fithub://shared-gym')) setPage('sharedGym');
      else if (url.startsWith('fithub://workout')) { setPage('main'); setTab('workout'); }
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const identifier = response.notification.request.identifier;
      const data: any = response.notification.request.content.data;
      await Notifications.dismissNotificationAsync(identifier).catch(() => {});

      if (data?.inviteId) {
        try { await supabase.from('user_notifications').update({ read_at: new Date().toISOString(), acted_at: response.actionIdentifier === GYM_INVITE_ACCEPT_ACTION || response.actionIdentifier === GYM_INVITE_DECLINE_ACTION ? new Date().toISOString() : null }).eq('user_id', profile.id).contains('data', { invite_id: String(data.inviteId) }).is('read_at', null); } catch {}
      } else if (data?.postId) {
        try { await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', profile.id).contains('data', { post_id: String(data.postId) }).is('read_at', null); } catch {}
      }
      loadUnreadNotifications();

      if (data?.type === 'supplement_reminder') {
        if (response.actionIdentifier === SUPPLEMENT_TAKEN_ACTION && data?.reminderId) {
          const now = new Date();
          await supabase.from('supplement_checkins').upsert({ user_id: profile.id, reminder_id: String(data.reminderId), local_date: localDateKey(), taken_at: now.toISOString(), status: 'taken', recorded_time: now.toTimeString().slice(0, 8), source: 'notification', updated_at: now.toISOString() }, { onConflict: 'user_id,reminder_id,local_date' });
          await cancelSameDaySupplementReschedule(String(data.reminderId), now);
          return;
        }
        if (response.actionIdentifier === SUPPLEMENT_RESCHEDULE_ACTION && data?.reminderId) {
          Alert.alert('Reschedule for today', `When should FitHub remind you about ${data.supplementName ?? 'this supplement'}?`, [
            { text: 'In 1 hour', onPress: () => rescheduleSupplement(data, 1) },
            { text: 'In 2 hours', onPress: () => rescheduleSupplement(data, 2) },
            { text: 'Cancel', style: 'cancel' },
          ]);
          return;
        }
        setPage('supplements');
        return;
      }

      if ((data?.type === 'gym_invite_request' || data?.type === 'gym_invite' || data?.type === 'gym_invite_response') && data?.inviteId) {
        if (response.actionIdentifier === GYM_INVITE_ACCEPT_ACTION || response.actionIdentifier === GYM_INVITE_DECLINE_ACTION) {
          const status = response.actionIdentifier === GYM_INVITE_ACCEPT_ACTION ? 'accepted' : 'declined';
          await supabase.from('gym_invites').update({ status, updated_at: new Date().toISOString() }).eq('id', String(data.inviteId)).eq('recipient_id', profile.id).eq('status', 'pending');
          if (status === 'accepted') await scheduleAcceptedGymReminderForInvite(String(data.inviteId), profile.id).catch(() => null);
          await supabase.functions.invoke('friend-notifications', { body: { invite_id: String(data.inviteId), notification_kind: 'response' } }).catch(() => null);
          return;
        }
        setPage('sharedGym');
        return;
      }

      if (data?.type === 'friend_post' || data?.type === 'friend_pr') {
        setPage('main');
        setTab('friends');
      } else if (data?.type === 'active_workout') {
        setPage('main');
        setTab('workout');
      }
    });
    return () => sub.remove();
  }, [profile.id, loadUnreadNotifications]);

  const rescheduleSupplement=async(data:any,hours:number)=>{const date=new Date(Date.now()+hours*60*60*1000);const id=await scheduleOneTimeSupplementReminder({supplementName:String(data.supplementName??'Supplement'),userId:profile.id,reminderId:String(data.reminderId),date});if(id){await supabase.from('supplement_reschedules').insert({user_id:profile.id,reminder_id:String(data.reminderId),scheduled_for:date.toISOString()});Alert.alert('Reminder rescheduled',`FitHub will remind you again in ${hours} hour${hours===1?'':'s'}. Tomorrow returns to the normal reminder time.`);}};

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

  const chooseTab = (next: Tab) => {
    if (page !== 'main' || next !== tab) tabHistory.current.push(tab);
    setTab(next);
    setPage('main');
  };
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
       page === 'community' ? <CommunityHubScreen profile={profile} initialTab={communityTab} onBack={() => setPage('main')} /> :
       page === 'runMetrics' ? <RunMetricsScreen profile={profile} onBack={() => setPage('main')} onOpenSession={openHistory} /> :
       page === 'supplements' ? <SupplementRemindersScreen profile={profile} onBack={() => setPage('main')} /> :
       page === 'split' ? <WorkoutSplitScreen profile={profile} onBack={() => setPage('main')} /> :
       page === 'customize' ? <CustomizationScreen onBack={() => setPage('main')} /> :
       page === 'notifications' ? <NotificationsScreen profile={profile} onBack={() => setPage('main')} onOpenSharedGym={() => setPage('sharedGym')} onOpenFriends={() => { setPage('main'); chooseTab('friends'); }} onUnreadChanged={loadUnreadNotifications} /> :
       page === 'sharedGym' ? <SharedGymScreen
         profile={profile}
         onBack={()=>setPage('main')}
         onOpenFriends={()=>{setPage('main');chooseTab('friends');}}
         onStartSyncedWorkout={(launch)=>{setSharedWorkoutLaunch(launch);setPage('main');chooseTab('workout');}}
         onStartIndividualWorkout={()=>{setPage('main');chooseTab('workout');}}
       /> : <>
        {tab === 'home' && <DashboardTab profile={profile} unreadNotifications={unreadNotifications} onOpenNotifications={()=>setPage('notifications')} onStartWorkout={() => chooseTab('workout')} onViewWorkouts={openHistory} onOpenJourney={openJourney} onOpenSupplements={()=>setPage('supplements')} onOpenFood={()=>chooseTab('food')} onOpenFriends={()=>chooseTab('friends')} onOpenSettings={()=>setPage('customize')} onOpenSplit={()=>setPage('split')} onOpenChallenges={()=>{setCommunityTab('challenges');setPage('community');}} onOpenRunMetrics={()=>setPage('runMetrics')} />}
        {tab === 'food' && <FoodTab ref={foodRef} profile={profile} />}
        {tab === 'workout' && <WorkoutTab ref={workoutRef} profile={profile} onProfileChanged={onProfileChanged} sharedLaunch={sharedWorkoutLaunch} onSharedLaunchConsumed={()=>setSharedWorkoutLaunch(null)} />}
        {tab === 'friends' && <FriendsTab ref={friendsRef} profile={profile} onCreatePost={() => chooseTab('workout')} onViewProfile={() => chooseTab('profile')} />}
        {tab === 'profile' && <ProfileTab ref={profileRef} profile={profile} onProfileChanged={onProfileChanged} onOpenCustomization={() => setPage('customize')} onOpenSupplements={() => setPage('supplements')} onOpenSplit={() => setPage('split')} onOpenClubs={() => {setCommunityTab('clubs');setPage('community');}} onOpenJourney={openJourney} onOpenSharedGym={()=>setPage('sharedGym')} />}
      </>}
    </View>
    {activeWorkoutBar&&(page!=='main'||tab!=='workout')?<Pressable onPress={()=>chooseTab('workout')} style={styles.floatingWorkout} accessibilityRole="button" accessibilityLabel="Resume active workout">
      <View style={styles.floatingWorkoutPulse}/>
      <View style={{flex:1}}><Text style={styles.floatingWorkoutLabel}>WORKOUT IN PROGRESS</Text><Text style={styles.floatingWorkoutName} numberOfLines={1}>{activeWorkoutBar.name} · {activeWorkoutBar.exercise}</Text></View>
      <View style={styles.floatingWorkoutRight}><Text style={styles.floatingWorkoutTime}>{formatElapsed(activeWorkoutElapsed)}</Text><View style={styles.floatingWorkoutResumeRow}><Text style={styles.floatingWorkoutResume}>RESUME</Text><FreshChevronIcon size={14} color={colors.primary}/></View></View>
    </Pressable>:null}
    <View style={styles.nav}>{tabs.map(([key, label]) => {
      const active = page === 'main' && tab === key;
      const primary = key === 'workout';
      return <Pressable key={key} onPress={() => chooseTab(key)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} style={({pressed})=>[styles.navItem,pressed&&styles.navPressed]}>
        {active && !primary ? <View pointerEvents="none" style={styles.activeTabLine}/> : null}
        <View style={[styles.iconWrap, active && !primary && styles.activeIndicator, primary && styles.trainButton, primary && active && styles.trainButtonActive]}>
          <BottomNavIcon tab={key} active={active} color={primary ? '#FFFFFF' : active ? colors.primary : colors.muted} accent={primary ? colors.primarySoft : colors.primary}/>
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
  floatingWorkout:{marginHorizontal:10,marginBottom:7,minHeight:58,borderRadius:15,borderWidth:1,borderColor:colors.primary,backgroundColor:colors.panel,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:9,shadowColor:'#000',shadowOpacity:.2,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:7},
  floatingWorkoutPulse:{width:10,height:10,borderRadius:5,backgroundColor:colors.primary},
  floatingWorkoutLabel:{color:colors.primary,fontSize:8,fontWeight:'900',letterSpacing:.6},
  floatingWorkoutName:{color:colors.text,fontSize:12,fontWeight:'900',marginTop:3},
  floatingWorkoutRight:{alignItems:'flex-end'},
  floatingWorkoutTime:{color:colors.text,fontSize:13,fontWeight:'900'},
  floatingWorkoutResumeRow:{flexDirection:'row',alignItems:'center',marginTop:3},
  floatingWorkoutResume:{color:colors.primary,fontSize:8,fontWeight:'900'},
  nav: { minHeight: 70, flexDirection: 'row', marginHorizontal: 10, marginBottom: 2, borderWidth: 1, borderColor: colors.border, borderRadius: 25, backgroundColor: colors.nav, paddingBottom: 5, paddingTop: 5, overflow: 'visible', shadowColor:'#000',shadowOpacity:.14,shadowRadius:13,shadowOffset:{width:0,height:5},elevation:12 },
  navItem: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navPressed: { opacity: 0.68 },
  activeTabLine: { position: 'absolute', top: -5, width: 28, height: 3, borderRadius: 3, backgroundColor: colors.primary },
  iconWrap: { width: 48, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  activeIndicator: { backgroundColor: 'transparent' },
  trainButton: { width: 66, height: 66, borderRadius: 33, marginTop: -26, backgroundColor: colors.primary, borderWidth: 5, borderColor: colors.nav, shadowColor:'#000',shadowOpacity:.24,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:10 },
  trainButtonActive: { transform: [{ scale: 1.035 }] },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 1 },
  trainLabel: { marginTop: 0, color: colors.text, fontWeight: '900' },
  badge: { position: 'absolute', right: 0, top: -3, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.nav, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
});

function BottomNavIcon({tab,active,color,accent}:{tab:Tab;active:boolean;color:string;accent:string}){
  if(tab==='home')return <FitHubHomeNavIcon size={29} color={color} accentColor={accent} filled={active}/>;
  if(tab==='friends')return <FitHubFriendsNavIcon size={29} color={color} accentColor={accent} filled={active}/>;
  if(tab==='workout')return <FitHubTrainNavIcon size={35} color={color}/>;
  if(tab==='food')return <FitHubFoodNavIcon size={29} color={color} accentColor={accent} filled={active}/>;
  return <FitHubProfileNavIcon size={29} color={color} accentColor={accent} filled={active}/>;
}

const formatElapsed=(seconds:number)=>{
  const hours=Math.floor(seconds/3600);
  const minutes=Math.floor((seconds%3600)/60);
  const secs=seconds%60;
  return hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`:`${minutes}:${String(secs).padStart(2,'0')}`;
};
