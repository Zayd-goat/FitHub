import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, OutlineButton, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { profileAge } from '../lib/profileAge';
import { supabase } from '../lib/supabase';
import { displayToKm, formatWeight, kmToDisplay } from '../lib/units';

export type CommunityHubTab = 'challenges' | 'clubs';

type ChallengeDraft = {
  title: string;
  description: string;
  targetType: 'workouts' | 'active_days' | 'distance' | 'prs';
  target: string;
  days: string;
  difficulty: number;
  visibility: 'private' | 'friends' | 'public';
  inviteIds: string[];
};

const emptyDraft: ChallengeDraft = {
  title: '', description: '', targetType: 'workouts', target: '3', days: '7',
  difficulty: 3, visibility: 'private', inviteIds: [],
};

export default function CommunityHubScreen({
  profile,
  initialTab = 'challenges',
  onBack,
}: {
  profile: Profile;
  initialTab?: CommunityHubTab;
  onBack: () => void;
}) {
  const { colors, distanceUnit, weightUnit } = useTheme();
  const styles = createStyles(colors);
  const age = profileAge(profile) ?? 13;
  const adult = age >= 18;
  const [tab, setTab] = useState<CommunityHubTab>(initialTab);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draft, setDraft] = useState<ChallengeDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => setTab(initialTab), [initialTab]);

  const calculateProgress = async (challenge: any) => {
    const start = challenge.starts_at || new Date(0).toISOString();
    const end = challenge.ends_at || new Date(8640000000000000).toISOString();
    if (challenge.target_type === 'prs' && adult) {
      const { count } = await supabase.from('pr_events').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).gte('achieved_at', start).lte('achieved_at', end);
      return Number(count ?? 0);
    }
    const { data: sessionRows } = await supabase.from('workout_sessions').select('id,ended_at').eq('user_id', profile.id).eq('completed', true).gte('ended_at', start).lte('ended_at', end);
    const sessions = sessionRows ?? [];
    if (challenge.target_type === 'active_days') return new Set(sessions.map((row: any) => new Date(row.ended_at).toDateString())).size;
    if (challenge.target_type === 'distance') {
      const ids = sessions.map((row: any) => row.id);
      if (!ids.length) return 0;
      const { data } = await supabase.from('workout_sets').select('distance_km').eq('user_id', profile.id).in('session_id', ids);
      return (data ?? []).reduce((total: number, row: any) => total + Number(row.distance_km ?? 0), 0);
    }
    return sessions.length;
  };

  const load = async () => {
    const [challengeResult, friendResult] = await Promise.all([
      supabase.from('community_challenges').select('*').is('archived_at', null).order('created_at', { ascending: false }).limit(75),
      supabase.rpc('get_my_friends'),
    ]);
    if (challengeResult.error) Alert.alert('Community challenges', challengeResult.error.message);
    const visible = (challengeResult.data ?? []).filter((item: any) => age >= Number(item.minimum_age ?? 13) && (!item.maximum_age || age <= Number(item.maximum_age)));
    setChallenges(visible);
    setFriends(friendResult.data ?? []);

    if (visible.length) {
      const ids = visible.map((item: any) => item.id);
      const { data: memberRows } = await supabase.from('community_challenge_members').select('*').in('challenge_id', ids);
      const nextMembers = memberRows ?? [];
      const mine = nextMembers.filter((member: any) => member.user_id === profile.id && (member.status === 'joined' || member.status === 'completed'));
      for (const membership of mine) {
        const challenge = visible.find((item: any) => item.id === membership.challenge_id);
        if (!challenge) continue;
        const progress = await calculateProgress(challenge);
        const completed = progress >= Number(challenge.target_value);
        const updated = {
          progress_value: progress,
          status: completed ? 'completed' : 'joined',
          completed_at: completed ? (membership.completed_at || new Date().toISOString()) : null,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('community_challenge_members').update(updated).eq('challenge_id', challenge.id).eq('user_id', profile.id);
        if (!error) Object.assign(membership, updated);
      }
      setMembers(nextMembers);
    } else setMembers([]);

    if (adult) {
      const refresh = await supabase.rpc('refresh_my_current_clubs');
      if (refresh.error) Alert.alert('Clubs', refresh.error.message);
      const result = await supabase.rpc('get_my_current_clubs_with_counts');
      if (result.error) Alert.alert('Clubs', result.error.message);
      setClubs(result.data ?? []);
    } else setClubs([]);
  };

  useEffect(() => { load(); }, [profile.id, age]);

  const toggleInvite = (userId: string) => setDraft((current) => ({
    ...current,
    inviteIds: current.inviteIds.includes(userId) ? current.inviteIds.filter((id) => id !== userId) : [...current.inviteIds, userId],
  }));

  const createChallenge = async () => {
    const displayTarget = Number(draft.target);
    const days = Number(draft.days);
    if (!draft.title.trim() || !Number.isFinite(displayTarget) || displayTarget <= 0 || !Number.isInteger(days) || days < 1 || days > 90) {
      return Alert.alert('Check challenge details', 'Add a title, a positive target and a duration from 1 to 90 days.');
    }
    if (!adult && !['workouts', 'active_days'].includes(draft.targetType)) {
      return Alert.alert('Choose a consistency target', 'Teen accounts can create workout or active-day challenges.');
    }
    if (!adult && displayTarget > days) {
      return Alert.alert('Check the target', 'For teen accounts, the target cannot be higher than the number of challenge days.');
    }
    setSaving(true);
    try {
      const ends = new Date();
      ends.setDate(ends.getDate() + days);
      const target = draft.targetType === 'distance' ? displayToKm(displayTarget, distanceUnit) : displayTarget;
      const unitMap: Record<string, string> = { workouts: 'workouts', active_days: 'days', distance: 'km', prs: 'PRs' };
      const payload: any = {
        creator_id: profile.id,
        creator_display_name: profile.username,
        title: draft.title.trim().slice(0, 100),
        description: draft.description.trim().slice(0, 500) || null,
        target_type: draft.targetType,
        target_value: target,
        unit: unitMap[draft.targetType],
        visibility: adult ? draft.visibility : (draft.visibility === 'public' ? 'friends' : draft.visibility),
        difficulty: draft.difficulty,
        difficulty_source: 'creator',
        minimum_age: adult ? 18 : 13,
        maximum_age: adult ? null : 17,
        starts_at: new Date().toISOString(),
        ends_at: ends.toISOString(),
      };
      const { data, error } = await supabase.from('community_challenges').insert(payload).select('id').single();
      if (error) throw error;
      const newMembers: any[] = [{ challenge_id: data.id, user_id: profile.id, display_name: profile.username, status: 'joined', joined_at: new Date().toISOString() }];
      for (const id of draft.inviteIds) {
        const friend = friends.find((item: any) => item.user_id === id);
        newMembers.push({ challenge_id: data.id, user_id: id, display_name: friend?.username || 'FitHub user', status: 'invited' });
      }
      const { error: memberError } = await supabase.from('community_challenge_members').insert(newMembers);
      if (memberError) throw memberError;
      setDraft(emptyDraft);
      setBuilderOpen(false);
      await load();
    } catch (error: any) {
      Alert.alert('Could not create challenge', error?.message ?? 'Please try again.');
    } finally { setSaving(false); }
  };

  const joinChallenge = async (challenge: any) => {
    const membership = members.find((item: any) => item.challenge_id === challenge.id && item.user_id === profile.id);
    const values = { status: 'joined', joined_at: membership?.joined_at || new Date().toISOString(), updated_at: new Date().toISOString() };
    const result = membership
      ? await supabase.from('community_challenge_members').update(values).eq('challenge_id', challenge.id).eq('user_id', profile.id)
      : await supabase.from('community_challenge_members').insert({ challenge_id: challenge.id, user_id: profile.id, display_name: profile.username, ...values });
    if (result.error) Alert.alert('Challenge', result.error.message); else load();
  };

  const declineInvite = async (challengeId: string) => {
    const { error } = await supabase.from('community_challenge_members').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('challenge_id', challengeId).eq('user_id', profile.id);
    if (error) Alert.alert('Challenge invite', error.message); else load();
  };

  const completedCount = useMemo(() => members.filter((item: any) => item.user_id === profile.id && item.status === 'completed').length, [members, profile.id]);
  const targetTypes = adult ? ['workouts', 'active_days', 'distance', 'prs'] as const : ['workouts', 'active_days'] as const;
  const visibilityOptions = adult ? ['private', 'friends', 'public'] as const : ['private', 'friends'] as const;

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}><Text style={styles.back}>‹</Text></Pressable>
      <View style={{ flex: 1 }}><Text style={styles.title}>Community</Text><Text style={styles.subtitle}>Challenges and clubs in one place.</Text></View>
    </View>
    <View style={styles.tabs}>
      <HubTab label="Challenges" active={tab === 'challenges'} onPress={() => setTab('challenges')} />
      <HubTab label="Clubs" active={tab === 'clubs'} onPress={() => setTab('clubs')} />
    </View>

    {tab === 'challenges' ? <View>
      <Card style={styles.introCard}>
        <View style={styles.introIcon}><Text style={styles.introIconText}>🏆</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.introTitle}>Community challenges</Text><Text style={styles.introText}>Join friends, track completed activity and celebrate steady progress.</Text></View>
      </Card>
      <Card>
        <View style={styles.builderHead}><View style={{ flex: 1 }}><SectionTitle title="Create a challenge" subtitle={adult ? 'Choose a target, visibility and friends to invite.' : 'Teen accounts use consistency-based targets and private or friends visibility.'} /></View><OutlineButton compact title={builderOpen ? 'CLOSE' : '+ CREATE'} onPress={() => setBuilderOpen(!builderOpen)} /></View>
        {builderOpen ? <View>
          <Input value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} placeholder="Challenge title" maxLength={100} />
          <Input value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} placeholder="Description (optional)" maxLength={500} />
          <Text style={styles.fieldLabel}>Target type</Text>
          <View style={styles.chips}>{targetTypes.map((value) => <Chip key={value} label={value.replace('_', ' ')} active={draft.targetType === value} onPress={() => setDraft({ ...draft, targetType: value })} />)}</View>
          <View style={styles.two}><Input style={{ flex: 1 }} value={draft.target} onChangeText={(target) => setDraft({ ...draft, target })} keyboardType="decimal-pad" placeholder={draft.targetType === 'distance' ? `Target (${distanceUnit})` : 'Target'} /><Input style={{ flex: 1 }} value={draft.days} onChangeText={(days) => setDraft({ ...draft, days })} keyboardType="number-pad" placeholder="Days (max 90)" /></View>
          <Text style={styles.fieldLabel}>Difficulty label</Text>
          <View style={styles.chips}>{[1, 2, 3, 4, 5].map((value) => <Chip key={value} label={`${value}/5`} active={draft.difficulty === value} onPress={() => setDraft({ ...draft, difficulty: value })} />)}</View>
          <Text style={styles.fieldLabel}>Who can see it?</Text>
          <View style={styles.chips}>{visibilityOptions.map((value) => <Chip key={value} label={value} active={draft.visibility === value} onPress={() => setDraft({ ...draft, visibility: value })} />)}</View>
          {friends.length ? <><Text style={styles.fieldLabel}>Invite friends (optional)</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendPicker}>{friends.map((friend: any) => { const active = draft.inviteIds.includes(friend.user_id); return <Pressable key={friend.user_id} onPress={() => toggleInvite(friend.user_id)} style={[styles.friendChip, active && styles.friendChipActive]}><View style={styles.friendAvatar}><Text style={styles.friendAvatarText}>{String(friend.username || '?').slice(0, 1).toUpperCase()}</Text></View><Text style={[styles.friendName, active && styles.friendNameActive]}>@{friend.username}</Text></Pressable>; })}</ScrollView></> : null}
          <Button title={saving ? 'CREATING…' : 'CREATE CHALLENGE'} onPress={createChallenge} disabled={saving} />
        </View> : null}
      </Card>

      <SectionTitle title="Available challenges" subtitle={`${completedCount} completed • progress refreshes from completed workout history`} />
      {challenges.length ? challenges.map((challenge: any) => {
        const mine = members.find((item: any) => item.challenge_id === challenge.id && item.user_id === profile.id);
        const progress = Number(mine?.progress_value ?? 0);
        const target = Number(challenge.target_value ?? 1);
        const invited = mine?.status === 'invited';
        const completed = mine?.status === 'completed' || progress >= target;
        const creator = challenge.creator_id === profile.id;
        const displayProgress = challenge.target_type === 'distance' ? kmToDisplay(progress, distanceUnit) : progress;
        const displayTarget = challenge.target_type === 'distance' ? kmToDisplay(target, distanceUnit) : target;
        return <Card key={challenge.id} style={completed ? styles.completedCard : undefined}>
          <View style={styles.challengeTop}>
            <View style={{ flex: 1 }}><Text style={styles.challengeTitle}>{completed ? '✓ ' : invited ? '✉ ' : ''}{challenge.title}</Text><Text style={styles.meta}>{challenge.difficulty_source === 'official' ? 'FitHub challenge' : `Created by @${challenge.creator_display_name}`} • {challenge.visibility}</Text>{challenge.description ? <Text style={styles.description}>{challenge.description}</Text> : null}</View>
            {!creator && !mine ? <OutlineButton compact title="JOIN" onPress={() => joinChallenge(challenge)} /> : null}
          </View>
          <View style={styles.progressRow}><Text style={styles.progress}>{displayProgress.toFixed(challenge.target_type === 'distance' ? 1 : 0)} / {displayTarget.toFixed(challenge.target_type === 'distance' ? 1 : 0)} {challenge.target_type === 'distance' ? distanceUnit : challenge.unit}</Text><Text style={styles.difficulty}>{challenge.difficulty ?? 3}/5</Text></View>
          <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (progress / Math.max(1, target)) * 100)}%` }]} /></View>
          <Text style={styles.meta}>{completed ? 'Completed' : mine?.status === 'joined' ? 'In progress' : invited ? 'Invitation waiting' : 'Available'}{challenge.ends_at ? ` • ends ${new Date(challenge.ends_at).toLocaleDateString()}` : ''}</Text>
          {invited ? <View style={styles.inviteActions}><OutlineButton compact title="ACCEPT" onPress={() => joinChallenge(challenge)} /><Pressable onPress={() => declineInvite(challenge.id)} style={styles.decline}><Text style={styles.declineText}>DECLINE</Text></Pressable></View> : null}
        </Card>;
      }) : <Card><Text style={styles.empty}>No challenges are available yet. You can create one above.</Text></Card>}
    </View> : <View>
      <Card style={styles.introCard}>
        <View style={[styles.introIcon, styles.clubIntroIcon]}><Text style={styles.clubStar}>★</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.introTitle}>Clubs</Text><Text style={styles.introText}>Your highest current milestone for each supported lift.</Text></View>
      </Card>
      {!adult ? <Card><SectionTitle title="Load-based clubs are hidden for under-18 accounts" subtitle="FitHub keeps younger users focused on technique, consistency and coached progress rather than load thresholds." /></Card> : <>
        {clubs.length ? <View style={styles.clubGrid}>{clubs.map((club: any) => <View key={club.club_key} style={styles.clubCard}><Text style={styles.clubStar}>★</Text><Text style={styles.clubValue}>{formatWeight(Number(club.threshold_kg), weightUnit, 0)}</Text><Text style={styles.clubName}>{club.exercise_name} club</Text><Text style={styles.clubState}>{Number(club.active_member_count ?? 1).toLocaleString()} active member{Number(club.active_member_count ?? 1) === 1 ? '' : 's'}</Text><Text style={styles.clubDate}>Best recorded: {formatWeight(Number(club.qualifying_weight_kg), weightUnit, 1)}</Text></View>)}</View> : <Card><SectionTitle title="No current clubs yet" subtitle="Completed workout history is checked automatically whenever this page opens." /></Card>}
        <Card><SectionTitle title="How clubs work" subtitle="A completed supported lift is matched by its normalized exercise name. Only the highest qualifying club for each lift stays active, while every achieved milestone remains in your history." /></Card>
      </>}
    </View>}
  </RefreshableScrollView>;
}

function HubTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingTop: 10, paddingBottom: 42 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 }, backButton: { width: 34, height: 44, justifyContent: 'center' }, back: { color: colors.text, fontSize: 38, fontWeight: '300' }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, subtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.panel2, borderRadius: 14, padding: 4, marginBottom: 15 }, tab: { flex: 1, minHeight: 43, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, tabActive: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.primary }, tabText: { color: colors.muted, fontWeight: '800', fontSize: 12 }, tabTextActive: { color: colors.primary, fontWeight: '900' },
  introCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderColor: colors.primary }, introIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, introIconText: { fontSize: 29 }, introTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, introText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  builderHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 6, marginBottom: 7 }, chips: { flexDirection: 'row', flexWrap: 'wrap' }, two: { flexDirection: 'row', gap: 8 }, friendPicker: { paddingBottom: 10, gap: 7 }, friendChip: { minHeight: 43, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', gap: 7 }, friendChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, friendAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' }, friendAvatarText: { color: colors.text, fontWeight: '900', fontSize: 10 }, friendName: { color: colors.muted, fontSize: 10, fontWeight: '800' }, friendNameActive: { color: colors.primary },
  challengeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, challengeTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, description: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 6 }, meta: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 }, progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 }, progress: { color: colors.blue, fontSize: 17, fontWeight: '900' }, difficulty: { color: colors.gold, fontSize: 10, fontWeight: '900' }, track: { height: 9, borderRadius: 99, backgroundColor: colors.panel2, overflow: 'hidden', marginVertical: 8 }, fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 99 }, completedCard: { borderColor: colors.green }, inviteActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 9 }, decline: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 7 }, declineText: { color: colors.danger, fontSize: 10, fontWeight: '900' }, empty: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  clubIntroIcon: { backgroundColor: colors.goldSoft }, clubStar: { color: colors.gold, fontSize: 24 }, clubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 9 }, clubCard: { width: '48%', minHeight: 170, borderRadius: 16, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.goldSoft, padding: 14 }, clubValue: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 8 }, clubName: { color: colors.text, fontWeight: '800', fontSize: 11, lineHeight: 15, marginTop: 2 }, clubState: { color: colors.muted, fontSize: 8, fontWeight: '900', marginTop: 10, textTransform: 'uppercase' }, clubDate: { color: colors.muted, fontSize: 8, marginTop: 5 },
});
