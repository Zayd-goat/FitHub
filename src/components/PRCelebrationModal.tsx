import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { NewPrEvent } from '../lib/prs';
import { contrastText, useTheme } from './UI';
import { formatDistance, formatPace, formatWeight } from '../lib/units';

export default function PRCelebrationModal({ visible, events, sessionId, onClose, onPostInApp }: { visible: boolean; events: NewPrEvent[]; sessionId: string | null; onClose: () => void; onPostInApp: () => void }) {
  const { colors, weightUnit, distanceUnit } = useTheme();
  const s = styles(colors);
  const pieces = useMemo(() => Array.from({length:18},(_,i)=>({left:`${(i*37)%94}%`,delay:(i%6)*80,duration:850+(i%5)*110})),[]);
  const anims = useRef(pieces.map(()=>new Animated.Value(0))).current;
  useEffect(()=>{
    if (!visible) { anims.forEach((a)=>a.setValue(0)); return; }
    Animated.parallel(anims.map((a,i)=>Animated.sequence([Animated.delay(pieces[i].delay),Animated.timing(a,{toValue:1,duration:pieces[i].duration,useNativeDriver:true})]))).start();
  },[visible]);

  const shareExternal = async () => {
    const summary = events.slice(0,4).map((event)=>`• ${event.exercise_name}: ${label(event,weightUnit,distanceUnit)}`).join('\n');
    const deep = sessionId ? `fithub://pr?session=${encodeURIComponent(sessionId)}` : 'fithub://pr';
    const download = process.env.EXPO_PUBLIC_FITHUB_DOWNLOAD_URL?.trim();
    await Share.share({ message:`FitHub PR 🎉\n${summary}\n\nOpen in FitHub: ${deep}${download ? `\nGet FitHub: ${download}` : ''}` });
  };

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>{pieces.map((p,i)=><Animated.View key={i} style={[s.confetti,{left:p.left as any,backgroundColor:i%3===0?colors.primary:i%3===1?colors.gold:colors.green,transform:[{translateY:anims[i].interpolate({inputRange:[0,1],outputRange:[-70,520]})},{rotate:anims[i].interpolate({inputRange:[0,1],outputRange:['0deg','420deg']})}],opacity:anims[i].interpolate({inputRange:[0,.08,.85,1],outputRange:[0,1,1,0]})}]} />)}</View>
      <View style={s.card}>
        <Text style={s.trophy}>🏆</Text><Text style={s.title}>NEW PR!</Text><Text style={s.sub}>Congratulations — you improved a recorded performance in this workout.</Text>
        <View style={s.results}>{events.slice(0,5).map((event,i)=><View key={`${event.exercise_name}-${event.metric}-${i}`} style={s.row}><Text style={s.exercise}>{event.exercise_name}</Text><Text style={s.value}>{label(event,weightUnit,distanceUnit)}</Text>{improvement(event,weightUnit,distanceUnit)?<Text style={s.improve}>{improvement(event,weightUnit,distanceUnit)}</Text>:null}</View>)}</View>
        {events.flatMap(e=>e.new_clubs??[]).map(club=><View key={club.club_key} style={s.clubUnlock}><Text style={s.clubTitle}>★ NEW CLUB UNLOCKED</Text><Text style={s.clubText}>You are now part of the {formatWeight(club.threshold_kg,weightUnit,0)} {club.exercise_name} Club</Text></View>)}
        <Pressable onPress={onPostInApp} style={s.primary}><Text style={[s.primaryText,{color:contrastText(colors.primary)}]}>SHARE AS FITHUB POST</Text></Pressable>
        <Pressable onPress={shareExternal} style={s.outline}><Text style={s.outlineText}>SHARE TO WHATSAPP / INSTAGRAM / MORE</Text></Pressable>
        <Pressable onPress={onClose} style={s.close}><Text style={s.closeText}>Continue</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

function label(event:NewPrEvent,weightUnit:'kg'|'lb',distanceUnit:'km'|'mi') {
  if(event.metric==='max_weight') return `${formatWeight(Number(event.value_numeric),weightUnit)}${event.details?.reps?` × ${event.details.reps} reps`:''}`;
  if(event.metric==='reps_at_weight') return `${formatWeight(Number(event.details?.weight_kg ?? 0),weightUnit)} × ${event.value_numeric} reps`;
  if(event.metric==='distance') return `${formatDistance(Number(event.value_numeric),distanceUnit)}${event.details?.duration_min?` in ${Number(event.details.duration_min).toFixed(1)} min`:''}`;
  if(event.metric==='pace') return formatPace(Number(event.value_numeric), distanceUnit);
  if(event.metric==='duration') return `${Number(event.value_numeric).toFixed(1)} min`;
  return `${event.value_numeric} ${event.unit}`;
}
function improvement(event:NewPrEvent,weightUnit:'kg'|'lb',distanceUnit:'km'|'mi') {
  if(event.previous_value_numeric==null) return 'First recorded PR';
  if(event.metric==='max_weight') return `Previous ${formatWeight(Number(event.previous_value_numeric),weightUnit)}`;
  if(event.metric==='reps_at_weight') return `+${Number(event.value_numeric)-Number(event.previous_value_numeric)} reps at this weight`;
  if(event.metric==='distance') return `Previous ${formatDistance(Number(event.previous_value_numeric),distanceUnit)}`;
  if(event.metric==='pace') return `Previous ${formatPace(Number(event.previous_value_numeric), distanceUnit)}`;
  return `Previous ${event.previous_value_numeric} ${event.unit}`;
}
const styles=(colors:any)=>StyleSheet.create({overlay:{flex:1,backgroundColor:'rgba(0,0,0,.72)',alignItems:'center',justifyContent:'center',padding:20},card:{width:'100%',maxWidth:420,backgroundColor:colors.panel,borderRadius:24,borderWidth:1,borderColor:colors.gold,padding:20,alignItems:'center'},confetti:{position:'absolute',top:-20,width:9,height:17,borderRadius:2},trophy:{fontSize:50},title:{color:colors.gold,fontSize:31,fontWeight:'900',marginTop:4},sub:{color:colors.muted,textAlign:'center',fontSize:11,lineHeight:17,marginTop:5},results:{width:'100%',marginTop:16},row:{backgroundColor:colors.panel2,borderRadius:12,padding:11,marginBottom:8},exercise:{color:colors.text,fontWeight:'900'},value:{color:colors.primary,fontSize:17,fontWeight:'900',marginTop:4},improve:{color:colors.green,fontSize:10,fontWeight:'800',marginTop:3},clubUnlock:{width:'100%',padding:12,borderRadius:12,backgroundColor:colors.goldSoft,borderWidth:1,borderColor:colors.gold,marginBottom:8},clubTitle:{color:colors.gold,fontWeight:'900',fontSize:11},clubText:{color:colors.text,fontWeight:'800',fontSize:12,marginTop:4},primary:{width:'100%',backgroundColor:colors.primary,borderRadius:11,padding:13,alignItems:'center',marginTop:6},primaryText:{color:'#fff',fontWeight:'900',fontSize:11},outline:{width:'100%',borderWidth:1.5,borderColor:colors.blue,borderRadius:11,padding:13,alignItems:'center',marginTop:8},outlineText:{color:colors.blue,fontWeight:'900',fontSize:10,textAlign:'center'},close:{padding:13},closeText:{color:colors.muted,fontWeight:'800'}});
