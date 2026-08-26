import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Input, useTheme } from '../components/UI';
import BirthdayFields from '../components/BirthdayFields';
import { Profile } from '../lib/types';
import { cmFrom, kgFrom, maintenanceCalories, proteinTarget } from '../lib/health';
import { BirthDateParts, validateBirthDate } from '../lib/profileAge';
import { supabase } from '../lib/supabase';

const TOTAL_STEPS = 8;

export default function OnboardingScreen({ profile, onComplete }: { profile: Profile; onComplete: () => void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [step, setStep] = useState(0);
  const [fitness, setFitness] = useState('');
  const [activity, setActivity] = useState('');
  const [birthday, setBirthday] = useState<BirthDateParts>({ month: '', day: '', year: '' });
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>('cm');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [goal, setGoal] = useState('');
  const [days, setDays] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = useMemo(() => {
    if (step === 0) return Boolean(fitness);
    if (step === 1) return Boolean(activity);
    if (step === 2) return !validateBirthDate(birthday).error;
    if (step === 3) return Boolean(gender);
    if (step === 4) { const n = Number(height); return Number.isFinite(n) && n > 0; }
    if (step === 5) { const n = Number(weight); return Number.isFinite(n) && n > 0; }
    if (step === 6) return Boolean(goal);
    const n = Number(days); return Number.isFinite(n) && n >= 1 && n <= 7;
  }, [step, fitness, activity, birthday, gender, height, weight, goal, days]);

  const progress = Math.round(((step + (valid ? 1 : 0)) / TOTAL_STEPS) * 100);
  const birthdayAge = validateBirthDate(birthday).age;
  const goalChoices: [string,string][] = birthdayAge != null && birthdayAge < 18
    ? [['improve_fitness','Improve fitness'],['build_consistency','Build consistency'],['sports_performance','Sports performance'],['maintain','General wellbeing']]
    : [['gain_muscle','Gain muscle'],['fat_loss','Lose fat'],['maintain','Maintain'],['improve_fitness','Improve fitness']];

  const finish = async () => {
    const birth = validateBirthDate(birthday);
    if (birth.error || !birth.iso || birth.age == null) return Alert.alert('Check your birthday', birth.error ?? 'Enter a valid birthday.');
    const a = birth.age, w = Number(weight), h = Number(height), d = Number(days);
    const kg = kgFrom(w, weightUnit);
    const cm = cmFrom(h, heightUnit);
    const adultNutrition = a >= 18;
    const payload: any = {
      age: a,
      date_of_birth: birth.iso,
      fitness_level: fitness,
      activity_level: activity,
      gender,
      height_cm: cm,
      weight_kg: kg,
      height_unit: heightUnit,
      weight_unit: weightUnit,
      goal,
      workout_days_target: d,
      maintenance_calories: adultNutrition ? maintenanceCalories(a, kg, cm, gender, activity) : null,
      protein_target_g: adultNutrition ? proteinTarget(kg, goal) : null,
      onboarding_complete: true
    };
    setBusy(true);
    let { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);
    if (error && /height_unit|weight_unit/i.test(error.message)) {
      delete payload.height_unit; delete payload.weight_unit;
      ({ error } = await supabase.from('profiles').update(payload).eq('id', profile.id));
    }
    setBusy(false);
    if (error && /date_of_birth/i.test(error.message)) return Alert.alert('Database update required', 'Run the FitHub 1.6.18 Supabase SQL update, then try setup again. Your birthday was not discarded.');
    if (error) return Alert.alert('Could not save', error.message);
    if (!adultNutrition) {
      Alert.alert('Setup complete', 'Your training profile is ready. FitHub keeps calorie and macro targets off for under-18 accounts.');
    }
    onComplete();
  };

  const next = () => {
    if (!valid) return;
    if (step === TOTAL_STEPS - 1) finish(); else setStep((s) => s + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.wrap}>
          <View style={styles.topRow}>
            <Text style={styles.stepText}>STEP {step + 1} OF {TOTAL_STEPS}</Text>
            <Text style={styles.percent}>{progress}%</Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>

          <View style={styles.questionArea}>
            {step === 0 && <Question title="How experienced are you with training?" subtitle="This helps FitHub keep workout suggestions at the right level."><ChoiceRow values={[['new','Completely new'],['occasional','Occasional'],['regular','Regular']]} value={fitness} onChange={setFitness} /></Question>}
            {step === 1 && <Question title="How active are you outside your workouts?" subtitle="Think about a normal week, not your hardest week."><ChoiceRow values={[['sedentary','Mostly seated'],['light','Light'],['moderate','Moderate'],['high','High']]} value={activity} onChange={setActivity} /></Question>}
            {step === 2 && <Question title="When is your birthday?" subtitle="FitHub calculates your age automatically and updates it every year. Your birthday also keeps age-appropriate safety settings accurate."><BirthdayFields value={birthday} onChange={setBirthday} /></Question>}
            {step === 3 && <Question title="Which option should FitHub use for your profile?" subtitle="For adult accounts, this is also used in the energy estimate."><ChoiceRow values={[['female','Female'],['male','Male'],['prefer_not_to_say','Prefer not to say']]} value={gender} onChange={setGender} /></Question>}
            {step === 4 && <Question title="What is your height?" subtitle="Choose whichever unit you normally use."><View style={styles.inputRow}><Input style={{ flex: 1 }} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Height" /><View style={styles.units}><Chip label="cm" active={heightUnit === 'cm'} onPress={() => setHeightUnit('cm')} /><Chip label="in" active={heightUnit === 'in'} onPress={() => setHeightUnit('in')} /></View></View></Question>}
            {step === 5 && <Question title="What is your weight?" subtitle="You can update this later from your profile at any time."><View style={styles.inputRow}><Input style={{ flex: 1 }} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Weight" /><View style={styles.units}><Chip label="kg" active={weightUnit === 'kg'} onPress={() => setWeightUnit('kg')} /><Chip label="lb" active={weightUnit === 'lb'} onPress={() => setWeightUnit('lb')} /></View></View></Question>}
            {step === 6 && <Question title="What is your main training goal?" subtitle="You can change this later whenever your goals change."><ChoiceRow values={goalChoices} value={goal} onChange={setGoal} /></Question>}
            {step === 7 && <Question title="How many days do you want to train each week?" subtitle="Choose a realistic target from 1 to 7 days."><Input value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="1-7 days" /></Question>}
          </View>

          <View style={styles.actions}>
            {step > 0 ? <Pressable onPress={() => setStep((s) => Math.max(0, s - 1))} style={styles.backButton}><Text style={styles.backText}>Back</Text></Pressable> : <View style={{ width: 86 }} />}
            <View style={{ flex: 1 }}><Button title={step === TOTAL_STEPS - 1 ? (busy ? 'Saving…' : 'Finish setup') : 'Continue'} onPress={next} disabled={!valid || busy} /></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { colors } = useTheme(); const styles = createStyles(colors);
  return <View><Text style={styles.kicker}>FITHUB SETUP</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text><View style={styles.answerBox}>{children}</View></View>;
}

function ChoiceRow({ values, value, onChange }: { values: [string,string][]; value: string; onChange: (v:string) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{values.map(([v,l]) => <Chip key={v} label={l} active={value === v} onPress={() => onChange(v)} />)}</View>;
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 18 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepText: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 }, percent: { color: colors.blue, fontSize: 12, fontWeight: '900' },
  track: { height: 7, borderRadius: 999, backgroundColor: colors.panel2, overflow: 'hidden', marginTop: 9 }, fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  questionArea: { flex: 1, justifyContent: 'center' }, kicker: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginBottom: 8 },
  title: { color: colors.text, fontSize: 31, lineHeight: 37, fontWeight: '900', letterSpacing: -.5 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  answerBox: { marginTop: 28 }, inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, units: { flexDirection: 'row', paddingTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, backButton: { width: 86, minHeight: 50, alignItems: 'center', justifyContent: 'center' }, backText: { color: colors.text, fontWeight: '900' }
});
