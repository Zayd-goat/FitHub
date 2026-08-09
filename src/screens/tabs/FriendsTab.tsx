import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, OutlineButton, SectionTitle, useTheme } from '../../components/UI';
import { exerciseLibrary } from '../../data/exerciseLibrary';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';

type FriendsView = 'feed' | 'following' | 'challenges';

export default function FriendsTab({ profile }: { profile: Profile }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [view,setView]=useState<FriendsView>('feed');
  const [search,setSearch]=useState('');
  const [found,setFound]=useState<any[]>([]);
  const [requests,setRequests]=useState<any[]>([]);
  const [friends,setFriends]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [comments,setComments]=useState<Record<string,any[]>>({});
  const [commentText,setCommentText]=useState<Record<string,string>>({});
  const [challenges,setChallenges]=useState<any[]>([]);
  const [customOpen,setCustomOpen]=useState(false);
  const [custom,setCustom]=useState({title:'',description:'',metric:'workouts',target:'3',days:'7'});

  const load=async()=>{
    const [req,fr,ch]=await Promise.all([
      supabase.from('friend_requests').select('id,requester_id,status,created_at,requester:public_profiles!friend_requests_requester_id_fkey(username,avatar_url,login_streak,workout_streak,tokens)').eq('addressee_id',profile.id).eq('status','pending').order('created_at',{ascending:false}),
      supabase.rpc('get_my_friends'),
      supabase.rpc('get_visible_challenges')
    ]);
    let feed=await supabase.rpc('get_friend_feed_v2');
    if(feed.error) feed=await supabase.rpc('get_friend_feed');
    setRequests(req.data??[]);
    setFriends(fr.data??[]);
    setPosts(feed.data??[]);
    setChallenges(ch.data??[]);

    const ids=(feed.data??[]).map((p:any)=>p.id);
    if(ids.length){
      const {data:c}=await supabase.from('comments').select('id,post_id,user_id,body,created_at,author:public_profiles!comments_user_id_fkey(username,avatar_url)').in('post_id',ids).order('created_at',{ascending:true});
      const grouped:Record<string,any[]>={};
      for(const row of c??[])(grouped[row.post_id]??=[]).push(row);
      setComments(grouped);
    } else setComments({});
  };

  useEffect(()=>{
    load();
    const channel=supabase.channel(`fithub-social-${profile.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'workout_posts'},load)
      .on('postgres_changes',{event:'*',schema:'public',table:'comments'},load)
      .on('postgres_changes',{event:'*',schema:'public',table:'friend_requests'},load)
      .on('postgres_changes',{event:'*',schema:'public',table:'challenge_participants'},load)
      .on('postgres_changes',{event:'*',schema:'public',table:'public_profiles'},load)
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[profile.id]);

  const find=async()=>{
    if(!search.trim())return;
    const {data,error}=await supabase.rpc('find_profile',{search_text:search.trim()});
    if(error)return Alert.alert('Search',error.message);
    setFound((data??[]).filter((x:any)=>x.user_id!==profile.id));
  };

  const addFriend=async(userId:string)=>{
    const {error}=await supabase.from('friend_requests').insert({requester_id:profile.id,addressee_id:userId});
    if(error)Alert.alert('Friend request',error.message.includes('duplicate')?'A request already exists.':error.message);
    else Alert.alert('Sent','Friend request sent.');
  };

  const accept=async(id:string)=>{
    const {error}=await supabase.rpc('accept_friend_request',{request_id:id});
    if(error)Alert.alert('Could not accept',error.message); else load();
  };

  const postComment=async(postId:string,quick?:string)=>{
    const body=(quick??commentText[postId]??'').trim();
    if(!body)return;
    const {error}=await supabase.from('comments').insert({post_id:postId,user_id:profile.id,body});
    if(error)Alert.alert('Comment',error.message);
    else{setCommentText({...commentText,[postId]:''});load();}
  };

  const joinChallenge=async(challengeId:string)=>{
    const {error}=await supabase.from('challenge_participants').upsert({challenge_id:challengeId,user_id:profile.id},{onConflict:'challenge_id,user_id'});
    if(error)Alert.alert('Challenge',error.message); else load();
  };

  const createChallenge=async()=>{
    const target=Number(custom.target),days=Number(custom.days);
    if(!custom.title.trim()||!target||target<=0||!days||days<1||days>365)return Alert.alert('Challenge details','Enter a title, positive target and duration.');
    const ends=new Date(); ends.setDate(ends.getDate()+days);
    const unit:Record<string,string>={workouts:'workouts',active_days:'days',distance:'km',strength_sessions:'sessions'};
    const {data,error}=await supabase.from('challenges').insert({created_by:profile.id,title:custom.title.trim(),description:custom.description.trim(),metric:custom.metric,target_value:target,unit:unit[custom.metric],start_date:new Date().toISOString(),end_date:ends.toISOString(),preset:false,visibility:'friends'}).select('id').single();
    if(error)return Alert.alert('Could not create challenge',error.message);
    await supabase.from('challenge_participants').insert({challenge_id:data.id,user_id:profile.id});
    setCustom({title:'',description:'',metric:'workouts',target:'3',days:'7'});
    setCustomOpen(false);
    load();
  };

  return <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Text style={styles.title}>Friends</Text><Text style={styles.profileGlyph}>♙</Text></View>
    <View style={styles.tabs}>
      <Tab label="Feed" active={view==='feed'} onPress={()=>setView('feed')}/>
      <Tab label="Following" active={view==='following'} onPress={()=>setView('following')}/>
      <Tab label="Challenges" active={view==='challenges'} onPress={()=>setView('challenges')}/>
    </View>

    {view==='feed'?<View style={styles.feedArea}>
      {requests.length?<View style={styles.requestStrip}><Text style={styles.requestText}>{requests.length} friend request{requests.length===1?'':'s'} waiting</Text><Pressable onPress={()=>setView('following')}><Text style={styles.requestAction}>View</Text></Pressable></View>:null}
      {posts.length?posts.map(p=><WorkoutPostCard key={p.id} post={p} comments={comments[p.id]??[]} comment={commentText[p.id]??''} setComment={v=>setCommentText({...commentText,[p.id]:v})} send={()=>postComment(p.id)} quick={(text)=>postComment(p.id,text)}/>):<View style={styles.emptyFeed}><Text style={styles.emptyTitle}>Your workout feed is ready.</Text><Text style={styles.sub}>Completed workouts from accepted friends will appear here as posts.</Text></View>}
    </View>:null}

    {view==='following'?<View style={styles.tabContent}>
      <Card>
        <SectionTitle title="Add a friend" subtitle="Search by username or exact email."/>
        <Input value={search} onChangeText={setSearch} autoCapitalize="none" placeholder="Username or exact email"/>
        <OutlineButton title="Search" onPress={find}/>
        {found.map(x=><View key={x.user_id} style={styles.person}><Avatar name={x.username} url={x.avatar_url}/><View style={{flex:1}}><Text style={styles.name}>@{x.username}</Text><Text style={styles.meta}>🔥 {x.login_streak} login · ⚡ {x.workout_streak} workout</Text></View><OutlineButton title="Add" onPress={()=>addFriend(x.user_id)} compact/></View>)}
      </Card>

      {requests.length?<Card><SectionTitle title="Friend requests"/>{requests.map(r=><View key={r.id} style={styles.person}><Avatar name={r.requester?.username??'?'} url={r.requester?.avatar_url}/><View style={{flex:1}}><Text style={styles.name}>@{r.requester?.username}</Text><Text style={styles.meta}>wants to connect</Text></View><OutlineButton title="Accept" onPress={()=>accept(r.id)} compact/></View>)}</Card>:null}

      <Card><SectionTitle title="Following" subtitle="Friends you train and compete with."/>{friends.length?friends.map(x=><View key={x.user_id} style={styles.person}><Avatar name={x.username} url={x.avatar_url}/><View style={{flex:1}}><Text style={styles.name}>@{x.username}</Text><Text style={styles.meta}>🔥 {x.login_streak} · ⚡ {x.workout_streak} · ✦ {x.tokens}</Text></View></View>):<Text style={styles.sub}>No friends yet. Search above to add someone.</Text>}</Card>
    </View>:null}

    {view==='challenges'?<View style={styles.tabContent}>
      <Card>
        <SectionTitle title="Challenges" subtitle="Join presets or make a friends-only challenge."/>
        <Button title={customOpen?'Close challenge builder':'Create a challenge'} onPress={()=>setCustomOpen(!customOpen)} secondary/>
        {customOpen?<View style={{marginTop:10}}>
          <Input value={custom.title} onChangeText={v=>setCustom({...custom,title:v})} placeholder="Challenge title"/>
          <Input value={custom.description} onChangeText={v=>setCustom({...custom,description:v})} placeholder="Description"/>
          <View style={styles.chips}>{(['workouts','active_days','distance','strength_sessions'] as const).map(v=><Chip key={v} label={v.replace('_',' ')} active={custom.metric===v} onPress={()=>setCustom({...custom,metric:v})}/>)}</View>
          <View style={styles.two}><Input style={{flex:1}} value={custom.target} onChangeText={v=>setCustom({...custom,target:v})} keyboardType="decimal-pad" placeholder="Target"/><Input style={{flex:1}} value={custom.days} onChangeText={v=>setCustom({...custom,days:v})} keyboardType="number-pad" placeholder="Days"/></View>
          <Button title="Create & join" onPress={createChallenge}/>
        </View>:null}
      </Card>
      {challenges.map(ch=><Card key={ch.id}>
        <View style={styles.challengeTop}><View style={{flex:1}}><Text style={styles.challenge}>{ch.preset?'★ ':''}{ch.title}</Text><Text style={styles.meta}>{ch.description}</Text></View><OutlineButton title={ch.joined?'Joined':'Join'} onPress={()=>joinChallenge(ch.id)} compact/></View>
        <Text style={styles.progress}>{Number(ch.my_progress??0).toFixed(ch.metric==='distance'?1:0)} / {ch.target_value} {ch.unit}</Text>
        <View style={styles.track}><View style={[styles.fill,{width:`${Math.min(100,(Number(ch.my_progress??0)/Math.max(1,Number(ch.target_value)))*100)}%`}]} /></View>
        <Text style={styles.meta}>{ch.participant_count} joined · ends {new Date(ch.end_date).toLocaleDateString()}</Text>
      </Card>)}
    </View>:null}
  </ScrollView>;
}

function Tab({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  return <Pressable onPress={onPress} style={[s.tab,active&&s.tabActive]}><Text style={[s.tabText,active&&s.tabTextActive]}>{label}</Text></Pressable>;
}

function WorkoutPostCard({post,comments,comment,setComment,send,quick}:{post:any;comments:any[];comment:string;setComment:(v:string)=>void;send:()=>void;quick:(v:string)=>void}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  const names=String(post.exercise_names??post.summary??'').replace(/^Completed:\s*/i,'').split(',').map((x:string)=>x.trim()).filter(Boolean);
  const groups=Array.from(new Set(names.map((n:string)=>exerciseLibrary.find(e=>e.name===n)?.targetArea).filter(Boolean))) as string[];
  const start=post.started_at?new Date(post.started_at).getTime():0;
  const end=post.ended_at?new Date(post.ended_at).getTime():0;
  const minutes=start&&end?Math.max(1,Math.round((end-start)/60000)):null;
  const volume=Math.round(Number(post.total_volume??0));
  const distance=Number(post.total_distance??0);
  const title=workoutTitle(groups);

  return <View style={s.post}>
    <View style={s.person}>
      <Avatar name={post.username} url={post.avatar_url}/>
      <View style={{flex:1}}><Text style={s.name}>{post.username}</Text><Text style={s.meta}>{relativeTime(post.created_at)}</Text></View>
      <Text style={s.more}>•••</Text>
    </View>

    <Text style={s.postTitle}>{title}</Text>
    <Text style={s.groupLine}>{groups.length?groups.slice(0,4).join(' • '):(names.slice(0,3).join(' • ')||'Training session')}</Text>

    <View style={s.postStats}>
      <PostStat label="Exercises" value={post.exercise_count!=null?String(post.exercise_count):String(names.length||'—')}/>
      <PostStat label="Sets" value={post.total_sets!=null?String(post.total_sets):'—'}/>
      <PostStat label="Duration" value={minutes?formatMinutes(minutes):'—'}/>
      <PostStat label={volume>0?'Volume':'Distance'} value={volume>0?`${volume.toLocaleString()} kg`:distance>0?`${distance.toFixed(1)} km`:'—'}/>
    </View>

    {names.length?<View style={s.highlight}>
      <Text style={s.highlightTitle}>🔥 Workout highlights</Text>
      <Text style={s.highlightText}>{names.slice(0,4).join(' • ')}{names.length>4?` • +${names.length-4} more`:''}</Text>
    </View>:null}

    <View style={s.actionRow}>
      <Pressable onPress={()=>quick('Great work! ❤️')} style={s.action}><Text style={s.heart}>♥</Text><Text style={s.actionText}>Cheer</Text></Pressable>
      <View style={s.action}><Text style={s.commentIcon}>▢</Text><Text style={s.actionText}>{comments.length}</Text></View>
      <View style={{flex:1}}/><Text style={s.more}>•••</Text>
    </View>

    {comments.length?<View style={s.commentsBox}>{comments.map(c=><View key={c.id} style={s.commentRow}>
      <AvatarSmall name={c.author?.username??'?'} url={c.author?.avatar_url}/>
      <View style={{flex:1}}><View style={s.commentHeader}><Text style={s.commentAuthor}>{c.author?.username}</Text><Text style={s.commentTime}>{relativeTime(c.created_at)}</Text></View><Text style={s.commentBody}>{c.body}</Text></View>
    </View>)}</View>:null}

    <View style={s.commentInput}>
      <Input style={{flex:1,marginBottom:0,minHeight:42}} value={comment} onChangeText={setComment} placeholder="Add a comment…"/>
      <Pressable onPress={send} style={s.send}><Text style={s.sendText}>➤</Text></Pressable>
    </View>
  </View>;
}

function workoutTitle(groups:string[]){
  const lower=groups.map(x=>x.toLowerCase());
  if(lower.some(x=>x.includes('chest'))&&lower.some(x=>x.includes('shoulder'))) return 'Push Day Complete 💪';
  if(lower.some(x=>x.includes('back'))&&lower.some(x=>x.includes('bicep'))) return 'Pull Day Complete 💪';
  if(lower.some(x=>x.includes('leg'))||lower.some(x=>x.includes('quad'))||lower.some(x=>x.includes('glute'))) return 'Leg Day Complete 🦵';
  return 'Workout Complete 💪';
}

function relativeTime(value:string){
  const ms=Date.now()-new Date(value).getTime();
  const min=Math.max(1,Math.floor(ms/60000));
  if(min<60)return `${min}m ago`;
  const h=Math.floor(min/60); if(h<24)return `${h}h ago`;
  const d=Math.floor(h/24); return d===1?'Yesterday':`${d}d ago`;
}

function formatMinutes(minutes:number){const h=Math.floor(minutes/60),m=minutes%60;return h?`${h}h ${m}m`:`${m}m`;}

function PostStat({label,value}:{label:string;value:string}){const {colors}=useTheme();const s=createStyles(colors);return <View style={s.postStat}><Text style={s.postStatValue}>{value}</Text><Text style={s.postStatLabel}>{label}</Text></View>;}
function Avatar({name,url}:{name:string;url?:string|null}){const {colors}=useTheme();const s=createStyles(colors);return url?<Image source={{uri:url}} style={s.avatar}/>:<View style={s.avatar}><Text style={s.avatarText}>{String(name??'?').slice(0,1).toUpperCase()}</Text></View>;}
function AvatarSmall({name,url}:{name:string;url?:string|null}){const {colors}=useTheme();const s=createStyles(colors);return url?<Image source={{uri:url}} style={s.avatarSmall}/>:<View style={s.avatarSmall}><Text style={s.avatarSmallText}>{String(name??'?').slice(0,1).toUpperCase()}</Text></View>;}

const createStyles=(colors:any)=>StyleSheet.create({
  wrap:{paddingBottom:40},
  header:{paddingHorizontal:18,paddingTop:11,paddingBottom:7,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  title:{color:colors.text,fontSize:29,fontWeight:'900'},
  profileGlyph:{color:colors.text,fontSize:27},
  tabs:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:colors.border,paddingHorizontal:18},
  tab:{paddingHorizontal:16,paddingVertical:13,borderBottomWidth:3,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:colors.primary},
  tabText:{color:colors.muted,fontWeight:'800',fontSize:13},
  tabTextActive:{color:colors.primary},
  feedArea:{paddingTop:0},
  tabContent:{padding:16},
  requestStrip:{marginHorizontal:16,marginTop:12,padding:11,borderRadius:11,backgroundColor:colors.panel2,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  requestText:{color:colors.text,fontWeight:'800',fontSize:12},
  requestAction:{color:colors.blue,fontWeight:'900'},
  emptyFeed:{margin:16,padding:20,borderWidth:1,borderColor:colors.border,borderRadius:14,backgroundColor:colors.panel},
  emptyTitle:{color:colors.text,fontWeight:'900',fontSize:16,marginBottom:4},
  sub:{color:colors.muted,lineHeight:19,marginTop:4,marginBottom:12},
  person:{flexDirection:'row',alignItems:'center',paddingVertical:8,gap:10},
  avatar:{width:40,height:40,borderRadius:20,backgroundColor:colors.blueSoft,alignItems:'center',justifyContent:'center'},
  avatarText:{color:colors.text,fontWeight:'900'},
  avatarSmall:{width:31,height:31,borderRadius:16,backgroundColor:colors.blueSoft,alignItems:'center',justifyContent:'center'},
  avatarSmallText:{color:colors.text,fontWeight:'900',fontSize:10},
  name:{color:colors.text,fontWeight:'900'},
  meta:{color:colors.muted,fontSize:11,marginTop:2,lineHeight:16},
  post:{paddingHorizontal:20,paddingTop:12,paddingBottom:16,borderBottomWidth:1,borderBottomColor:colors.border,backgroundColor:colors.bg},
  more:{color:colors.muted,fontWeight:'900',letterSpacing:1},
  postTitle:{color:colors.text,fontSize:21,fontWeight:'900',marginTop:9},
  groupLine:{color:colors.muted,fontSize:13,marginTop:5},
  postStats:{flexDirection:'row',gap:6,marginTop:15},
  postStat:{flex:1,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:10,paddingVertical:10,paddingHorizontal:3,alignItems:'center'},
  postStatValue:{color:colors.text,fontWeight:'900',fontSize:13,textAlign:'center'},
  postStatLabel:{color:colors.muted,fontSize:8,marginTop:4},
  highlight:{borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border,paddingVertical:12,marginTop:13},
  highlightTitle:{color:colors.text,fontWeight:'900',fontSize:13},
  highlightText:{color:colors.text,fontSize:12,lineHeight:18,marginTop:5},
  actionRow:{flexDirection:'row',alignItems:'center',gap:22,paddingVertical:11,borderBottomWidth:1,borderBottomColor:colors.border},
  action:{flexDirection:'row',alignItems:'center',gap:7},
  heart:{color:colors.primary,fontSize:25,fontWeight:'900'},
  commentIcon:{color:colors.text,fontSize:20},
  actionText:{color:colors.muted,fontWeight:'800',fontSize:12},
  commentsBox:{paddingTop:5},
  commentRow:{flexDirection:'row',gap:9,alignItems:'flex-start',marginTop:10},
  commentHeader:{flexDirection:'row',alignItems:'center',gap:8},
  commentAuthor:{color:colors.text,fontWeight:'900',fontSize:11},
  commentBody:{color:colors.text,marginTop:2,fontSize:12,lineHeight:17},
  commentTime:{color:colors.muted,fontSize:9},
  commentInput:{flexDirection:'row',gap:8,alignItems:'center',marginTop:12},
  send:{width:42,height:42,borderRadius:21,backgroundColor:colors.panel2,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
  sendText:{color:colors.muted,fontWeight:'900',fontSize:16},
  chips:{flexDirection:'row',flexWrap:'wrap'},
  two:{flexDirection:'row',gap:8},
  challengeTop:{flexDirection:'row',alignItems:'flex-start',gap:8},
  challenge:{color:colors.text,fontSize:17,fontWeight:'900'},
  progress:{color:colors.blue,fontSize:18,fontWeight:'900',marginTop:10},
  track:{height:8,borderRadius:999,backgroundColor:colors.panel2,overflow:'hidden',marginVertical:7},
  fill:{height:'100%',backgroundColor:colors.gold}
});
