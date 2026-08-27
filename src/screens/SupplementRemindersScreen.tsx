import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, OutlineButton, RefreshableScrollView, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { cancelSupplementReminder, scheduleDailySupplementReminder, scheduleOneTimeSupplementReminder } from '../lib/notifications';
import { profileAge } from '../lib/profileAge';

type Reminder = { id: string; supplement_name: string; reminder_hour: number; reminder_minute: number; enabled: boolean; notification_id?: string | null; color_hex?: string | null };
type CheckinStatus = 'taken' | 'missed' | 'skipped';

const quickAdds = ['Creatine', 'Multivitamin', 'Vitamin D', 'Omega-3', 'Electrolytes'];
const supplementColors = ['#2ECC71','#3498DB','#9B59B6','#F39C12','#E74C3C','#00A8A8'];
const timeText = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseTime = (value: string) => { const match = value.trim().match(/^(\d{1,2}):(\d{2})$/); if (!match) return null; const hour = Number(match[1]), minute = Number(match[2]); return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? { hour, minute } : null; };

export default function SupplementRemindersScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [rows, setRows] = useState<Reminder[]>([]);
  const [name, setName] = useState('');
  const [time, setTime] = useState('08:00');
  const [selectedColor, setSelectedColor] = useState(supplementColors[0]);
  const [busy, setBusy] = useState(false);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [recordTimes, setRecordTimes] = useState<Record<string, string>>({});
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
    for (const row of reminders.filter((item) => item.enabled)) {
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

  const remove = (row: Reminder) => Alert.alert('Delete reminder?', `${row.supplement_name} and its tracking history will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await cancelSupplementReminder(row.notification_id); await supabase.from('supplement_reminders').delete().eq('id', row.id).eq('user_id', profile.id); await load(); } },
  ]);

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
  const recorded = checkins.filter((item) => item.status === 'taken').length;
  const decided = checkins.filter((item) => ['taken','missed','skipped'].includes(item.status)).length;
  const adherence = decided ? Math.round((recorded / decided) * 100) : 0;

  return <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable><View><Text style={styles.title}>Supplement tracker</Text><Text style={styles.sub}>Calendar reminders and editable past-day records.</Text></View></View>

    {!adult ? <Card><SectionTitle title="For younger users" subtitle="FitHub does not recommend supplements or doses. Only track something already managed with a parent/guardian or qualified clinician." /></Card> : null}
    {adult ? <Card><SectionTitle title="Quick add" subtitle="Labels only — FitHub does not recommend a dose or tell you to take these." /><View style={styles.chips}>{quickAdds.map((item) => <Chip key={item} label={item} onPress={() => setName(item)} active={name === item} />)}</View></Card> : null}

    <Card><SectionTitle title="New reminder" subtitle="Choose the item, local notification time and calendar colour." /><Input value={name} onChangeText={setName} placeholder="Supplement name" /><Input value={time} onChangeText={setTime} placeholder="08:00" autoCapitalize="none" /><Text style={styles.time}>Calendar colour</Text><View style={styles.colorRow}>{supplementColors.map((color) => <Pressable key={color} onPress={() => setSelectedColor(color)} style={[styles.colorDot, { backgroundColor: color }, selectedColor === color && styles.colorSelected]} />)}</View><Button title={busy ? 'ADDING…' : 'ADD DAILY REMINDER'} onPress={() => add()} disabled={busy} /></Card>

    <SupplementCalendar month={month} rows={rows} checkins={checkins} selectedDate={selectedDate} onMonth={setMonth} onPick={setSelectedDate} />

    <Card style={styles.agendaCard}>
      <View style={styles.agendaHead}><View><Text style={styles.agendaDate}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text><Text style={styles.sub}>Set Taken, Missed or Skipped. You can revise or clear it later.</Text></View><View style={styles.adherence}><Text style={styles.adherenceValue}>{adherence}%</Text><Text style={styles.adherenceLabel}>recorded adherence</Text></View></View>
      {rows.length ? rows.map((row) => {
        const check = selectedChecks.find((item) => item.reminder_id === row.id);
        return <View key={row.id} style={styles.agendaRow}><View style={[styles.eventBar, { backgroundColor: row.color_hex ?? supplementColors[0] }]} /><View style={{ flex: 1 }}><Text style={styles.name}>{row.supplement_name}</Text><Text style={styles.time}>Scheduled {timeText(row.reminder_hour, row.reminder_minute)}</Text><View style={styles.statusRow}>{(['taken','missed','skipped'] as CheckinStatus[]).map((status) => <Pressable key={status} onPress={() => setStatus(row, status)} style={[styles.statusChip, check?.status === status && styles.statusActive, check?.status === status && status === 'missed' && styles.statusMissed, check?.status === status && status === 'skipped' && styles.statusSkipped]}><Text style={[styles.statusText, check?.status === status && styles.statusTextActive]}>{status.toUpperCase()}</Text></Pressable>)}</View><View style={styles.timeEdit}><Input value={recordTimes[row.id] ?? timeText(row.reminder_hour, row.reminder_minute)} onChangeText={(value) => setRecordTimes((previous) => ({ ...previous, [row.id]: value }))} placeholder="08:00" style={styles.recordTime} />{check ? <Pressable onPress={() => clearStatus(row)}><Text style={styles.clear}>CLEAR</Text></Pressable> : null}</View></View></View>;
      }) : <Text style={styles.sub}>Add a reminder before recording calendar statuses.</Text>}
    </Card>

    <SectionTitle title="Your reminders" subtitle="Switch notifications off without deleting tracking history." />
    {rows.length ? rows.map((row) => {
      const todayCheck = checkins.find((item) => item.reminder_id === row.id && item.local_date === localDate());
      return <Card key={row.id} style={styles.reminderRow}><View style={[styles.eventBar, { backgroundColor: row.color_hex ?? supplementColors[0] }]} /><View style={{ flex: 1 }}><Text style={styles.name}>{row.supplement_name}</Text><Text style={styles.time}>Daily • {timeText(row.reminder_hour, row.reminder_minute)}{todayCheck ? ` • ${String(todayCheck.status).toUpperCase()}` : ''}</Text></View><View style={styles.actions}><OutlineButton compact title="LATER" onPress={() => reschedule(row)} /><OutlineButton compact title={row.enabled ? 'ON' : 'OFF'} onPress={() => toggle(row)} /><Pressable onPress={() => remove(row)}><Text style={styles.delete}>Delete</Text></Pressable></View></Card>;
    }) : <Card><Text style={styles.sub}>No supplement reminders yet.</Text></Card>}
  </RefreshableScrollView>;
}

function SupplementCalendar({ month, rows, checkins, selectedDate, onMonth, onPick }: { month: Date; rows: Reminder[]; checkins: any[]; selectedDate: string; onMonth: (d: Date) => void; onPick: (key: string) => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const year = month.getFullYear(), monthIndex = month.getMonth(), first = new Date(year, monthIndex, 1).getDay(), days = new Date(year, monthIndex + 1, 0).getDate(), today = localDate();
  return <Card><View style={styles.calHead}><Pressable onPress={() => onMonth(new Date(year, monthIndex - 1, 1))}><Text style={styles.calArrow}>‹</Text></Pressable><View><Text style={styles.calTitle}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text><Text style={styles.calSub}>Tap a past day to add or edit records</Text></View><Pressable onPress={() => onMonth(new Date(year, monthIndex + 1, 1))} disabled={localDate(new Date(year, monthIndex + 1, 1)) > today}><Text style={styles.calArrow}>›</Text></Pressable></View><View style={styles.legend}>{rows.map((row) => <View key={row.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: row.color_hex ?? supplementColors[0] }]} /><Text style={styles.time}>{row.supplement_name}</Text></View>)}</View><View style={styles.calGrid}>{['S','M','T','W','T','F','S'].map((label, index) => <Text key={index} style={styles.week}>{label}</Text>)}{Array.from({ length: first }).map((_, index) => <View key={`blank-${index}`} style={styles.day} />)}{Array.from({ length: days }).map((_, index) => { const date = new Date(year, monthIndex, index + 1), key = localDate(date), dayChecks = checkins.filter((item) => item.local_date === key), future = key > today; return <Pressable key={key} disabled={future} onPress={() => onPick(key)} style={[styles.day, selectedDate === key && styles.selectedDay, future && styles.futureDay]}><Text style={styles.dayText}>{index + 1}</Text><View style={styles.dayDots}>{dayChecks.slice(0, 4).map((check: any) => <View key={check.id} style={[styles.checkDot, { backgroundColor: check.status === 'missed' ? colors.danger : check.status === 'skipped' ? colors.muted : rows.find((row) => row.id === check.reminder_id)?.color_hex ?? supplementColors[0] }]} />)}</View></Pressable>; })}</View></Card>;
}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 }, header: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 }, back: { color: colors.text, fontSize: 38, width: 28 }, title: { color: colors.text, fontSize: 25, fontWeight: '900' }, sub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, chips: { flexDirection: 'row', flexWrap: 'wrap' }, colorRow: { flexDirection: 'row', gap: 10, marginVertical: 10 }, colorDot: { width: 28, height: 28, borderRadius: 14 }, colorSelected: { borderWidth: 3, borderColor: colors.text },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, eventBar: { width: 5, alignSelf: 'stretch', minHeight: 52, borderRadius: 999 }, name: { color: colors.text, fontWeight: '900', fontSize: 15 }, time: { color: colors.muted, fontSize: 10, marginTop: 3 }, actions: { alignItems: 'center', gap: 6 }, delete: { color: colors.danger, fontSize: 10, fontWeight: '900' },
  agendaCard: { borderColor: colors.primary }, agendaHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }, agendaDate: { color: colors.text, fontSize: 18, fontWeight: '900' }, adherence: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 12, padding: 8 }, adherenceValue: { color: colors.primary, fontSize: 17, fontWeight: '900' }, adherenceLabel: { color: colors.muted, fontSize: 7 }, agendaRow: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }, statusRow: { flexDirection: 'row', gap: 6, marginTop: 9 }, statusChip: { flex: 1, minHeight: 32, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2 }, statusActive: { backgroundColor: colors.greenSoft, borderColor: colors.green }, statusMissed: { backgroundColor: `${colors.danger}20`, borderColor: colors.danger }, statusSkipped: { backgroundColor: colors.panel2, borderColor: colors.muted }, statusText: { color: colors.muted, fontSize: 8, fontWeight: '900' }, statusTextActive: { color: colors.text }, timeEdit: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }, recordTime: { width: 94, minHeight: 38, marginBottom: 0 }, clear: { color: colors.danger, fontSize: 9, fontWeight: '900' },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, calArrow: { color: colors.primary, fontSize: 30, padding: 8 }, calTitle: { color: colors.text, fontWeight: '900', textAlign: 'center' }, calSub: { color: colors.muted, fontSize: 8, marginTop: 2 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 9 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 }, legendDot: { width: 8, height: 8, borderRadius: 4 }, calGrid: { flexDirection: 'row', flexWrap: 'wrap' }, week: { width: '14.285%', textAlign: 'center', color: colors.muted, fontSize: 9, fontWeight: '900', padding: 5 }, day: { width: '14.285%', height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 9 }, selectedDay: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft }, futureDay: { opacity: .3 }, dayText: { color: colors.text, fontSize: 10, fontWeight: '800' }, dayDots: { height: 9, flexDirection: 'row', gap: 2 }, checkDot: { width: 6, height: 6, borderRadius: 3 },
});
