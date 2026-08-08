import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, SectionTitle, useTheme } from '../../components/UI';
import { presetChallenges } from '../../data/presets';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export default function FriendsTab({ profile }: { profile: Profile }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [challenges, setChallenges] = useState<any[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({ title: '', description: '', metric: 'workouts', target: '3', days: '7' });

  const load = async () => {
    const [{ data: req }, { data: fr }, { data: feed }, { data: ch }] = await Promise.all([
      supabase.from('friend_requests').select('id,requester_id,status,created_at,requester:public_profiles!friend_requests_requester_id_fkey(username,avatar_url,login_streak,workout_streak,tokens)').eq('addressee_id', profile.id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.rpc('get_my_friends'),
      supabase.rpc('get_friend_feed'),
      supabase.rpc('get_visible_challenges')
    ]);
    setRequests(req ?? []); setFriends(fr ?? []); setPosts(feed ?? []); setChallenges(ch ?? []);
    if ((feed ?? []).length) {
      const ids = (feed ?? []).map((p: any) => p.id);
      const { data: c } = await supabase.from('comments').select('id,post_id,user_id,body,created_at,author:public_profiles!comments_user_id_fkey(username,avatar_url)').in('post_id', ids).order('created_at', { ascending: true });
      const grouped: Record<string, any[]> = {};
      for (const row of c ?? []) (grouped[row.post_id] ??= []).push(row);
      setComments(grouped);
    }
  };
  useEffect(() => {
    load();
    const channel = supabase.channel(`fithub-social-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_posts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_participants' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_profiles' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id]);

  const find = async () => {
    if (!search.trim()) return;
    const { data, error } = await supabase.rpc('find_profile', { search_text: search.trim() });
    if (error) return Alert.alert('Search', error.message);
    setFound((data ?? []).filter((x: any) => x.user_id !== profile.id));
  };

  const addFriend = async (userId: string) => {
    const { error } = await supabase.from('friend_requests').insert({ requester_id: profile.id, addressee_id: userId });
    if (error) Alert.alert('Friend request', error.message.includes('duplicate') ? 'A request already exists.' : error.message);
    else Alert.alert('Sent', 'Friend request sent.');
  };

  const accept = async (id: string) => {
    const { error } = await supabase.rpc('accept_friend_request', { request_id: id });
    if (error) Alert.alert('Could not accept', error.message); else load();
  };

  const postComment = async (postId: string) => {
    const body = (commentText[postId] ?? '').trim(); if (!body) return;
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: profile.id, body });
    if (error) Alert.alert('Comment', error.message); else { setCommentText({ ...commentText, [postId]: '' }); load(); }
  };

  const joinChallenge = async (challengeId: string) => {
    const { error } = await supabase.from('challenge_participants').upsert({ challenge_id: challengeId, user_id: profile.id }, { onConflict: 'challenge_id,user_id' });
    if (error) Alert.alert('Challenge', error.message); else load();
  };

  const createChallenge = async () => {
    const target = Number(custom.target), days = Number(custom.days);
    if (!custom.title.trim() || !target || target <= 0 || !days || days < 1 || days > 365) return Alert.alert('Challenge details', 'Enter a title, positive target and duration.');
    const ends = new Date(); ends.setDate(ends.getDate() + days);
    const unit: Record<string,string> = { workouts: 'workouts', active_days: 'days', distance: 'km', strength_sessions: 'sessions' };
    const { data, error } = await supabase.from('challenges').insert({ created_by: profile.id, title: custom.title.trim(), description: custom.description.trim(), metric: custom.metric, target_value: target, unit: unit[custom.metric], start_date: new Date().toISOString(), end_date: ends.toISOString(), preset: false, visibility: 'friends' }).select('id').single();
    if (error) return Alert.alert('Could not create challenge', error.message);
    await supabase.from('challenge_participants').insert({ challenge_id: data.id, user_id: profile.id });
    setCustom({ title: '', description: '', metric: 'workouts', target: '3', days: '7' }); setCustomOpen(false); load();
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Friends & challenges</Text>
      <Text style={styles.sub}>Add friends by username or exact email, compare streaks, celebrate workouts and train together.</Text>

      <Card>
        <SectionTitle title="Add a friend" />
        <Input value={search} onChangeText={setSearch} autoCapitalize="none" placeholder="Username or exact email" />
        <Button title="Search" onPress={find} />
        {found.map(x => <View key={x.user_id} style={styles.person}><Avatar name={x.username} url={x.avatar_url} /><View style={{ flex: 1 }}><Text style={styles.name}>@{x.username}</Text><Text style={styles.meta}>🔥 {x.login_streak} login · ⚡ {x.workout_streak} workout</Text></View><Pressable onPress={() => addFriend(x.user_id)} style={styles.small}><Text style={styles.smallText}>Add</Text></Pressable></View>)}
      </Card>

      {requests.length ? <Card><SectionTitle title="Friend requests" />{requests.map(r => <View key={r.id} style={styles.person}><Avatar name={r.requester?.username ?? '?'} url={r.requester?.avatar_url} /><View style={{ flex: 1 }}><Text style={styles.name}>@{r.requester?.username}</Text><Text style={styles.meta}>wants to connect</Text></View><Pressable onPress={() => accept(r.id)} style={styles.small}><Text style={styles.smallText}>Accept</Text></Pressable></View>)}</Card> : null}

      <Card>
        <SectionTitle title="Your friends" subtitle="Streaks sync from each friend's device through Supabase." />
        {friends.length ? friends.map(x => <View key={x.user_id} style={styles.person}><Avatar name={x.username} url={x.avatar_url} /><View style={{ flex: 1 }}><Text style={styles.name}>@{x.username}</Text><Text style={styles.meta}>🔥 {x.login_streak} · ⚡ {x.workout_streak} · ✦ {x.tokens}</Text></View></View>) : <Text style={styles.sub}>No friends yet. Search above to add someone.</Text>}
      </Card>

      <SectionTitle title="Workout feed" subtitle="Every completed workout is shared with accepted friends." />
      {posts.length ? posts.map(p => <Card key={p.id}>
        <View style={styles.person}><Avatar name={p.username} url={p.avatar_url} /><View style={{ flex: 1 }}><Text style={styles.name}>@{p.username}</Text><Text style={styles.meta}>{new Date(p.created_at).toLocaleString()}</Text></View></View>
        <Text style={styles.post}>{p.summary}</Text>
        {(comments[p.id] ?? []).map(c => <View key={c.id} style={styles.comment}><Text style={styles.commentAuthor}>@{c.author?.username}</Text><Text style={styles.commentBody}>{c.body}</Text></View>)}
        <View style={styles.commentInput}><Input style={{ flex: 1, marginBottom: 0 }} value={commentText[p.id] ?? ''} onChangeText={v => setCommentText({ ...commentText, [p.id]: v })} placeholder="Congratulate them…" /><Pressable onPress={() => postComment(p.id)} style={styles.send}><Text style={styles.sendText}>Send</Text></Pressable></View>
      </Card>) : <Card><Text style={styles.sub}>Friend workouts will appear here.</Text></Card>}

      <Card>
        <SectionTitle title="Challenges" subtitle="Join presets or make a friends-only challenge. Progress updates from logged workouts." />
        <Button title={customOpen ? 'Close challenge builder' : 'Create a challenge'} onPress={() => setCustomOpen(!customOpen)} secondary />
        {customOpen ? <View style={{ marginTop: 10 }}>
          <Input value={custom.title} onChangeText={v => setCustom({ ...custom, title: v })} placeholder="Challenge title" />
          <Input value={custom.description} onChangeText={v => setCustom({ ...custom, description: v })} placeholder="Description" />
          <View style={styles.chips}>{(['workouts','active_days','distance','strength_sessions'] as const).map(v => <Chip key={v} label={v.replace('_',' ')} active={custom.metric === v} onPress={() => setCustom({ ...custom, metric: v })} />)}</View>
          <View style={styles.two}><Input style={{ flex: 1 }} value={custom.target} onChangeText={v => setCustom({ ...custom, target: v })} keyboardType="decimal-pad" placeholder="Target" /><Input style={{ flex: 1 }} value={custom.days} onChangeText={v => setCustom({ ...custom, days: v })} keyboardType="number-pad" placeholder="Days" /></View>
          <Button title="Create & join" onPress={createChallenge} />
        </View> : null}
      </Card>

      {challenges.map(ch => <Card key={ch.id}>
        <View style={styles.challengeTop}><View style={{ flex: 1 }}><Text style={styles.challenge}>{ch.preset ? '★ ' : ''}{ch.title}</Text><Text style={styles.meta}>{ch.description}</Text></View><Pressable style={styles.small} onPress={() => joinChallenge(ch.id)}><Text style={styles.smallText}>{ch.joined ? 'Joined' : 'Join'}</Text></Pressable></View>
        <Text style={styles.progress}>{Number(ch.my_progress ?? 0).toFixed(ch.metric === 'distance' ? 1 : 0)} / {ch.target_value} {ch.unit}</Text>
        <View style={styles.track}><View style={[styles.fill,{ width: `${Math.min(100,(Number(ch.my_progress ?? 0)/Math.max(1,Number(ch.target_value)))*100)}%` }]} /></View>
        <Text style={styles.meta}>{ch.participant_count} joined · ends {new Date(ch.end_date).toLocaleDateString()}</Text>
      </Card>)}
    </ScrollView>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) { const { colors } = useTheme(); const styles = createStyles(colors); return url ? <Image source={{ uri: url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{String(name ?? '?').slice(0,1).toUpperCase()}</Text></View>; }

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 }, title: { color: colors.text, fontSize: 29, fontWeight: '900' }, sub: { color: colors.muted, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  person: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }, avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.text, fontWeight: '900' }, name: { color: colors.text, fontWeight: '900' }, meta: { color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 16 },
  small: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, backgroundColor: colors.primary }, smallText: { color: colors.text, fontWeight: '900', fontSize: 12 }, post: { color: colors.text, fontSize: 16, lineHeight: 22, marginVertical: 8, fontWeight: '700' },
  comment: { backgroundColor: colors.panel2, borderRadius: 12, padding: 9, marginTop: 6 }, commentAuthor: { color: colors.cyan, fontWeight: '900', fontSize: 11 }, commentBody: { color: colors.text, marginTop: 2 }, commentInput: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 9 }, send: { backgroundColor: colors.blue, borderRadius: 12, paddingHorizontal: 13, minHeight: 48, justifyContent: 'center' }, sendText: { color: 'white', fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' }, two: { flexDirection: 'row', gap: 8 }, challengeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, challenge: { color: colors.text, fontSize: 17, fontWeight: '900' }, progress: { color: colors.cyan, fontSize: 18, fontWeight: '900', marginTop: 10 }, track: { height: 8, borderRadius: 999, backgroundColor: colors.panel2, overflow: 'hidden', marginVertical: 7 }, fill: { height: '100%', backgroundColor: colors.purple }
});
