import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, OutlineButton, RefreshableScrollView, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { cancelSupplementReminder, scheduleDailySupplementReminder, scheduleOneTimeSupplementReminder } from '../lib/notifications';
import { profileAge } from '../lib/profileAge';
import { CalendarCheckIcon, ReminderClockIcon } from '../components/FitHubTrackerIcons';
import { FreshChevronIcon, FreshPlusIcon } from '../components/FitHubFreshIcons';
import { YouCardArtwork } from '../components/YouCardArtwork';

type Reminder = { id: string; supplement_name: string; reminder_hour: number; reminder_minute: number; enabled: boolean; notification_id?: string | null; color_hex?: string | null; archived_at?: string | null };
type CheckinStatus = 'taken' | 'missed' | 'skipped';

const quickAdds = ['Creatine', 'Multivitamin', 'Vitamin D', 'Omega-3', 'Electrolytes'];
const supplementColors = ['#2ECC71','#3498DB','#9B59B6','#F39C12','#E74C3C','#00A8A8'];
const timeText = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseTime = (value: string) => { const match = value.trim().match(/^(\d{1,2}):(\d{2})$/); if (!match) return null; const hour = Number(match[1]), minute = Number(match[2]); return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? { hour, minute } : null; };

export default function SupplementRemindersScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [rows, setRows] = useState<Reminder[]>([]);
  const [name, setName] = useState('');
  const [time, setTime] = useState('08:00');
  const [selectedColor, setSelectedColor] = useState(supplementColors[0]);
  const [busy, setBusy] = useState(false);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [recordTimes, setRecordTimes] = useState<Record<string, string>>({});
  const [showAddForm,setShowAddForm]=useState(false);
  const [editingId,setEditingId]=useState<string | null>(null);
  const [editingTime,setEditingTime]=useState('');
  const adult = (profileAge(profile) ?? 0) >= 18;

  const load = async () => {
    const [{ data, error }, { data: checks, error: checkError }] = await Promise.all([
      supabase.from('supplement_reminders').select('*').eq('user_id', profile.id).order('reminder_hour').order('reminder_minute'),
      supabase.from('supplement_checkins').select('*').eq('user_id', profile.id).order('local_date', { ascending: false }).limit(800),
    ]);
    if (error || checkError) return Alert.alert('Supplement tracker', error?.message ?? checkError?.message ?? 'Could not refresh.');
    const reminders = (data ?? []) as Reminder[];
    setRows(reminders);
    setCheckins(checks ?? []);
    const times: Record<string, string> = {};
    reminders.forEach((row) => {
      const check = (checks ?? []).find((item: any) => item.reminder_id === row.id && item.local_date === selectedDate);
      times[row.id] = String(check?.recorded_time ?? timeText(row.reminder_hour, row.reminder_minute)).slice(0, 5);
    });
    setRecordTimes(times);
    for (const row of reminders.filter((item) => item.enabled && !item.archived_at)) {
      try {
        const notificationId = await scheduleDailySupplementReminder({ identifier: row.notification_id, supplementName: row.supplement_name, hour: row.reminder_hour, minute: row.reminder_minute, userId: profile.id, reminderId: row.id });
        if (notificationId && notificationId !== row.notification_id) await supabase.from('supplement_reminders').update({ notification_id: notificationId, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', profile.id);
      } catch {}
    }
  };
  useEffect(() => { load(); }, [profile.id]);
  useEffect(() => {
    const next: Record<string, string> = {};
    rows.forEach((row) => { const check = checkins.find((item) => item.reminder_id === row.id && item.local_date === selectedDate); next[row.id] = String(check?.recorded_time ?? timeText(row.reminder_hour, row.reminder_minute)).slice(0, 5); });
    setRecordTimes(next);
  }, [selectedDate, rows.length, checkins]);

  const add = async (quick?: string) => {
    const supplement = (quick ?? name).trim();
    const parsed = parseTime(time);
    if (!supplement || !parsed) return Alert.alert('Check reminder', 'Enter a supplement name and a time like 08:00.');
    setBusy(true);
    try {
      const { data: created, error } = await supabase.from('supplement_reminders').insert({ user_id: profile.id, supplement_name: supplement, reminder_hour: parsed.hour, reminder_minute: parsed.minute, enabled: true, color_hex: selectedColor }).select('id').single();
      if (error) throw error;
      const notificationId = await scheduleDailySupplementReminder({ supplementName: supplement, hour: parsed.hour, minute: parsed.minute, userId: profile.id, reminderId: created.id });
      await supabase.from('supplement_reminders').update({ notification_id: notificationId }).eq('id', created.id).eq('user_id', profile.id);
      setName('');
      await load();
    } catch (error: any) { Alert.alert('Reminder', error?.message ?? 'Could not create reminder.'); }
    finally { setBusy(false); }
  };

  const toggle = async (row: Reminder) => {
    try {
      if (row.enabled) {
        await cancelSupplementReminder(row.notification_id);
        const { error } = await supabase.from('supplement_reminders').update({ enabled: false, notification_id: null, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', profile.id);
        if (error) throw error;
      } else {
        const notificationId = await scheduleDailySupplementReminder({ supplementName: row.supplement_name, hour: row.reminder_hour, minute: row.reminder_minute, userId: profile.id, reminderId: row.id });
        const { error } = await supabase.from('supplement_reminders').update({ enabled: true, notification_id: notificationId, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', profile.id);
        if (error) throw error;
      }
      await load();
    } catch (error: any) { Alert.alert('Reminder', error?.message ?? 'Could not update reminder.'); }
  };

  const remove = (row: Reminder) => Alert.alert('Remove this reminder?', `${row.supplement_name} will leave your schedule, but its previous calendar history will stay available.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { await cancelSupplementReminder(row.notification_id); await supabase.from('supplement_reminders').update({ enabled: false, notification_id: null, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', profile.id); await load(); } },
  ]);

  const saveReminderTime = async (row: Reminder) => {
    const parsed = parseTime(editingTime);
    if (!parsed) return Alert.alert('Check the time', 'Use a 24-hour time such as 07:30 or 18:00.');
    try {
      await cancelSupplementReminder(row.notification_id);
      const notificationId = row.enabled ? await scheduleDailySupplementReminder({ supplementName: row.supplement_name, hour: parsed.hour, minute: parsed.minute, userId: profile.id, reminderId: row.id }) : null;
      const { error } = await supabase.from('supplement_reminders').update({ reminder_hour: parsed.hour, reminder_minute: parsed.minute, notification_id: notificationId, updated_at: new Date().toISOString() }).eq('id', row.id).eq('user_id', profile.id);
      if (error) throw error;
      setEditingId(null);
      await load();
    } catch (error: any) { Alert.alert('Reminder time', error?.message ?? 'Could not update this reminder.'); }
  };

  const setStatus = async (row: Reminder, status: CheckinStatus) => {
    if (selectedDate > localDate()) return Alert.alert('Future date', 'A future supplement status cannot be recorded.');
    const parsed = parseTime(recordTimes[row.id] || timeText(row.reminder_hour, row.reminder_minute));
    if (status === 'taken' && !parsed) return Alert.alert('Check time', 'Use a time like 08:00, or restore the reminder time.');
    const stamp = status === 'taken' && parsed ? new Date(`${selectedDate}T${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}:00`) : new Date(`${selectedDate}T12:00:00`);
    const { error } = await supabase.from('supplement_checkins').upsert({ user_id: profile.id, reminder_id: row.id, local_date: selectedDate, taken_at: stamp.toISOString(), status, recorded_time: status === 'taken' && parsed ? `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}:00` : null, source: 'manual', updated_at: new Date().toISOString() }, { onConflict: 'user_id,reminder_id,local_date' });
    if (error) return Alert.alert('Supplement tracker', error.message);
    await load();
  };

  const clearStatus = async (row: Reminder) => {
    await supabase.from('supplement_checkins').delete().eq('user_id', profile.id).eq('reminder_id', row.id).eq('local_date', selectedDate);
    await load();
  };

  const reschedule = (row: Reminder) => Alert.alert('Remind me later today', row.supplement_name, [30,60,120].map((minutes) => ({ text: minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes > 60 ? 's' : ''}`, onPress: async () => { const date = new Date(Date.now() + minutes * 60000); await scheduleOneTimeSupplementReminder({ supplementName: row.supplement_name, userId: profile.id, reminderId: row.id, date }); await supabase.from('supplement_reschedules').insert({ user_id: profile.id, reminder_id: row.id, scheduled_for: date.toISOString() }); } })).concat([{ text: 'Cancel', style: 'cancel' }] as any));

  const selectedChecks = useMemo(() => checkins.filter((item) => item.local_date === selectedDate), [checkins, selectedDate]);
  const activeRows = useMemo(() => rows.filter((row) => !row.archived_at), [rows]);
  const scheduledRows = useMemo(() => activeRows.filter((row) => row.enabled), [activeRows]);
  const selectedRows = useMemo(() => rows.filter((row) => !row.archived_at || selectedChecks.some((check) => check.reminder_id === row.id)), [rows, selectedChecks]);
  const recorded = checkins.filter((item) => item.status === 'taken').length;
  const decided = checkins.filter((item) => ['taken','missed','skipped'].includes(item.status)).length;
  const adherence = decided ? Math.round((recorded / decided) * 100) : 0;
  const todayChecks = checkins.filter((item)=>scheduledRows.some((row)=>row.id===item.reminder_id)&&item.local_date===localDate()&&['taken','missed','skipped'].includes(item.status));
  const sortedSchedule = [...scheduledRows].sort((a,b)=>(a.reminder_hour*60+a.reminder_minute)-(b.reminder_hour*60+b.reminder_minute));
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextReminder = sortedSchedule.find((row) => row.reminder_hour * 60 + row.reminder_minute >= nowMinutes) ?? sortedSchedule[0];
  const nextReminderIsTomorrow = Boolean(nextReminder && nextReminder.reminder_hour * 60 + nextReminder.reminder_minute < nowMinutes);

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.backTarget} accessibilityRole="button"><FreshChevronIcon size={27} color={colors.text} direction="left"/></Pressable><View style={{flex:1}}><Text style={styles.title}>Supplement tracker</Text><Text style={styles.sub}>Reminders, calendar and editable records.</Text></View><Pressable onPress={()=>setShowAddForm(!showAddForm)} style={styles.headerAdd} accessibilityRole="button"><FreshPlusIcon size={22} color="#FFFFFF"/></Pressable></View>

    <Card style={styles.heroCard}><View style={styles.heroArt}><YouCardArtwork kind="supplements" width={148} height={108}/></View><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>TODAY'S ROUTINE</Text><Text style={styles.heroTitle}>{todayChecks.length} of {scheduledRows.length} recorded</Text><Text style={styles.heroSub}>{nextReminder?`${nextReminderIsTomorrow?'Tomorrow':'Next reminder'} · ${nextReminder.supplement_name} at ${timeText(nextReminder.reminder_hour,nextReminder.reminder_minute)}`:activeRows.length?'Daily reminders are paused. Turn one on below.':'Add a reminder to start your calendar.'}</Text><View style={styles.heroTrack}><View style={[styles.heroFill,{width:`${scheduledRows.length?Math.min(100,todayChecks.length/scheduledRows.length*100):0}%`}]}/></View></View></Card>

    {!adult?<View style={styles.guardianCard}><Text style={styles.guardianTitle}>TRACK WITH SUPPORT</Text><Text style={styles.guardianText}>FitHub does not recommend supplements or doses. Only track something already managed with a parent, guardian or qualified clinician.</Text></View>:null}

    {showAddForm?<Card style={styles.addCard}><View style={styles.addHeading}><View style={styles.addIcon}><ReminderClockIcon size={31} color={colors.text} accentColor={colors.primary}/></View><View style={{flex:1}}><Text style={styles.sectionTitle}>New reminder</Text><Text style={styles.sectionSub}>Choose a label, local time and calendar colour.</Text></View></View>{adult?<><Text style={styles.formLabel}>QUICK LABELS</Text><View style={styles.chips}>{quickAdds.map((item)=><Chip key={item} label={item} onPress={()=>setName(item)} active={name===item}/>)}</View><Text style={styles.noDose}>Labels only — FitHub does not recommend a dose or tell you what to take.</Text></>:null}<Input value={name} onChangeText={setName} placeholder="Reminder label"/><Input value={time} onChangeText={setTime} placeholder="08:00" autoCapitalize="none"/><Text style={styles.formLabel}>CALENDAR COLOUR</Text><View style={styles.colorRow}>{supplementColors.map((color)=><Pressable key={color} onPress={()=>setSelectedColor(color)} style={[styles.colorDot,{backgroundColor:color},selectedColor===color&&styles.colorSelected]} accessibilityRole="button"/>)}</View><Button title={busy?'ADDING…':'ADD DAILY REMINDER'} onPress={()=>add()} disabled={busy}/></Card>:null}

    <View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>HISTORY</Text><Text style={styles.sectionTitle}>Calendar</Text><Text style={styles.sectionSub}>Pick today or a past date to review a record.</Text></View><CalendarCheckIcon size={34} color={colors.text} accentColor={colors.primary}/></View>

    <SupplementCalendar month={month} rows={rows} checkins={checkins} selectedDate={selectedDate} onMonth={setMonth} onPick={setSelectedDate} />

    <View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>SELECTED DAY</Text><Text style={styles.sectionTitle}>Daily check-in</Text><Text style={styles.sectionSub}>Record, revise or clear each status.</Text></View><ReminderClockIcon size={34} color={colors.text} accentColor={colors.primary}/></View>
    <Card style={styles.agendaCard}>
      <View style={styles.agendaHead}><View style={{ flex: 1 }}><Text style={styles.agendaDate}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text><Text style={styles.sub}>Choose one status. You can change or clear it later.</Text></View></View>
      <View style={styles.adherence}><View><Text style={styles.adherenceLabel}>RECORDED HISTORY</Text><Text style={styles.adherenceCopy}>Taken statuses across decided check-ins</Text></View><Text style={styles.adherenceValue}>{adherence}%</Text></View>
      {selectedRows.length ? selectedRows.map((row) => {
        const check = selectedChecks.find((item) => item.reminder_id === row.id);
        const archived = Boolean(row.archived_at);
        return <View key={row.id} style={[styles.agendaRow, archived && { opacity: .62 }]}><View style={[styles.eventBar, { backgroundColor: row.color_hex ?? supplementColors[0] }]} /><View style={{ flex: 1 }}><View style={styles.nameLine}><Text style={styles.name}>{row.supplement_name}</Text>{archived ? <Text style={styles.archivedPill}>HISTORY</Text> : null}</View><Text style={styles.time}>Scheduled {timeText(row.reminder_hour, row.reminder_minute)}</Text><View style={styles.statusRow}>{(['taken','missed','skipped'] as CheckinStatus[]).map((status) => <Pressable disabled={archived} key={status} onPress={() => setStatus(row, status)} style={[styles.statusChip, check?.status === status && styles.statusActive, check?.status === status && status === 'missed' && styles.statusMissed, check?.status === status && status === 'skipped' && styles.statusSkipped]}><Text style={[styles.statusText, check?.status === status && styles.statusTextActive]}>{status === 'taken' ? '✓  TAKEN' : status === 'missed' ? '!  MISSED' : '–  SKIPPED'}</Text></Pressable>)}</View>{check?.status === 'taken' && !archived ? <View style={styles.timeEdit}><View><Text style={styles.editLabel}>RECORDED TIME</Text><Input value={recordTimes[row.id] ?? timeText(row.reminder_hour, row.reminder_minute)} onChangeText={(value) => setRecordTimes((previous) => ({ ...previous, [row.id]: value }))} placeholder="08:00" style={styles.recordTime}/></View><Text style={styles.timeHelp}>Edit the time, then tap Taken again to save it.</Text></View> : null}{check && !archived ? <Pressable onPress={() => clearStatus(row)} style={styles.clearButton}><Text style={styles.clear}>CLEAR THIS STATUS</Text></Pressable> : null}</View></View>;
      }) : <Text style={styles.sub}>Add a reminder before recording calendar statuses.</Text>}
    </Card>

    <View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>REMINDERS</Text><Text style={styles.sectionTitle}>Your schedule</Text><Text style={styles.sectionSub}>Pause a notification without deleting its history.</Text></View></View>
    {activeRows.length ? activeRows.map((row) => {
      const todayCheck = checkins.find((item) => item.reminder_id === row.id && item.local_date === localDate());
      const editing = editingId === row.id;
      return <Card key={row.id} style={styles.reminderCard}><View style={styles.reminderTop}><View style={[styles.reminderArtwork,{ borderColor: row.color_hex ?? supplementColors[0] }]}><YouCardArtwork kind="supplements" width={78} height={58}/></View><View style={{ flex: 1 }}><Text style={styles.name}>{row.supplement_name}</Text><Text style={styles.time}>Every day · {timeText(row.reminder_hour, row.reminder_minute)}</Text>{todayCheck ? <Text style={styles.todayStatus}>TODAY · {String(todayCheck.status).toUpperCase()}</Text> : <Text style={styles.todayPending}>TODAY · NOT RECORDED</Text>}</View><Pressable onPress={() => toggle(row)} style={[styles.switch, row.enabled && styles.switchOn]} accessibilityRole="switch" accessibilityState={{ checked: row.enabled }}><View style={[styles.switchKnob, row.enabled && styles.switchKnobOn]}/></Pressable></View>{editing ? <View style={styles.editReminder}><Text style={styles.editLabel}>NEW DAILY TIME</Text><View style={styles.editReminderRow}><Input value={editingTime} onChangeText={setEditingTime} placeholder="07:30" style={styles.editReminderInput}/><View style={{ flex: 1 }}><Button title="SAVE TIME" onPress={() => saveReminderTime(row)}/></View></View></View> : null}<View style={styles.reminderActions}><Pressable onPress={() => reschedule(row)} style={styles.actionButton}><Text style={styles.actionText}>Later today</Text></Pressable><Pressable onPress={() => { setEditingId(editing ? null : row.id); setEditingTime(timeText(row.reminder_hour,row.reminder_minute)); }} style={styles.actionButton}><Text style={styles.actionText}>{editing ? 'Cancel edit' : 'Edit time'}</Text></Pressable><Pressable onPress={() => remove(row)} style={styles.removeButton}><Text style={styles.removeText}>Remove</Text></Pressable></View></Card>;
    }) : <Card><Text style={styles.sub}>No supplement reminders yet.</Text></Card>}
  </RefreshableScrollView>;
}

function SupplementCalendar({ month, rows, checkins, selectedDate, onMonth, onPick }: { month: Date; rows: Reminder[]; checkins: any[]; selectedDate: string; onMonth: (d: Date) => void; onPick: (key: string) => void }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const year = month.getFullYear(), monthIndex = month.getMonth(), first = new Date(year, monthIndex, 1).getDay(), days = new Date(year, monthIndex + 1, 0).getDate(), today = localDate();
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const legendRows = rows.filter((row) => !row.archived_at || checkins.some((check) => check.reminder_id === row.id && String(check.local_date).startsWith(monthPrefix)));
  return <Card><View style={styles.calHead}><Pressable onPress={() => onMonth(new Date(year, monthIndex - 1, 1))}><Text style={styles.calArrow}>‹</Text></Pressable><View><Text style={styles.calTitle}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text><Text style={styles.calSub}>Tap a past day to add or edit records</Text></View><Pressable onPress={() => onMonth(new Date(year, monthIndex + 1, 1))} disabled={localDate(new Date(year, monthIndex + 1, 1)) > today}><Text style={styles.calArrow}>›</Text></Pressable></View><View style={styles.legend}>{legendRows.map((row) => <View key={row.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: row.color_hex ?? supplementColors[0] }]} /><Text style={styles.time}>{row.supplement_name}</Text></View>)}</View><View style={styles.calGrid}>{['S','M','T','W','T','F','S'].map((label, index) => <Text key={index} style={styles.week}>{label}</Text>)}{Array.from({ length: first }).map((_, index) => <View key={`blank-${index}`} style={styles.day} />)}{Array.from({ length: days }).map((_, index) => { const date = new Date(year, monthIndex, index + 1), key = localDate(date), dayChecks = checkins.filter((item) => item.local_date === key), future = key > today; return <Pressable key={key} disabled={future} onPress={() => onPick(key)} style={[styles.day, selectedDate === key && styles.selectedDay, future && styles.futureDay]}><Text style={styles.dayText}>{index + 1}</Text><View style={styles.dayDots}>{dayChecks.slice(0, 4).map((check: any) => <View key={check.id} style={[styles.checkDot, { backgroundColor: check.status === 'missed' ? colors.danger : check.status === 'skipped' ? colors.muted : rows.find((row) => row.id === check.reminder_id)?.color_hex ?? supplementColors[0] }]} />)}</View></Pressable>; })}</View></Card>;
}

const createStyles = (colors: any, isDark = false) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 108 },
  header: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  backTarget: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  back: { color: colors.text, fontSize: 38, width: 28 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -.5 },
  sub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  headerAdd: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: isDark ? .15 : .28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderColor: colors.primary, backgroundColor: isDark ? colors.panel : colors.panel2 },
  heroArt: { width: 116, height: 116, borderRadius: 30, backgroundColor: '#0B1013', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroCopy: { flex: 1 },
  heroEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 5, lineHeight: 27 },
  heroSub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  heroTrack: { height: 7, borderRadius: 999, backgroundColor: colors.border, marginTop: 12, overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  guardianCard: { borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
  guardianTitle: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  guardianText: { color: colors.text, fontSize: 11, lineHeight: 17, marginTop: 5, fontWeight: '700' },
  addCard: { borderColor: colors.primary, marginBottom: 16 },
  addHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  addIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, marginBottom: 9, paddingHorizontal: 2 },
  sectionEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: '900', marginTop: 2 },
  sectionSub: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  formLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 5, marginBottom: 6 },
  noDose: { color: colors.muted, fontSize: 9, lineHeight: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' }, colorRow: { flexDirection: 'row', gap: 10, marginVertical: 10 }, colorDot: { width: 32, height: 32, borderRadius: 16 }, colorSelected: { borderWidth: 3, borderColor: colors.text },
  eventBar: { width: 5, alignSelf: 'stretch', minHeight: 58, borderRadius: 999 },
  name: { color: colors.text, fontWeight: '900', fontSize: 15 },
  nameLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  archivedPill: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: .8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.panel2, overflow: 'hidden' },
  time: { color: colors.muted, fontSize: 10, marginTop: 3 },
  agendaCard: { borderColor: colors.primary },
  agendaHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  agendaDate: { color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  adherence: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.primarySoft, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 2 },
  adherenceValue: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  adherenceLabel: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .9 },
  adherenceCopy: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  agendaRow: { flexDirection: 'row', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  statusRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  statusChip: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, paddingHorizontal: 2 },
  statusActive: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  statusMissed: { backgroundColor: `${colors.danger}20`, borderColor: colors.danger },
  statusSkipped: { backgroundColor: colors.panel2, borderColor: colors.muted },
  statusText: { color: colors.muted, fontSize: 7.5, fontWeight: '900' },
  statusTextActive: { color: colors.text },
  timeEdit: { marginTop: 10, padding: 10, borderRadius: 13, backgroundColor: colors.panel2 },
  editLabel: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .9, marginBottom: 6 },
  recordTime: { width: 112, minHeight: 42, marginBottom: 0 },
  timeHelp: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 6 },
  clearButton: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 3, marginTop: 3 },
  clear: { color: colors.danger, fontSize: 9, fontWeight: '900' },
  reminderCard: { marginBottom: 11, padding: 14 },
  reminderTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  reminderArtwork: { width: 82, height: 68, borderRadius: 18, borderWidth: 1.5, backgroundColor: '#0B1013', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  todayStatus: { color: colors.green, fontSize: 8, fontWeight: '900', letterSpacing: .7, marginTop: 7 },
  todayPending: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: .6, marginTop: 7 },
  switch: { width: 50, height: 30, borderRadius: 999, padding: 3, backgroundColor: colors.border, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.primary },
  switchKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  switchKnobOn: { marginLeft: 20 },
  editReminder: { marginTop: 12, padding: 11, borderRadius: 15, backgroundColor: colors.panel2 },
  editReminderRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  editReminderInput: { width: 105, minHeight: 44, marginBottom: 0 },
  reminderActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { minHeight: 42, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  actionText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  removeButton: { minHeight: 42, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.danger}12` },
  removeText: { color: colors.danger, fontSize: 9, fontWeight: '900' },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calArrow: { color: colors.primary, fontSize: 30, padding: 8 }, calTitle: { color: colors.text, fontWeight: '900', textAlign: 'center' }, calSub: { color: colors.muted, fontSize: 8, marginTop: 2 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 9 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 }, legendDot: { width: 8, height: 8, borderRadius: 4 }, calGrid: { flexDirection: 'row', flexWrap: 'wrap' }, week: { width: '14.285%', textAlign: 'center', color: colors.muted, fontSize: 9, fontWeight: '900', padding: 5 }, day: { width: '14.285%', height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 9 }, selectedDay: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft }, futureDay: { opacity: .3 }, dayText: { color: colors.text, fontSize: 10, fontWeight: '800' }, dayDots: { height: 9, flexDirection: 'row', gap: 2 }, checkDot: { width: 6, height: 6, borderRadius: 3 },
});
