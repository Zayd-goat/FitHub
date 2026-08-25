import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, OutlineButton, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { exerciseLibrary, LibraryExercise } from '../data/exerciseLibrary';
import { imageForExercise } from '../data/exerciseVisuals';
import { normalizeSharedPlan, SharedWorkoutLaunch, SharedWorkoutPlanItem } from '../lib/sharedGym';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';

type SessionRow = {
  id: string;
  creator_id: string;
  leader_id: string | null;
  title: string;
  planned_for: string | null;
  status: string;
  started_at: string | null;
  plan_revision: number | null;
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
  const [username, setUsername] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const mine = participants.find((item) => item.user_id === profile.id);
  const isLeader = !!selected && (selected.leader_id ?? selected.creator_id) === profile.id;
  const accepted = mine?.invite_status === 'accepted' || selected?.creator_id === profile.id;

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
      .select('id,creator_id,leader_id,title,planned_for,status,started_at,plan_revision')
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

  const openSession = async (session: SessionRow) => {
    setSelected(session);
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

  useEffect(() => { loadSessions(); }, [profile.id]);

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

  const createSession = async () => {
    setBusy(true);
    const cleanTitle = title.trim() || 'Gym session';
    const { data, error } = await supabase
      .from('shared_gym_sessions')
      .insert({ creator_id: profile.id, leader_id: profile.id, title: cleanTitle, status: 'ready' })
      .select('id,creator_id,leader_id,title,planned_for,status,started_at,plan_revision')
      .single();
    if (!error && data) {
      const { error: participantError } = await supabase.from('shared_gym_participants').insert({
        shared_session_id: data.id,
        user_id: profile.id,
        invite_status: 'accepted',
        workout_mode: 'undecided',
        publish_consent: false,
      });
      if (participantError) Alert.alert('Shared gym session', participantError.message);
      await loadSessions();
      await openSession(data as SessionRow);
    } else if (error) Alert.alert('Shared gym session', error.message);
    setBusy(false);
  };

  const invite = async () => {
    if (!selected) return;
    const clean = username.trim().replace(/^@/, '');
    if (!clean) return;
    const { data: user } = await supabase.from('public_profiles').select('user_id').eq('username', clean).maybeSingle();
    if (!user) {
      Alert.alert('Friend not found', 'Enter the exact FitHub username, or send a scheduled gym invite from the Friends page.');
      return;
    }
    const { error } = await supabase.from('shared_gym_participants').insert({
      shared_session_id: selected.id,
      user_id: user.user_id,
      invite_status: 'pending',
      workout_mode: 'undecided',
      publish_consent: false,
    });
    if (error) Alert.alert('Gym invite', error.message);
    else {
      setUsername('');
      await openSession(selected);
      Alert.alert('Invite ready', 'The invitation is listed in FitHub. For a push notification, use the Gym invite option on the Friends page.');
    }
  };

  const reply = async (status: 'accepted' | 'declined') => {
    if (!selected) return;
    const { error } = await supabase
      .from('shared_gym_participants')
      .update({ invite_status: status })
      .eq('shared_session_id', selected.id)
      .eq('user_id', profile.id);
    if (error) Alert.alert('Gym invitation', error.message);
    else await openSession(selected);
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
    const blocked = participants.some((person) => person.invite_status !== 'accepted' || !person.publish_consent);
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
    return <RefreshableScrollView onRefresh={loadSessions} contentContainerStyle={styles.wrap}>
      <OutlineButton title="‹ Back" onPress={onBack} />
      <Text style={styles.title}>Shared gym sessions</Text>
      <Text style={styles.subtitle}>Train together with one synced exercise plan, or let each person build their own workout.</Text>
      <Card>
        <SectionTitle title="Create a session" subtitle="You become the workout leader. Control can be transferred later." />
        <Input value={title} onChangeText={setTitle} placeholder="Gym session name" />
        <Button title={busy ? 'Creating…' : 'Create shared session'} onPress={createSession} disabled={busy} />
        <OutlineButton title="Open scheduled gym invites" onPress={onOpenFriends} />
      </Card>
      {sessions.map((session) => <Pressable key={session.id} onPress={() => openSession(session)}>
        <Card>
          <View style={styles.sessionRow}>
            <View style={{ flex: 1 }}><Text style={styles.sessionTitle}>{session.title}</Text><Text style={styles.muted}>{session.status === 'active' ? 'In progress' : 'Open session'} · tap for workout options</Text></View>
            <Text style={styles.arrow}>›</Text>
          </View>
        </Card>
      </Pressable>)}
    </RefreshableScrollView>;
  }

  return <>
    <RefreshableScrollView onRefresh={() => openSession(selected)} contentContainerStyle={styles.wrap}>
      <OutlineButton title="‹ Shared sessions" onPress={() => setSelected(null)} />
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}><Text style={styles.title}>{selected.title}</Text><Text style={styles.subtitle}>{selected.status === 'active' ? 'Session in progress' : 'Plan the session together'}</Text></View>
        <View style={styles.statusPill}><Text style={styles.statusText}>{selected.status.toUpperCase()}</Text></View>
      </View>

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
        {isLeader ? <><Input value={username} onChangeText={setUsername} placeholder="@username" autoCapitalize="none" /><OutlineButton title="Invite by username" onPress={invite} /></> : null}
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
  title: { color: colors.text, fontSize: 27, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  muted: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
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
