import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, contrastText, Input, OutlineButton, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { cancelSupplementReminder, scheduleDailySupplementReminder, scheduleOneTimeSupplementReminder } from '../lib/notifications';

type Reminder = {
  id: string;
  supplement_name: string;
  reminder_hour: number;
  reminder_minute: number;
  enabled: boolean;
  notification_id?: string | null;
  color_hex?: string | null;
};

const quickAdds = ['Creatine', 'Multivitamin', 'Vitamin D', 'Omega-3', 'Electrolytes'];
const supplementColors=['#2ECC71','#3498DB','#9B59B6','#F39C12','#E74C3C','#00A8A8'];
const timeText = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const parseTime = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]), m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? { h, m } : null;
};

export default function SupplementRemindersScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [rows, setRows] = useState<Reminder[]>([]);
  const [name, setName] = useState('');
  const [time, setTime] = useState('08:00');
  const [selectedColor,setSelectedColor]=useState(supplementColors[0]);
  const [busy, setBusy] = useState(false);
  const [checkins,setCheckins]=useState<any[]>([]);
  const [month,setMonth]=useState(()=>new Date());
  const [selectedDate,setSelectedDate]=useState(()=>localDate());
  const adult = (profile.age ?? 0) >= 18;

  const load = async () => {
    const [{ data },{data:checks}] = await Promise.all([supabase.from('supplement_reminders').select('*').eq('user_id', profile.id).order('reminder_hour').order('reminder_minute'),supabase.from('supplement_checkins').select('*').eq('user_id',profile.id).order('local_date',{ascending:false}).limit(400)]);
    const reminders = (data ?? []) as Reminder[];
    setRows(reminders);
    setCheckins(checks??[]);
    // Re-create enabled local schedules when this screen is opened (useful after reinstall/device changes).
    for (const row of reminders.filter((item) => item.enabled)) {
      try {
        const notificationId = await scheduleDailySupplementReminder({ identifier: row.notification_id, supplementName: row.supplement_name, hour: row.reminder_hour, minute: row.reminder_minute, userId:profile.id, reminderId:row.id });
        if (notificationId && notificationId !== row.notification_id) {
          await supabase.from('supplement_reminders').update({ notification_id: notificationId, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', profile.id);
        }
      } catch {}
    }
  };
  useEffect(() => { load(); }, [profile.id]);

  const add = async (quick?: string) => {
    const supplement = (quick ?? name).trim();
    const parsed = parseTime(time);
    if (!supplement || !parsed) return Alert.alert('Check reminder', 'Enter a supplement name and a time like 08:00.');
    setBusy(true);
    try {
      const { data:created,error } = await supabase.from('supplement_reminders').insert({ user_id: profile.id, supplement_name: supplement, reminder_hour: parsed.h, reminder_minute: parsed.m, enabled: true,color_hex:selectedColor }).select('id').single();
      if (error) throw error;
      const notificationId = await scheduleDailySupplementReminder({ supplementName: supplement, hour: parsed.h, minute: parsed.m,userId:profile.id,reminderId:created.id });
      await supabase.from('supplement_reminders').update({notification_id:notificationId}).eq('id',created.id).eq('user_id',profile.id);
      setName('');
      await load();
    } catch (e: any) { Alert.alert('Reminder', e?.message ?? 'Could not create reminder.'); }
    finally { setBusy(false); }
  };

  const toggle = async (row: Reminder) => {
    try {
      if (row.enabled) {
        await cancelSupplementReminder(row.notification_id);
        const { error } = await supabase.from('supplement_reminders').update({ enabled: false, notification_id: null, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', profile.id);
        if (error) throw error;
      } else {
        const notificationId = await scheduleDailySupplementReminder({ supplementName: row.supplement_name, hour: row.reminder_hour, minute: row.reminder_minute,userId:profile.id,reminderId:row.id });
        const { error } = await supabase.from('supplement_reminders').update({ enabled: true, notification_id: notificationId, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', profile.id);
        if (error) throw error;
      }
      load();
    } catch (e: any) { Alert.alert('Reminder', e?.message ?? 'Could not update reminder.'); }
  };

  const remove = (row: Reminder) => Alert.alert('Delete reminder?', `${row.supplement_name} will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await cancelSupplementReminder(row.notification_id); await supabase.from('supplement_reminders').delete().eq('id', row.id).eq('user_id', profile.id); load(); } },
  ]);

  const localDate=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const markTaken=async(row:Reminder,date=localDate())=>{const existing=checkins.find(x=>x.reminder_id===row.id&&x.local_date===date);if(existing){await supabase.from('supplement_checkins').delete().eq('id',existing.id).eq('user_id',profile.id);}else{await supabase.from('supplement_checkins').upsert({user_id:profile.id,reminder_id:row.id,local_date:date,taken_at:new Date().toISOString(),source:'in_app'},{onConflict:'user_id,reminder_id,local_date'});}load();};
  const reschedule=(row:Reminder)=>Alert.alert('Remind me later today',row.supplement_name,[30,60,120].map(minutes=>({text:minutes<60?`${minutes} minutes`:`${minutes/60} hour${minutes>60?'s':''}`,onPress:async()=>{const date=new Date(Date.now()+minutes*60000);await scheduleOneTimeSupplementReminder({supplementName:row.supplement_name,userId:profile.id,reminderId:row.id,date});await supabase.from('supplement_reschedules').insert({user_id:profile.id,reminder_id:row.id,scheduled_for:date.toISOString()});}})).concat([{text:'Cancel',style:'cancel'}] as any));

  return <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable><View><Text style={styles.title}>Supplement reminders</Text><Text style={styles.sub}>Daily reminders for items you already choose to take.</Text></View></View>

    {!adult ? <Card><SectionTitle title="For younger users" subtitle="FitHub does not recommend supplements or doses. Only add a reminder for something already managed with a parent/guardian or qualified clinician." /></Card> : null}

    {adult ? <Card>
      <SectionTitle title="Quick add" subtitle="Common labels only — FitHub does not recommend a dose or tell you to take these." />
      <View style={styles.chips}>{quickAdds.map((item) => <Chip key={item} label={item} onPress={() => setName(item)} active={name === item} />)}</View>
    </Card> : null}

    <Card>
      <SectionTitle title="New reminder" subtitle="Choose the item and the local time you want the notification." />
      <Input value={name} onChangeText={setName} placeholder="Supplement name" />
      <Input value={time} onChangeText={setTime} placeholder="08:00" autoCapitalize="none" />
      <Text style={styles.time}>Calendar colour</Text><View style={styles.colorRow}>{supplementColors.map(color=><Pressable key={color} onPress={()=>setSelectedColor(color)} style={[styles.colorDot,{backgroundColor:color},selectedColor===color&&styles.colorSelected]}/>)}</View>
      <Button title={busy ? 'ADDING…' : 'ADD DAILY REMINDER'} onPress={() => add()} disabled={busy} />
    </Card>

    <SectionTitle title="Your reminders" subtitle="Switch notifications off without deleting the reminder." />
    {rows.length ? rows.map((row) => <Card key={row.id} style={styles.row}>
      <View style={{ flex: 1 }}><Text style={styles.name}>{row.supplement_name}</Text><Text style={styles.time}>Daily • {timeText(row.reminder_hour, row.reminder_minute)}</Text></View>
      <View style={{width:12,height:12,borderRadius:6,backgroundColor:row.color_hex??supplementColors[0]}}/><View style={styles.actions}><OutlineButton compact title={checkins.some(x=>x.reminder_id===row.id&&x.local_date===localDate())?'TAKEN ✓':'MARK TAKEN'} onPress={()=>markTaken(row)} /><OutlineButton compact title="LATER" onPress={()=>reschedule(row)} /><OutlineButton compact title={row.enabled ? 'ON' : 'OFF'} onPress={() => toggle(row)} /><Pressable onPress={() => remove(row)}><Text style={styles.delete}>Delete</Text></Pressable></View>
    </Card>) : <Card><Text style={styles.sub}>No supplement reminders yet.</Text></Card>}
    <SupplementCalendar month={month} rows={rows} checkins={checkins} selectedDate={selectedDate} onSelect={setSelectedDate} onMonth={setMonth} onToggle={markTaken}/>
  </ScrollView>;
}

function SupplementCalendar({month,rows,checkins,selectedDate,onSelect,onMonth,onToggle}:{month:Date;rows:Reminder[];checkins:any[];selectedDate:string;onSelect:(d:string)=>void;onMonth:(d:Date)=>void;onToggle:(r:Reminder,d:string)=>void}){const{colors}=useTheme();const s=createStyles(colors);const y=month.getFullYear(),m=month.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=new Date();const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const selectedLabel=new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});return <Card style={s.calendarCard}><View style={s.calHead}><Pressable onPress={()=>onMonth(new Date(y,m-1,1))}><Text style={s.calArrow}>‹</Text></Pressable><View style={{flex:1}}><Text style={s.calendarTitle}>{month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</Text><Text style={s.calendarSub}>Supplement calendar</Text></View><Pressable onPress={()=>{const n=new Date();onMonth(new Date(n.getFullYear(),n.getMonth(),1));onSelect(key(n));}} style={s.todayButton}><Text style={s.todayText}>Today</Text></Pressable><Pressable onPress={()=>onMonth(new Date(y,m+1,1))}><Text style={s.calArrow}>›</Text></Pressable></View><View style={s.legend}>{rows.map(r=><View key={r.id} style={s.legendItem}><View style={[s.legendDot,{backgroundColor:r.color_hex??supplementColors[0]}]}/><Text style={s.time}>{r.supplement_name}</Text></View>)}</View><View style={s.calGrid}>{['S','M','T','W','T','F','S'].map((x,i)=><Text key={i} style={s.week}>{x}</Text>)}{Array.from({length:first}).map((_,i)=><View key={`b${i}`} style={s.day}/>)}{Array.from({length:days}).map((_,i)=>{const d=new Date(y,m,i+1),date=key(d),checks=checkins.filter(x=>x.local_date===date),future=d>today;return <Pressable key={i} onPress={()=>onSelect(date)} style={[s.day,date===selectedDate&&s.selectedDay,!future&&rows.length&&!checks.length&&date!==selectedDate?s.missed:null]}><Text style={[s.dayText,date===selectedDate&&s.selectedDayText]}>{i+1}</Text><View style={s.eventDots}>{checks.slice(0,4).map((c:any)=><View key={c.id} style={[s.eventDot,{backgroundColor:rows.find(r=>r.id===c.reminder_id)?.color_hex??supplementColors[0]}]}/>)}</View></Pressable>})}</View><View style={s.agenda}><Text style={s.agendaDate}>{selectedLabel}</Text>{rows.length?rows.map(row=>{const taken=checkins.some(x=>x.reminder_id===row.id&&x.local_date===selectedDate);const past=selectedDate<key(today);return <Pressable key={row.id} onPress={()=>onToggle(row,selectedDate)} style={s.agendaRow}><View style={[s.agendaBar,{backgroundColor:row.color_hex??supplementColors[0]}]}/><View style={{flex:1}}><Text style={s.agendaName}>{row.supplement_name}</Text><Text style={s.agendaTime}>{timeText(row.reminder_hour,row.reminder_minute)} • {taken?'Taken':past?'Missed':'Scheduled'}</Text></View><View style={[s.agendaCheck,taken&&{backgroundColor:row.color_hex??supplementColors[0],borderColor:row.color_hex??supplementColors[0]}]}><Text style={s.agendaCheckText}>{taken?'✓':''}</Text></View></Pressable>}):<Text style={s.sub}>No supplements scheduled.</Text>}</View></Card>}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 }, header: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 }, back: { color: colors.text, fontSize: 38, width: 28 }, title: { color: colors.text, fontSize: 25, fontWeight: '900' }, sub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, chips: { flexDirection: 'row', flexWrap: 'wrap' },colorRow:{flexDirection:'row',gap:10,marginVertical:10},colorDot:{width:28,height:28,borderRadius:14},colorSelected:{borderWidth:3,borderColor:colors.text}, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: colors.text, fontWeight: '900', fontSize: 16 }, time: { color: colors.muted, fontSize: 11, marginTop: 4 }, actions: { alignItems: 'center', gap: 7 }, delete: { color: colors.danger, fontSize: 10, fontWeight: '900' },calendarCard:{padding:12},calHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},calendarTitle:{color:colors.text,fontSize:17,fontWeight:'900'},calendarSub:{color:colors.muted,fontSize:9,marginTop:2},todayButton:{borderWidth:1,borderColor:colors.border,borderRadius:8,paddingHorizontal:9,paddingVertical:6},todayText:{color:colors.primary,fontWeight:'900',fontSize:9},calArrow:{color:colors.primary,fontSize:30,padding:7},legend:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:8},legendItem:{flexDirection:'row',alignItems:'center',gap:4},legendDot:{width:8,height:8,borderRadius:4},calGrid:{flexDirection:'row',flexWrap:'wrap'},week:{width:'14.285%',textAlign:'center',color:colors.muted,fontSize:9,fontWeight:'900',padding:5},day:{width:'14.285%',height:45,alignItems:'center',justifyContent:'center',borderRadius:22},selectedDay:{backgroundColor:colors.primary},selectedDayText:{color:contrastText(colors.primary)},missed:{borderWidth:1,borderColor:colors.border},dayText:{color:colors.text,fontSize:10,fontWeight:'800'},eventDots:{flexDirection:'row',gap:2,marginTop:3},eventDot:{width:5,height:5,borderRadius:3},agenda:{marginTop:12,borderTopWidth:1,borderTopColor:colors.border,paddingTop:12},agendaDate:{color:colors.text,fontWeight:'900',fontSize:14,marginBottom:8},agendaRow:{minHeight:55,flexDirection:'row',alignItems:'center',gap:10,borderRadius:10,backgroundColor:colors.panel2,marginBottom:7,padding:9},agendaBar:{width:4,alignSelf:'stretch',borderRadius:3},agendaName:{color:colors.text,fontWeight:'900',fontSize:12},agendaTime:{color:colors.muted,fontSize:9,marginTop:3},agendaCheck:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},agendaCheckText:{color:'#fff',fontWeight:'900'},
});
