import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { BellIcon } from '../components/FitHubIcons';
import { Button, Card, OutlineButton, RefreshableScrollView, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { scheduleAcceptedGymReminderForInvite } from '../lib/notifications';

type NotificationRow = {
  id: string;
  notification_type: 'gym_invite'|'gym_invite_response'|'friend_request'|'friend_post'|'friend_pr'|'system';
  title: string;
  body: string;
  data: Record<string, any> | null;
  created_at: string;
  read_at: string | null;
  acted_at: string | null;
};

type Props = {
  profile: Profile;
  onBack: () => void;
  onOpenSharedGym: () => void;
  onOpenFriends: () => void;
  onUnreadChanged: () => void;
};

export default function NotificationsScreen({ profile, onBack, onOpenSharedGym, onOpenFriends, onUnreadChanged }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('id,notification_type,title,body,data,created_at,read_at,acted_at')
      .eq('user_id', profile.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setSetupNeeded(/user_notifications|relation|schema cache/i.test(error.message));
      return;
    }
    setSetupNeeded(false);
    setRows((data ?? []) as NotificationRow[]);
    onUnreadChanged();
  }, [profile.id, onUnreadChanged]);

  useEffect(() => {
    load();
    const channel = supabase.channel(`notification-center-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${profile.id}` }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id, load]);

  const markRead = async (row: NotificationRow, acted = false) => {
    const now = new Date().toISOString();
    const payload: Record<string,string> = { read_at: now };
    if (acted) payload.acted_at = now;
    await supabase.from('user_notifications').update(payload).eq('id', row.id).eq('user_id', profile.id);
    setRows((previous) => previous.filter((item) => item.id !== row.id));
    onUnreadChanged();
  };

  const open = async (row: NotificationRow) => {
    await markRead(row);
    if (row.notification_type === 'gym_invite' || row.notification_type === 'gym_invite_response') onOpenSharedGym();
    else if (row.notification_type === 'friend_request' || row.notification_type === 'friend_post' || row.notification_type === 'friend_pr') onOpenFriends();
  };

  const respondGymInvite = async (row: NotificationRow, status: 'accepted'|'declined') => {
    const inviteId = String(row.data?.invite_id ?? '');
    if (!inviteId || busyId) return;
    setBusyId(row.id);
    const { error } = await supabase.from('gym_invites').update({ status, updated_at: new Date().toISOString() }).eq('id', inviteId).eq('recipient_id', profile.id).eq('status', 'pending');
    setBusyId(null);
    if (error) return Alert.alert('Gym invite', error.message);
    if (status === 'accepted') await scheduleAcceptedGymReminderForInvite(inviteId, profile.id).catch(() => null);
    await supabase.functions.invoke('friend-notifications', { body: { invite_id: inviteId, notification_kind: 'response' } }).catch(() => null);
    await markRead(row, true);
    if (status === 'accepted') onOpenSharedGym();
  };

  const respondFriendRequest = async (row: NotificationRow, status: 'accepted'|'declined') => {
    const requestId = String(row.data?.request_id ?? '');
    if (!requestId || busyId) return;
    setBusyId(row.id);
    const result = status === 'accepted'
      ? await supabase.rpc('accept_friend_request', { request_id: requestId })
      : await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', requestId).eq('addressee_id', profile.id).eq('status', 'pending');
    setBusyId(null);
    if (result.error) return Alert.alert('Friend request', result.error.message);
    await markRead(row, true);
    if (status === 'accepted') onOpenFriends();
  };

  const markAllRead = async () => {
    if (!rows.length) return;
    await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', profile.id).is('read_at', null);
    setRows([]);
    onUnreadChanged();
  };

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} alwaysBounceVertical>
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹</Text></Pressable>
      <View style={{ flex: 1 }}><Text style={styles.title}>Notifications</Text><Text style={styles.subtitle}>{rows.length ? `${rows.length} new notification${rows.length === 1 ? '' : 's'}` : 'You’re all caught up'}</Text></View>
      {rows.length ? <Pressable onPress={markAllRead} style={styles.markAll}><Text style={styles.markAllText}>MARK ALL READ</Text></Pressable> : null}
    </View>

    {rows.length ? <Text style={styles.swipeHint}>Swipe a notification left or right to dismiss it</Text> : null}

    {setupNeeded ? <Card><Text style={styles.cardTitle}>Notification center setup required</Text><Text style={styles.body}>Run the FitHub 1.6.18 Supabase SQL update. Push notifications can still arrive, but in-app notification history needs the new table.</Text></Card> : null}
    {!setupNeeded && !rows.length ? <View style={styles.empty}><View style={styles.emptyBell}><BellIcon size={42} color={colors.text}/></View><Text style={styles.emptyTitle}>No new notifications</Text><Text style={styles.emptyText}>Gym invites, friend requests and enabled friend updates will appear here. Pull down to check again.</Text></View> : null}

    {rows.map((row) => <SwipeDismissNotification key={row.id} colors={colors} onDismiss={() => markRead(row)}><View style={styles.notification}>
      <Pressable onPress={() => open(row)} style={({ pressed }) => [styles.notificationOpen, pressed && { opacity: .78 }]} accessibilityRole="button" accessibilityLabel={`${row.title}. ${row.body}`}>
        <View style={styles.typeIcon}><Text style={styles.typeGlyph}>{glyph(row.notification_type)}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{row.title}</Text><Text style={styles.body}>{row.body}</Text><Text style={styles.time}>{relativeTime(row.created_at)}</Text></View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      {row.notification_type === 'gym_invite' ? <View style={styles.actions}><View style={{ flex: 1 }}><Button title={busyId === row.id ? 'UPDATING…' : 'ACCEPT'} onPress={() => respondGymInvite(row, 'accepted')} disabled={Boolean(busyId)}/></View><View style={{ flex: 1 }}><OutlineButton title="DECLINE" onPress={() => respondGymInvite(row, 'declined')} disabled={Boolean(busyId)}/></View></View> : null}
      {row.notification_type === 'friend_request' ? <View style={styles.actions}><View style={{ flex: 1 }}><Button title={busyId === row.id ? 'UPDATING…' : 'ACCEPT'} onPress={() => respondFriendRequest(row, 'accepted')} disabled={Boolean(busyId)}/></View><View style={{ flex: 1 }}><OutlineButton title="DECLINE" onPress={() => respondFriendRequest(row, 'declined')} disabled={Boolean(busyId)}/></View></View> : null}
    </View></SwipeDismissNotification>)}
  </RefreshableScrollView>;
}

function SwipeDismissNotification({children,onDismiss,colors}:{children:React.ReactNode;onDismiss:()=>void;colors:any}){
  const translateX=React.useRef(new Animated.Value(0)).current;
  const dismissed=React.useRef(false);
  const finish=(direction:number)=>{
    if(dismissed.current)return;
    dismissed.current=true;
    Animated.timing(translateX,{toValue:direction*520,duration:180,useNativeDriver:true}).start(onDismiss);
  };
  const responder=React.useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,gesture)=>Math.abs(gesture.dx)>10&&Math.abs(gesture.dx)>Math.abs(gesture.dy),
    onPanResponderMove:(_,gesture)=>translateX.setValue(gesture.dx),
    onPanResponderRelease:(_,gesture)=>{
      if(Math.abs(gesture.dx)>92||Math.abs(gesture.vx)>.85)finish(gesture.dx<0?-1:1);
      else Animated.spring(translateX,{toValue:0,useNativeDriver:true,bounciness:7}).start();
    },
    onPanResponderTerminate:()=>Animated.spring(translateX,{toValue:0,useNativeDriver:true}).start(),
  }),[translateX]);
  return <View style={stylesForSwipe(colors).shell}>
    <View style={stylesForSwipe(colors).backdrop}><Text style={stylesForSwipe(colors).dismissText}>DISMISS</Text><Text style={stylesForSwipe(colors).dismissText}>DISMISS</Text></View>
    <Animated.View {...responder.panHandlers} style={{transform:[{translateX}]}}>{children}</Animated.View>
  </View>;
}

const stylesForSwipe=(colors:any)=>StyleSheet.create({
  shell:{position:'relative',overflow:'hidden',borderRadius:16,marginBottom:10},
  backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:colors.primarySoft,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18},
  dismissText:{color:colors.primary,fontSize:10,fontWeight:'900',letterSpacing:.7},
});

function glyph(type: NotificationRow['notification_type']) {
  if (type === 'gym_invite' || type === 'gym_invite_response') return '🏋';
  if (type === 'friend_request') return '＋';
  if (type === 'friend_pr') return '★';
  if (type === 'friend_post') return '▧';
  return '•';
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 42, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  back: { width: 34, height: 44, justifyContent: 'center' }, backText: { color: colors.text, fontSize: 38, fontWeight: '300' },
  title: { color: colors.text, fontSize: 27, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  swipeHint:{color:colors.muted,fontSize:10,marginTop:-9,marginBottom:12,textAlign:'center'},
  markAll: { paddingHorizontal: 8, minHeight: 38, justifyContent: 'center' }, markAllText: { color: colors.primary, fontWeight: '900', fontSize: 9 },
  empty: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35 },
  emptyBell: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 18 }, emptyText: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  notification: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, borderRadius: 16, padding: 13 },
  notificationOpen: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, typeGlyph: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, body: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, time: { color: colors.primary, fontSize: 9, fontWeight: '800', marginTop: 7 }, chevron: { color: colors.muted, fontSize: 24 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
});
