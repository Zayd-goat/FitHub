import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, OutlineButton, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { readTodaySteps } from '../lib/steps';
import { supabase } from '../lib/supabase';

export default function StepsScreen({profile,onBack,onGroups}:{profile:Profile;onBack:()=>void;onGroups:()=>void}){
  const {colors}=useTheme(); const s=StyleSheet.create({wrap:{padding:18,gap:12},title:{color:colors.text,fontSize:28,fontWeight:'900'},big:{color:colors.primary,fontSize:44,fontWeight:'900'},muted:{color:colors.muted},row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,borderBottomWidth:1,borderBottomColor:colors.border}});
  const [today,setToday]=useState(0); const [reason,setReason]=useState<string|null>(null); const [history,setHistory]=useState<any[]>([]);
  const load=async()=>{const r=await readTodaySteps(profile.id);setToday(r.steps);setReason(r.reason);const {data}=await supabase.from('daily_steps').select('local_date,steps').eq('user_id',profile.id).order('local_date',{ascending:false}).limit(31);setHistory(data??[])};
  useEffect(()=>{load().catch(e=>setReason(e.message))},[profile.id]);
  return <ScrollView contentContainerStyle={s.wrap}><OutlineButton title="‹ Back" onPress={onBack}/><Text style={s.title}>Steps</Text><Card><Text style={s.muted}>Today</Text><Text style={s.big}>{today.toLocaleString()}</Text><Text style={s.muted}>{reason??'Read from your device pedometer. Private by default.'}</Text><OutlineButton title="Refresh sensor" onPress={()=>load().catch(e=>Alert.alert('Steps',e.message))}/></Card><OutlineButton title="Step groups & leaderboards" onPress={onGroups}/><Card><SectionTitle title="Recent history" subtitle="Daily totals remain after the counter changes to a new day."/>{history.map(x=><View style={s.row} key={x.local_date}><Text style={s.muted}>{x.local_date}</Text><Text style={{color:colors.text,fontWeight:'800'}}>{Number(x.steps).toLocaleString()}</Text></View>)}</Card></ScrollView>;
}
