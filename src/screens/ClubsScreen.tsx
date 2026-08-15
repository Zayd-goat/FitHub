import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { formatWeight } from '../lib/units';

export default function ClubsScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const { colors, weightUnit } = useTheme(); const s = styles(colors);
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const adult = (profile.age ?? 0) >= 18;
  useEffect(() => { if (adult) supabase.rpc('get_my_clubs_with_active_counts').then(({data}) => setUnlocks(data ?? [])); }, [profile.id,adult]);
  const grouped=unlocks.reduce((map:Record<string,any[]>,row:any)=>{(map[row.exercise_name]??=[]).push(row);return map;},{});
  return <ScrollView contentContainerStyle={s.wrap}>
    <View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>‹</Text></Pressable><View><Text style={s.title}>Clubs</Text><Text style={s.sub}>Milestones unlocked from verified FitHub PR events.</Text></View></View>
    {!adult ? <Card><SectionTitle title="Load-based clubs are hidden for under-18 accounts" subtitle="FitHub keeps younger users focused on technique, consistency and coached progress rather than chasing heavy-load thresholds." /></Card> : <>
      {unlocks.length?Object.entries(grouped).map(([exercise,items])=><View key={exercise}><SectionTitle title={exercise} /><View style={s.grid}>{items.map((club:any)=><View key={club.club_key} style={[s.club,s.clubOn]}><Text style={s.clubIcon}>★</Text><Text style={s.clubValue}>{formatWeight(Number(club.threshold_kg),weightUnit,0)}</Text><Text style={s.clubName}>{formatWeight(Number(club.threshold_kg),weightUnit,0)} {exercise} club</Text><Text style={s.clubState}>{Number(club.active_member_count??1).toLocaleString()} ACTIVE MEMBER{Number(club.active_member_count??1)===1?'':'S'}</Text></View>)}</View></View>):<Card><SectionTitle title="No clubs unlocked yet" subtitle="Your first qualifying completed-workout PR will appear here automatically." /></Card>}
      <Card><SectionTitle title="How clubs work" subtitle="A club unlocks when a completed workout creates a new max-weight PR that reaches the listed threshold. Existing unlocks stay saved even if you later change units." /></Card>
    </>}
  </ScrollView>;
}
const styles=(colors:any)=>StyleSheet.create({wrap:{padding:16,paddingBottom:40},header:{flexDirection:'row',gap:10,alignItems:'center',marginBottom:16},back:{color:colors.text,fontSize:38,width:28},title:{color:colors.text,fontSize:25,fontWeight:'900'},sub:{color:colors.muted,fontSize:11,marginTop:2},grid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:18},club:{width:'48%',borderRadius:15,borderWidth:1,padding:14,minHeight:120},clubOn:{backgroundColor:colors.goldSoft,borderColor:colors.gold},clubOff:{backgroundColor:colors.panel,borderColor:colors.border,opacity:.78},clubIcon:{fontSize:22,color:colors.gold},clubValue:{color:colors.text,fontSize:22,fontWeight:'900',marginTop:7},clubName:{color:colors.text,fontWeight:'800',fontSize:11,marginTop:2},clubState:{color:colors.muted,fontSize:8,fontWeight:'900',marginTop:8}});
