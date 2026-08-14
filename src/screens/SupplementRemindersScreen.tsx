import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, OutlineButton, SectionTitle, useTheme } from '../components/UI';
import { Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { cancelSupplementReminder, scheduleDailySupplementReminder } from '../lib/notifications';

type Reminder = {
  id: string;
  supplement_name: string;
  reminder_hour: number;
  reminder_minute: number;
  enabled: boolean;
  notification_id?: string | null;
};

const quickAdds = ['Creatine', 'Multivitamin', 'Vitamin D', 'Omega-3', 'Electrolytes'];
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
  const [busy, setBusy] = useState(false);
  const adult = (profile.age ?? 0) >= 18;

  const load = async () => {
    const { data } = await supabase.from('supplement_reminders').select('*').eq('user_id', profile.id).order('reminder_hour').order('reminder_minute');
    const reminders = (data ?? []) as Reminder[];
    setRows(reminders);
    // Re-create enabled local schedules when this screen is opened (useful after reinstall/device changes).
    for (const row of reminders.filter((item) => item.enabled)) {
      try {
        const notificationId = await scheduleDailySupplementReminder({ identifier: row.notification_id, supplementName: row.supplement_name, hour: row.reminder_hour, minute: row.reminder_minute });
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
      const notificationId = await scheduleDailySupplementReminder({ supplementName: supplement, hour: parsed.h, minute: parsed.m });
      const { error } = await supabase.from('supplement_reminders').insert({ user_id: profile.id, supplement_name: supplement, reminder_hour: parsed.h, reminder_minute: parsed.m, enabled: true, notification_id: notificationId });
      if (error) { await cancelSupplementReminder(notificationId); throw error; }
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
        const notificationId = await scheduleDailySupplementReminder({ supplementName: row.supplement_name, hour: row.reminder_hour, minute: row.reminder_minute });
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
      <Button title={busy ? 'ADDING…' : 'ADD DAILY REMINDER'} onPress={() => add()} disabled={busy} />
    </Card>

    <SectionTitle title="Your reminders" subtitle="Switch notifications off without deleting the reminder." />
    {rows.length ? rows.map((row) => <Card key={row.id} style={styles.row}>
      <View style={{ flex: 1 }}><Text style={styles.name}>{row.supplement_name}</Text><Text style={styles.time}>Daily • {timeText(row.reminder_hour, row.reminder_minute)}</Text></View>
      <View style={styles.actions}><OutlineButton compact title={row.enabled ? 'ON' : 'OFF'} onPress={() => toggle(row)} /><Pressable onPress={() => remove(row)}><Text style={styles.delete}>Delete</Text></Pressable></View>
    </Card>) : <Card><Text style={styles.sub}>No supplement reminders yet.</Text></Card>}
  </ScrollView>;
}

const createStyles = (colors: any) => StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 }, header: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 }, back: { color: colors.text, fontSize: 38, width: 28 }, title: { color: colors.text, fontSize: 25, fontWeight: '900' }, sub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, chips: { flexDirection: 'row', flexWrap: 'wrap' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: colors.text, fontWeight: '900', fontSize: 16 }, time: { color: colors.muted, fontSize: 11, marginTop: 4 }, actions: { alignItems: 'center', gap: 7 }, delete: { color: colors.danger, fontSize: 10, fontWeight: '900' },
});
