import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Chip, Input, SectionTitle, colors } from '../../components/UI';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export default function ProfileTab({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const [days, setDays] = useState(String(profile.workout_days_target));
  const [busy, setBusy] = useState(false);

  const uploadAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: .8 });
    if (result.canceled) return;
    setBusy(true);
    try {
      const asset = result.assets[0];
      const bytes = await (await fetch(asset.uri)).arrayBuffer();
      const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, bytes, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id); if (error) throw error;
      onProfileChanged();
    } catch (e: any) { Alert.alert('Profile photo', e?.message ?? 'Upload failed.'); }
    finally { setBusy(false); }
  };

  const saveDays = async () => {
    const n = Number(days); if (!n || n < 1 || n > 7) return Alert.alert('Workout days', 'Choose between 1 and 7 days per week.');
    const { error } = await supabase.from('profiles').update({ workout_days_target: n }).eq('id', profile.id);
    if (error) Alert.alert('Could not save', error.message); else onProfileChanged();
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Your profile</Text>
      <Card>
        <View style={styles.profileRow}>
          {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> : <View style={[styles.avatar,styles.fallback]}><Text style={styles.initial}>{profile.username.slice(0,1).toUpperCase()}</Text></View>}
          <View style={{ flex: 1 }}><Text style={styles.name}>@{profile.username}</Text><Text style={styles.meta}>{profile.email}</Text><Text style={styles.meta}>✦ {profile.tokens} tokens</Text></View>
        </View>
        <Button title={busy ? 'Uploading…' : 'Change profile picture'} onPress={uploadAvatar} disabled={busy} secondary />
      </Card>

      <Card>
        <SectionTitle title="Training plan" subtitle="Change how many days you want to train each week." />
        <Input value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="1-7" />
        <Button title="Save weekly target" onPress={saveDays} />
      </Card>

      <Card>
        <SectionTitle title="Your setup" />
        <Info label="Experience" value={profile.fitness_level?.replace('_',' ') ?? '—'} />
        <Info label="Goal" value={profile.goal?.replaceAll('_',' ') ?? '—'} />
        <Info label="Height" value={profile.height_cm ? `${Math.round(profile.height_cm)} cm` : '—'} />
        <Info label="Weight" value={profile.weight_kg ? `${profile.weight_kg.toFixed(1)} kg` : '—'} />
        <Info label="Adult maintenance estimate" value={(profile.age ?? 0) >= 18 ? `${profile.maintenance_calories ?? '—'} kcal/day` : 'Not generated under age 18'} />
        <Info label="Adult protein target" value={(profile.age ?? 0) >= 18 ? `${profile.protein_target_g ?? '—'} g/day` : 'Not generated under age 18'} />
      </Card>

      <Card>
        <SectionTitle title="Evidence & safety" subtitle="FitHub uses estimates and training guidance, not medical diagnosis." />
        <Source title="CDC — Adult BMI calculator and BMI as a screening measure" url="https://www.cdc.gov/bmi/adult-calculator/index.html" />
        <Source title="NIDDK — Body Weight Planner (adult use)" url="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner" />
        <Source title="Mifflin–St Jeor resting energy equation — PubMed" url="https://pubmed.ncbi.nlm.nih.gov/2305711/" />
        <Source title="ACSM 2026 resistance-training position stand" url="https://acsm.org/resistance-training-guidelines-update-2026/" />
        <Source title="ACSM progression position stand — PubMed" url="https://pubmed.ncbi.nlm.nih.gov/19204579/" />
        <Source title="Protein + resistance training meta-analysis — BJSM" url="https://bjsm.bmj.com/content/52/6/376" />
        <Source title="USDA FoodData Central API" url="https://fdc.nal.usda.gov/api-guide/" />
      </Card>

      <Button title="Sign out" onPress={signOut} secondary />
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
function Source({ title, url }: { title: string; url: string }) { return <Pressable onPress={() => Linking.openURL(url)} style={styles.source}><Text style={styles.sourceText}>↗ {title}</Text></Pressable>; }

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 }, title: { color: colors.text, fontSize: 29, fontWeight: '900', marginBottom: 12 }, profileRow: { flexDirection: 'row', gap: 13, alignItems: 'center', marginBottom: 8 }, avatar: { width: 74, height: 74, borderRadius: 37 }, fallback: { backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.text, fontSize: 28, fontWeight: '900' }, name: { color: colors.text, fontSize: 21, fontWeight: '900' }, meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  info: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }, infoLabel: { color: colors.muted, flex: 1 }, infoValue: { color: colors.text, fontWeight: '800', flex: 1, textAlign: 'right', textTransform: 'capitalize' }, source: { backgroundColor: colors.panel2, padding: 10, borderRadius: 12, marginTop: 7 }, sourceText: { color: colors.blue, fontWeight: '800', lineHeight: 18 }
});
