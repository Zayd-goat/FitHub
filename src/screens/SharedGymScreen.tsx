import React, { useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, OutlineButton, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { FreshChevronIcon } from '../components/FitHubFreshIcons';
import { YouCardArtwork } from '../components/YouCardArtwork';
import { exerciseLibrary, LibraryExercise } from '../data/exerciseLibrary';
import { imageForExercise } from '../data/exerciseVisuals';
import { normalizeSharedPlan, SharedWorkoutLaunch, SharedWorkoutPlanItem } from '../lib/sharedGym';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';

type SessionRow = {
  id: string;
  gym_invite_id: string | null;
  creator_id: string;
  leader_id: string | null;
  title: string;
  planned_for: string | null;
  status: string;
  started_at: string | null;
  plan_revision: number | null;
};

type FriendRow = {
  user_id: string;
  username: string;
  avatar_url?: string | null;
};

type ParticipantRow = {
  user_id: string;
  invite_status: string;
  workout_mode: 'undecided' | 'synced' | 'individual';
  publish_consent: boolean;
  completed_at: string | null;
  username: string;
};

type Props = {
  profile: Profile;
  onBack: () => void;
  onOpenFriends: () => void;
  onStartSyncedWorkout: (launch: SharedWorkoutLaunch) => void;
  onStartIndividualWorkout: () => void;
};

const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const tomorrowKey = () => { const date = new Date(); date.setDate(date.getDate() + 1); return localDateKey(date); };
const weekendKey = () => { const date = new Date(); const distance = (6 - date.getDay() + 7) % 7 || 7; date.setDate(date.getDate() + distance); return localDateKey(date); };
const parseLocalDateTime = (dateValue: string, timeValue: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{1,2}:\d{2}$/.test(timeValue)) return null;
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isFinite(value.getTime()) && value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day ? value : null;
};

export default function SharedGymScreen({
  profile,
  onBack,
  onOpenFriends,
  onStartSyncedWorkout,
  onStartIndividualWorkout,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [plan, setPlan] = useState<SharedWorkoutPlanItem[]>([]);
  const [planRevision, setPlanRevision] = useState(0);
  const [title, setTitle] = useState('Gym session');
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [inviteFriendId, setInviteFriendId] = useState('');
  const [inviteDate, setInviteDate] = useState(tomorrowKey());
  const [inviteTime, setInviteTime] = useState('17:00');
  const [gymName, setGymName] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const mine = participants.find((item) => item.user_id === profile.id);
  const isLeader = !!selected && (selected.leader_id ?? selected.creator_id) === profile.id;
  const accepted = mine?.invite_status === 'accepted' || selected?.creator_id === profile.id;
  const availableFriends = useMemo(() => friends.filter((friend) => !participants.some((person) => person.user_id === friend.user_id)), [friends, participants]);

  const pickerExercises = useMemo(() => {
    const search = pickerQuery.trim().toLowerCase();
    return exerciseLibrary
      .filter((exercise) => !plan.some((item) => item.exercise_slug === exercise.slug))
      .filter((exercise) => !search || `${exercise.name} ${exercise.targetArea} ${exercise.equipment}`.toLowerCase().includes(search))
      .slice(0, 80);
  }, [pickerQuery, plan]);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('shared_gym_sessions')
      .select('id,gym_invite_id,creator_id,leader_id,title,planned_for,status,started_at,plan_revision')
      .order('created_at', { ascending: false });
    if (error) {
      Alert.alert('Shared gym sessions', error.message);
      return;
    }
    setSessions((data ?? []) as SessionRow[]);
    if (selected) {
      const current = (data ?? []).find((item: any) => item.id === selected.id);
      if (current) setSelected(current as SessionRow);
    }
  };

  const loadFriends = async () => {
    const { data, error } = await supabase.rpc('get_my_friends');
    if (error) {
      Alert.alert('Training friends', error.message);
      return;
    }
    setFriends(((data ?? []) as any[]).map((friend) => ({
      user_id: String(friend.user_id),
      username: String(friend.username ?? 'Friend'),
      avatar_url: friend.avatar_url ?? null,
    })));
  };

  const refreshAll = async () => { await Promise.all([loadSessions(), loadFriends()]); };

  const openSession = async (session: SessionRow) => {
    setSelected(session);
    setTitle(session.title || 'Gym session');
    if (session.planned_for) {
      const planned = new Date(session.planned_for);
      setInviteDate(localDateKey(planned));
      setInviteTime(`${String(planned.getHours()).padStart(2, '0')}:${String(planned.getMinutes()).padStart(2, '0')}`);
    }
    setInviteFriendId('');
    const [{ data: participantData, error: participantError }, { data: planData, error: planError }] = await Promise.all([
      supabase
        .from('shared_gym_participants')
        .select('user_id,invite_status,workout_mode,publish_consent,completed_at')
        .eq('shared_session_id', session.id),
      supabase
        .from('shared_gym_workout_plans')
        .select('plan,revision')
        .eq('shared_session_id', session.id)
        .maybeSingle(),
    ]);
    if (participantError) Alert.alert('Participants', participantError.message);
    if (planError) Alert.alert('Shared workout', planError.message);

    const ids = (participantData ?? []).map((item: any) => item.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from('public_profiles').select('user_id,username').in('user_id', ids)
      : { data: [] as any[] };
    setParticipants((participantData ?? []).map((item: any) => ({
      ...item,
      workout_mode: item.workout_mode ?? 'undecided',
      username: (profiles ?? []).find((person: any) => person.user_id === item.user_id)?.username ?? 'Member',
    })) as ParticipantRow[]);
    setPlan(normalizeSharedPlan(planData?.plan));
    setPlanRevision(Number(planData?.revision ?? session.plan_revision ?? 0));
  };

  useEffect(() => { refreshAll(); }, [profile.id]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!selected) return false;
      setSelected(null);
      return true;
    });
    return () => subscription.remove();
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const refresh = () => { loadSessions(); openSession(selected); };
    const channel = supabase.channel(`shared-gym-${selected.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_gym_sessions', filter: `id=eq.${selected.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_gym_participants', filter: `shared_session_id=eq.${selected.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_gym_workout_plans', filter: `shared_session_id=eq.${selected.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected?.id]);

  const sendInvite = async (targetSession?: SessionRow) => {
    if (!inviteFriendId) return Alert.alert('Choose a friend', 'Select who you want to train with.');
    const sessionAt = targetSession
      ? targetSession.planned_for && new Date(targetSession.planned_for).getTime() > Date.now()
        ? new Date(targetSession.planned_for)
        : new Date(Date.now() + 5 * 60000)
      : parseLocalDateTime(inviteDate, inviteTime);
    if (!sessionAt || sessionAt.getTime() <= Date.now()) return Alert.alert('Check the session time', 'Choose a future date and time.');
    const cleanTitle = (targetSession?.title ?? title).trim() || 'Gym session';
    setBusy(true);
    try {
      const { data, error } = await supabase.from('gym_invites').insert({
        sender_id: profile.id,
        recipient_id: inviteFriendId,
        session_at: sessionAt.toISOString(),
        gym_name: gymName.trim() || null,
        workout_name: cleanTitle,
        note: inviteNote.trim() || null,
        shared_session_id: targetSession?.id ?? null,
      }).select('id').single();
      if (error) throw error;
      await supabase.functions.invoke('friend-notifications', { body: { invite_id: data.id } }).catch(() => null);
      setInviteFriendId('');
      setInviteNote('');
      await refreshAll();
      if (targetSession) await openSession(targetSession);
      else {
        const { data: linked } = await supabase
          .from('shared_gym_sessions')
          .select('id,gym_invite_id,creator_id,leader_id,title,planned_for,status,started_at,plan_revision')
          .eq('gym_invite_id', data.id)
          .maybeSingle();
        if (linked) await openSession(linked as SessionRow);
      }
      Alert.alert('Gym invite sent', 'Your friend has been notified. This shared workout will update when they respond.');
    } catch (error: any) {
      Alert.alert('Could not send invite', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reply = async (status: 'accepted' | 'declined') => {
    if (!selected) return;
    let query = supabase.from('gym_invites').select('id').eq('recipient_id', profile.id).eq('status', 'pending');
    query = selected.gym_invite_id
      ? query.or(`id.eq.${selected.gym_invite_id},shared_session_id.eq.${selected.id}`)
      : query.eq('shared_session_id', selected.id);
    const { data: inviteRow, error: inviteLookupError } = await query.limit(1).maybeSingle();
    if (inviteLookupError) return Alert.alert('Gym invitation', inviteLookupError.message);
    if (inviteRow?.id) {
      const { error } = await supabase.from('gym_invites').update({ status, updated_at: new Date().toISOString() }).eq('id', inviteRow.id).eq('recipient_id', profile.id);
      if (error) return Alert.alert('Gym invitation', error.message);
      await supabase.functions.invoke('friend-notifications', { body: { invite_id: inviteRow.id, notification_kind: 'response' } }).catch(() => null);
    } else {
      const { error } = await supabase.from('shared_gym_participants').update({ invite_status: status }).eq('shared_session_id', selected.id).eq('user_id', profile.id);
      if (error) return Alert.alert('Gym invitation', error.message);
    }
    await openSession(selected);
  };

  const savePlan = async (nextPlan: SharedWorkoutPlanItem[]) => {
    if (!selected || !isLeader) return;
    setPlan(nextPlan);
    const { data, error } = await supabase.from('shared_gym_workout_plans').upsert({
      shared_session_id: selected.id,
      title: selected.title,
      plan: nextPlan,
      updated_by: profile.id,
    }, { onConflict: 'shared_session_id' }).select('revision').single();
    if (error) Alert.alert('Shared workout', error.message);
    else setPlanRevision(Number(data?.revision ?? planRevision + 1));
  };

  const addExercise = (exercise: LibraryExercise) => {
    const next = [...plan, {
      exercise_slug: exercise.slug,
      exercise_name: exercise.name,
      sets: exercise.metric_type === 'strength' ? 3 : 1,
      reps: exercise.metric_type === 'strength' ? Number(exercise.rep_max ?? 10) : 1,
      distance: '',
      duration: '',
    }];
    setPickerOpen(false);
    setPickerQuery('');
    savePlan(next);
  };

  const updatePlanItem = (index: number, patch: Partial<SharedWorkoutPlanItem>) => {
    const next = plan.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    savePlan(next);
  };

  const movePlanItem = (from: number, to: number) => {
    if (to < 0 || to >= plan.length) return;
    const next = [...plan];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    savePlan(next);
  };

  const startSharedSession = async () => {
    if (!selected) return;
    if (!plan.length) {
      Alert.alert('Add exercises', 'Build the shared workout before starting the gym session.');
      return;
    }
    const { error } = await supabase.rpc('start_shared_gym_session', { p_session_id: selected.id });
    if (error) {
      Alert.alert('Start shared session', error.message);
      return;
    }
    await chooseMode('synced');
  };

  const chooseMode = async (mode: 'synced' | 'individual') => {
    if (!selected) return;
    const { error } = await supabase.rpc('set_shared_gym_workout_mode', { p_session_id: selected.id, p_mode: mode });
    if (error) {
      Alert.alert('Gym workout', error.message);
      return;
    }
    if (mode === 'individual') {
      onStartIndividualWorkout();
      return;
    }
    if (!plan.length) {
      Alert.alert('Waiting for workout', 'The session leader has not added exercises yet. This page will update automatically.');
      return;
    }
    onStartSyncedWorkout({
      sharedSessionId: selected.id,
      title: selected.title,
      plan,
      isLeader,
      revision: planRevision,
    });
  };

  const transferLeader = async (participant: ParticipantRow) => {
    if (!selected) return;
    const { error } = await supabase.rpc('transfer_shared_gym_leader', {
      p_session_id: selected.id,
      p_new_leader: participant.user_id,
    });
    if (error) Alert.alert('Transfer workout control', error.message);
    else await loadSessions();
  };

  const toggleConsent = async () => {
    if (!selected || !mine) return;
    const { error } = await supabase.from('shared_gym_participants')
      .update({ publish_consent: !mine.publish_consent })
      .eq('shared_session_id', selected.id)
      .eq('user_id', profile.id);
    if (error) Alert.alert('Publishing consent', error.message);
    else await openSession(selected);
  };

  const publish = async () => {
    if (!selected) return;
    const included = participants.filter((person) => person.invite_status !== 'declined');
    const blocked = included.some((person) => person.invite_status !== 'accepted' || !person.publish_consent);
    if (blocked) {
      Alert.alert('Consent required', 'Every included participant must accept the session and approve the joint post.');
      return;
    }
    const { error } = await supabase.from('shared_workout_posts').insert({
      shared_session_id: selected.id,
      created_by: profile.id,
      caption: selected.title,
      published_at: new Date().toISOString(),
    });
    Alert.alert('Joint post', error ? error.message : 'The shared completed-workout post was created.');
  };

  if (!selected) {
    return <RefreshableScrollView onRefresh={refreshAll} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.topHeader}>
        <Pressable onPress={onBack} style={styles.backTarget} accessibilityRole="button" accessibilityLabel="Back"><FreshChevronIcon size={27} color={colors.text} direction="left"/></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.title}>Gym together</Text><Text style={styles.subtitle}>Invite a friend and build one shared workout.</Text></View>
      </View>

      <Card style={styles.heroCard}>
        <View style={styles.heroArtwork}><YouCardArtwork kind="gymTogether" width={142} height={104}/></View>
        <View style={styles.heroCopy}><Text style={styles.eyebrow}>SHARED TRAINING</Text><Text style={styles.heroTitle}>Plan it together</Text><Text style={styles.heroText}>Send the real gym invite here. Your friend receives the notification and can accept or decline.</Text></View>
      </Card>

      <Card style={styles.inviteCard}>
        <View style={styles.stepHeading}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View><View style={{ flex: 1 }}><Text style={styles.formTitle}>Choose a training friend</Text><Text style={styles.subtitle}>Only confirmed FitHub friends are shown.</Text></View></View>
        {friends.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendStrip}>
          {friends.map((friend) => {
            const active = inviteFriendId === friend.user_id;
            return <Pressable key={friend.user_id} onPress={() => setInviteFriendId(friend.user_id)} style={[styles.friendChoice, active && styles.friendChoiceActive]}>
              {friend.avatar_url ? <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar}/> : <View style={styles.friendInitial}><Text style={styles.friendInitialText}>{friend.username.slice(0, 1).toUpperCase()}</Text></View>}
              <Text numberOfLines={1} style={[styles.friendName, active && styles.friendNameActive]}>@{friend.username}</Text>
              <View style={[styles.choiceDot, active && styles.choiceDotActive]}>{active ? <Text style={styles.choiceTick}>✓</Text> : null}</View>
            </Pressable>;
          })}
        </ScrollView> : <View style={styles.emptyFriends}><Text style={styles.emptyTitle}>Add a training friend first</Text><Text style={styles.muted}>Once a friend request is accepted, they will appear here.</Text><OutlineButton title="OPEN FRIENDS" onPress={onOpenFriends}/></View>}

        <View style={styles.divider}/>
        <View style={styles.stepHeading}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View><View style={{ flex: 1 }}><Text style={styles.formTitle}>Set the session details</Text><Text style={styles.subtitle}>Your friend sees these details in the invite.</Text></View></View>
        <Text style={styles.fieldLabel}>WORKOUT NAME</Text>
        <Input value={title} onChangeText={setTitle} placeholder="For example: Push Day" maxLength={80}/>
        <View style={styles.inputRow}><View style={{ flex: 1 }}><Text style={styles.fieldLabel}>DATE</Text><Input value={inviteDate} onChangeText={setInviteDate} placeholder="YYYY-MM-DD" autoCapitalize="none"/></View><View style={{ width: 112 }}><Text style={styles.fieldLabel}>TIME</Text><Input value={inviteTime} onChangeText={setInviteTime} placeholder="17:00" autoCapitalize="none"/></View></View>
        <View style={styles.quickRow}><Pressable onPress={() => setInviteDate(tomorrowKey())} style={[styles.quickChoice, inviteDate === tomorrowKey() && styles.quickChoiceActive]}><Text style={[styles.quickChoiceText, inviteDate === tomorrowKey() && styles.quickChoiceTextActive]}>Tomorrow</Text></Pressable><Pressable onPress={() => setInviteDate(weekendKey())} style={[styles.quickChoice, inviteDate === weekendKey() && styles.quickChoiceActive]}><Text style={[styles.quickChoiceText, inviteDate === weekendKey() && styles.quickChoiceTextActive]}>This weekend</Text></Pressable>{['17:00','18:00','19:00'].map((value) => <Pressable key={value} onPress={() => setInviteTime(value)} style={[styles.quickTime, inviteTime === value && styles.quickChoiceActive]}><Text style={[styles.quickChoiceText, inviteTime === value && styles.quickChoiceTextActive]}>{value}</Text></Pressable>)}</View>
        <Text style={styles.fieldLabel}>GYM OR MEETING PLACE <Text style={styles.optional}>OPTIONAL</Text></Text>
        <Input value={gymName} onChangeText={setGymName} placeholder="Where are you training?" maxLength={120}/>
        <Text style={styles.fieldLabel}>MESSAGE <Text style={styles.optional}>OPTIONAL</Text></Text>
        <Input value={inviteNote} onChangeText={setInviteNote} placeholder="Add a short note" maxLength={240} multiline/>
        <Button title={busy ? 'SENDING INVITE…' : 'SEND GYM INVITE'} onPress={() => sendInvite()} disabled={busy || !friends.length}/>
        <Text style={styles.privacyNote}>Only the invited friend can see this session. Personal weights and completed sets remain private.</Text>
      </Card>

      <View style={styles.listHeading}><View><Text style={styles.eyebrow}>YOUR SESSIONS</Text><Text style={styles.listTitle}>Open and upcoming</Text></View><View style={styles.countPill}><Text style={styles.countText}>{sessions.length}</Text></View></View>
      {sessions.length ? sessions.map((session) => {
        const planned = session.planned_for ? new Date(session.planned_for) : null;
        return <Pressable key={session.id} onPress={() => openSession(session)} style={({ pressed }) => pressed && { opacity: .76 }}>
          <Card style={styles.sessionCard}>
            <View style={styles.sessionBadge}><Text style={styles.sessionBadgeText}>{session.status === 'active' ? 'LIVE' : session.status.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.sessionTitle}>{session.title}</Text><Text style={styles.muted}>{planned ? planned.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + planned.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Date not set'} · Tap to open</Text></View>
            <Text style={styles.arrow}>›</Text>
          </Card>
        </Pressable>;
      }) : <Card style={styles.emptySession}><Text style={styles.emptyTitle}>No shared sessions yet</Text><Text style={styles.muted}>Choose a friend above and send your first gym invite.</Text></Card>}
    </RefreshableScrollView>;
  }

  return <>
    <RefreshableScrollView onRefresh={() => openSession(selected)} contentContainerStyle={styles.wrap}>
      <View style={styles.topHeader}>
        <Pressable onPress={() => setSelected(null)} style={styles.backTarget} accessibilityRole="button" accessibilityLabel="Shared sessions"><FreshChevronIcon size={27} color={colors.text} direction="left"/></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.title}>{selected.title}</Text><Text style={styles.subtitle}>{selected.status === 'active' ? 'Session in progress' : 'Plan the session together'}</Text></View>
        <View style={styles.statusPill}><Text style={styles.statusText}>{selected.status.toUpperCase()}</Text></View>
      </View>

      <Card style={styles.roomSummary}><View style={styles.roomArt}><YouCardArtwork kind="gymTogether" width={116} height={78}/></View><View style={{ flex: 1 }}><Text style={styles.eyebrow}>SHARED WORKOUT ROOM</Text><Text style={styles.roomTitle}>{participants.filter((person) => person.invite_status === 'accepted').length} accepted · {plan.length} exercise{plan.length === 1 ? '' : 's'}</Text><Text style={styles.muted}>{selected.planned_for ? new Date(selected.planned_for).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Session time not set'}</Text></View></Card>

      {mine?.invite_status === 'pending' ? <Card>
        <SectionTitle title="Gym invitation" subtitle="Accept to choose a synced or individual workout when the session starts." />
        <View style={styles.buttonRow}><Button title="Accept" onPress={() => reply('accepted')} /><Button title="Decline" onPress={() => reply('declined')} secondary /></View>
      </Card> : null}

      {accepted && selected.status === 'active' ? <Card>
        <SectionTitle title="How are you training?" subtitle="Your weights, reps and completed sets stay on your own account in either mode." />
        <Button title="Use the same synced workout" onPress={() => chooseMode('synced')} />
        <OutlineButton title="Build my own workout" onPress={() => chooseMode('individual')} />
        {mine?.workout_mode !== 'undecided' ? <Text style={styles.choiceNote}>Current choice: {mine?.workout_mode === 'synced' ? 'same synced workout' : 'my own workout'}</Text> : null}
      </Card> : null}

      {isLeader ? <Card>
        <SectionTitle title="Shared workout plan" subtitle="Everyone in Same Workout mode receives these exercises and live order changes." />
        {!plan.length ? <Text style={styles.empty}>No exercises yet. Add the first exercise to build the plan.</Text> : null}
        {plan.map((item, index) => {
          const exercise = exerciseLibrary.find((candidate) => candidate.slug === item.exercise_slug);
          const image = exercise ? imageForExercise(exercise, profile.gender) : undefined;
          return <View key={`${item.exercise_slug}-${index}`} style={styles.planRow}>
            <View style={styles.imageFrame}>{image ? <Image source={image} style={styles.planImage} /> : null}</View>
            <View style={styles.planCopy}>
              <Text style={styles.planTarget}>{exercise?.targetArea ?? 'Exercise'}</Text>
              <Text style={styles.planName}>{item.exercise_name}</Text>
              {exercise?.metric_type === 'strength' ? <View style={styles.counterRow}>
                <Pressable style={styles.counterButton} onPress={() => updatePlanItem(index, { sets: Math.max(1, item.sets - 1) })}><Text style={styles.counterText}>−</Text></Pressable>
                <Text style={styles.counterValue}>{item.sets} sets</Text>
                <Pressable style={styles.counterButton} onPress={() => updatePlanItem(index, { sets: Math.min(12, item.sets + 1) })}><Text style={styles.counterText}>+</Text></Pressable>
                <Pressable style={styles.counterButton} onPress={() => updatePlanItem(index, { reps: Math.max(1, item.reps - 1) })}><Text style={styles.counterText}>−</Text></Pressable>
                <Text style={styles.counterValue}>{item.reps} reps</Text>
                <Pressable style={styles.counterButton} onPress={() => updatePlanItem(index, { reps: Math.min(100, item.reps + 1) })}><Text style={styles.counterText}>+</Text></Pressable>
              </View> : <Text style={styles.muted}>Time or distance is entered on each person’s phone.</Text>}
            </View>
            <View style={styles.orderColumn}>
              <Pressable onPress={() => movePlanItem(index, index - 1)} disabled={index === 0}><Text style={[styles.orderText, index === 0 && styles.disabled]}>↑</Text></Pressable>
              <Pressable onPress={() => movePlanItem(index, index + 1)} disabled={index === plan.length - 1}><Text style={[styles.orderText, index === plan.length - 1 && styles.disabled]}>↓</Text></Pressable>
              <Pressable onPress={() => savePlan(plan.filter((_, itemIndex) => itemIndex !== index))}><Text style={styles.remove}>×</Text></Pressable>
            </View>
          </View>;
        })}
        <OutlineButton title="+ Add exercise" onPress={() => setPickerOpen(true)} />
        <Button title={selected.status === 'active' ? 'Open synced workout' : 'Start gym session'} onPress={selected.status === 'active' ? () => chooseMode('synced') : startSharedSession} />
      </Card> : <Card>
        <SectionTitle title="Shared workout plan" subtitle="The leader controls the exercise list and order. Your personal results remain private." />
        {plan.map((item, index) => <View key={`${item.exercise_slug}-${index}`} style={styles.readOnlyPlan}><Text style={styles.planNumber}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.planName}>{item.exercise_name}</Text><Text style={styles.muted}>{item.sets} set{item.sets === 1 ? '' : 's'}{item.reps > 1 ? ` × ${item.reps} reps` : ''}</Text></View></View>)}
        {!plan.length ? <Text style={styles.empty}>Waiting for the session leader to add exercises.</Text> : null}
      </Card>}

      <Card>
        <SectionTitle title="Participants" subtitle="Only one leader controls the synced exercise plan at a time." />
        {participants.map((person) => <View key={person.user_id} style={styles.participantRow}>
          <View style={{ flex: 1 }}><Text style={styles.participantName}>@{person.username}{person.user_id === (selected.leader_id ?? selected.creator_id) ? ' · LEADER' : ''}</Text><Text style={styles.muted}>{person.invite_status} · {person.workout_mode === 'undecided' ? 'mode not selected' : person.workout_mode}</Text></View>
          {isLeader && person.user_id !== profile.id && person.invite_status === 'accepted' ? <Pressable onPress={() => transferLeader(person)} style={styles.transfer}><Text style={styles.transferText}>Make leader</Text></Pressable> : null}
        </View>)}
        {isLeader ? <View style={styles.addPeople}>
          <Text style={styles.fieldLabel}>INVITE ANOTHER FRIEND</Text>
          {availableFriends.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendStrip}>
            {availableFriends.map((friend) => {
              const active = inviteFriendId === friend.user_id;
              return <Pressable key={friend.user_id} onPress={() => setInviteFriendId(friend.user_id)} style={[styles.friendChoice, active && styles.friendChoiceActive]}>
                {friend.avatar_url ? <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar}/> : <View style={styles.friendInitial}><Text style={styles.friendInitialText}>{friend.username.slice(0, 1).toUpperCase()}</Text></View>}
                <Text numberOfLines={1} style={[styles.friendName, active && styles.friendNameActive]}>@{friend.username}</Text>
                <View style={[styles.choiceDot, active && styles.choiceDotActive]}>{active ? <Text style={styles.choiceTick}>✓</Text> : null}</View>
              </Pressable>;
            })}
          </ScrollView> : <Text style={styles.muted}>Every available friend is already included in this session.</Text>}
          <OutlineButton title={busy ? 'SENDING…' : 'SEND GYM INVITE'} onPress={() => sendInvite(selected)} disabled={busy || !inviteFriendId}/>
        </View> : null}
      </Card>

      {accepted ? <Card>
        <SectionTitle title="Optional joint post" subtitle="A joint completed-workout post is created only after every included participant approves it." />
        <OutlineButton title={mine?.publish_consent ? 'Withdraw my post consent' : 'Approve joint post'} onPress={toggleConsent} />
        {isLeader ? <Button title="Create joint completed-workout post" onPress={publish} /> : null}
      </Card> : null}
    </RefreshableScrollView>

    <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
      <View style={styles.modalShade}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}><Text style={styles.pickerTitle}>Add to shared workout</Text><Pressable onPress={() => setPickerOpen(false)}><Text style={styles.close}>×</Text></Pressable></View>
          <Input value={pickerQuery} onChangeText={setPickerQuery} placeholder="Search exercises, equipment or muscles…" />
          <ScrollView contentContainerStyle={styles.pickerList} keyboardShouldPersistTaps="handled">
            {pickerExercises.map((exercise) => {
              const image = imageForExercise(exercise, profile.gender);
              return <Pressable key={exercise.slug} onPress={() => addExercise(exercise)} style={styles.pickerRow}>
                <View style={styles.pickerImageFrame}>{image ? <Image source={image} style={styles.pickerImage} /> : null}</View>
                <View style={{ flex: 1 }}><Text style={styles.planTarget}>{exercise.targetArea}</Text><Text style={styles.planName}>{exercise.name}</Text><Text style={styles.muted}>{exercise.equipment}</Text></View>
                <Text style={styles.add}>+</Text>
              </Pressable>;
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 120, gap: 10, backgroundColor: colors.bg },
  topHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  backTarget: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontSize: 27, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  muted: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: .9 },
  heroCard: { minHeight: 150, flexDirection: 'row', alignItems: 'center', padding: 12, overflow: 'hidden', backgroundColor: isDark ? colors.panel : colors.panel2, borderColor: colors.primary },
  heroArtwork: { width: 145, height: 116, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D0F' },
  heroCopy: { flex: 1, paddingLeft: 9 },
  heroTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 4 },
  heroText: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  inviteCard: { borderRadius: 24, padding: 15 },
  stepHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  formTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  friendStrip: { gap: 9, paddingVertical: 3, paddingRight: 6 },
  friendChoice: { width: 104, minHeight: 118, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, padding: 9, alignItems: 'center', justifyContent: 'center' },
  friendChoiceActive: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
  friendAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 7 },
  friendInitial: { width: 50, height: 50, borderRadius: 25, marginBottom: 7, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  friendInitialText: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  friendName: { color: colors.text, fontSize: 10, fontWeight: '800', maxWidth: 84 },
  friendNameActive: { color: colors.primary },
  choiceDot: { width: 20, height: 20, borderRadius: 10, marginTop: 7, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  choiceDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceTick: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  emptyFriends: { borderRadius: 17, padding: 13, backgroundColor: colors.panel2 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 15 },
  fieldLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: .5, marginTop: 8, marginBottom: 4 },
  optional: { color: colors.primary, fontSize: 8 },
  inputRow: { flexDirection: 'row', gap: 9 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: -2, marginBottom: 4 },
  quickChoice: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  quickTime: { minWidth: 54, minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  quickChoiceActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  quickChoiceText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  quickChoiceTextActive: { color: colors.primary },
  privacyNote: { color: colors.muted, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 8 },
  listHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8, marginBottom: 1 },
  listTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 },
  countPill: { minWidth: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  countText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  sessionCard: { minHeight: 90, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20 },
  sessionBadge: { minWidth: 54, height: 54, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  sessionBadgeText: { color: colors.primary, fontSize: 8, fontWeight: '900' },
  emptySession: { alignItems: 'center', paddingVertical: 25, borderRadius: 20 },
  roomSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? colors.panel : colors.panel2, borderColor: colors.primary },
  roomArt: { width: 118, height: 80, borderRadius: 17, overflow: 'hidden', backgroundColor: '#0B0D0F', alignItems: 'center', justifyContent: 'center' },
  roomTitle: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 4 },
  addPeople: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 18, fontSize: 11 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { borderWidth: 1, borderColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primarySoft },
  statusText: { color: colors.primary, fontWeight: '900', fontSize: 8 },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  sessionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  arrow: { color: colors.primary, fontSize: 30, fontWeight: '300' },
  buttonRow: { flexDirection: 'row', gap: 8 },
  choiceNote: { color: colors.primary, textAlign: 'center', fontSize: 10, fontWeight: '900', marginTop: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  imageFrame: { width: 92, height: 72, borderRadius: isDark ? 12 : 0, backgroundColor: isDark ? '#FFFFFF' : 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: isDark ? 3 : 0 },
  planImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  planCopy: { flex: 1 },
  planTarget: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  planName: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  counterButton: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2 },
  counterText: { color: colors.primary, fontWeight: '900', fontSize: 17 },
  counterValue: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  orderColumn: { width: 34, alignItems: 'center', gap: 5 },
  orderText: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  disabled: { opacity: .2 },
  remove: { color: colors.danger, fontSize: 20, fontWeight: '900' },
  readOnlyPlan: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  planNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, color: colors.primary, textAlign: 'center', lineHeight: 28, fontSize: 10, fontWeight: '900' },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  participantName: { color: colors.text, fontWeight: '900', fontSize: 12 },
  transfer: { minHeight: 36, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  transferText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' },
  pickerSheet: { height: '86%', backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 16 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pickerTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  close: { color: colors.text, fontSize: 31, lineHeight: 34 },
  pickerList: { paddingBottom: 50 },
  pickerRow: { minHeight: 102, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 9 },
  pickerImageFrame: { width: 110, height: 82, borderRadius: isDark ? 12 : 0, backgroundColor: isDark ? '#FFFFFF' : 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pickerImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  add: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primary, color: colors.primary, textAlign: 'center', lineHeight: 40, fontSize: 24, fontWeight: '900' },
});
