import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, OutlineButton, RefreshableScrollView, SectionTitle, useTheme } from '../../components/UI';
import { exerciseLibrary } from '../../data/exerciseLibrary';
import { cancelGymReminder, scheduleGymReminder } from '../../lib/notifications';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { displayToKm, formatDistance, kgToDisplay, kmToDisplay } from '../../lib/units';

type FriendsView = 'feed' | 'following' | 'invites' | 'challenges';

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

const tomorrowKey = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type FriendsTabHandle = { goBack: () => boolean };

const FriendsTab = forwardRef<FriendsTabHandle, { profile: Profile }>(function FriendsTab({ profile }, ref) {
  const { colors, hiddenFeatures, weightUnit, distanceUnit } = useTheme();
  const styles = createStyles(colors);
  const [view, setView] = useState<FriendsView>('feed');
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendAlerts,setFriendAlerts]=useState<Record<string,{post_notifications:boolean;pr_notifications:boolean}>>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [challenges, setChallenges] = useState<any[]>([]);
  const [communityChallenges, setCommunityChallenges] = useState<any[]>([]);
  const [communityMembers, setCommunityMembers] = useState<any[]>([]);
  const [gymInvites, setGymInvites] = useState<GymInvite[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({ title: '', description: '', metric: 'workouts', target: '3', days: '7' });
  const [communityDraft, setCommunityDraft] = useState({ title: '', description: '', targetType: 'workouts', target: '3', days: '7', difficulty:3, visibility: 'private' as 'private'|'friends'|'public', inviteIds: [] as string[] });
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

  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (customOpen) {
        setCustomOpen(false);
        return true;
      }
      if (view !== 'feed') {
        setView('feed');
        return true;
      }
      return false;
    },
  }), [customOpen, view]);


  async function calculateCommunityProgress(challenge: any) {
    const start = challenge.starts_at || new Date(0).toISOString();
    const end = challenge.ends_at || new Date(8640000000000000).toISOString();
    if (challenge.target_type === 'prs') {
      const { count } = await supabase.from('pr_events').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).gte('achieved_at', start).lte('achieved_at', end);
      return Number(count ?? 0);
    }
    if (challenge.target_type === 'distance') {
      const { data } = await supabase.from('workout_sets').select('distance_km,created_at').eq('user_id', profile.id).gte('created_at', start).lte('created_at', end);
      return (data ?? []).reduce((sum:number,row:any)=>sum+Number(row.distance_km ?? 0),0);
    }
    const { data } = await supabase.from('workout_sessions').select('ended_at').eq('user_id', profile.id).eq('completed', true).gte('ended_at', start).lte('ended_at', end);
    if (challenge.target_type === 'active_days') return new Set((data ?? []).map((row:any)=>new Date(row.ended_at).toDateString())).size;
    return (data ?? []).length;
  }

  async function loadCommunityChallenges() {
    const { data: cc } = await supabase.from('community_challenges').select('*').is('archived_at',null).order('created_at', { ascending: false }).limit(50);
    const list = (cc ?? []).filter((x:any)=>Number(profile.age??13)>=Number(x.minimum_age??13)&&(!x.maximum_age||Number(profile.age??13)<=Number(x.maximum_age)));
    setCommunityChallenges(list);
    if (!list.length) { setCommunityMembers([]); return; }
    const ids = list.map((x:any)=>x.id);
    const { data: members } = await supabase.from('community_challenge_members').select('*').in('challenge_id', ids);
    const memberRows = members ?? [];
    setCommunityMembers(memberRows);
    const mine = memberRows.filter((m:any)=>m.user_id===profile.id && (m.status==='joined' || m.status==='completed'));
    for (const member of mine) {
      const challenge = list.find((x:any)=>x.id===member.challenge_id);
      if (!challenge) continue;
      const progress = await calculateCommunityProgress(challenge);
      const done = progress >= Number(challenge.target_value);
      try { await supabase.from('community_challenge_members').update({ progress_value: progress, status: done ? 'completed' : 'joined', completed_at: done ? (member.completed_at || new Date().toISOString()) : null, updated_at: new Date().toISOString() }).eq('challenge_id', challenge.id).eq('user_id', profile.id); } catch {}
    }
  }

  const load = async () => {
    const [req, fr, ch, gi, prefs] = await Promise.all([
      supabase.from('friend_requests').select('id,requester_id,status,created_at,requester:public_profiles!friend_requests_requester_id_fkey(username,avatar_url,login_streak,workout_streak,tokens)').eq('addressee_id', profile.id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.rpc('get_my_friends'),
      supabase.rpc('get_visible_challenges'),
      supabase.from('gym_invites').select('id,sender_id,recipient_id,session_at,gym_name,workout_name,note,status,created_at,sender:public_profiles!gym_invites_sender_id_fkey(username,avatar_url),recipient:public_profiles!gym_invites_recipient_id_fkey(username,avatar_url)').or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order('session_at', { ascending: true }),
      supabase.from('friend_notification_preferences').select('friend_id,post_notifications,pr_notifications').eq('user_id',profile.id),
    ]);

    let feed = await supabase.rpc('get_friend_feed_v3');
    if (feed.error) feed = await supabase.rpc('get_friend_feed_v2');
    if (feed.error) feed = await supabase.rpc('get_friend_feed');

    setRequests(req.data ?? []);
    setFriends(fr.data ?? []);
    setFriendAlerts(Object.fromEntries((prefs.data??[]).map((x:any)=>[x.friend_id,{post_notifications:x.post_notifications,pr_notifications:x.pr_notifications}])));
    setChallenges(ch.data ?? []);
    await loadCommunityChallenges();
    const invites = (gi.data ?? []) as GymInvite[];
    setGymInvites(invites);

    let feedRows:any[] = feed.data ?? [];
    const feedIds=feedRows.map((p:any)=>p.id);
    if(feedIds.length){const{data:settings}=await supabase.from('workout_posts').select('id,hide_like_count,hide_comment_count').in('id',feedIds);const byId=Object.fromEntries((settings??[]).map((x:any)=>[x.id,x]));feedRows=feedRows.map((p:any)=>({...p,...byId[p.id]}));}
    const enriched = await Promise.all(feedRows.map(async (post: any) => {
      if (!post.photo_path) return post;
      const { data } = await supabase.storage.from('workout-media').createSignedUrl(post.photo_path, 60 * 60);
      return { ...post, photo_url: data?.signedUrl ?? null };
    }));
    setPosts(enriched);

    const ids = enriched.map((p: any) => p.id);
    if (ids.length) {
      const [{ data: c },{data:r}] = await Promise.all([supabase.from('comments').select('id,post_id,user_id,body,created_at,hidden_by_post_owner,hidden_at,author:public_profiles!comments_user_id_fkey(username,avatar_url)').in('post_id', ids).order('created_at', { ascending: true }),supabase.from('post_reactions').select('post_id,user_id').in('post_id',ids)]);
      const grouped: Record<string, any[]> = {};
      for (const row of c ?? []) (grouped[row.post_id] ??= []).push(row);
      setComments(grouped);
      const reactionGroups:Record<string,string[]>={};for(const row of r??[])(reactionGroups[row.post_id]??=[]).push(row.user_id);setReactions(reactionGroups);
    } else {setComments({});setReactions({});}

    // Re-create local reminders for accepted future sessions whenever Friends loads.
    const future = invites.filter((invite) => invite.status === 'accepted' && new Date(invite.session_at).getTime() > Date.now());
    future.forEach((invite) => {
      const other = invite.sender_id === profile.id ? invite.recipient : invite.sender;
      scheduleGymReminder({
        inviteId: invite.id,
        friendName: other?.username ?? 'your friend',
        sessionAt: invite.session_at,
        workoutName: invite.workout_name,
        gymName: invite.gym_name,
      }).catch(() => {});
    });
  };

  useEffect(() => {
    load();
    const channel = supabase.channel(`fithub-social-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_posts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_participants' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_profiles' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gym_invites' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_challenges' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_challenge_members' }, load)
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
  const toggleFriendAlert=async(friendId:string,key:'post_notifications'|'pr_notifications')=>{const current=friendAlerts[friendId]??{post_notifications:false,pr_notifications:false};const next={...current,[key]:!current[key]};const{error}=await supabase.from('friend_notification_preferences').upsert({user_id:profile.id,friend_id:friendId,...next,updated_at:new Date().toISOString()},{onConflict:'user_id,friend_id'});if(error)Alert.alert('Notifications',error.message);else setFriendAlerts({...friendAlerts,[friendId]:next});};

  const accept = async (id: string) => {
    const { error } = await supabase.rpc('accept_friend_request', { request_id: id });
    if (error) Alert.alert('Could not accept', error.message); else load();
  };

  const postComment = async (postId: string, quick?: string) => {
    const body = (quick ?? commentText[postId] ?? '').trim();
    if (!body) return;
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: profile.id, body });
    if (error) Alert.alert('Comment', error.message);
    else { setCommentText({ ...commentText, [postId]: '' }); load(); }
  };
  const deletePost=(post:any)=>Alert.alert('Delete workout post?','The post, comments and reactions will be removed. Your private workout and PR records stay saved.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{if(post.photo_path)await supabase.storage.from('workout-media').remove([post.photo_path]);const{error}=await supabase.from('workout_posts').delete().eq('id',post.id).eq('user_id',profile.id);if(error)Alert.alert('Delete post',error.message);else load();}}]);
  const openPostEditor = (post: any) => {
    setEditingPost(post);
    setEditCaption(String(post.caption ?? ''));
    setEditPhotoUri(post.photo_url ?? null);
    setEditPhotoAsset(null);
    setRemoveEditPhoto(false);
  };
  const chooseEditPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setEditPhotoAsset(asset);
    setEditPhotoUri(asset.uri);
    setRemoveEditPhoto(false);
  };
  const clearEditPhoto = () => {
    setEditPhotoAsset(null);
    setEditPhotoUri(null);
    setRemoveEditPhoto(true);
  };
  const closePostEditor = () => {
    if (savingEdit) return;
    setEditingPost(null);
    setEditPhotoAsset(null);
  };
  const savePostEdit = async () => {
    if (!editingPost || savingEdit) return;
    setSavingEdit(true);
    let uploadedPath: string | null = null;
    const originalPath = editingPost.photo_path as string | null;
    try {
      let photoPath: string | null = removeEditPhoto ? null : originalPath;
      if (editPhotoAsset) {
        const bytes = await (await fetch(editPhotoAsset.uri)).arrayBuffer();
        const rawExt = String(editPhotoAsset.fileName?.split('.').pop() || 'jpg').toLowerCase();
        const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : 'jpg';
        uploadedPath = `${profile.id}/${editingPost.session_id || editingPost.id}-edit-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('workout-media').upload(uploadedPath, bytes, { contentType: editPhotoAsset.mimeType ?? 'image/jpeg', upsert: false });
        if (uploadError) throw uploadError;
        photoPath = uploadedPath;
      }
      const { error } = await supabase.from('workout_posts').update({
        caption: editCaption.trim().slice(0, 500) || null,
        photo_path: photoPath,
        updated_at: new Date().toISOString(),
      }).eq('id', editingPost.id).eq('user_id', profile.id);
      if (error) throw error;
      if (originalPath && originalPath !== photoPath) await supabase.storage.from('workout-media').remove([originalPath]);
      setEditingPost(null);
      setEditPhotoAsset(null);
      await load();
    } catch (error: any) {
      if (uploadedPath) await supabase.storage.from('workout-media').remove([uploadedPath]);
      Alert.alert('Could not update post', error?.message ?? 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };
  const toggleReaction=async(postId:string)=>{const liked=(reactions[postId]??[]).includes(profile.id);const query=liked?supabase.from('post_reactions').delete().eq('post_id',postId).eq('user_id',profile.id):supabase.from('post_reactions').insert({post_id:postId,user_id:profile.id,reaction:'like'});const{error}=await query;if(error)Alert.alert('Like',error.message);else load();};
  const deleteComment=(comment:any)=>Alert.alert('Delete comment?','This comment will be permanently removed.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{const{error}=await supabase.from('comments').delete().eq('id',comment.id);if(error)Alert.alert('Comment',error.message);else load();}}]);
  const toggleCommentHidden=async(comment:any)=>{const hidden=!comment.hidden_by_post_owner;const{error}=await supabase.from('comments').update({hidden_by_post_owner:hidden,hidden_at:hidden?new Date().toISOString():null}).eq('id',comment.id);if(error)Alert.alert('Comment',error.message);else load();};
  const toggleCountVisibility=async(post:any,key:'hide_like_count'|'hide_comment_count')=>{const{error}=await supabase.from('workout_posts').update({[key]:!post[key]}).eq('id',post.id).eq('user_id',profile.id);if(error)Alert.alert('Post settings',error.message);else load();};

  const joinChallenge = async (challengeId: string) => {
    const { error } = await supabase.from('challenge_participants').upsert({ challenge_id: challengeId, user_id: profile.id }, { onConflict: 'challenge_id,user_id' });
    if (error) Alert.alert('Challenge', error.message); else load();
  };

  const createChallenge = async () => {
    const target = Number(custom.target), days = Number(custom.days);
    if (!custom.title.trim() || !target || target <= 0 || !days || days < 1 || days > 365) return Alert.alert('Challenge details', 'Enter a title, positive target and duration.');
    const ends = new Date(); ends.setDate(ends.getDate() + days);
    const unit: Record<string, string> = { workouts: 'workouts', active_days: 'days', distance: 'km', strength_sessions: 'sessions' };
    const { data, error } = await supabase.from('challenges').insert({ created_by: profile.id, title: custom.title.trim(), description: custom.description.trim(), metric: custom.metric, target_value: target, unit: unit[custom.metric], start_date: new Date().toISOString(), end_date: ends.toISOString(), preset: false, visibility: 'friends' }).select('id').single();
    if (error) return Alert.alert('Could not create challenge', error.message);
    await supabase.from('challenge_participants').insert({ challenge_id: data.id, user_id: profile.id });
    setCustom({ title: '', description: '', metric: 'workouts', target: '3', days: '7' });
    setCustomOpen(false);
    load();
  };

  const toggleCommunityInvite = (userId: string) => setCommunityDraft((prev) => ({ ...prev, inviteIds: prev.inviteIds.includes(userId) ? prev.inviteIds.filter((id) => id !== userId) : [...prev.inviteIds, userId] }));

  const createCommunityChallenge = async () => {
    const displayTarget = Number(communityDraft.target), days = Number(communityDraft.days);
    const target = communityDraft.targetType === 'distance' ? displayToKm(displayTarget, distanceUnit) : displayTarget;
    if (!communityDraft.title.trim() || !displayTarget || displayTarget <= 0 || !days || days < 1 || days > 365) return Alert.alert('Challenge details', 'Enter a title, positive target and duration.');
    const ends = new Date(); ends.setDate(ends.getDate() + days);
    const unitMap: Record<string,string> = { workouts: 'workouts', active_days: 'days', distance: 'km', prs: 'PRs' };
    const { data, error } = await supabase.from('community_challenges').insert({ creator_id: profile.id, creator_display_name: profile.username, title: communityDraft.title.trim(), description: communityDraft.description.trim() || null, target_type: communityDraft.targetType, target_value: target, unit: unitMap[communityDraft.targetType] || 'units', visibility: communityDraft.visibility,difficulty:communityDraft.difficulty,difficulty_source:'creator', starts_at: new Date().toISOString(), ends_at: ends.toISOString() }).select('id').single();
    if (error) return Alert.alert('Could not create challenge', error.message);
    const members:any[] = [{ challenge_id:data.id, user_id:profile.id, display_name:profile.username, status:'joined', joined_at:new Date().toISOString() }];
    for (const id of communityDraft.inviteIds) { const friend=friends.find((x:any)=>x.user_id===id); members.push({ challenge_id:data.id, user_id:id, display_name:friend?.username || 'FitHub user', status:'invited' }); }
    const { error: memberError } = await supabase.from('community_challenge_members').insert(members);
    if (memberError) return Alert.alert('Challenge created', `The challenge was created, but some invites could not be added: ${memberError.message}`);
    setCommunityDraft({ title:'',description:'',targetType:'workouts',target:'3',days:'7',difficulty:3,visibility:'private',inviteIds:[] }); setCustomOpen(false); await load();
  };

  const joinCommunityChallenge = async (challenge:any) => {
    const mine = communityMembers.find((m:any)=>m.challenge_id===challenge.id && m.user_id===profile.id);
    if (mine) {
      const { error } = await supabase.from('community_challenge_members').update({ status:'joined', joined_at:mine.joined_at || new Date().toISOString(), updated_at:new Date().toISOString() }).eq('challenge_id',challenge.id).eq('user_id',profile.id);
      if (error) Alert.alert('Challenge',error.message); else load();
    } else {
      const { error } = await supabase.from('community_challenge_members').insert({ challenge_id:challenge.id,user_id:profile.id,display_name:profile.username,status:'joined',joined_at:new Date().toISOString() });
      if (error) Alert.alert('Challenge',error.message); else load();
    }
  };

  const declineCommunityInvite = async (challengeId:string) => {
    await supabase.from('community_challenge_members').update({status:'declined',updated_at:new Date().toISOString()}).eq('challenge_id',challengeId).eq('user_id',profile.id); load();
  };

  const sendGymInvite = async () => {
    if (!inviteFriendId) return Alert.alert('Choose a friend', 'Select the friend you want to train with.');
    const sessionAt = parseLocalDateTime(inviteDate, inviteTime);
    if (!sessionAt || sessionAt.getTime() <= Date.now()) return Alert.alert('Check the session time', 'Use a future date and time.');
    const friend = friends.find((x: any) => x.user_id === inviteFriendId);
    setSendingInvite(true);
    try {
      const { data, error } = await supabase.from('gym_invites').insert({
        sender_id: profile.id,
        recipient_id: inviteFriendId,
        session_at: sessionAt.toISOString(),
        gym_name: inviteGym.trim() || null,
        workout_name: inviteWorkout.trim() || null,
        note: inviteNote.trim() || null,
      }).select('id,session_at').single();
      if (error) throw error;
      await scheduleGymReminder({ inviteId: data.id, friendName: friend?.username ?? 'your friend', sessionAt: data.session_at, workoutName: inviteWorkout, gymName: inviteGym }).catch(() => {});
      setInviteNote('');
      Alert.alert('Gym invite sent', `${friend?.username ?? 'Your friend'} can accept or decline it in FitHub.`);
      load();
    } catch (error: any) {
      Alert.alert('Could not send invite', error?.message ?? 'Please try again.');
    } finally {
      setSendingInvite(false);
    }
  };

  const respondInvite = async (invite: GymInvite, status: 'accepted' | 'declined') => {
    const { error } = await supabase.from('gym_invites').update({ status, updated_at: new Date().toISOString() }).eq('id', invite.id).eq('recipient_id', profile.id);
    if (error) return Alert.alert('Gym invite', error.message);
    if (status === 'accepted') {
      await scheduleGymReminder({ inviteId: invite.id, friendName: invite.sender?.username ?? 'your friend', sessionAt: invite.session_at, workoutName: invite.workout_name, gymName: invite.gym_name }).catch(() => {});
    } else await cancelGymReminder(invite.id);
    load();
  };

  const cancelInvite = async (invite: GymInvite) => {
    const { error } = await supabase.from('gym_invites').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', invite.id).eq('sender_id', profile.id);
    if (error) Alert.alert('Gym invite', error.message);
    else { await cancelGymReminder(invite.id); load(); }
  };

  const pendingReceived = useMemo(() => gymInvites.filter((i) => i.recipient_id === profile.id && i.status === 'pending'), [gymInvites, profile.id]);
  const upcoming = useMemo(() => gymInvites.filter((i) => i.status === 'accepted' && new Date(i.session_at).getTime() > Date.now()).sort((a, b) => new Date(a.session_at).getTime() - new Date(b.session_at).getTime()), [gymInvites]);
  const sentPending = useMemo(() => gymInvites.filter((i) => i.sender_id === profile.id && i.status === 'pending'), [gymInvites, profile.id]);

  return <>
    <Modal visible={Boolean(editingPost)} transparent animationType="slide" onRequestClose={closePostEditor}>
      <View style={styles.modalBackdrop}>
        <View style={styles.editSheet}>
          <View style={styles.editHeader}><Text style={styles.editTitle}>Edit workout post</Text><Pressable onPress={closePostEditor} accessibilityRole="button" accessibilityLabel="Close post editor"><Text style={styles.editClose}>×</Text></Pressable></View>
          <Text style={styles.fieldLabel}>Caption</Text>
          <Input value={editCaption} onChangeText={setEditCaption} placeholder="Add a caption (optional)" multiline maxLength={500} style={styles.captionInput} />
          {editPhotoUri ? <Image source={{ uri: editPhotoUri }} style={styles.editPhoto} /> : <View style={styles.noPhoto}><Text style={styles.noPhotoText}>No photo selected</Text></View>}
          <View style={styles.editPhotoActions}><OutlineButton title={editPhotoUri ? 'REPLACE PHOTO' : 'CHOOSE PHOTO'} onPress={chooseEditPhoto} compact />{editPhotoUri ? <Pressable onPress={clearEditPhoto} style={styles.removePhotoButton}><Text style={styles.removePhotoText}>Remove photo</Text></Pressable> : null}</View>
          <Text style={styles.editHelp}>Workout totals remain linked to the original completed session.</Text>
          <Button title={savingEdit ? 'SAVING…' : 'SAVE CHANGES'} onPress={savePostEdit} disabled={savingEdit} />
        </View>
      </View>
    </Modal>
    <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Text style={styles.title}>Friends</Text><Text style={styles.profileGlyph}>♙</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      <Tab label="Feed" active={view === 'feed'} onPress={() => setView('feed')} />
      <Tab label="Following" active={view === 'following'} onPress={() => setView('following')} />
      <Tab label={`Invites${pendingReceived.length ? ` ${pendingReceived.length}` : ''}`} active={view === 'invites'} onPress={() => setView('invites')} />
      {!hiddenFeatures.includes('challenges') ? <Tab label="Challenges" active={view === 'challenges'} onPress={() => setView('challenges')} /> : null}
    </ScrollView>

    {view === 'feed' ? <View style={styles.feedArea}>
      {requests.length ? <View style={styles.requestStrip}><Text style={styles.requestText}>{requests.length} friend request{requests.length === 1 ? '' : 's'} waiting</Text><Pressable onPress={() => setView('following')}><Text style={styles.requestAction}>View</Text></Pressable></View> : null}
      {posts.length ? posts.map((p) => <WorkoutPostCard key={p.id} post={p} mine={p.user_id===profile.id} viewerId={profile.id} onEdit={()=>openPostEditor(p)} onDelete={()=>deletePost(p)} onLike={()=>toggleReaction(p.id)} liked={(reactions[p.id]??[]).includes(profile.id)} likeCount={(reactions[p.id]??[]).length} onDeleteComment={deleteComment} onToggleCommentHidden={toggleCommentHidden} onToggleCount={(key)=>toggleCountVisibility(p,key)} comments={comments[p.id] ?? []} comment={commentText[p.id] ?? ''} setComment={(v) => setCommentText({ ...commentText, [p.id]: v })} send={() => postComment(p.id)} />) : <View style={styles.emptyFeed}><Text style={styles.emptyTitle}>Your workout feed is ready.</Text><Text style={styles.sub}>Completed workouts your friends choose to share will appear here.</Text></View>}
    </View> : null}

    {view === 'following' ? <View style={styles.tabContent}>
      <Card>
        <SectionTitle title="Add a friend" subtitle="Search by username or exact email." />
        <Input value={search} onChangeText={setSearch} autoCapitalize="none" placeholder="Username or exact email" />
        <OutlineButton title="Search" onPress={find} />
        {found.map((x) => <View key={x.user_id} style={styles.person}><Avatar name={x.username} url={x.avatar_url} /><View style={{ flex: 1 }}><Text style={styles.name}>@{x.username}</Text><Text style={styles.meta}>🔥 {x.login_streak} login · ⚡ {x.workout_streak} workout</Text></View><OutlineButton title="Add" onPress={() => addFriend(x.user_id)} compact /></View>)}
      </Card>
      {requests.length ? <Card><SectionTitle title="Friend requests" />{requests.map((r) => <View key={r.id} style={styles.person}><Avatar name={r.requester?.username ?? '?'} url={r.requester?.avatar_url} /><View style={{ flex: 1 }}><Text style={styles.name}>@{r.requester?.username}</Text><Text style={styles.meta}>wants to connect</Text></View><OutlineButton title="Accept" onPress={() => accept(r.id)} compact /></View>)}</Card> : null}
      <Card><SectionTitle title="Following" subtitle="Choose post and PR notifications separately for every friend." />{friends.length ? friends.map((x) => {const p=friendAlerts[x.user_id]??{post_notifications:false,pr_notifications:false};return <View key={x.user_id} style={styles.person}><Avatar name={x.username} url={x.avatar_url} /><View style={{ flex: 1 }}><Text style={styles.name}>@{x.username}</Text><Text style={styles.meta}>🔥 {x.login_streak} · ⚡ {x.workout_streak} · ✦ {x.tokens}</Text><View style={styles.quickRow}><Chip label={p.post_notifications?'Posts ON':'Posts OFF'} active={p.post_notifications} onPress={()=>toggleFriendAlert(x.user_id,'post_notifications')}/><Chip label={p.pr_notifications?'PRs ON':'PRs OFF'} active={p.pr_notifications} onPress={()=>toggleFriendAlert(x.user_id,'pr_notifications')}/></View></View></View>}) : <Text style={styles.sub}>No friends yet. Search above to add someone.</Text>}</Card>
    </View> : null}

    {view === 'invites' ? <View style={styles.tabContent}>
      <Card>
        <SectionTitle title="Plan a gym session" subtitle="Invite a FitHub friend and both of you can get a reminder 30 minutes before the session." />
        <Text style={styles.fieldLabel}>Friend</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendPicker}>{friends.map((friend: any) => <Pressable key={friend.user_id} onPress={() => setInviteFriendId(friend.user_id)} style={[styles.friendChip, inviteFriendId === friend.user_id && styles.friendChipActive]}><AvatarSmall name={friend.username} url={friend.avatar_url} /><Text style={[styles.friendChipText, inviteFriendId === friend.user_id && { color: colors.blue }]}>@{friend.username}</Text></Pressable>)}</ScrollView>
        {!friends.length ? <Text style={styles.sub}>Add a friend first, then you can invite them to train.</Text> : null}
        <View style={styles.two}><View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Date</Text><Input value={inviteDate} onChangeText={setInviteDate} placeholder="YYYY-MM-DD" autoCapitalize="none" /></View><View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Time</Text><Input value={inviteTime} onChangeText={setInviteTime} placeholder="17:00" autoCapitalize="none" /></View></View>
        <Input value={inviteGym} onChangeText={setInviteGym} placeholder="Gym / location (optional)" />
        <Input value={inviteWorkout} onChangeText={setInviteWorkout} placeholder="Workout, e.g. Push Day (optional)" />
        <Input value={inviteNote} onChangeText={setInviteNote} placeholder="Message (optional)" />
        <Button title={sendingInvite ? 'SENDING…' : 'SEND GYM INVITE'} onPress={sendGymInvite} disabled={sendingInvite || !friends.length} />
      </Card>

      {pendingReceived.length ? <><SectionTitle title="Invites for you" subtitle="Accept or decline upcoming gym plans." />{pendingReceived.map((invite) => <GymInviteCard key={invite.id} invite={invite} other={invite.sender} actions={<View style={styles.inviteActions}><OutlineButton title="Accept" onPress={() => respondInvite(invite, 'accepted')} compact /><Pressable onPress={() => respondInvite(invite, 'declined')} style={styles.declineButton}><Text style={styles.declineText}>Decline</Text></Pressable></View>} />)}</> : null}

      <SectionTitle title="Upcoming gym sessions" subtitle="Accepted plans appear here in time order." />
      {upcoming.length ? upcoming.map((invite) => {
        const other = invite.sender_id === profile.id ? invite.recipient : invite.sender;
        return <GymInviteCard key={invite.id} invite={invite} other={other} actions={invite.sender_id === profile.id ? <Pressable onPress={() => cancelInvite(invite)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel session</Text></Pressable> : null} />;
      }) : <Card><Text style={styles.sub}>No upcoming shared gym sessions yet.</Text></Card>}

      {sentPending.length ? <><SectionTitle title="Waiting for a reply" />{sentPending.map((invite) => <GymInviteCard key={invite.id} invite={invite} other={invite.recipient} actions={<Pressable onPress={() => cancelInvite(invite)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel invite</Text></Pressable>} />)}</> : null}
    </View> : null}

    {view === 'challenges' ? <View style={styles.tabContent}>
      <Card>
        <SectionTitle title="Create a challenge" subtitle="Choose the target, privacy and friends you want to invite. Every challenge shows who created it." />
        <Button title={customOpen ? 'Close challenge builder' : 'Create private / community challenge'} onPress={() => setCustomOpen(!customOpen)} secondary />
        {customOpen ? <View style={{ marginTop: 10 }}>
          <Input value={communityDraft.title} onChangeText={(v) => setCommunityDraft({ ...communityDraft, title: v })} placeholder="Challenge title" />
          <Input value={communityDraft.description} onChangeText={(v) => setCommunityDraft({ ...communityDraft, description: v })} placeholder="Description (optional)" />
          <Text style={styles.fieldLabel}>Target</Text>
          <View style={styles.chips}>{(['workouts','active_days','distance','prs'] as const).map((v)=><Chip key={v} label={v.replace('_',' ')} active={communityDraft.targetType===v} onPress={()=>setCommunityDraft({...communityDraft,targetType:v})}/>)}</View>
          <View style={styles.two}><Input style={{flex:1}} value={communityDraft.target} onChangeText={(v)=>setCommunityDraft({...communityDraft,target:v})} keyboardType="decimal-pad" placeholder={communityDraft.targetType === 'distance' ? `Target (${distanceUnit})` : "Target"}/><Input style={{flex:1}} value={communityDraft.days} onChangeText={(v)=>setCommunityDraft({...communityDraft,days:v})} keyboardType="number-pad" placeholder="Days"/></View>
          <Text style={styles.fieldLabel}>Difficulty</Text><View style={styles.chips}>{[1,2,3,4,5].map(v=><Chip key={v} label={`${'★'.repeat(v)}${'☆'.repeat(5-v)}`} active={communityDraft.difficulty===v} onPress={()=>setCommunityDraft({...communityDraft,difficulty:v})}/>)}</View>
          <Text style={styles.fieldLabel}>Who can see it?</Text>
          <View style={styles.chips}>{(['private','friends','public'] as const).map((v)=><Chip key={v} label={v} active={communityDraft.visibility===v} onPress={()=>setCommunityDraft({...communityDraft,visibility:v})}/>)}</View>
          {friends.length ? <><Text style={styles.fieldLabel}>Invite friends (optional)</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendPicker}>{friends.map((friend:any)=>{const active=communityDraft.inviteIds.includes(friend.user_id);return <Pressable key={friend.user_id} onPress={()=>toggleCommunityInvite(friend.user_id)} style={[styles.friendChip,active&&styles.friendChipActive]}><AvatarSmall name={friend.username} url={friend.avatar_url}/><Text style={[styles.friendChipText,active&&{color:colors.blue}]}>@{friend.username}</Text></Pressable>;})}</ScrollView></> : null}
          <Button title="CREATE CHALLENGE" onPress={createCommunityChallenge} />
        </View> : null}
      </Card>

      <SectionTitle title="Your community challenges" subtitle="Progress updates from your FitHub workout history." />
      {communityChallenges.length ? communityChallenges.map((ch:any)=>{
        const mine=communityMembers.find((m:any)=>m.challenge_id===ch.id&&m.user_id===profile.id);
        const progress=Number(mine?.progress_value??0);
        const target=Number(ch.target_value??1);
        const invited=mine?.status==='invited';
        const completed=mine?.status==='completed'||progress>=target;
        const creator=ch.creator_id===profile.id;
        return <Card key={ch.id}>
          <View style={styles.challengeTop}><View style={{flex:1}}><Text style={styles.challenge}>{completed?'✓ ':invited?'✉ ':''}{ch.title}</Text><Text style={styles.meta}>{'★'.repeat(Number(ch.difficulty??3))}{'☆'.repeat(5-Number(ch.difficulty??3))} • {ch.difficulty_source==='official'?'FitHub-rated':'creator-rated'}</Text><Text style={styles.meta}>Created by @{ch.creator_display_name} • {ch.visibility}</Text>{ch.description?<Text style={styles.meta}>{ch.description}</Text>:null}</View>{!creator&&!mine?<OutlineButton title="Join" onPress={()=>joinCommunityChallenge(ch)} compact/>:null}</View>
          <Text style={styles.progress}>{ch.target_type==='distance' ? `${kmToDisplay(progress, distanceUnit).toFixed(1)} / ${kmToDisplay(target, distanceUnit).toFixed(1)} ${distanceUnit}` : `${progress.toFixed(0)} / ${target.toFixed(0)} ${ch.unit}`}</Text>
          <View style={styles.track}><View style={[styles.fill,{width:`${Math.min(100,(progress/Math.max(1,target))*100)}%`}]} /></View>
          <Text style={styles.meta}>{completed?'Completed':mine?.status==='joined'?'In progress':invited?'You were invited':'Available to join'}{ch.ends_at?` • ends ${new Date(ch.ends_at).toLocaleDateString()}`:''}</Text>
          {invited?<View style={styles.inviteActions}><OutlineButton title="Accept" onPress={()=>joinCommunityChallenge(ch)} compact/><Pressable onPress={()=>declineCommunityInvite(ch.id)} style={styles.declineButton}><Text style={styles.declineText}>Decline</Text></Pressable></View>:null}
        </Card>;
      }) : <Card><Text style={styles.sub}>No community challenges yet. Create one above and invite friends.</Text></Card>}
      <Card><SectionTitle title="Completed challenges" subtitle={`${communityMembers.filter((m:any)=>m.user_id===profile.id&&m.status==='completed').length} completed`} />{communityMembers.filter((m:any)=>m.user_id===profile.id&&m.status==='completed').map((m:any)=>{const ch=communityChallenges.find((x:any)=>x.id===m.challenge_id);return <Text key={m.challenge_id} style={styles.meta}>✓ {ch?.title??'Challenge'} • {ch?.difficulty??3}/5 stars</Text>})}</Card>

      {challenges.length ? <><SectionTitle title="FitHub preset challenges" subtitle="Existing FitHub challenges are still available." />{challenges.map((ch) => <Card key={ch.id}>
        <View style={styles.challengeTop}><View style={{ flex: 1 }}><Text style={styles.challenge}>{ch.preset ? '★ ' : ''}{ch.title}</Text><Text style={styles.meta}>{ch.description}</Text></View><OutlineButton title="Join" onPress={() => joinChallenge(ch.id)} compact /></View>
        <Text style={styles.progress}>{Number(ch.my_progress ?? 0).toFixed(ch.metric === 'distance' ? 1 : 0)} / {ch.target_value} {ch.unit}</Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (Number(ch.my_progress ?? 0) / Math.max(1, Number(ch.target_value))) * 100)}%` }]} /></View>
        <Text style={styles.meta}>{ch.participant_count} joined · ends {new Date(ch.end_date).toLocaleDateString()}</Text>
      </Card>)}</> : null}
    </View> : null}
    </RefreshableScrollView>
  </>;
});

export default FriendsTab;

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { const { colors } = useTheme(); const s = createStyles(colors); return <Pressable onPress={onPress} style={[s.tab, active && s.tabActive]}><Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text></Pressable>; }

function GymInviteCard({ invite, other, actions }: { invite: GymInvite; other?: any; actions?: React.ReactNode }) {
  const { colors } = useTheme(); const s = createStyles(colors);
  const d = new Date(invite.session_at);
  return <Card><View style={s.person}><Avatar name={other?.username ?? '?'} url={other?.avatar_url} /><View style={{ flex: 1 }}><Text style={s.name}>@{other?.username ?? 'friend'}</Text><Text style={s.sessionTitle}>{invite.workout_name?.trim() || 'Gym session'}</Text><Text style={s.meta}>{d.toLocaleDateString()} • {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>{invite.gym_name ? <Text style={s.meta}>⌖ {invite.gym_name}</Text> : null}{invite.note ? <Text style={s.inviteNote}>{invite.note}</Text> : null}</View></View>{actions}</Card>;
}

function WorkoutPostCard({ post, mine, viewerId, onEdit, onDelete, onLike, liked, likeCount, onDeleteComment, onToggleCommentHidden, onToggleCount, comments, comment, setComment, send }: { post: any;mine:boolean;viewerId:string;onEdit:()=>void;onDelete:()=>void;onLike:()=>void;liked:boolean;likeCount:number;onDeleteComment:(c:any)=>void;onToggleCommentHidden:(c:any)=>void;onToggleCount:(key:'hide_like_count'|'hide_comment_count')=>void;comments:any[];comment:string;setComment:(v:string)=>void;send:()=>void }) {
  const { colors, weightUnit, distanceUnit } = useTheme(); const s = createStyles(colors);
  const names = String(post.exercise_names ?? post.summary ?? '').replace(/^Completed:\s*/i, '').split(',').map((x: string) => x.trim()).filter(Boolean);
  const groups = Array.from(new Set(names.map((n: string) => exerciseLibrary.find((e) => e.name === n)?.targetArea).filter(Boolean))) as string[];
  const start = post.started_at ? new Date(post.started_at).getTime() : 0;
  const end = post.ended_at ? new Date(post.ended_at).getTime() : 0;
  const minutes = start && end ? Math.max(1, Math.round((end - start) / 60000)) : null;
  const volume = Math.round(Number(post.total_volume ?? 0));
  const distance = Number(post.total_distance ?? 0);
  const title = workoutTitle(groups);

  return <View style={s.post}>
    <View style={s.person}><Avatar name={post.username} url={post.avatar_url} /><View style={{ flex: 1 }}><Text style={s.name}>{post.username}</Text><Text style={s.meta}>{relativeTime(post.created_at)}</Text></View>{mine?<Pressable onPress={()=>Alert.alert('Post controls','Edit your post or choose what other people can see.',[{text:'Edit caption or photo',onPress:onEdit},{text:post.hide_like_count?'Show like count':'Hide like count',onPress:()=>onToggleCount('hide_like_count')},{text:post.hide_comment_count?'Show comment count':'Hide comment count',onPress:()=>onToggleCount('hide_comment_count')},{text:'Delete post',style:'destructive',onPress:onDelete},{text:'Cancel',style:'cancel'}])}><Text style={s.more}>•••</Text></Pressable>:<Text style={s.more}>•••</Text>}</View>
    <Text style={s.postTitle}>{title}</Text>
    <Text style={s.groupLine}>{groups.length ? groups.slice(0, 4).join(' • ') : (names.slice(0, 3).join(' • ') || 'Training session')}</Text>
    {post.caption ? <Text style={s.caption}>{post.caption}</Text> : null}
    {post.photo_url ? <Image source={{ uri: post.photo_url }} style={s.postPhoto} /> : null}
    <View style={s.postStats}>
      <PostStat label="Exercises" value={post.exercise_count != null ? String(post.exercise_count) : String(names.length || '—')} />
      <PostStat label="Sets" value={post.total_sets != null ? String(post.total_sets) : '—'} />
      <PostStat label="Duration" value={minutes ? formatMinutes(minutes) : '—'} />
      <PostStat label={volume > 0 ? 'Volume' : 'Distance'} value={volume > 0 ? `${Math.round(kgToDisplay(volume, weightUnit)).toLocaleString()} ${weightUnit}` : distance > 0 ? formatDistance(distance, distanceUnit, 1) : '—'} />
    </View>
    {names.length ? <View style={s.highlight}><Text style={s.highlightTitle}>🔥 Workout highlights</Text><Text style={s.highlightText}>{names.slice(0, 4).join(' • ')}{names.length > 4 ? ` • +${names.length - 4} more` : ''}</Text></View> : null}
    <View style={s.actionRow}><Pressable onPress={onLike} style={s.action}><Text style={[s.heart,liked&&{color:colors.primary}]}>{liked?'♥':'♡'}</Text><Text style={s.actionText}>{post.hide_like_count&&!mine?'Like':`${likeCount} like${likeCount===1?'':'s'}${post.hide_like_count&&mine?' · hidden':''}`}</Text></Pressable><View style={s.action}><Text style={s.commentIcon}>▢</Text><Text style={s.actionText}>{post.hide_comment_count&&!mine?'Comments':`${comments.filter(c=>!c.hidden_by_post_owner).length} comment${comments.filter(c=>!c.hidden_by_post_owner).length===1?'':'s'}${post.hide_comment_count&&mine?' · hidden':''}`}</Text></View></View>
    {comments.length ? <View style={s.commentsBox}>{comments.filter(c=>mine||!c.hidden_by_post_owner).map((c) => <View key={c.id} style={[s.commentRow,c.hidden_by_post_owner&&{opacity:.55}]}><AvatarSmall name={c.author?.username ?? '?'} url={c.author?.avatar_url} /><View style={{ flex: 1 }}><View style={s.commentHeader}><Text style={s.commentAuthor}>{c.author?.username}</Text><Text style={s.commentTime}>{relativeTime(c.created_at)}{c.hidden_by_post_owner?' · hidden':''}</Text></View><Text style={s.commentBody}>{c.body}</Text></View>{mine||c.user_id===viewerId?<Pressable onPress={()=>Alert.alert('Comment controls',undefined,[...(mine?[{text:c.hidden_by_post_owner?'Unhide comment':'Hide comment',onPress:()=>onToggleCommentHidden(c)}]:[]),{text:'Delete comment',style:'destructive',onPress:()=>onDeleteComment(c)},{text:'Cancel',style:'cancel'}] as any)}><Text style={s.more}>•••</Text></Pressable>:null}</View>)}</View> : null}
    <View style={s.commentInput}><Input style={{ flex: 1, marginBottom: 0, minHeight: 42 }} value={comment} onChangeText={setComment} placeholder="Add a comment…" /><Pressable onPress={send} style={s.send}><Text style={s.sendText}>➤</Text></Pressable></View>
  </View>;
}

function parseLocalDateTime(date: string, time: string) {
  const matchDate = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const matchTime = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!matchDate || !matchTime) return null;
  const d = new Date(Number(matchDate[1]), Number(matchDate[2]) - 1, Number(matchDate[3]), Number(matchTime[1]), Number(matchTime[2]), 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}
function workoutTitle(groups: string[]) { const lower = groups.map((x) => x.toLowerCase()); if (lower.some((x) => x.includes('chest')) && lower.some((x) => x.includes('shoulder'))) return 'Push Day Complete 💪'; if (lower.some((x) => x.includes('back')) && lower.some((x) => x.includes('bicep'))) return 'Pull Day Complete 💪'; if (lower.some((x) => x.includes('leg')) || lower.some((x) => x.includes('quad')) || lower.some((x) => x.includes('glute'))) return 'Leg Day Complete 🦵'; return 'Workout Complete 💪'; }
function relativeTime(value: string) { const ms = Date.now() - new Date(value).getTime(); const min = Math.max(1, Math.floor(ms / 60000)); if (min < 60) return `${min}m ago`; const h = Math.floor(min / 60); if (h < 24) return `${h}h ago`; const d = Math.floor(h / 24); return d === 1 ? 'Yesterday' : `${d}d ago`; }
function formatMinutes(minutes: number) { const h = Math.floor(minutes / 60), m = minutes % 60; return h ? `${h}h ${m}m` : `${m}m`; }
function PostStat({ label, value }: { label: string; value: string }) { const { colors } = useTheme(); const s = createStyles(colors); return <View style={s.postStat}><Text style={s.postStatValue}>{value}</Text><Text style={s.postStatLabel}>{label}</Text></View>; }
function Avatar({ name, url }: { name: string; url?: string | null }) { const { colors } = useTheme(); const s = createStyles(colors); return url ? <Image source={{ uri: url }} style={s.avatar} /> : <View style={s.avatar}><Text style={s.avatarText}>{String(name ?? '?').slice(0, 1).toUpperCase()}</Text></View>; }
function AvatarSmall({ name, url }: { name: string; url?: string | null }) { const { colors } = useTheme(); const s = createStyles(colors); return url ? <Image source={{ uri: url }} style={s.avatarSmall} /> : <View style={s.avatarSmall}><Text style={s.avatarSmallText}>{String(name ?? '?').slice(0, 1).toUpperCase()}</Text></View>; }

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { paddingBottom: 40 }, header: { paddingHorizontal: 18, paddingTop: 11, paddingBottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: colors.text, fontSize: 29, fontWeight: '900' }, profileGlyph: { color: colors.text, fontSize: 27 },
  tabs: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12 }, tab: { paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 3, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: colors.primary }, tabText: { color: colors.muted, fontWeight: '800', fontSize: 12 }, tabTextActive: { color: colors.primary },
  feedArea: { paddingTop: 0 }, tabContent: { padding: 16 }, requestStrip: { marginHorizontal: 16, marginTop: 12, padding: 11, borderRadius: 11, backgroundColor: colors.panel2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, requestText: { color: colors.text, fontWeight: '800', fontSize: 12 }, requestAction: { color: colors.blue, fontWeight: '900' }, emptyFeed: { margin: 16, padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.panel }, emptyTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 4 }, sub: { color: colors.muted, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  person: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }, quickRow:{flexDirection:'row',flexWrap:'wrap',marginTop:5}, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.text, fontWeight: '900' }, avatarSmall: { width: 31, height: 31, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, avatarSmallText: { color: colors.text, fontWeight: '900', fontSize: 10 }, name: { color: colors.text, fontWeight: '900' }, meta: { color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 16 },
  post: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg }, more: { color: colors.muted, fontWeight: '900', letterSpacing: 1 }, postTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 9 }, groupLine: { color: colors.muted, fontSize: 13, marginTop: 5 }, caption: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 9 }, postPhoto: { width: '100%', aspectRatio: 1.3, borderRadius: 14, marginTop: 12, backgroundColor: colors.panel2 },
  postStats: { flexDirection: 'row', gap: 6, marginTop: 15 }, postStat: { flex: 1, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 3, alignItems: 'center' }, postStatValue: { color: colors.text, fontWeight: '900', fontSize: 13, textAlign: 'center' }, postStatLabel: { color: colors.muted, fontSize: 8, marginTop: 4 }, highlight: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12, marginTop: 13 }, highlightTitle: { color: colors.text, fontWeight: '900', fontSize: 13 }, highlightText: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 5 }, actionRow: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }, action: { flexDirection: 'row', alignItems: 'center', gap: 7 }, heart: { color: colors.primary, fontSize: 25, fontWeight: '900' }, commentIcon: { color: colors.text, fontSize: 20 }, actionText: { color: colors.muted, fontWeight: '800', fontSize: 12 }, commentsBox: { paddingTop: 5 }, commentRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 10 }, commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 }, commentAuthor: { color: colors.text, fontWeight: '900', fontSize: 11 }, commentBody: { color: colors.text, marginTop: 2, fontSize: 12, lineHeight: 17 }, commentTime: { color: colors.muted, fontSize: 9 }, commentInput: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }, send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, sendText: { color: colors.muted, fontWeight: '900', fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' }, two: { flexDirection: 'row', gap: 8 }, challengeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, challenge: { color: colors.text, fontSize: 17, fontWeight: '900' }, progress: { color: colors.blue, fontSize: 18, fontWeight: '900', marginTop: 10 }, track: { height: 8, borderRadius: 999, backgroundColor: colors.panel2, overflow: 'hidden', marginVertical: 7 }, fill: { height: '100%', backgroundColor: colors.gold },
  fieldLabel: { color: colors.muted, fontWeight: '900', fontSize: 10, marginBottom: 6 }, friendPicker: { gap: 7, paddingBottom: 10 }, friendChip: { minWidth: 104, flexDirection: 'row', gap: 7, alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel2 }, friendChipActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft }, friendChipText: { color: colors.text, fontWeight: '800', fontSize: 10 }, sessionTitle: { color: colors.text, fontWeight: '900', fontSize: 15, marginTop: 3 }, inviteNote: { color: colors.text, fontSize: 11, lineHeight: 17, marginTop: 6 }, inviteActions: { flexDirection: 'row', gap: 8, marginTop: 7 }, declineButton: { flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel }, declineText: { color: colors.muted, fontWeight: '900', fontSize: 12 }, cancelButton: { alignSelf: 'flex-start', paddingVertical: 7 }, cancelText: { color: colors.danger, fontWeight: '900', fontSize: 11 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.55)' }, editSheet: { maxHeight: '92%', backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border }, editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, editTitle: { color: colors.text, fontSize: 21, fontWeight: '900' }, editClose: { color: colors.text, fontSize: 32, lineHeight: 34, paddingHorizontal: 8 }, captionInput: { minHeight: 82, textAlignVertical: 'top' }, editPhoto: { width: '100%', aspectRatio: 1.7, resizeMode: 'cover', borderRadius: 14, backgroundColor: colors.panel2, marginBottom: 12 }, noPhoto: { height: 120, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, noPhotoText: { color: colors.muted, fontWeight: '800' }, editPhotoActions: { flexDirection: 'row', gap: 10, alignItems: 'center' }, removePhotoButton: { paddingHorizontal: 11, paddingVertical: 10 }, removePhotoText: { color: colors.danger, fontWeight: '900', fontSize: 11 }, editHelp: { color: colors.muted, fontSize: 11, lineHeight: 17, marginVertical: 12 },
});
