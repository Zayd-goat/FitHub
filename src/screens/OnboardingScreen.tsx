import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Input, SectionTitle, colors } from '../components/UI';
import { Profile } from '../lib/types';
import { bmi, cmFrom, kgFrom, maintenanceCalories, proteinTarget } from '../lib/health';
import { supabase } from '../lib/supabase';

export default function OnboardingScreen({ profile, onComplete }: { profile: Profile; onComplete: () => void }) {
  const [age, setAge] = useState('');
  const [fitness, setFitness] = useState('new');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>('cm');
  const [gender, setGender] = useState('female');
  const [activity, setActivity] = useState('light');
  const [goal, setGoal] = useState('improve_fitness');
  const [days, setDays] = useState('3');
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    const a = Number(age), w = Number(weight), h = Number(height), d = Number(days);
    if (!a || !w || !h || !d || a < 13 || a > 100 || w <= 0 || h <= 0 || d < 1 || d > 7) {
      Alert.alert('Check your details', 'Enter a valid age, height, weight and workout-days goal.');
      return;
    }
    const kg = kgFrom(w, weightUnit);
    const cm = cmFrom(h, heightUnit);
    const adultNutrition = a >= 18;
    const maintenance = adultNutrition ? maintenanceCalories(a, kg, cm, gender, activity) : null;
    const protein = adultNutrition ? proteinTarget(kg, goal) : null;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({
      age: a,
      fitness_level: fitness,
      weight_kg: kg,
      height_cm: cm,
      gender,
      activity_level: activity,
      goal,
      workout_days_target: d,
      maintenance_calories: maintenance,
      protein_target_g: protein,
      onboarding_complete: true
    }).eq('id', profile.id);
    setBusy(false);
    if (error) return Alert.alert('Could not save', error.message);
    if (!adultNutrition) {
      Alert.alert('Workout mode enabled', 'FitHub saved your training profile. Calorie and macro targets are only generated for adults 18+, so those targets will stay hidden on this account.');
    }
    onComplete();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>FIRST-TIME SETUP</Text>
          <Text style={styles.title}>Build your FitHub profile</Text>
          <Text style={styles.lead}>These answers personalize your dashboard, workout targets and training suggestions.</Text>

          <Card>
            <SectionTitle title="About you" />
            <Text style={styles.label}>Age</Text>
            <Input value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="e.g. 22" />
            <Text style={styles.label}>Gender used for adult energy estimate</Text>
            <View style={styles.rowWrap}>{['female','male','prefer_not_to_say'].map(x => <Chip key={x} label={x === 'prefer_not_to_say' ? 'Prefer not to say' : x[0].toUpperCase()+x.slice(1)} active={gender === x} onPress={() => setGender(x)} />)}</View>
            <Text style={styles.label}>Training experience</Text>
            <View style={styles.rowWrap}>{[
              ['new','Completely new'],['occasional','Occasional'],['regular','Regular']
            ].map(([v,l]) => <Chip key={v} label={l} active={fitness === v} onPress={() => setFitness(v)} />)}</View>
          </Card>

          <Card>
            <SectionTitle title="Height & weight" subtitle="You can use metric or imperial units." />
            <View style={styles.inline}>
              <View style={{ flex: 1 }}><Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Weight" /></View>
              <View style={styles.unitRow}><Chip label="kg" active={weightUnit === 'kg'} onPress={() => setWeightUnit('kg')} /><Chip label="lb" active={weightUnit === 'lb'} onPress={() => setWeightUnit('lb')} /></View>
            </View>
            <View style={styles.inline}>
              <View style={{ flex: 1 }}><Input value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Height" /></View>
              <View style={styles.unitRow}><Chip label="cm" active={heightUnit === 'cm'} onPress={() => setHeightUnit('cm')} /><Chip label="in" active={heightUnit === 'in'} onPress={() => setHeightUnit('in')} /></View>
            </View>
          </Card>

          <Card>
            <SectionTitle title="Your goal" />
            <View style={styles.rowWrap}>{[
              ['gain_muscle','Gain muscle'],['fat_loss','Lose fat'],['maintain','Maintain'],['improve_fitness','Improve fitness']
            ].map(([v,l]) => <Chip key={v} label={l} active={goal === v} onPress={() => setGoal(v)} />)}</View>
            <Text style={styles.label}>Typical activity outside workouts</Text>
            <View style={styles.rowWrap}>{[
              ['sedentary','Mostly seated'],['light','Light'],['moderate','Moderate'],['high','High']
            ].map(([v,l]) => <Chip key={v} label={l} active={activity === v} onPress={() => setActivity(v)} />)}</View>
            <Text style={styles.label}>Workout days you want each week</Text>
            <Input value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="1-7" />
          </Card>

          {Number(age) >= 18 && Number(weight) > 0 && Number(height) > 0 ? (
            <Card>
              <SectionTitle title="Preview" subtitle="An estimate, not a diagnosis." />
              <Text style={styles.preview}>BMI: {bmi(kgFrom(Number(weight), weightUnit), cmFrom(Number(height), heightUnit)).toFixed(1)}</Text>
              <Text style={styles.muted}>Adult calorie and protein estimates will appear after setup.</Text>
            </Card>
          ) : null}
          <Button title={busy ? 'Saving…' : 'Finish setup'} onPress={finish} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 20, paddingBottom: 50 },
  kicker: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, marginTop: 12 },
  title: { color: colors.text, fontSize: 31, fontWeight: '900', marginTop: 3 },
  lead: { color: colors.muted, lineHeight: 20, marginVertical: 12 },
  label: { color: colors.text, fontWeight: '800', marginTop: 7, marginBottom: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitRow: { flexDirection: 'row', width: 125, justifyContent: 'flex-end' },
  preview: { color: colors.text, fontSize: 26, fontWeight: '900' },
  muted: { color: colors.muted, marginTop: 4 }
});
