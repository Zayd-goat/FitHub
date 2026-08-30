import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import { Button, Card, Chip, Input, RefreshableScrollView, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { profileAge } from '../lib/profileAge';
import { supabase } from '../lib/supabase';
import { displayToKm, formatWeight, kmToDisplay } from '../lib/units';

export type CommunityHubTab = 'challenges' | 'clubs';
type ChallengeFilter = 'explore' | 'active' | 'invites' | 'completed';

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
  title: '',
  description: '',
  targetType: 'workouts',
  target: '3',
  days: '7',
  difficulty: 3,
  visibility: 'private',
  inviteIds: [],
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
  const { colors, distanceUnit, weightUnit, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const age = profileAge(profile) ?? 13;
  const adult = age >= 18;
  const [tab, setTab] = useState<CommunityHubTab>(initialTab);
  const [challengeFilter, setChallengeFilter] = useState<ChallengeFilter>('explore');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [clubError, setClubError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState(1);
  const [draft, setDraft] = useState<ChallengeDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => setTab(initialTab), [initialTab]);

  const calculateProgress = async (challenge: any) => {
    const start = challenge.starts_at || new Date(0).toISOString();
    const end = challenge.ends_at || new Date(8640000000000000).toISOString();
    if (challenge.target_type === 'prs' && adult) {
      const { count } = await supabase
        .from('pr_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('achieved_at', start)
        .lte('achieved_at', end);
      return Number(count ?? 0);
    }
    const { data: sessionRows } = await supabase
      .from('workout_sessions')
      .select('id,ended_at')
      .eq('user_id', profile.id)
      .eq('completed', true)
      .gte('ended_at', start)
      .lte('ended_at', end);
    const sessions = sessionRows ?? [];
    if (challenge.target_type === 'active_days') {
      return new Set(sessions.map((row: any) => new Date(row.ended_at).toDateString())).size;
    }
    if (challenge.target_type === 'distance') {
      const ids = sessions.map((row: any) => row.id);
      if (!ids.length) return 0;
      const { data } = await supabase
        .from('workout_sets')
        .select('distance_km')
        .eq('user_id', profile.id)
        .in('session_id', ids);
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
    const visible = (challengeResult.data ?? []).filter((item: any) => {
      return age >= Number(item.minimum_age ?? 13) && (!item.maximum_age || age <= Number(item.maximum_age));
    });
    setChallenges(visible);
    setFriends(friendResult.data ?? []);

    if (visible.length) {
      const ids = visible.map((item: any) => item.id);
      const { data: memberRows } = await supabase
        .from('community_challenge_members')
        .select('*')
        .in('challenge_id', ids);
      const nextMembers = memberRows ?? [];
      const mine = nextMembers.filter((member: any) => {
        return member.user_id === profile.id && (member.status === 'joined' || member.status === 'completed');
      });
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
        const { error } = await supabase
          .from('community_challenge_members')
          .update(updated)
          .eq('challenge_id', challenge.id)
          .eq('user_id', profile.id);
        if (!error) Object.assign(membership, updated);
      }
      setMembers(nextMembers);
    } else {
      setMembers([]);
    }

    if (adult) {
      setClubError(null);
      const refresh = await supabase.rpc('refresh_my_current_clubs');
      if (refresh.error) {
        setClubs([]);
        setClubError('Your clubs could not be refreshed. Install the 1.6.20 Supabase update, then tap Retry.');
        return;
      }
      const result = await supabase.rpc('get_my_current_clubs_with_counts');
      if (result.error) {
        setClubs([]);
        setClubError('Your club history is temporarily unavailable. Pull down or tap Retry after installing the database update.');
        return;
      }
      setClubs(result.data ?? []);
    } else {
      setClubs([]);
      setClubError(null);
    }
  };

  useEffect(() => {
    load();
  }, [profile.id, age]);

  const toggleInvite = (userId: string) => {
    setDraft((current) => ({
      ...current,
      inviteIds: current.inviteIds.includes(userId)
        ? current.inviteIds.filter((id) => id !== userId)
        : [...current.inviteIds, userId],
    }));
  };

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
      const unitMap: Record<string, string> = {
        workouts: 'workouts',
        active_days: 'days',
        distance: 'km',
        prs: 'PRs',
      };
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
      const newMembers: any[] = [{
        challenge_id: data.id,
        user_id: profile.id,
        display_name: profile.username,
        status: 'joined',
        joined_at: new Date().toISOString(),
      }];
      for (const id of draft.inviteIds) {
        const friend = friends.find((item: any) => item.user_id === id);
        newMembers.push({
          challenge_id: data.id,
          user_id: id,
          display_name: friend?.username || 'FitHub user',
          status: 'invited',
        });
      }
      const { error: memberError } = await supabase.from('community_challenge_members').insert(newMembers);
      if (memberError) throw memberError;
      setDraft(emptyDraft);
      setBuilderStep(1);
      setBuilderOpen(false);
      await load();
    } catch (error: any) {
      Alert.alert('Could not create challenge', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const joinChallenge = async (challenge: any) => {
    const membership = members.find((item: any) => {
      return item.challenge_id === challenge.id && item.user_id === profile.id;
    });
    const values = {
      status: 'joined',
      joined_at: membership?.joined_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const result = membership
      ? await supabase
        .from('community_challenge_members')
        .update(values)
        .eq('challenge_id', challenge.id)
        .eq('user_id', profile.id)
      : await supabase
        .from('community_challenge_members')
        .insert({
          challenge_id: challenge.id,
          user_id: profile.id,
          display_name: profile.username,
          ...values,
        });
    if (result.error) Alert.alert('Challenge', result.error.message);
    else load();
  };

  const declineInvite = async (challengeId: string) => {
    const { error } = await supabase
      .from('community_challenge_members')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('challenge_id', challengeId)
      .eq('user_id', profile.id);
    if (error) Alert.alert('Challenge invite', error.message);
    else load();
  };

  const mine = useMemo(() => {
    return members.filter((item: any) => item.user_id === profile.id);
  }, [members, profile.id]);
  const completedCount = useMemo(() => mine.filter((item: any) => item.status === 'completed').length, [mine]);
  const inviteCount = useMemo(() => mine.filter((item: any) => item.status === 'invited').length, [mine]);
  const activeCount = useMemo(() => mine.filter((item: any) => item.status === 'joined').length, [mine]);
  const targetTypes = adult
    ? ['workouts', 'active_days', 'distance', 'prs'] as const
    : ['workouts', 'active_days'] as const;
  const visibilityOptions = adult
    ? ['private', 'friends', 'public'] as const
    : ['private', 'friends'] as const;

  const filteredChallenges = useMemo(() => {
    if (challengeFilter === 'explore') return challenges;
    return challenges.filter((challenge: any) => {
      const membership = mine.find((item: any) => item.challenge_id === challenge.id);
      if (challengeFilter === 'active') return membership?.status === 'joined';
      if (challengeFilter === 'invites') return membership?.status === 'invited';
      return membership?.status === 'completed';
    });
  }, [challengeFilter, challenges, mine]);

  const openBuilder = () => {
    setBuilderStep(1);
    setBuilderOpen(true);
  };

  const closeBuilder = () => {
    setBuilderOpen(false);
    setBuilderStep(1);
  };

  return (
    <View style={styles.page}>
      <View pointerEvents="none" style={styles.backgroundAccentOne} />
      <View pointerEvents="none" style={styles.backgroundAccentTwo} />
      <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Home" style={styles.backButton}>
            <BackIcon size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>Compete together. Celebrate every milestone.</Text>
          </View>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          <HubTab
            label="Challenges"
            count={activeCount + inviteCount}
            active={tab === 'challenges'}
            icon="challenge"
            onPress={() => setTab('challenges')}
          />
          <HubTab
            label="Clubs"
            count={adult ? clubs.length : undefined}
            active={tab === 'clubs'}
            icon="club"
            onPress={() => setTab('clubs')}
          />
        </View>

        {tab === 'challenges' ? (
          <View>
            <View style={styles.heroCard}>
              <View style={styles.heroGlow} />
              <View style={styles.heroIcon}>
                <ChallengeIcon size={56} color={colors.text} accent={colors.primary} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>TRAIN TOGETHER</Text>
                <Text style={styles.heroTitle}>Community challenges</Text>
                <Text style={styles.heroText}>Track real workout progress, join friends and build consistency together.</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <SummaryTile icon="active" value={activeCount} label="Active" tone={colors.primary} />
              <SummaryTile icon="invite" value={inviteCount} label="Invites" tone={colors.blue} />
              <SummaryTile icon="complete" value={completedCount} label="Completed" tone={colors.green} />
            </View>

            {!builderOpen ? (
              <Pressable onPress={openBuilder} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]} accessibilityRole="button">
                <View style={styles.createButtonIcon}><PlusIcon size={21} color="#FFFFFF" /></View>
                <View style={styles.createButtonCopy}>
                  <Text style={styles.createButtonTitle}>Create a challenge</Text>
                  <Text style={styles.createButtonText}>Set a goal and invite your friends</Text>
                </View>
                <ForwardIcon size={20} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Card style={styles.builderCard}>
                <View style={styles.builderHeader}>
                  <View style={styles.builderTitleRow}>
                    <View style={styles.builderMark}><PlusIcon size={18} color={colors.primary} /></View>
                    <View style={styles.builderTitleCopy}>
                      <Text style={styles.builderTitle}>Create a challenge</Text>
                      <Text style={styles.builderSubtitle}>Step {builderStep} of 3</Text>
                    </View>
                  </View>
                  <Pressable onPress={closeBuilder} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close challenge creator">
                    <CloseIcon size={18} color={colors.muted} />
                  </Pressable>
                </View>
                <BuilderSteps current={builderStep} />

                {builderStep === 1 ? (
                  <View>
                    <Text style={styles.stepTitle}>Give it a clear goal</Text>
                    <Text style={styles.stepHelp}>Friends should understand the challenge at a glance.</Text>
                    <Text style={styles.fieldLabel}>Challenge name</Text>
                    <Input
                      value={draft.title}
                      onChangeText={(title) => setDraft({ ...draft, title })}
                      placeholder="Example: Three workouts this week"
                      maxLength={100}
                    />
                    <Text style={styles.fieldLabel}>Description</Text>
                    <Input
                      value={draft.description}
                      onChangeText={(description) => setDraft({ ...draft, description })}
                      placeholder="Add an encouraging note (optional)"
                      maxLength={500}
                    />
                  </View>
                ) : null}

                {builderStep === 2 ? (
                  <View>
                    <Text style={styles.stepTitle}>Choose the target</Text>
                    <Text style={styles.stepHelp}>Progress updates from completed workout history.</Text>
                    <Text style={styles.fieldLabel}>Target type</Text>
                    <View style={styles.chips}>
                      {targetTypes.map((value) => (
                        <Chip
                          key={value}
                          label={targetTypeLabel(value)}
                          active={draft.targetType === value}
                          onPress={() => setDraft({ ...draft, targetType: value })}
                        />
                      ))}
                    </View>
                    <View style={styles.two}>
                      <View style={styles.halfField}>
                        <Text style={styles.fieldLabel}>Goal</Text>
                        <Input
                          value={draft.target}
                          onChangeText={(target) => setDraft({ ...draft, target })}
                          keyboardType="decimal-pad"
                          placeholder={draft.targetType === 'distance' ? 'Target (' + distanceUnit + ')' : 'Target'}
                        />
                      </View>
                      <View style={styles.halfField}>
                        <Text style={styles.fieldLabel}>Duration</Text>
                        <Input
                          value={draft.days}
                          onChangeText={(days) => setDraft({ ...draft, days })}
                          keyboardType="number-pad"
                          placeholder="Days (max 90)"
                        />
                      </View>
                    </View>
                    <Text style={styles.fieldLabel}>Difficulty</Text>
                    <View style={styles.difficultyRow}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Pressable
                          key={value}
                          onPress={() => setDraft({ ...draft, difficulty: value })}
                          style={[styles.difficultyOption, draft.difficulty === value && styles.difficultyOptionActive]}
                        >
                          <Text style={[styles.difficultyNumber, draft.difficulty === value && styles.difficultyNumberActive]}>{value}</Text>
                          <Text style={[styles.difficultyDot, draft.difficulty >= value && styles.difficultyDotActive]}>●</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {builderStep === 3 ? (
                  <View>
                    <Text style={styles.stepTitle}>Choose who joins you</Text>
                    <Text style={styles.stepHelp}>You stay in control of visibility and invitations.</Text>
                    <Text style={styles.fieldLabel}>Visibility</Text>
                    <View style={styles.chips}>
                      {visibilityOptions.map((value) => (
                        <Chip
                          key={value}
                          label={visibilityLabel(value)}
                          active={draft.visibility === value}
                          onPress={() => setDraft({ ...draft, visibility: value })}
                        />
                      ))}
                    </View>
                    {friends.length ? (
                      <>
                        <Text style={styles.fieldLabel}>Invite friends (optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendPicker}>
                          {friends.map((friend: any) => {
                            const selected = draft.inviteIds.includes(friend.user_id);
                            return (
                              <Pressable
                                key={friend.user_id}
                                onPress={() => toggleInvite(friend.user_id)}
                                style={[styles.friendChip, selected && styles.friendChipActive]}
                              >
                                <View style={styles.friendAvatar}>
                                  <Text style={styles.friendAvatarText}>{String(friend.username || '?').slice(0, 1).toUpperCase()}</Text>
                                </View>
                                <Text style={[styles.friendName, selected && styles.friendNameActive]}>@{friend.username}</Text>
                                {selected ? <CheckIcon size={15} color={colors.primary} /> : null}
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </>
                    ) : null}
                    <View style={styles.reviewCard}>
                      <View style={styles.reviewIcon}><ChallengeIcon size={30} color={colors.text} accent={colors.primary} /></View>
                      <View style={styles.reviewCopy}>
                        <Text style={styles.reviewTitle}>{draft.title.trim() || 'Your challenge'}</Text>
                        <Text style={styles.reviewText}>{challengeDraftSummary(draft, distanceUnit)}</Text>
                        <Text style={styles.reviewText}>{visibilityLabel(draft.visibility)} · {draft.inviteIds.length} invited</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                <View style={styles.builderActions}>
                  {builderStep > 1 ? (
                    <Pressable onPress={() => setBuilderStep((value) => Math.max(1, value - 1))} style={styles.secondaryAction}>
                      <BackIcon size={17} color={colors.text} />
                      <Text style={styles.secondaryActionText}>Back</Text>
                    </Pressable>
                  ) : <View style={styles.actionSpacer} />}
                  {builderStep < 3 ? (
                    <Pressable
                      onPress={() => {
                        if (builderStep === 1 && !draft.title.trim()) {
                          Alert.alert('Add a challenge name', 'Give your challenge a short, clear name before continuing.');
                          return;
                        }
                        setBuilderStep((value) => Math.min(3, value + 1));
                      }}
                      style={styles.primaryStepAction}
                    >
                      <Text style={styles.primaryStepActionText}>Continue</Text>
                      <ForwardIcon size={17} color="#FFFFFF" />
                    </Pressable>
                  ) : (
                    <View style={styles.createFinal}>
                      <Button title={saving ? 'CREATING…' : 'CREATE CHALLENGE'} onPress={createChallenge} disabled={saving} />
                    </View>
                  )}
                </View>
              </Card>
            )}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Challenges</Text>
                <Text style={styles.sectionSubtitle}>Pick up where you left off or discover a new goal.</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <FilterPill label="Explore" count={challenges.length} active={challengeFilter === 'explore'} onPress={() => setChallengeFilter('explore')} />
              <FilterPill label="Active" count={activeCount} active={challengeFilter === 'active'} onPress={() => setChallengeFilter('active')} />
              <FilterPill label="Invites" count={inviteCount} active={challengeFilter === 'invites'} onPress={() => setChallengeFilter('invites')} />
              <FilterPill label="Completed" count={completedCount} active={challengeFilter === 'completed'} onPress={() => setChallengeFilter('completed')} />
            </ScrollView>

            {filteredChallenges.length ? filteredChallenges.map((challenge: any) => {
              const membership = mine.find((item: any) => item.challenge_id === challenge.id);
              const progress = Number(membership?.progress_value ?? 0);
              const target = Number(challenge.target_value ?? 1);
              const invited = membership?.status === 'invited';
              const completed = membership?.status === 'completed' || progress >= target;
              const joined = membership?.status === 'joined';
              const creator = challenge.creator_id === profile.id;
              const displayProgress = challenge.target_type === 'distance' ? kmToDisplay(progress, distanceUnit) : progress;
              const displayTarget = challenge.target_type === 'distance' ? kmToDisplay(target, distanceUnit) : target;
              const memberCount = members.filter((item: any) => {
                return item.challenge_id === challenge.id && (item.status === 'joined' || item.status === 'completed');
              }).length;
              const progressPercent = Math.min(100, Math.max(0, (progress / Math.max(1, target)) * 100));
              const status = completed ? 'Completed' : invited ? 'Invitation' : joined ? 'In progress' : creator ? 'Created by you' : 'Open';
              const statusTone = completed ? colors.green : invited ? colors.blue : joined ? colors.primary : colors.muted;
              return (
                <Card key={challenge.id} style={[styles.challengeCard, completed && styles.challengeCardComplete, invited && styles.challengeCardInvite]}>
                  <View style={styles.challengeHeader}>
                    <View style={[styles.challengeIcon, { backgroundColor: statusTone + '18', borderColor: statusTone + '40' }]}>
                      <ChallengeIcon size={31} color={colors.text} accent={statusTone} />
                    </View>
                    <View style={styles.challengeHeaderCopy}>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusPill, { borderColor: statusTone + '55', backgroundColor: statusTone + '16' }]}>
                          <Text style={[styles.statusText, { color: statusTone }]}>{status}</Text>
                        </View>
                        <Text style={styles.daysLeft}>{timeRemaining(challenge.ends_at)}</Text>
                      </View>
                      <Text style={styles.challengeTitle}>{challenge.title}</Text>
                      <Text style={styles.creatorText}>
                        {challenge.difficulty_source === 'official' ? 'FitHub official' : 'Created by @' + challenge.creator_display_name}
                      </Text>
                    </View>
                  </View>

                  {challenge.description ? <Text style={styles.description}>{challenge.description}</Text> : null}

                  <View style={styles.challengeFacts}>
                    <Fact icon="people" label={String(memberCount) + ' joined'} />
                    <Fact icon="difficulty" label={difficultyLabel(Number(challenge.difficulty ?? 3))} />
                    <Fact icon="privacy" label={visibilityLabel(challenge.visibility)} />
                  </View>

                  {(joined || completed || creator) ? (
                    <View style={styles.progressPanel}>
                      <View style={styles.progressTop}>
                        <View>
                          <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
                          <Text style={styles.progressValue}>
                            {formatChallengeNumber(displayProgress, challenge.target_type)}
                            <Text style={styles.progressTarget}> / {formatChallengeNumber(displayTarget, challenge.target_type)} {challenge.target_type === 'distance' ? distanceUnit : challenge.unit}</Text>
                          </Text>
                        </View>
                        <View style={[styles.percentRing, completed && styles.percentRingComplete]}>
                          {completed ? <CheckIcon size={18} color={colors.green} /> : <Text style={styles.percentText}>{Math.round(progressPercent)}%</Text>}
                        </View>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, completed && styles.fillComplete, { width: (String(progressPercent) + '%') as any }]} />
                      </View>
                      <Text style={styles.progressNote}>Updates automatically from completed workout history.</Text>
                    </View>
                  ) : (
                    <View style={styles.goalStrip}>
                      <TargetIcon size={21} color={colors.primary} />
                      <Text style={styles.goalStripText}>Goal: {formatChallengeNumber(displayTarget, challenge.target_type)} {challenge.target_type === 'distance' ? distanceUnit : challenge.unit}</Text>
                    </View>
                  )}

                  {invited ? (
                    <View style={styles.inviteActions}>
                      <Pressable onPress={() => joinChallenge(challenge)} style={styles.acceptButton}>
                        <CheckIcon size={17} color="#FFFFFF" />
                        <Text style={styles.acceptButtonText}>Accept invite</Text>
                      </Pressable>
                      <Pressable onPress={() => declineInvite(challenge.id)} style={styles.declineButton}>
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </Pressable>
                    </View>
                  ) : !creator && !membership ? (
                    <Pressable onPress={() => joinChallenge(challenge)} style={styles.joinButton}>
                      <PlusIcon size={18} color="#FFFFFF" />
                      <Text style={styles.joinButtonText}>Join challenge</Text>
                    </Pressable>
                  ) : null}
                </Card>
              );
            }) : (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyIcon}><ChallengeIcon size={48} color={colors.muted} accent={colors.primary} /></View>
                <Text style={styles.emptyTitle}>{emptyChallengeTitle(challengeFilter)}</Text>
                <Text style={styles.emptyText}>{emptyChallengeText(challengeFilter)}</Text>
                {challengeFilter !== 'explore' ? (
                  <Pressable onPress={() => setChallengeFilter('explore')} style={styles.emptyAction}>
                    <Text style={styles.emptyActionText}>Explore challenges</Text>
                  </Pressable>
                ) : null}
              </Card>
            )}
          </View>
        ) : (
          <View>
            <View style={[styles.heroCard, styles.clubHero]}>
              <View style={styles.clubHeroGlow} />
              <View style={[styles.heroIcon, styles.clubHeroIcon]}>
                <ClubIcon size={58} color={colors.text} accent={colors.gold} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroEyebrow, { color: colors.gold }]}>MILESTONE CLUBS</Text>
                <Text style={styles.heroTitle}>Earned by your lifts</Text>
                <Text style={styles.heroText}>Your highest active milestone for each supported exercise, checked from workout history.</Text>
              </View>
            </View>

            <View style={styles.clubSummary}>
              <ClubSummaryMetric value={adult ? String(clubs.length) : '—'} label="Active clubs" icon="club" />
              <ClubSummaryMetric value="4" label="Supported lifts" icon="lifts" />
              <ClubSummaryMetric value="Auto" label="History check" icon="refresh" />
            </View>

            {!adult ? (
              <Card style={styles.safetyCard}>
                <View style={styles.safetyIcon}><ShieldIcon size={30} color={colors.primary} /></View>
                <View style={styles.safetyCopy}>
                  <Text style={styles.safetyTitle}>Technique and consistency come first</Text>
                  <Text style={styles.safetyText}>Load-based clubs are hidden for under-18 accounts. Your completed workouts and progress still remain available throughout FitHub.</Text>
                </View>
              </Card>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Your current clubs</Text>
                    <Text style={styles.sectionSubtitle}>Only your highest active milestone per lift is shown.</Text>
                  </View>
                  <Pressable onPress={load} style={styles.refreshButton} accessibilityRole="button" accessibilityLabel="Refresh clubs">
                    <RefreshIcon size={18} color={colors.primary} />
                  </Pressable>
                </View>

                {clubError ? (
                  <Card style={styles.clubErrorCard}>
                    <View style={styles.errorIcon}><RefreshIcon size={26} color={colors.primary} /></View>
                    <Text style={styles.emptyTitle}>Clubs need a quick refresh</Text>
                    <Text style={styles.emptyText}>{clubError}</Text>
                    <Pressable onPress={load} style={styles.emptyAction}>
                      <Text style={styles.emptyActionText}>Retry refresh</Text>
                    </Pressable>
                  </Card>
                ) : clubs.length ? (
                  <View>
                    {clubs.map((club: any) => {
                      const threshold = formatWeight(Number(club.threshold_kg), weightUnit, 0);
                      const best = formatWeight(Number(club.qualifying_weight_kg), weightUnit, 1);
                      const membersCount = Number(club.active_member_count ?? 1);
                      return (
                        <View key={club.club_key} style={styles.clubCard}>
                          <View style={styles.clubBadgeWrap}>
                            <ClubBadge color={colors.gold} textColor={colors.text} />
                          </View>
                          <View style={styles.clubCardCopy}>
                            <View style={styles.clubCardTop}>
                              <View style={styles.clubCardTitleWrap}>
                                <Text style={styles.clubExercise}>{club.exercise_name}</Text>
                                <Text style={styles.clubTitle}>{threshold} Club</Text>
                              </View>
                              <View style={styles.earnedPill}><CheckIcon size={13} color={colors.green} /><Text style={styles.earnedText}>EARNED</Text></View>
                            </View>
                            <View style={styles.clubComparison}>
                              <View style={styles.clubCompareItem}>
                                <Text style={styles.clubCompareLabel}>YOUR BEST</Text>
                                <Text style={styles.clubCompareValue}>{best}</Text>
                              </View>
                              <View style={styles.clubCompareDivider} />
                              <View style={styles.clubCompareItem}>
                                <Text style={styles.clubCompareLabel}>CLUB MARK</Text>
                                <Text style={styles.clubCompareValue}>{threshold}</Text>
                              </View>
                            </View>
                            <View style={styles.clubMetaRow}>
                              <View style={styles.clubMetaItem}><PeopleIcon size={15} color={colors.muted} /><Text style={styles.clubMetaText}>{membersCount.toLocaleString()} active member{membersCount === 1 ? '' : 's'}</Text></View>
                              <Text style={styles.clubMetaText}>{earnedDate(club.achieved_at)}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Card style={styles.emptyCard}>
                    <View style={styles.emptyIcon}><ClubIcon size={52} color={colors.muted} accent={colors.gold} /></View>
                    <Text style={styles.emptyTitle}>No current clubs yet</Text>
                    <Text style={styles.emptyText}>Completed workout history is checked automatically whenever this page opens.</Text>
                  </Card>
                )}

                <Card style={styles.howCard}>
                  <Text style={styles.howEyebrow}>HOW CLUBS WORK</Text>
                  <Text style={styles.howTitle}>Milestones without the guesswork</Text>
                  <HowRow number="1" title="Complete a supported lift" text="Bench press, back squat, conventional deadlift or overhead press." />
                  <HowRow number="2" title="History is checked automatically" text="Exercise names and units are normalized before matching your result." />
                  <HowRow number="3" title="Your highest club stays active" text="Earlier milestones remain in history while the current one is easy to see." last />
                </Card>
              </>
            )}
          </View>
        )}
      </RefreshableScrollView>
    </View>
  );
}

function HubTab({
  label,
  count,
  active,
  icon,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  icon: 'challenge' | 'club';
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
    >
      <View style={[styles.tabIcon, active && styles.tabIconActive]}>
        {icon === 'challenge'
          ? <ChallengeIcon size={22} color={active ? colors.text : colors.muted} accent={active ? colors.primary : colors.muted} />
          : <ClubIcon size={22} color={active ? colors.text : colors.muted} accent={active ? colors.gold : colors.muted} />}
      </View>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {typeof count === 'number' && count > 0 ? (
        <View style={[styles.tabCount, active && styles.tabCountActive]}>
          <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SummaryTile({ icon, value, label, tone }: { icon: IconName; value: number; label: string; tone: string }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryIcon, { backgroundColor: tone + '16', borderColor: tone + '35' }]}>
        <StatusIcon name={icon} size={20} color={tone} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function FilterPill({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  return (
    <Pressable onPress={onPress} style={[styles.filterPill, active && styles.filterPillActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
      <View style={[styles.filterCount, active && styles.filterCountActive]}>
        <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
      </View>
    </Pressable>
  );
}

function BuilderSteps({ current }: { current: number }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  return (
    <View style={styles.builderSteps}>
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <View style={styles.builderStepItem}>
            <View style={[styles.stepCircle, step <= current && styles.stepCircleActive]}>
              {step < current ? <CheckIcon size={13} color="#FFFFFF" /> : <Text style={[styles.stepCircleText, step <= current && styles.stepCircleTextActive]}>{step}</Text>}
            </View>
            <Text style={[styles.stepLabel, step === current && styles.stepLabelActive]}>{['Details', 'Goal', 'Invite'][step - 1]}</Text>
          </View>
          {step < 3 ? <View style={[styles.stepLine, step < current && styles.stepLineActive]} /> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

function Fact({ icon, label }: { icon: IconName; label: string }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  return (
    <View style={styles.fact}>
      <StatusIcon name={icon} size={15} color={colors.muted} />
      <Text style={styles.factText}>{label}</Text>
    </View>
  );
}

function ClubSummaryMetric({ value, label, icon }: { value: string; label: string; icon: IconName }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  return (
    <View style={styles.clubSummaryMetric}>
      <View style={styles.clubSummaryIcon}><StatusIcon name={icon} size={19} color={colors.gold} /></View>
      <Text style={styles.clubSummaryValue}>{value}</Text>
      <Text style={styles.clubSummaryLabel}>{label}</Text>
    </View>
  );
}

function HowRow({ number, title, text, last = false }: { number: string; title: string; text: string; last?: boolean }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  return (
    <View style={[styles.howRow, last && styles.howRowLast]}>
      <View style={styles.howNumber}><Text style={styles.howNumberText}>{number}</Text></View>
      <View style={styles.howCopy}>
        <Text style={styles.howRowTitle}>{title}</Text>
        <Text style={styles.howRowText}>{text}</Text>
      </View>
    </View>
  );
}

type IconName = 'active' | 'invite' | 'complete' | 'people' | 'difficulty' | 'privacy' | 'club' | 'lifts' | 'refresh';

function StatusIcon({ name, size, color }: { name: IconName; size: number; color: string }) {
  if (name === 'invite') return <MailIcon size={size} color={color} />;
  if (name === 'complete') return <CheckCircleIcon size={size} color={color} />;
  if (name === 'people') return <PeopleIcon size={size} color={color} />;
  if (name === 'privacy') return <ShieldIcon size={size} color={color} />;
  if (name === 'club') return <ClubIcon size={size} color={color} accent={color} />;
  if (name === 'lifts') return <BarbellIcon size={size} color={color} />;
  if (name === 'refresh') return <RefreshIcon size={size} color={color} />;
  if (name === 'difficulty') return <BoltIcon size={size} color={color} />;
  return <ProgressIcon size={size} color={color} />;
}

function BackIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M15.5 5 8.5 12l7 7" fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function ForwardIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m9 5 7 7-7 7" fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function PlusIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2.4} strokeLinecap="round" /><Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.4} strokeLinecap="round" /></Svg>;
}

function CloseIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2.2} strokeLinecap="round" /><Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2.2} strokeLinecap="round" /></Svg>;
}

function CheckIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m5 12.5 4.2 4.2L19 7" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function ChallengeIcon({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M20 10h24v10c0 10-5.3 17-12 17s-12-7-12-17V10Z" fill="none" stroke={color} strokeWidth={3.2} strokeLinejoin="round" />
      <Path d="M20 15h-8v5c0 8 4 12 11 13M44 15h8v5c0 8-4 12-11 13" fill="none" stroke={accent} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M32 37v8M23 52h18M27 45h10" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
      <Polygon points="32,15 34.6,20.3 40.5,21.1 36.2,25.2 37.2,31 32,28.2 26.8,31 27.8,25.2 23.5,21.1 29.4,20.3" fill={accent} />
      <Circle cx="13" cy="46" r="4" fill={accent} />
      <Circle cx="51" cy="46" r="4" fill={accent} />
      <Path d="M6 56c1-5 4-7 7-7s6 2 7 7M44 56c1-5 4-7 7-7s6 2 7 7" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

function ClubIcon({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M19 10h26v10c0 11-5.7 18-13 18s-13-7-13-18V10Z" fill="none" stroke={color} strokeWidth={3.1} strokeLinejoin="round" />
      <Path d="M19 15h-7v6c0 7 3.8 11 10 12M45 15h7v6c0 7-3.8 11-10 12" fill="none" stroke={accent} strokeWidth={3.1} strokeLinecap="round" />
      <Path d="M32 38v8M24 53h16M27 46h10" fill="none" stroke={color} strokeWidth={3.1} strokeLinecap="round" />
      <Polygon points="32,15 35,21 42,22 37,27 38,34 32,31 26,34 27,27 22,22 29,21" fill={accent} />
    </Svg>
  );
}

function ClubBadge({ color, textColor }: { color: string; textColor: string }) {
  return (
    <Svg width={70} height={78} viewBox="0 0 70 78">
      <Path d="M13 7h44v43L35 70 13 50V7Z" fill={color + '20'} stroke={color} strokeWidth={2.5} />
      <Path d="M20 15h30v30L35 57 20 45V15Z" fill="none" stroke={textColor} strokeWidth={2.2} />
      <Polygon points="35,20 38.5,27 46,28 40.5,33.2 42,41 35,37.3 28,41 29.5,33.2 24,28 31.5,27" fill={color} />
      <Circle cx="54" cy="16" r="10" fill={color} />
      <Path d="m49.5 16 3 3 6-6" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ProgressIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth={2} /><Path d="M12 7v5l3.5 2" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" /></Svg>;
}

function MailIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="none" stroke={color} strokeWidth={2} /><Path d="m4.5 7 7.5 6 7.5-6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function CheckCircleIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth={2} /><Path d="m7.5 12 3 3 6-6" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function PeopleIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="9" cy="8.5" r="3" fill="none" stroke={color} strokeWidth={1.9} /><Circle cx="17" cy="9.5" r="2.3" fill="none" stroke={color} strokeWidth={1.7} /><Path d="M3.5 19c.4-4.2 2.4-6.3 5.5-6.3s5.1 2.1 5.5 6.3M14.5 14c3.5-.8 5.5.9 6 4.5" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" /></Svg>;
}

function ShieldIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3 20 6v5c0 5.2-3 8.5-8 10-5-1.5-8-4.8-8-10V6l8-3Z" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" /><Path d="m8.5 12 2.3 2.3 4.8-5" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function BoltIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m13.5 2-8 12h6L10.5 22l8-12h-6l1-8Z" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" /></Svg>;
}

function TargetIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth={1.8} /><Circle cx="12" cy="12" r="5" fill="none" stroke={color} strokeWidth={1.8} /><Circle cx="12" cy="12" r="1.7" fill={color} /></Svg>;
}

function RefreshIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M20 8V3l-2.2 2.2A9 9 0 1 0 20.5 14" fill="none" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function BarbellIcon({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Line x1="6" y1="12" x2="18" y2="12" stroke={color} strokeWidth={2.2} strokeLinecap="round" /><Rect x="3" y="8" width="3" height="8" rx="1" fill="none" stroke={color} strokeWidth={1.8} /><Rect x="18" y="8" width="3" height="8" rx="1" fill="none" stroke={color} strokeWidth={1.8} /><Line x1="1.5" y1="10" x2="1.5" y2="14" stroke={color} strokeWidth={1.8} strokeLinecap="round" /><Line x1="22.5" y1="10" x2="22.5" y2="14" stroke={color} strokeWidth={1.8} strokeLinecap="round" /></Svg>;
}

function targetTypeLabel(value: ChallengeDraft['targetType']) {
  if (value === 'active_days') return 'Active days';
  if (value === 'distance') return 'Distance';
  if (value === 'prs') return 'PRs';
  return 'Workouts';
}

function visibilityLabel(value: string) {
  if (value === 'private') return 'Private';
  if (value === 'friends') return 'Friends';
  return 'Public';
}

function difficultyLabel(value: number) {
  if (value <= 1) return 'Easy';
  if (value === 2) return 'Steady';
  if (value === 3) return 'Moderate';
  if (value === 4) return 'Tough';
  return 'Advanced';
}

function challengeDraftSummary(draft: ChallengeDraft, distanceUnit: string) {
  const unit = draft.targetType === 'distance' ? distanceUnit : targetTypeLabel(draft.targetType).toLowerCase();
  return draft.target + ' ' + unit + ' in ' + draft.days + ' days';
}

function formatChallengeNumber(value: number, type: string) {
  return value.toFixed(type === 'distance' ? 1 : 0);
}

function timeRemaining(value?: string | null) {
  if (!value) return 'No end date';
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return 'Ended';
  const days = Math.ceil(milliseconds / 86400000);
  if (days === 1) return '1 day left';
  return String(days) + ' days left';
}

function earnedDate(value?: string | null) {
  if (!value) return 'Earned from history';
  return 'Earned ' + new Date(value).toLocaleDateString();
}

function emptyChallengeTitle(filter: ChallengeFilter) {
  if (filter === 'active') return 'No active challenges';
  if (filter === 'invites') return 'No invitations waiting';
  if (filter === 'completed') return 'No completed challenges yet';
  return 'No challenges are available yet';
}

function emptyChallengeText(filter: ChallengeFilter) {
  if (filter === 'active') return 'Join a challenge from Explore to start tracking progress.';
  if (filter === 'invites') return 'New friend invitations will appear here.';
  if (filter === 'completed') return 'Completed challenges will stay easy to find here.';
  return 'Create the first challenge and invite friends to join you.';
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 54 },
  backgroundAccentOne: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: colors.primarySoft, opacity: isDark ? .22 : .52, right: -130, top: 70 },
  backgroundAccentTwo: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: colors.border, opacity: .45, left: -150, top: 430 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  backButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -.4 },
  subtitle: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.panel2, borderRadius: 17, padding: 5, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, paddingHorizontal: 8 },
  tabActive: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.primary, shadowColor: colors.shadow, shadowOpacity: isDark ? .28 : .1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  tabIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: colors.primarySoft },
  tabText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
  tabTextActive: { color: colors.text, fontWeight: '900' },
  tabCount: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, paddingHorizontal: 5 },
  tabCountActive: { backgroundColor: colors.primary },
  tabCountText: { color: colors.muted, fontSize: 8, fontWeight: '900' },
  tabCountTextActive: { color: '#FFFFFF' },
  heroCard: { minHeight: 146, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 18, marginBottom: 10, shadowColor: colors.shadow, shadowOpacity: isDark ? .26 : .12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primarySoft, left: -70, bottom: -72 },
  heroIcon: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + '45', marginRight: 14 },
  heroCopy: { flex: 1, minWidth: 0 },
  heroEyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .9 },
  heroTitle: { color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: '900', marginTop: 4 },
  heroText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  summaryRow: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  summaryTile: { flex: 1, minHeight: 76, borderRadius: 16, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  summaryIcon: { width: 29, height: 29, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { color: colors.text, fontSize: 18, lineHeight: 20, fontWeight: '900', marginTop: 3 },
  summaryLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', marginTop: 1 },
  createButton: { minHeight: 64, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 11, marginBottom: 15, shadowColor: colors.primary, shadowOpacity: .24, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  createButtonIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center' },
  createButtonCopy: { flex: 1 },
  createButtonTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  createButtonText: { color: 'rgba(255,255,255,.78)', fontSize: 9, marginTop: 2 },
  builderCard: { borderColor: colors.primary, padding: 15, marginBottom: 15 },
  builderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  builderTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  builderMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  builderTitleCopy: { flex: 1 },
  builderTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  builderSubtitle: { color: colors.muted, fontSize: 9, marginTop: 2 },
  closeButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  builderSteps: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 17, paddingHorizontal: 5 },
  builderStepItem: { width: 55, alignItems: 'center' },
  stepCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepCircleText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  stepCircleTextActive: { color: '#FFFFFF' },
  stepLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', marginTop: 4 },
  stepLabelActive: { color: colors.text },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 12 },
  stepLineActive: { backgroundColor: colors.primary },
  stepTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  stepHelp: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3, marginBottom: 11 },
  fieldLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: .55, textTransform: 'uppercase', marginTop: 7, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  two: { flexDirection: 'row', gap: 8 },
  halfField: { flex: 1, minWidth: 0 },
  difficultyRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  difficultyOption: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  difficultyOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  difficultyNumber: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  difficultyNumberActive: { color: colors.primary },
  difficultyDot: { color: colors.border, fontSize: 7, marginTop: 1 },
  difficultyDotActive: { color: colors.primary },
  friendPicker: { paddingBottom: 9, gap: 7 },
  friendChip: { minHeight: 43, paddingHorizontal: 9, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', gap: 7 },
  friendChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  friendAvatar: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  friendAvatarText: { color: colors.text, fontWeight: '900', fontSize: 10 },
  friendName: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  friendNameActive: { color: colors.primary },
  reviewCard: { borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  reviewIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  reviewCopy: { flex: 1, minWidth: 0 },
  reviewTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  reviewText: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  builderActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  actionSpacer: { flex: 1 },
  secondaryAction: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 14 },
  secondaryActionText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  primaryStepAction: { minHeight: 42, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 },
  primaryStepActionText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  createFinal: { flex: 1, maxWidth: 205 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginTop: 4, marginBottom: 9 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  filterRow: { gap: 7, paddingBottom: 10 },
  filterPill: { minHeight: 36, borderRadius: 18, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, paddingLeft: 12, paddingRight: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterPillActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  filterTextActive: { color: colors.primary },
  filterCount: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterCountActive: { backgroundColor: colors.primary },
  filterCountText: { color: colors.muted, fontSize: 8, fontWeight: '900' },
  filterCountTextActive: { color: '#FFFFFF' },
  challengeCard: { padding: 14, marginBottom: 10 },
  challengeCardComplete: { borderColor: colors.green },
  challengeCardInvite: { borderColor: colors.blue },
  challengeHeader: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  challengeIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  challengeHeaderCopy: { flex: 1, minWidth: 0 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 7 },
  statusPill: { minHeight: 21, borderRadius: 11, borderWidth: 1, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 7, fontWeight: '900', textTransform: 'uppercase', letterSpacing: .4 },
  daysLeft: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  challengeTitle: { color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: '900', marginTop: 5 },
  creatorText: { color: colors.muted, fontSize: 8, marginTop: 2 },
  description: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 10 },
  challengeFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  fact: { minHeight: 28, borderRadius: 10, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
  factText: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  progressPanel: { borderRadius: 14, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, padding: 11, marginTop: 11 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  progressLabel: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: .7 },
  progressValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
  progressTarget: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  percentRing: { width: 43, height: 43, borderRadius: 22, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  percentRingComplete: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  percentText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.panel, overflow: 'hidden', marginTop: 9 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  fillComplete: { backgroundColor: colors.green },
  progressNote: { color: colors.muted, fontSize: 7, marginTop: 6 },
  goalStrip: { minHeight: 43, borderRadius: 13, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, marginTop: 11 },
  goalStripText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  inviteActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptButton: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  acceptButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  declineButton: { minWidth: 92, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  declineButtonText: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  joinButton: { minHeight: 42, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  joinButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 4, maxWidth: 280 },
  emptyAction: { minHeight: 38, borderRadius: 12, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 12 },
  emptyActionText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  clubHero: { borderColor: colors.gold + '55' },
  clubHeroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.goldSoft, left: -70, bottom: -72 },
  clubHeroIcon: { backgroundColor: colors.goldSoft, borderColor: colors.gold + '55' },
  clubSummary: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  clubSummaryMetric: { flex: 1, minHeight: 78, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', padding: 7 },
  clubSummaryIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  clubSummaryValue: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 3 },
  clubSummaryLabel: { color: colors.muted, fontSize: 7, fontWeight: '800', marginTop: 1, textAlign: 'center' },
  safetyCard: { flexDirection: 'row', gap: 12, borderColor: colors.primary },
  safetyIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  safetyCopy: { flex: 1 },
  safetyTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  safetyText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  refreshButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  clubErrorCard: { alignItems: 'center', borderColor: colors.primary, paddingVertical: 22 },
  errorIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  clubCard: { borderRadius: 19, borderWidth: 1, borderColor: colors.gold + '65', backgroundColor: colors.panel, padding: 12, flexDirection: 'row', gap: 11, marginBottom: 9, shadowColor: colors.shadow, shadowOpacity: isDark ? .22 : .08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  clubBadgeWrap: { width: 72, alignItems: 'center', justifyContent: 'center' },
  clubCardCopy: { flex: 1, minWidth: 0 },
  clubCardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 7, alignItems: 'flex-start' },
  clubCardTitleWrap: { flex: 1, minWidth: 0 },
  clubExercise: { color: colors.muted, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: .45 },
  clubTitle: { color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: '900', marginTop: 2 },
  earnedPill: { minHeight: 23, borderRadius: 12, paddingHorizontal: 7, backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: colors.green, flexDirection: 'row', alignItems: 'center', gap: 3 },
  earnedText: { color: colors.green, fontSize: 6, fontWeight: '900', letterSpacing: .35 },
  clubComparison: { flexDirection: 'row', borderRadius: 12, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, marginTop: 9, paddingVertical: 8 },
  clubCompareItem: { flex: 1, alignItems: 'center' },
  clubCompareDivider: { width: 1, backgroundColor: colors.border },
  clubCompareLabel: { color: colors.muted, fontSize: 6, fontWeight: '900', letterSpacing: .5 },
  clubCompareValue: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  clubMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  clubMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  clubMetaText: { color: colors.muted, fontSize: 7, lineHeight: 10 },
  howCard: { marginTop: 5, padding: 15 },
  howEyebrow: { color: colors.gold, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  howTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 3, marginBottom: 9 },
  howRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  howRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  howNumber: { width: 29, height: 29, borderRadius: 10, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  howNumberText: { color: colors.gold, fontSize: 10, fontWeight: '900' },
  howCopy: { flex: 1 },
  howRowTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  howRowText: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  pressed: { opacity: .68, transform: [{ scale: .99 }] },
});
