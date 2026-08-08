import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, SectionTitle, colors } from '../../components/UI';
import { presetFoods } from '../../data/presets';
import { Food, Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { searchUsda } from '../../lib/usda';

export default function FoodTab({ profile }: { profile: Profile }) {
  const locked = (profile.age ?? 0) < 18;
  const [query, setQuery] = useState('');
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [usdaFoods, setUsdaFoods] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: '', serving: '1 serving', calories: '', protein: '', carbs: '', fat: '' });

  const load = async () => {
    if (locked) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const { data: foods } = await supabase.from('foods').select('id,name,serving,calories,protein_g,carbs_g,fat_g,source').eq('owner_id', profile.id).order('created_at', { ascending: false });
    setCustomFoods((foods ?? []) as Food[]);
    const { data: logs } = await supabase.from('food_logs').select('*').eq('user_id', profile.id).gte('logged_at', today.toISOString()).order('logged_at', { ascending: false });
    setTodayLogs(logs ?? []);
  };
  useEffect(() => { load(); }, [profile.id]);

  const filtered = useMemo(() => {
    const all = [...customFoods, ...presetFoods];
    if (!query.trim()) return all.slice(0, 20);
    const q = query.toLowerCase();
    return all.filter(f => f.name.toLowerCase().includes(q)).slice(0, 25);
  }, [query, customFoods]);

  const addLog = async (food: Food) => {
    const { error } = await supabase.from('food_logs').insert({
      user_id: profile.id,
      food_id: food.id ?? null,
      food_name: food.name,
      serving: food.serving,
      servings: 1,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g
    });
    if (error) Alert.alert('Could not log food', error.message); else load();
  };

  const onlineSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await searchUsda(query);
      setUsdaFoods(result);
    } catch (e: any) { Alert.alert('Food search', e?.message ?? 'Online search failed.'); }
    finally { setSearching(false); }
  };

  const saveManual = async () => {
    const nums = [manual.calories, manual.protein, manual.carbs, manual.fat].map(Number);
    if (!manual.name.trim() || nums.some(n => !Number.isFinite(n) || n < 0)) return Alert.alert('Check food details', 'Enter a name and valid non-negative macro values.');
    const payload = {
      owner_id: profile.id, name: manual.name.trim(), serving: manual.serving.trim() || '1 serving',
      calories: nums[0], protein_g: nums[1], carbs_g: nums[2], fat_g: nums[3], source: 'manual', public: false
    };
    const { data, error } = await supabase.from('foods').insert(payload).select('id,name,serving,calories,protein_g,carbs_g,fat_g,source').single();
    if (error) return Alert.alert('Could not save food', error.message);
    await addLog(data as Food);
    setManual({ name: '', serving: '1 serving', calories: '', protein: '', carbs: '', fat: '' });
    setManualOpen(false);
    load();
  };

  const totals = todayLogs.reduce((a, x) => ({
    calories: a.calories + Number(x.calories), protein: a.protein + Number(x.protein_g), carbs: a.carbs + Number(x.carbs_g), fat: a.fat + Number(x.fat_g)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  if (locked) return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Food & macros</Text>
      <Card><SectionTitle title="Available for adults 18+" subtitle="FitHub does not generate calorie or macro targets for under-18 accounts. You can still use workouts, friends, challenges, streaks and badges." /></Card>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Food & macros</Text>
        <Text style={styles.sub}>Log from common foods, search USDA FoodData Central, or add your own.</Text>

        <View style={styles.macroRow}>
          <Mini label="Calories" value={`${Math.round(totals.calories)} / ${profile.maintenance_calories ?? '—'}`} />
          <Mini label="Protein" value={`${Math.round(totals.protein)} / ${profile.protein_target_g ?? '—'} g`} />
          <Mini label="Carbs" value={`${Math.round(totals.carbs)} g`} />
          <Mini label="Fat" value={`${Math.round(totals.fat)} g`} />
        </View>

        <Card>
          <SectionTitle title="Find a food" />
          <Input value={query} onChangeText={setQuery} placeholder="Search chicken, oats, banana…" />
          <View style={styles.buttonRow}><View style={{ flex: 1 }}><Button title={searching ? 'Searching…' : 'Search online'} onPress={onlineSearch} disabled={searching} secondary /></View><View style={{ flex: 1 }}><Button title={manualOpen ? 'Close manual entry' : 'Add food manually'} onPress={() => setManualOpen(!manualOpen)} secondary /></View></View>
          {manualOpen && <View style={styles.manualBox}>
            <Input value={manual.name} onChangeText={v => setManual({ ...manual, name: v })} placeholder="Food name" />
            <Input value={manual.serving} onChangeText={v => setManual({ ...manual, serving: v })} placeholder="Serving, e.g. 100 g" />
            <View style={styles.two}><Input style={{ flex: 1 }} value={manual.calories} onChangeText={v => setManual({ ...manual, calories: v })} keyboardType="decimal-pad" placeholder="Calories" /><Input style={{ flex: 1 }} value={manual.protein} onChangeText={v => setManual({ ...manual, protein: v })} keyboardType="decimal-pad" placeholder="Protein g" /></View>
            <View style={styles.two}><Input style={{ flex: 1 }} value={manual.carbs} onChangeText={v => setManual({ ...manual, carbs: v })} keyboardType="decimal-pad" placeholder="Carbs g" /><Input style={{ flex: 1 }} value={manual.fat} onChangeText={v => setManual({ ...manual, fat: v })} keyboardType="decimal-pad" placeholder="Fat g" /></View>
            <Button title="Save food & log it" onPress={saveManual} />
          </View>}
        </Card>

        <SectionTitle title="Foods" subtitle={query ? `Matches for “${query}”` : 'Common foods and your saved foods'} />
        {[...usdaFoods, ...filtered].slice(0, 35).map((food, i) => <FoodRow key={`${food.source}-${food.id ?? food.name}-${i}`} food={food} onAdd={() => addLog(food)} />)}

        <Card>
          <SectionTitle title="Today's log" />
          {todayLogs.length ? todayLogs.map(x => (
            <View key={x.id} style={styles.logRow}><View style={{ flex: 1 }}><Text style={styles.foodName}>{x.food_name}</Text><Text style={styles.foodMeta}>{x.serving}</Text></View><Text style={styles.kcal}>{Math.round(Number(x.calories))} kcal</Text></View>
          )) : <Text style={styles.sub}>Nothing logged yet today.</Text>}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Mini({ label, value }: { label: string; value: string }) { return <View style={styles.mini}><Text style={styles.miniValue}>{value}</Text><Text style={styles.miniLabel}>{label}</Text></View>; }
function FoodRow({ food, onAdd }: { food: Food; onAdd: () => void }) {
  return <View style={styles.foodRow}><View style={{ flex: 1 }}><Text style={styles.foodName}>{food.name}</Text><Text style={styles.foodMeta}>{food.serving} · P {Math.round(food.protein_g)}g · C {Math.round(food.carbs_g)}g · F {Math.round(food.fat_g)}g</Text></View><Pressable onPress={onAdd} style={styles.add}><Text style={styles.addText}>+ {Math.round(food.calories)}</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 }, title: { color: colors.text, fontSize: 29, fontWeight: '900' }, sub: { color: colors.muted, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }, mini: { width: '48%', backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12 }, miniValue: { color: colors.text, fontWeight: '900', fontSize: 16 }, miniLabel: { color: colors.green, fontSize: 11, marginTop: 2, fontWeight: '800' },
  buttonRow: { flexDirection: 'row', gap: 8 }, manualBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }, two: { flexDirection: 'row', gap: 8 },
  foodRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13, marginBottom: 8 }, foodName: { color: colors.text, fontWeight: '900' }, foodMeta: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 16 }, kcal: { color: colors.green, fontWeight: '900' }, add: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, marginLeft: 8 }, addText: { color: colors.text, fontWeight: '900' },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }
});
