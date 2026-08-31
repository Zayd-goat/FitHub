import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Input, RefreshableScrollView, useTheme } from '../../components/UI';
import { FitHubSocialIcon, FitHubSocialIconName } from '../../components/FitHubSocialIcons';
import { exerciseLibrary } from '../../data/exerciseLibrary';
import { cancelGymReminder, scheduleGymReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../lib/types';
import { formatDistance, kgToDisplay } from '../../lib/units';

type FriendsView = 'feed' | 'following' | 'invites' | 'mine';
type PostFilter = 'all' | 'workouts' | 'prs' | 'progress';
type MineLayout = 'grid' | 'list';

type GymInvite = {
  id: string;
  sender_id: string;
  recipient_id: string;
  session_at: string;
  gym_name?: string | null;
  workout_name?: string | null;
  note?: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  sender?: { username?: string; avatar_url?: string | null } | null;
  recipient?: { username?: string; avatar_url?: string | null } | null;
};

type Props = {
  profile: Profile;
  onCreatePost?: () => void;
  onViewProfile?: () => void;
};

export type FriendsTabHandle = { goBack: () => boolean };

const tomorrowKey = () => {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const FriendsTab = forwardRef<FriendsTabHandle, Props>(function FriendsTab({ profile, onCreatePost, onViewProfile }, ref) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [view, setView] = useState<FriendsView>('feed');
  const [feedFilter, setFeedFilter] = useState<PostFilter>('all');
  const [mineFilter, setMineFilter] = useState<PostFilter>('all');
  const [mineLayout, setMineLayout] = useState<MineLayout>('grid');
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendAlerts, setFriendAlerts] = useState<Record<string, { post_notifications: boolean; pr_notifications: boolean }>>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [gymInvites, setGymInvites] = useState<GymInvite[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteFriendId, setInviteFriendId] = useState('');
  const [inviteDate, setInviteDate] = useState(tomorrowKey());
  const [inviteTime, setInviteTime] = useState('17:00');
  const [inviteGym, setInviteGym] = useState('');
  const [inviteWorkout, setInviteWorkout] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [editPhotoAsset, setEditPhotoAsset] = useState<any | null>(null);
  const [removeEditPhoto, setRemoveEditPhoto] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const closeEditor = () => {
    if (savingEdit) return;
    setEditingPost(null);
    setEditPhotoAsset(null);
  };

  useImperativeHandle(ref, () => ({ goBack: () => {
    if (editingPost) { closeEditor(); return true; }
    if (showInviteForm) { setShowInviteForm(false); return true; }
    if (view !== 'feed') { changeView('feed'); return true; }
    return false;
  } }), [editingPost, savingEdit, showInviteForm, view]);

  const load = async () => {
    const [requestResult, friendResult, inviteResult, preferenceResult] = await Promise.all([
      supabase.from('friend_requests').select('id,requester_id,status,created_at,requester:public_profiles!friend_requests_requester_id_fkey(username,avatar_url,login_streak,workout_streak,tokens)').eq('addressee_id', profile.id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.rpc('get_my_friends'),
      supabase.from('gym_invites').select('id,sender_id,recipient_id,session_at,gym_name,workout_name,note,status,created_at,sender:public_profiles!gym_invites_sender_id_fkey(username,avatar_url),recipient:public_profiles!gym_invites_recipient_id_fkey(username,avatar_url)').or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order('session_at', { ascending: true }),
      supabase.from('friend_notification_preferences').select('friend_id,post_notifications,pr_notifications').eq('user_id', profile.id),
    ]);

    let feedResult = await supabase.rpc('get_friend_feed_v3');
    if (feedResult.error) feedResult = await supabase.rpc('get_friend_feed_v2');
    if (feedResult.error) feedResult = await supabase.rpc('get_friend_feed');

    setRequests(requestResult.data ?? []);
    setFriends(friendResult.data ?? []);
    setFriendAlerts(Object.fromEntries((preferenceResult.data ?? []).map((row: any) => [row.friend_id, { post_notifications: row.post_notifications, pr_notifications: row.pr_notifications }])));
    const invites = (inviteResult.data ?? []) as GymInvite[];
    setGymInvites(invites);

    let feedRows: any[] = feedResult.data ?? [];
    const ids = feedRows.map((post: any) => post.id);
    if (ids.length) {
      const { data } = await supabase.from('workout_posts').select('id,hide_like_count,hide_comment_count').in('id', ids);
      const settings = Object.fromEntries((data ?? []).map((row: any) => [row.id, row]));
      feedRows = feedRows.map((post: any) => ({ ...post, ...settings[post.id] }));
    }
    const enriched = await Promise.all(feedRows.map(async (post: any) => {
      if (!post.photo_path) return post;
      const { data } = await supabase.storage.from('workout-media').createSignedUrl(post.photo_path, 3600);
      return { ...post, photo_url: data?.signedUrl ?? null };
    }));
    setPosts(enriched);

    if (ids.length) {
      const [{ data: commentRows }, { data: reactionRows }] = await Promise.all([
        supabase.from('comments').select('id,post_id,user_id,body,created_at,hidden_by_post_owner,hidden_at,author:public_profiles!comments_user_id_fkey(username,avatar_url)').in('post_id', ids).order('created_at', { ascending: true }),
        supabase.from('post_reactions').select('post_id,user_id').in('post_id', ids),
      ]);
      const nextComments: Record<string, any[]> = {};
      for (const row of commentRows ?? []) (nextComments[row.post_id] ??= []).push(row);
      setComments(nextComments);
      const nextReactions: Record<string, string[]> = {};
      for (const row of reactionRows ?? []) (nextReactions[row.post_id] ??= []).push(row.user_id);
      setReactions(nextReactions);
    } else {
      setComments({});
      setReactions({});
    }

    invites.filter((invite) => invite.status === 'accepted' && new Date(invite.session_at).getTime() > Date.now()).forEach((invite) => {
      const other = invite.sender_id === profile.id ? invite.recipient : invite.sender;
      scheduleGymReminder({ inviteId: invite.id, friendName: other?.username ?? 'your friend', sessionAt: invite.session_at, workoutName: invite.workout_name, gymName: invite.gym_name }).catch(() => {});
    });
  };

  useEffect(() => {
    load();
    const channel = supabase.channel(`fithub-social-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_posts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_invites' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id]);

  const changeView = (next: FriendsView) => {
    setView(next);
    setSearch('');
    setFound([]);
    setSearched(false);
  };

  const findPeople = async () => {
    if (!search.trim() || view === 'mine') return;
    setSearching(true);
    setSearched(true);
    const { data, error } = await supabase.rpc('find_profile', { search_text: search.trim() });
    setSearching(false);
    if (error) return Alert.alert('Search', error.message);
    setFound((data ?? []).filter((row: any) => row.user_id !== profile.id));
  };

  const addFriend = async (userId: string) => {
    const { error } = await supabase.from('friend_requests').insert({ requester_id: profile.id, addressee_id: userId });
    Alert.alert(error ? 'Friend request' : 'Request sent', error ? (error.message.includes('duplicate') ? 'A request already exists.' : error.message) : 'They will see your request in FitHub.');
  };

  const acceptFriend = async (id: string) => {
    const { error } = await supabase.rpc('accept_friend_request', { request_id: id });
    if (error) Alert.alert('Could not accept', error.message); else load();
  };

  const removeFriendRequest = async (id: string) => {
    const { error } = await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', id).eq('addressee_id', profile.id).eq('status', 'pending');
    if (error) Alert.alert('Could not remove request', error.message); else load();
  };

  const toggleFriendAlert = async (friendId: string, key: 'post_notifications' | 'pr_notifications') => {
    const current = friendAlerts[friendId] ?? { post_notifications: false, pr_notifications: false };
    const next = { ...current, [key]: !current[key] };
    const { error } = await supabase.from('friend_notification_preferences').upsert({ user_id: profile.id, friend_id: friendId, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id,friend_id' });
    if (error) Alert.alert('Notifications', error.message); else setFriendAlerts({ ...friendAlerts, [friendId]: next });
  };

  const reactToPost = async (postId: string) => {
    const liked = (reactions[postId] ?? []).includes(profile.id);
    const query = liked ? supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', profile.id) : supabase.from('post_reactions').insert({ post_id: postId, user_id: profile.id, reaction: 'like' });
    const { error } = await query;
    if (error) Alert.alert('Like', error.message); else load();
  };

  const addComment = async (postId: string) => {
    const body = (commentText[postId] ?? '').trim();
    if (!body) return;
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: profile.id, body });
    if (error) Alert.alert('Comment', error.message); else { setCommentText({ ...commentText, [postId]: '' }); load(); }
  };

  const deleteComment = (comment: any) => Alert.alert('Delete comment?', 'This comment will be permanently removed.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await supabase.from('comments').delete().eq('id', comment.id); if (error) Alert.alert('Comment', error.message); else load(); } },
  ]);

  const hideComment = async (comment: any) => {
    const hidden = !comment.hidden_by_post_owner;
    const { error } = await supabase.from('comments').update({ hidden_by_post_owner: hidden, hidden_at: hidden ? new Date().toISOString() : null }).eq('id', comment.id);
    if (error) Alert.alert('Comment', error.message); else load();
  };

  const deletePost = (post: any) => Alert.alert('Delete workout post?', 'The post, comments and reactions will be removed. Your private workout stays saved.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      if (post.photo_path) await supabase.storage.from('workout-media').remove([post.photo_path]);
      const { error } = await supabase.from('workout_posts').delete().eq('id', post.id).eq('user_id', profile.id);
      if (error) Alert.alert('Delete post', error.message); else load();
    } },
  ]);

  const toggleCount = async (post: any, key: 'hide_like_count' | 'hide_comment_count') => {
    const { error } = await supabase.from('workout_posts').update({ [key]: !post[key] }).eq('id', post.id).eq('user_id', profile.id);
    if (error) Alert.alert('Post settings', error.message); else load();
  };

  const editPost = (post: any) => {
    setEditingPost(post);
    setEditCaption(String(post.caption ?? ''));
    setEditPhotoUri(post.photo_url ?? null);
    setEditPhotoAsset(null);
    setRemoveEditPhoto(false);
  };

  const postControls = (post: any) => Alert.alert('Post controls', 'Manage your workout post.', [
    { text: 'Edit caption or photo', onPress: () => editPost(post) },
    { text: post.hide_like_count ? 'Show like count' : 'Hide like count', onPress: () => toggleCount(post, 'hide_like_count') },
    { text: post.hide_comment_count ? 'Show comment count' : 'Hide comment count', onPress: () => toggleCount(post, 'hide_comment_count') },
    { text: 'Delete post', style: 'destructive', onPress: () => deletePost(post) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: .82 });
    if (result.canceled) return;
    setEditPhotoAsset(result.assets[0]);
    setEditPhotoUri(result.assets[0].uri);
    setRemoveEditPhoto(false);
  };

  const savePost = async () => {
    if (!editingPost || savingEdit) return;
    setSavingEdit(true);
    let uploadedPath: string | null = null;
    const originalPath = editingPost.photo_path as string | null;
    try {
      let photoPath: string | null = removeEditPhoto ? null : originalPath;
      if (editPhotoAsset) {
        const bytes = await (await fetch(editPhotoAsset.uri)).arrayBuffer();
        const extension = String(editPhotoAsset.fileName?.split('.').pop() || 'jpg').toLowerCase();
        uploadedPath = `${profile.id}/${editingPost.session_id || editingPost.id}-edit-${Date.now()}.${/^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg'}`;
        const { error } = await supabase.storage.from('workout-media').upload(uploadedPath, bytes, { contentType: editPhotoAsset.mimeType ?? 'image/jpeg' });
        if (error) throw error;
        photoPath = uploadedPath;
      }
      const { error } = await supabase.from('workout_posts').update({ caption: editCaption.trim().slice(0, 500) || null, photo_path: photoPath, updated_at: new Date().toISOString() }).eq('id', editingPost.id).eq('user_id', profile.id);
      if (error) throw error;
      if (originalPath && originalPath !== photoPath) await supabase.storage.from('workout-media').remove([originalPath]);
      setEditingPost(null);
      await load();
    } catch (error: any) {
      if (uploadedPath) await supabase.storage.from('workout-media').remove([uploadedPath]);
      Alert.alert('Could not update post', error?.message ?? 'Please try again.');
    } finally { setSavingEdit(false); }
  };

  const respondToInvite = async (invite: GymInvite, status: 'accepted' | 'declined') => {
    const { error } = await supabase.from('gym_invites').update({ status, updated_at: new Date().toISOString() }).eq('id', invite.id).eq('recipient_id', profile.id);
    if (error) return Alert.alert('Gym invite', error.message);
    if (status === 'accepted') await scheduleGymReminder({ inviteId: invite.id, friendName: invite.sender?.username ?? 'your friend', sessionAt: invite.session_at, workoutName: invite.workout_name, gymName: invite.gym_name }).catch(() => {});
    else await cancelGymReminder(invite.id);
    await supabase.functions.invoke('friend-notifications', { body: { invite_id: invite.id, notification_kind: 'response' } }).catch(() => null);
    load();
  };

  const cancelInvite = async (invite: GymInvite) => {
    const { error } = await supabase.from('gym_invites').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', invite.id).eq('sender_id', profile.id);
    if (error) Alert.alert('Gym invite', error.message); else { await cancelGymReminder(invite.id); load(); }
  };

  const sendInvite = async () => {
    if (!inviteFriendId) return Alert.alert('Choose a friend', 'Select who you want to train with.');
    const sessionAt = parseLocalDateTime(inviteDate, inviteTime);
    if (!sessionAt || sessionAt.getTime() <= Date.now()) return Alert.alert('Check the session time', 'Use a future date and time.');
    setSendingInvite(true);
    try {
      const { data, error } = await supabase.from('gym_invites').insert({ sender_id: profile.id, recipient_id: inviteFriendId, session_at: sessionAt.toISOString(), gym_name: inviteGym.trim() || null, workout_name: inviteWorkout.trim() || null, note: inviteNote.trim() || null }).select('id').single();
      if (error) throw error;
      await supabase.functions.invoke('friend-notifications', { body: { invite_id: data.id } }).catch(() => null);
      setShowInviteForm(false);
      setInviteNote('');
      Alert.alert('Gym invite sent', 'Your friend has been notified.');
      load();
    } catch (error: any) { Alert.alert('Could not send invite', error?.message ?? 'Please try again.'); }
    finally { setSendingInvite(false); }
  };

  const pendingInvites = useMemo(() => gymInvites.filter((invite) => invite.recipient_id === profile.id && invite.status === 'pending'), [gymInvites, profile.id]);
  const upcoming = useMemo(() => gymInvites.filter((invite) => invite.status === 'accepted' && new Date(invite.session_at).getTime() > Date.now()), [gymInvites]);
  const sent = useMemo(() => gymInvites.filter((invite) => invite.sender_id === profile.id && invite.status === 'pending'), [gymInvites, profile.id]);
  const myPosts = useMemo(() => posts.filter((post) => post.user_id === profile.id), [posts, profile.id]);
  const feedPosts = useMemo(() => posts.filter((post) => matchesFilter(post, feedFilter)), [posts, feedFilter]);
  const filteredMine = useMemo(() => {
    const query = search.trim().toLowerCase();
    return myPosts.filter((post) => matchesFilter(post, mineFilter)).filter((post) => !query || postSearchText(post).includes(query));
  }, [myPosts, mineFilter, search]);
  const myLikes = useMemo(() => myPosts.reduce((total, post) => total + (reactions[post.id]?.length ?? 0), 0), [myPosts, reactions]);
  const myComments = useMemo(() => myPosts.reduce((total, post) => total + (comments[post.id]?.filter((row) => !row.hidden_by_post_owner).length ?? 0), 0), [myPosts, comments]);

  return <>
    <PostEditor visible={Boolean(editingPost)} caption={editCaption} setCaption={setEditCaption} photoUri={editPhotoUri} onChoosePhoto={choosePhoto} onRemovePhoto={() => { setEditPhotoAsset(null); setEditPhotoUri(null); setRemoveEditPhoto(true); }} saving={savingEdit} onClose={closeEditor} onSave={savePost}/>
    <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Text style={styles.title}>Friends</Text><Pressable onPress={() => changeView('following')} style={styles.headerButton}><FitHubSocialIcon name="personAdd" size={27} color={colors.text} accentColor={colors.primary}/></Pressable></View>
      <View style={styles.searchBox}>
        <FitHubSocialIcon name="search" size={24} color={colors.muted} accentColor={colors.primary}/>
        <Input value={search} onChangeText={(value) => { setSearch(value); if (!value.trim()) { setFound([]); setSearched(false); } }} onSubmitEditing={view === 'mine' ? undefined : findPeople} returnKeyType="search" placeholder={view === 'mine' ? 'Search your posts' : 'Search friends'} style={styles.searchInput}/>
        {search.trim() && view !== 'mine' ? <Pressable onPress={findPeople} style={styles.goButton}><Text style={styles.goText}>{searching ? '…' : 'Go'}</Text></Pressable> : null}
      </View>
      <View style={styles.tabs}>
        <TopTab label="Feed" active={view === 'feed'} onPress={() => changeView('feed')}/>
        <TopTab label="Following" active={view === 'following'} onPress={() => changeView('following')}/>
        <TopTab label="Invites" badge={pendingInvites.length + requests.length} active={view === 'invites'} onPress={() => changeView('invites')}/>
        <TopTab label="My Posts" active={view === 'mine'} onPress={() => changeView('mine')}/>
      </View>

      {view !== 'mine' && (searched || found.length) ? <SearchResults rows={found} searching={searching} onAdd={addFriend}/> : null}

      {view === 'feed' ? <View style={styles.body}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          <FilterPill label="All" icon="check" active={feedFilter === 'all'} onPress={() => setFeedFilter('all')}/>
          <FilterPill label="Workouts" icon="dumbbell" active={feedFilter === 'workouts'} onPress={() => setFeedFilter('workouts')}/>
          <FilterPill label="PRs" icon="medal" active={feedFilter === 'prs'} onPress={() => setFeedFilter('prs')}/>
          <FilterPill label="Progress" icon="progress" active={feedFilter === 'progress'} onPress={() => setFeedFilter('progress')}/>
        </ScrollView>
        {requests.length ? <Pressable onPress={() => changeView('invites')} style={styles.notice}><RoundIcon name="people"/><View style={styles.flex}><Text style={styles.cardTitle}>{requests.length} friend request{requests.length === 1 ? '' : 's'} waiting</Text><Text style={styles.muted}>Review requests in Invites</Text></View><FitHubSocialIcon name="chevron" size={18} color={colors.muted}/></Pressable> : null}
        {feedPosts.length ? feedPosts.map((post) => <SocialPost key={post.id} post={post} mine={post.user_id === profile.id} viewerId={profile.id} comments={comments[post.id] ?? []} reactions={reactions[post.id] ?? []} comment={commentText[post.id] ?? ''} setComment={(value) => setCommentText({ ...commentText, [post.id]: value })} onSend={() => addComment(post.id)} onLike={() => reactToPost(post.id)} onShare={() => Share.share({ message: `${postTitle(post)}\n${postExerciseNames(post).slice(0, 4).join(' • ')}\nShared from FitHub` })} onControls={() => postControls(post)} onDeleteComment={deleteComment} onHideComment={hideComment}/>) : <Empty icon="dumbbell" title="No posts in this view" body="Completed workouts and progress updates from your training circle will appear here."/>}
      </View> : null}

      {view === 'following' ? <View style={styles.body}>
        <View style={styles.sectionRow}><View><Text style={styles.eyebrow}>YOUR CIRCLE</Text><Text style={styles.sectionTitle}>Following</Text></View><Text style={styles.count}>{friends.length}</Text></View>
        <Text style={styles.sectionCopy}>Choose post and personal-record alerts separately for each friend.</Text>
        {friends.length ? friends.map((friend: any) => <FriendCard key={friend.user_id} friend={friend} preferences={friendAlerts[friend.user_id] ?? { post_notifications: false, pr_notifications: false }} onToggle={toggleFriendAlert}/>) : <Empty icon="people" title="Build your training circle" body="Search for a FitHub member above and send a friend request."/>}
      </View> : null}

      {view === 'invites' ? <View style={styles.body}>
        <InviteSummary gym={pendingInvites.length} friends={requests.length}/>
        {showInviteForm ? <InviteForm friends={friends} friendId={inviteFriendId} setFriendId={setInviteFriendId} date={inviteDate} setDate={setInviteDate} time={inviteTime} setTime={setInviteTime} gym={inviteGym} setGym={setInviteGym} workout={inviteWorkout} setWorkout={setInviteWorkout} note={inviteNote} setNote={setInviteNote} sending={sendingInvite} onSend={sendInvite} onClose={() => setShowInviteForm(false)}/> : null}
        <SectionLabel text="GYM INVITES"/>
        {pendingInvites.length ? pendingInvites.map((invite) => <InviteCard key={invite.id} invite={invite} other={invite.sender} incoming><View style={styles.actions}><SmallButton title="Accept" onPress={() => respondToInvite(invite, 'accepted')}/><SmallButton title="Decline" secondary onPress={() => respondToInvite(invite, 'declined')}/></View></InviteCard>) : <CompactEmpty text="No new gym invites"/>}
        <SectionLabel text="FRIEND REQUESTS"/>
        {requests.length ? requests.map((request) => <View key={request.id} style={styles.request}><Avatar name={request.requester?.username} url={request.requester?.avatar_url} large/><View style={styles.flex}><Text style={styles.friendName}>{request.requester?.username}</Text><Text style={styles.muted}>wants to connect with you</Text></View><View style={styles.requestButtons}><SmallButton title="Confirm" onPress={() => acceptFriend(request.id)}/><SmallButton title="Remove" secondary onPress={() => removeFriendRequest(request.id)}/></View></View>) : <CompactEmpty text="No pending friend requests"/>}
        <Pressable onPress={() => setShowInviteForm(true)} style={styles.planCard}><RoundIcon name="calendar"/><View style={styles.flex}><Text style={styles.cardTitle}>Plan a gym session</Text><Text style={styles.muted}>Choose a friend, workout, place and time</Text></View><FitHubSocialIcon name="chevron" size={19} color={colors.muted}/></Pressable>
        {upcoming.length ? <><SectionLabel text="UPCOMING SESSIONS"/>{upcoming.map((invite) => <InviteCard key={invite.id} invite={invite} other={invite.sender_id === profile.id ? invite.recipient : invite.sender}>{invite.sender_id === profile.id ? <Pressable onPress={() => cancelInvite(invite)}><Text style={styles.danger}>Cancel session</Text></Pressable> : null}</InviteCard>)}</> : null}
        {sent.length ? <><SectionLabel text="WAITING FOR A REPLY"/>{sent.map((invite) => <InviteCard key={invite.id} invite={invite} other={invite.recipient}><Pressable onPress={() => cancelInvite(invite)}><Text style={styles.danger}>Cancel invite</Text></Pressable></InviteCard>)}</> : null}
      </View> : null}

      {view === 'mine' ? <View style={styles.body}>
        <ProfileSummary profile={profile} postCount={myPosts.length} likeCount={myLikes} commentCount={myComments} onViewProfile={onViewProfile}/>
        <View style={styles.mineTools}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}><FilterPill label="All posts" icon="check" active={mineFilter === 'all'} onPress={() => setMineFilter('all')}/><FilterPill label="Workouts" icon="dumbbell" active={mineFilter === 'workouts'} onPress={() => setMineFilter('workouts')}/><FilterPill label="Progress" icon="progress" active={mineFilter === 'progress'} onPress={() => setMineFilter('progress')}/></ScrollView><View style={styles.layout}><LayoutButton name="list" active={mineLayout === 'list'} onPress={() => setMineLayout('list')}/><LayoutButton name="grid" active={mineLayout === 'grid'} onPress={() => setMineLayout('grid')}/></View></View>
        <View style={styles.privateLine}><FitHubSocialIcon name="lock" size={17} color={colors.muted}/><Text style={styles.muted}>Only your posts appear here</Text></View>
        <SectionLabel text="YOUR POSTS"/>
        {filteredMine.length ? mineLayout === 'grid' ? <View style={styles.grid}>{filteredMine.map((post) => <MineGridCard key={post.id} post={post} onControls={() => postControls(post)}/>)}</View> : filteredMine.map((post) => <MineListCard key={post.id} post={post} onControls={() => postControls(post)}/>) : <Empty icon="edit" title="No posts found" body={search.trim() ? 'Try a different search or filter.' : 'Complete a workout, then share it to build your training history.'}/>} 
        <Pressable onPress={onCreatePost} style={styles.create}><FitHubSocialIcon name="edit" size={22} color="#FFFFFF" accentColor="#FFFFFF"/><Text style={styles.createText}>Create post</Text></Pressable>
      </View> : null}
    </RefreshableScrollView>
  </>;
});

export default FriendsTab;

function TopTab({ label, badge, active, onPress }: { label: string; badge?: number; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.tab, active && styles.tabActive]}>
    <Text numberOfLines={1} style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    {badge ? <View style={[styles.badge, active && styles.badgeActive]}><Text style={[styles.badgeText, active && styles.badgeTextActive]}>{badge > 9 ? '9+' : badge}</Text></View> : null}
  </Pressable>;
}

function FilterPill({ label, icon, active, onPress }: { label: string; icon: FitHubSocialIconName; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}><FitHubSocialIcon name={icon} size={18} color={active ? colors.primary : colors.text} accentColor={colors.primary} filled={active}/><Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text></Pressable>;
}

function LayoutButton({ name, active, onPress }: { name: 'list' | 'grid'; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Pressable onPress={onPress} style={[styles.layoutButton, active && styles.layoutButtonActive]}><FitHubSocialIcon name={name} size={19} color={active ? '#FFFFFF' : colors.muted} accentColor={colors.primary}/></Pressable>;
}

function SearchResults({ rows, searching, onAdd }: { rows: any[]; searching: boolean; onAdd: (id: string) => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.searchResults}><Text style={styles.eyebrow}>SEARCH RESULTS</Text>{searching ? <Text style={styles.emptyCopy}>Searching…</Text> : rows.length ? rows.map((row) => <View key={row.user_id} style={styles.resultRow}><Avatar name={row.username} url={row.avatar_url} large/><View style={styles.flex}><Text style={styles.friendName}>@{row.username}</Text><Text style={styles.muted}>FitHub member</Text></View><SmallButton title="Add" onPress={() => onAdd(row.user_id)}/></View>) : <Text style={styles.emptyCopy}>No matching members found.</Text>}</View>;
}

function FriendCard({ friend, preferences, onToggle }: { friend: any; preferences: { post_notifications: boolean; pr_notifications: boolean }; onToggle: (id: string, key: 'post_notifications' | 'pr_notifications') => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.friendCard}><Avatar name={friend.username} url={friend.avatar_url} large/><View style={styles.flex}><Text style={styles.friendName}>@{friend.username}</Text><View style={styles.friendMetaRow}><Text style={styles.muted}>{friend.workout_streak ?? 0} workout streak</Text><View style={styles.dot}/><Text style={styles.muted}>{friend.tokens ?? 0} points</Text></View><View style={styles.preferenceRow}><Preference label="Posts" active={preferences.post_notifications} onPress={() => onToggle(friend.user_id, 'post_notifications')}/><Preference label="PRs" active={preferences.pr_notifications} onPress={() => onToggle(friend.user_id, 'pr_notifications')}/></View></View></View>;
}

function Preference({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Pressable onPress={onPress} style={[styles.preference, active && styles.preferenceActive]}><View style={[styles.preferenceDot, active && styles.preferenceDotActive]}/><Text style={[styles.preferenceText, active && styles.preferenceTextActive]}>{label} {active ? 'on' : 'off'}</Text></Pressable>;
}

function InviteSummary({ gym, friends }: { gym: number; friends: number }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.summary}><RoundIcon name="envelope"/><View style={styles.summaryCopy}><Text style={styles.summaryTitle}>Invitations</Text><Text style={styles.muted}>Train together. Stay consistent.</Text></View><SummaryNumber value={gym} label="Gym invite"/><SummaryNumber value={friends} label="Friend request"/></View>;
}

function SummaryNumber({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.summaryNumber}><Text style={styles.summaryValue}>{value}</Text><Text numberOfLines={2} style={styles.summaryLabel}>{label}{value === 1 ? '' : 's'}</Text></View>;
}

function InviteForm(props: {
  friends: any[]; friendId: string; setFriendId: (value: string) => void;
  date: string; setDate: (value: string) => void; time: string; setTime: (value: string) => void;
  gym: string; setGym: (value: string) => void; workout: string; setWorkout: (value: string) => void;
  note: string; setNote: (value: string) => void; sending: boolean; onSend: () => void; onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.formCard}>
    <View style={styles.formHeader}><View><Text style={styles.eyebrow}>NEW INVITE</Text><Text style={styles.formTitle}>Plan a gym session</Text></View><Pressable onPress={props.onClose} style={styles.closeButton}><FitHubSocialIcon name="close" size={18} color={colors.text}/></Pressable></View>
    <Text style={styles.fieldLabel}>TRAIN WITH</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendPicker}>{props.friends.map((friend: any) => <Pressable key={friend.user_id} onPress={() => props.setFriendId(friend.user_id)} style={[styles.friendChip, props.friendId === friend.user_id && styles.friendChipActive]}><Avatar name={friend.username} url={friend.avatar_url} small/><Text style={[styles.friendChipText, props.friendId === friend.user_id && { color: colors.primary }]}>@{friend.username}</Text></Pressable>)}</ScrollView>
    {!props.friends.length ? <Text style={styles.emptyCopy}>Add a friend first, then invite them to train.</Text> : null}
    <View style={styles.two}><View style={styles.flex}><Text style={styles.fieldLabel}>DATE</Text><Input value={props.date} onChangeText={props.setDate} placeholder="YYYY-MM-DD" autoCapitalize="none"/></View><View style={styles.flex}><Text style={styles.fieldLabel}>TIME</Text><Input value={props.time} onChangeText={props.setTime} placeholder="17:00" autoCapitalize="none"/></View></View>
    <Input value={props.gym} onChangeText={props.setGym} placeholder="Gym / location (optional)"/><Input value={props.workout} onChangeText={props.setWorkout} placeholder="Workout, e.g. Push Day (optional)"/><Input value={props.note} onChangeText={props.setNote} placeholder="Message (optional)"/>
    <Button title={props.sending ? 'SENDING…' : 'SEND GYM INVITE'} onPress={props.onSend} disabled={props.sending || !props.friends.length}/>
  </View>;
}

function InviteCard({ invite, other, incoming = false, children }: { invite: GymInvite; other?: any; incoming?: boolean; children?: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const date = new Date(invite.session_at);
  return <View style={styles.inviteCard}>
    <View style={styles.inviteHeader}><Avatar name={other?.username ?? '?'} url={other?.avatar_url} large/><View style={styles.flex}><Text style={styles.friendName}>{other?.username ?? 'Friend'}</Text><Text style={styles.muted}>{incoming ? 'invited you to train' : 'Gym session'}</Text></View><View style={styles.calendar}><FitHubSocialIcon name="calendar" size={29} color={colors.text} accentColor={colors.primary}/></View></View>
    <Text style={styles.workoutName}>{invite.workout_name?.trim() || 'Gym session'}</Text>
    <MetaLine icon="clock" text={`${friendlyDate(date)} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}/>{invite.gym_name ? <MetaLine icon="location" text={invite.gym_name}/> : null}{invite.note ? <Text style={styles.inviteNote}>{invite.note}</Text> : null}{children ? <View style={styles.inviteChildren}>{children}</View> : null}
  </View>;
}

function MetaLine({ icon, text }: { icon: FitHubSocialIconName; text: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.metaLine}><FitHubSocialIcon name={icon} size={17} color={colors.muted} accentColor={colors.primary}/><Text style={styles.metaText}>{text}</Text></View>;
}

function ProfileSummary({ profile, postCount, likeCount, commentCount, onViewProfile }: { profile: Profile; postCount: number; likeCount: number; commentCount: number; onViewProfile?: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.profileCard}><Avatar name={profile.username} url={profile.avatar_url} hero/><View style={styles.flex}><Text style={styles.profileName}>{profile.username}</Text><Text style={styles.profileSub}>Your training posts</Text></View><View style={styles.profileStats}><Metric value={postCount} label="Posts"/><Metric value={compactNumber(likeCount)} label="Likes"/><Metric value={compactNumber(commentCount)} label="Comments"/></View><Pressable onPress={onViewProfile} style={styles.profileButton}><Text style={styles.profileButtonText}>View profile</Text></Pressable></View>;
}

function Metric({ value, label }: { value: number | string; label: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function PostEditor(props: { visible: boolean; caption: string; setCaption: (value: string) => void; photoUri: string | null; onChoosePhoto: () => void; onRemovePhoto: () => void; saving: boolean; onClose: () => void; onSave: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}><View style={styles.modalBackdrop}><View style={styles.editSheet}><View style={styles.formHeader}><View><Text style={styles.eyebrow}>YOUR POST</Text><Text style={styles.formTitle}>Edit workout post</Text></View><Pressable onPress={props.onClose} style={styles.closeButton}><FitHubSocialIcon name="close" size={18} color={colors.text}/></Pressable></View><Text style={styles.fieldLabel}>CAPTION</Text><Input value={props.caption} onChangeText={props.setCaption} placeholder="Add a caption (optional)" multiline maxLength={500} style={styles.captionInput}/>{props.photoUri ? <Image source={{ uri: props.photoUri }} style={styles.editPhoto}/> : <View style={styles.noPhoto}><FitHubSocialIcon name="edit" size={31} color={colors.muted} accentColor={colors.primary}/><Text style={styles.emptyCopy}>No photo selected</Text></View>}<View style={styles.photoActions}><SmallButton title={props.photoUri ? 'Replace photo' : 'Choose photo'} secondary onPress={props.onChoosePhoto}/>{props.photoUri ? <Pressable onPress={props.onRemovePhoto}><Text style={styles.danger}>Remove photo</Text></Pressable> : null}</View><Text style={styles.editHelp}>Workout totals stay linked to the original completed session.</Text><Button title={props.saving ? 'SAVING…' : 'SAVE CHANGES'} onPress={props.onSave} disabled={props.saving}/></View></View></Modal>;
}

function SocialPost(props: { post: any; mine: boolean; viewerId: string; comments: any[]; reactions: string[]; comment: string; setComment: (value: string) => void; onSend: () => void; onLike: () => void; onShare: () => void; onControls: () => void; onDeleteComment: (comment: any) => void; onHideComment: (comment: any) => void }) {
  const { colors, weightUnit, distanceUnit } = useTheme();
  const styles = makeStyles(colors);
  const post = props.post;
  const names = postExerciseNames(post);
  const groups = postGroups(post);
  const minutes = postDurationMinutes(post);
  const volume = Math.round(Number(post.total_volume ?? 0));
  const distance = Number(post.total_distance ?? 0);
  const visibleComments = props.comments.filter((comment) => props.mine || !comment.hidden_by_post_owner);
  const commentControls = (comment: any) => Alert.alert('Comment controls', undefined, [...(props.mine ? [{ text: comment.hidden_by_post_owner ? 'Unhide comment' : 'Hide comment', onPress: () => props.onHideComment(comment) }] : []), { text: 'Delete comment', style: 'destructive', onPress: () => props.onDeleteComment(comment) }, { text: 'Cancel', style: 'cancel' }] as any);
  return <View style={styles.postCard}>
    <View style={styles.postHeader}><Avatar name={post.username} url={post.avatar_url} large/><View style={styles.flex}><Text style={styles.postAuthor}>{post.username}</Text><Text style={styles.postTime}>{relativeTime(post.created_at)}</Text></View><Pressable onPress={props.mine ? props.onControls : undefined} style={styles.moreButton}><Text style={styles.more}>•••</Text></Pressable></View>
    <Text style={styles.postTitle}>{postTitle(post)}</Text><Text style={styles.groupLine}>{groups.length ? groups.slice(0, 4).join(' • ') : (names.slice(0, 3).join(' • ') || 'Training session')}</Text>{post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
    {post.photo_url ? <Image source={{ uri: post.photo_url }} style={styles.postPhoto}/> : <View style={styles.photoPlaceholder}><FitHubSocialIcon name="dumbbell" size={52} color={colors.text} accentColor={colors.primary} filled/><Text style={styles.cardTitle}>Workout complete</Text></View>}
    <View style={styles.postStats}><PostStat icon="dumbbell" value={post.exercise_count ?? (names.length || '—')} label="Exercises"/><PostStat icon="list" value={post.total_sets ?? '—'} label="Sets"/><PostStat icon="clock" value={minutes ? formatMinutes(minutes) : '—'} label="Duration"/><PostStat icon="progress" value={volume > 0 ? `${Math.round(kgToDisplay(volume, weightUnit)).toLocaleString()} ${weightUnit}` : distance > 0 ? formatDistance(distance, distanceUnit, 1) : '—'} label={volume > 0 ? 'Volume' : 'Distance'}/></View>
    {names.length ? <View style={styles.highlight}><FitHubSocialIcon name="medal" size={21} color={colors.text} accentColor={colors.primary}/><Text numberOfLines={1} style={styles.highlightText}>{names.slice(0, 3).join(' • ')}{names.length > 3 ? ` • +${names.length - 3}` : ''}</Text><FitHubSocialIcon name="chevron" size={16} color={colors.muted}/></View> : null}
    <View style={styles.postActions}><Pressable onPress={props.onLike} style={styles.postAction}><Text style={[styles.heart, props.reactions.includes(props.viewerId) && { color: colors.primary }]}>{props.reactions.includes(props.viewerId) ? '♥' : '♡'}</Text><Text style={styles.actionText}>{post.hide_like_count && !props.mine ? 'Like' : `${props.reactions.length} likes`}</Text></Pressable><View style={styles.postAction}><FitHubSocialIcon name="comment" size={20} color={colors.text}/><Text style={styles.actionText}>{post.hide_comment_count && !props.mine ? 'Comments' : `${visibleComments.filter((row) => !row.hidden_by_post_owner).length} comments`}</Text></View><Pressable onPress={props.onShare} style={styles.postAction}><FitHubSocialIcon name="share" size={20} color={colors.text}/><Text style={styles.actionText}>Share</Text></Pressable></View>
    {visibleComments.slice(-3).map((comment) => <View key={comment.id} style={[styles.comment, comment.hidden_by_post_owner && { opacity: .5 }]}><Avatar name={comment.author?.username ?? '?'} url={comment.author?.avatar_url} small/><View style={styles.flex}><Text style={styles.commentAuthor}>{comment.author?.username} <Text style={styles.commentTime}>{relativeTime(comment.created_at)}</Text></Text><Text style={styles.commentBody}>{comment.body}</Text></View>{props.mine || comment.user_id === props.viewerId ? <Pressable onPress={() => commentControls(comment)}><Text style={styles.more}>•••</Text></Pressable> : null}</View>)}
    <View style={styles.commentInputRow}><Input value={props.comment} onChangeText={props.setComment} onSubmitEditing={props.onSend} returnKeyType="send" placeholder="Add a comment…" style={styles.commentInput}/><Pressable onPress={props.onSend} style={styles.send}><FitHubSocialIcon name="send" size={20} color={colors.primary} accentColor={colors.primary}/></Pressable></View>
  </View>;
}

function PostStat({ icon, value, label }: { icon: FitHubSocialIconName; value: string | number; label: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.postStat}><FitHubSocialIcon name={icon} size={18} color={colors.primary} accentColor={colors.primary}/><Text numberOfLines={1} adjustsFontSizeToFit style={styles.postStatValue}>{value}</Text><Text style={styles.postStatLabel}>{label}</Text></View>;
}

function MineGridCard({ post, onControls }: { post: any; onControls: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.gridCard}><View style={styles.gridImageBox}>{post.photo_url ? <Image source={{ uri: post.photo_url }} style={styles.gridImage}/> : <FitHubSocialIcon name="dumbbell" size={42} color={colors.text} accentColor={colors.primary} filled/>}<Pressable onPress={onControls} style={styles.gridMore}><Text style={styles.more}>•••</Text></Pressable><View style={styles.visibility}><FitHubSocialIcon name="globe" size={15} color={colors.text}/></View></View><Text numberOfLines={2} style={styles.gridTitle}>{postTitle(post)}</Text><Text style={styles.gridDate}>{shortDate(post.created_at)}</Text><Text numberOfLines={1} style={styles.gridMeta}>{post.exercise_count ?? postExerciseNames(post).length} exercises{postDuration(post) ? ` • ${postDuration(post)}` : ''}</Text></View>;
}

function MineListCard({ post, onControls }: { post: any; onControls: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.listCard}>{post.photo_url ? <Image source={{ uri: post.photo_url }} style={styles.listImage}/> : <View style={styles.listImage}><FitHubSocialIcon name="dumbbell" size={28} color={colors.text} accentColor={colors.primary} filled/></View>}<View style={styles.flex}><Text numberOfLines={1} style={styles.cardTitle}>{postTitle(post)}</Text><Text style={styles.gridDate}>{shortDate(post.created_at)}</Text><Text style={styles.gridMeta}>{post.exercise_count ?? postExerciseNames(post).length} exercises{postDuration(post) ? ` • ${postDuration(post)}` : ''}</Text></View><Pressable onPress={onControls} style={styles.moreButton}><Text style={styles.more}>•••</Text></Pressable></View>;
}

function Avatar({ name, url, small = false, large = false, hero = false }: { name: string; url?: string | null; small?: boolean; large?: boolean; hero?: boolean }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const style = hero ? styles.avatarHero : large ? styles.avatarLarge : small ? styles.avatarSmall : styles.avatar;
  return url ? <Image source={{ uri: url }} style={style}/> : <View style={style}><Text style={styles.avatarText}>{String(name ?? '?').slice(0, 1).toUpperCase()}</Text></View>;
}

function RoundIcon({ name }: { name: FitHubSocialIconName }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.roundIcon}><FitHubSocialIcon name={name} size={25} color={colors.text} accentColor={colors.primary}/></View>;
}

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function SmallButton({ title, secondary = false, onPress }: { title: string; secondary?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Pressable onPress={onPress} style={[styles.smallButton, secondary && styles.smallButtonSecondary]}><Text style={[styles.smallButtonText, secondary && { color: colors.primary }]}>{title}</Text></Pressable>;
}

function Empty({ icon, title, body }: { icon: FitHubSocialIconName; title: string; body: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.empty}><RoundIcon name={icon}/><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View>;
}

function CompactEmpty({ text }: { text: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.compactEmpty}><Text style={styles.emptyCopy}>{text}</Text></View>;
}

function parseLocalDateTime(date: string, time: string) {
  const dateMatch = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const result = new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(timeMatch[1]), Number(timeMatch[2]));
  return Number.isNaN(result.getTime()) ? null : result;
}

function postExerciseNames(post: any) {
  return String(post.exercise_names ?? post.summary ?? '').replace(/^Completed:\s*/i, '').split(',').map((name: string) => name.trim()).filter(Boolean);
}

function postGroups(post: any) {
  return Array.from(new Set(postExerciseNames(post).map((name) => exerciseLibrary.find((exercise) => exercise.name === name)?.targetArea).filter(Boolean))) as string[];
}

function postTitle(post: any) {
  const groups = postGroups(post).map((group) => group.toLowerCase());
  if (groups.some((group) => group.includes('chest')) && groups.some((group) => group.includes('shoulder'))) return 'Push Day Complete';
  if (groups.some((group) => group.includes('back')) && groups.some((group) => group.includes('bicep'))) return 'Pull Day Complete';
  if (groups.some((group) => group.includes('leg')) || groups.some((group) => group.includes('quad')) || groups.some((group) => group.includes('glute'))) return 'Leg Day Complete';
  return 'Workout Complete';
}

function postSearchText(post: any) {
  return `${post.summary ?? ''} ${post.caption ?? ''} ${post.exercise_names ?? ''} ${postTitle(post)}`.toLowerCase();
}

function matchesFilter(post: any, filter: PostFilter) {
  if (filter === 'all' || filter === 'workouts') return true;
  const text = postSearchText(post);
  if (filter === 'prs') return /\bpr\b|personal record|new max|record/i.test(text);
  return /progress|transformation|improved|milestone|streak/i.test(text);
}

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d`;
}

function postDurationMinutes(post: any) {
  if (!post.started_at || !post.ended_at) return 0;
  return Math.max(1, Math.round((new Date(post.ended_at).getTime() - new Date(post.started_at).getTime()) / 60000));
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function postDuration(post: any) {
  const minutes = postDurationMinutes(post);
  return minutes ? formatMinutes(minutes) : '';
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function friendlyDate(value: Date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (value.toDateString() === today.toDateString()) return 'Today';
  if (value.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return value.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function compactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return value;
}

const makeStyles = (colors: any) => StyleSheet.create({
  page: { paddingBottom: 38 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -.8 },
  headerButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: .12, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  searchBox: { minHeight: 54, marginHorizontal: 20, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', gap: 9, shadowColor: colors.shadow, shadowOpacity: .08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  searchInput: { flex: 1, minHeight: 50, marginBottom: 0, paddingHorizontal: 0, borderWidth: 0, backgroundColor: 'transparent', fontSize: 15 },
  goButton: { minWidth: 42, height: 34, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  goText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  tabs: { minHeight: 58, marginHorizontal: 20, marginTop: 15, padding: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', shadowColor: colors.shadow, shadowOpacity: .1, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  tab: { flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 3, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.text, fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#FFFFFF' },
  badge: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeActive: { backgroundColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 9 },
  badgeTextActive: { color: colors.primary },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  pills: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  pill: { minHeight: 43, paddingHorizontal: 13, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', gap: 7, alignItems: 'center' },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pillText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  pillTextActive: { color: colors.primary, fontWeight: '900' },
  notice: { minHeight: 67, marginTop: 13, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  muted: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  roundIcon: { width: 47, height: 47, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  searchResults: { marginHorizontal: 20, marginTop: 12, padding: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  resultRow: { minHeight: 60, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  emptyCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 3 },
  sectionCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 11 },
  count: { minWidth: 39, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.primarySoft, color: colors.primary, fontWeight: '900', textAlign: 'center' },
  friendCard: { marginBottom: 10, padding: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: colors.shadow, shadowOpacity: .08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  friendName: { color: colors.text, fontWeight: '900', fontSize: 15 },
  friendMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted, marginHorizontal: 6 },
  preferenceRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  preference: { minHeight: 30, paddingHorizontal: 9, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', gap: 5 },
  preferenceActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  preferenceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted },
  preferenceDotActive: { backgroundColor: colors.primary },
  preferenceText: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  preferenceTextActive: { color: colors.primary },
  summary: { padding: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', shadowColor: colors.shadow, shadowOpacity: .1, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  summaryCopy: { flex: 1, marginLeft: 10 },
  summaryTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  summaryNumber: { width: 62, minHeight: 59, borderLeftWidth: 1, borderLeftColor: colors.border, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { color: colors.text, fontWeight: '900', fontSize: 20 },
  summaryLabel: { color: colors.muted, fontSize: 8, lineHeight: 11, textAlign: 'center', marginTop: 3 },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: .8, marginTop: 19, marginBottom: 8 },
  formCard: { marginTop: 13, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.panel },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  formTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 },
  closeButton: { width: 39, height: 39, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: .7, marginBottom: 6 },
  friendPicker: { gap: 7, paddingBottom: 11 },
  friendChip: { minWidth: 106, minHeight: 48, padding: 7, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, flexDirection: 'row', alignItems: 'center', gap: 7 },
  friendChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  friendChipText: { color: colors.text, fontWeight: '800', fontSize: 10 },
  two: { flexDirection: 'row', gap: 8 },
  inviteCard: { padding: 16, marginBottom: 10, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, shadowColor: colors.shadow, shadowOpacity: .1, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  calendar: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  workoutName: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 13, marginBottom: 5 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  metaText: { color: colors.muted, fontSize: 12 },
  inviteNote: { color: colors.text, fontSize: 11, lineHeight: 17, marginTop: 9, padding: 10, borderRadius: 11, backgroundColor: colors.panel2 },
  inviteChildren: { marginTop: 13 },
  actions: { flexDirection: 'row', gap: 9 },
  smallButton: { minWidth: 77, minHeight: 39, paddingHorizontal: 13, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  smallButtonSecondary: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.panel },
  smallButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  request: { padding: 12, marginBottom: 9, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', gap: 9 },
  requestButtons: { flexDirection: 'row', gap: 5 },
  planCard: { minHeight: 76, marginTop: 16, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', gap: 11 },
  danger: { color: colors.danger, fontWeight: '900', fontSize: 11, paddingVertical: 9 },
  compactEmpty: { minHeight: 55, padding: 14, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.panel, justifyContent: 'center' },
  profileCard: { padding: 16, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, shadowColor: colors.shadow, shadowOpacity: .1, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  profileName: { color: colors.text, fontSize: 23, fontWeight: '900' },
  profileSub: { color: colors.muted, fontSize: 12, marginTop: 4 },
  profileStats: { width: '100%', paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row' },
  metric: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 3 },
  profileButton: { width: '100%', minHeight: 42, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  profileButtonText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  mineTools: { minHeight: 58, marginTop: 13, padding: 7, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center' },
  layout: { marginLeft: 'auto', flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  layoutButton: { width: 36, height: 36, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  layoutButtonActive: { backgroundColor: colors.primary },
  privateLine: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 11 },
  gridCard: { width: '48.5%', padding: 8, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  gridImageBox: { width: '100%', aspectRatio: .92, borderRadius: 13, overflow: 'hidden', backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  gridImage: { width: '100%', height: '100%' },
  gridMore: { position: 'absolute', top: 7, right: 7, width: 31, height: 31, borderRadius: 16, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  visibility: { position: 'absolute', right: 7, bottom: 7, width: 29, height: 29, borderRadius: 15, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  gridTitle: { color: colors.text, fontWeight: '900', fontSize: 13, lineHeight: 17, marginTop: 8 },
  gridDate: { color: colors.muted, fontSize: 10, marginTop: 4 },
  gridMeta: { color: colors.muted, fontSize: 9, marginTop: 5 },
  listCard: { minHeight: 88, marginBottom: 9, padding: 9, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, flexDirection: 'row', alignItems: 'center', gap: 11 },
  listImage: { width: 70, height: 70, borderRadius: 13, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  create: { minHeight: 52, marginTop: 15, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: colors.primary, shadowOpacity: .22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  createText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  postCard: { marginTop: 13, padding: 13, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, shadowColor: colors.shadow, shadowOpacity: .12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAuthor: { color: colors.text, fontWeight: '900', fontSize: 15 },
  postTime: { color: colors.muted, fontSize: 11, marginTop: 3 },
  moreButton: { minWidth: 38, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  more: { color: colors.muted, fontWeight: '900', letterSpacing: 1 },
  postTitle: { color: colors.text, fontSize: 24, lineHeight: 29, fontWeight: '900', marginTop: 13 },
  groupLine: { color: colors.muted, fontSize: 13, marginTop: 5 },
  caption: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 9 },
  postPhoto: { width: '100%', aspectRatio: 1.12, borderRadius: 16, marginTop: 12, backgroundColor: colors.panel2 },
  photoPlaceholder: { width: '100%', aspectRatio: 1.6, borderRadius: 16, marginTop: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 8 },
  postStats: { marginTop: 11, flexDirection: 'row', gap: 6 },
  postStat: { flex: 1, minWidth: 0, minHeight: 79, paddingVertical: 8, paddingHorizontal: 3, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  postStatValue: { width: '100%', color: colors.text, fontWeight: '900', fontSize: 12, textAlign: 'center', marginTop: 4 },
  postStatLabel: { color: colors.muted, fontSize: 8, marginTop: 3 },
  highlight: { minHeight: 47, marginTop: 10, paddingHorizontal: 11, borderRadius: 13, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 8 },
  highlightText: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '800' },
  postActions: { minHeight: 49, marginTop: 9, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  postAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heart: { color: colors.text, fontSize: 24, lineHeight: 26 },
  actionText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  comment: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAuthor: { color: colors.text, fontWeight: '900', fontSize: 10 },
  commentTime: { color: colors.muted, fontWeight: '400', fontSize: 8 },
  commentBody: { color: colors.text, fontSize: 11, lineHeight: 16, marginTop: 2 },
  commentInputRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, minHeight: 42, marginBottom: 0, borderRadius: 14, fontSize: 12 },
  send: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  empty: { marginTop: 14, padding: 24, borderRadius: 19, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontWeight: '900', fontSize: 17, marginTop: 12 },
  emptyBody: { maxWidth: 260, color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarSmall: { width: 31, height: 31, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarLarge: { width: 51, height: 51, borderRadius: 26, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarHero: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontWeight: '900', fontSize: 15 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.58)' },
  editSheet: { maxHeight: '92%', padding: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  captionInput: { minHeight: 82, textAlignVertical: 'top' },
  editPhoto: { width: '100%', aspectRatio: 1.65, borderRadius: 15, backgroundColor: colors.panel2, marginBottom: 11 },
  noPhoto: { height: 120, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editHelp: { color: colors.muted, fontSize: 10, lineHeight: 16, marginVertical: 12 },
});
