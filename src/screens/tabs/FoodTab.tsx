import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Input, OutlineButton, SectionTitle, useTheme } from '../../components/UI';
import { presetFoods } from '../../data/presets';
import { Food, Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { searchUsda } from '../../lib/usda';

const localKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function FoodTab({ profile }: { profile: Profile }) {
  const { colors } = useTheme(); const styles = createStyles(colors);
  const locked = (profile.age ?? 0) < 18;
  const [query, setQuery] = useState('');
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [usdaFoods, setUsdaFoods] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name:'', serving:'1 serving', calories:'', protein:'', carbs:'', fat:'' });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = async () => {
    const since = new Date(); since.setDate(since.getDate()-90); since.setHours(0,0,0,0);
    const [foodsRes, logsRes] = await Promise.all([
      supabase.from('foods').select('id,name,serving,calories,protein_g,carbs_g,fat_g,source').eq('owner_id',profile.id).order('created_at',{ascending:false}),
      supabase.from('food_logs').select('*').eq('user_id',profile.id).gte('logged_at',since.toISOString()).order('logged_at',{ascending:false}).limit(3000)
    ]);
    setCustomFoods((foodsRes.data ?? []) as Food[]); setAllLogs(logsRes.data ?? []);
  };
  useEffect(()=>{ load(); },[profile.id]);

  const todayKey = localKey(new Date());
  const todayLogs = allLogs.filter(x=>localKey(x.logged_at)===todayKey);
  const filtered = useMemo(()=>{
    const all=[...customFoods,...presetFoods]; if(!query.trim()) return all.slice(0,20);
    const q=query.toLowerCase(); return all.filter(f=>f.name.toLowerCase().includes(q)).slice(0,25);
  },[query,customFoods]);

  const addLog = async (food: Food) => {
    const {error}=await supabase.from('food_logs').insert({user_id:profile.id,food_id:food.id??null,food_name:food.name,serving:food.serving,servings:1,calories:food.calories,protein_g:food.protein_g,carbs_g:food.carbs_g,fat_g:food.fat_g});
    if(error) Alert.alert('Could not log food',error.message); else load();
  };
  const onlineSearch=async()=>{ if(!query.trim()||locked) return; setSearching(true); try{setUsdaFoods(await searchUsda(query));}catch(e:any){Alert.alert('Food search',e?.message??'Online search failed.');}finally{setSearching(false);} };
  const saveManual=async()=>{
    if(!manual.name.trim()) return Alert.alert('Food name','Enter a food or meal name.');
    const nums=locked?[0,0,0,0]:[manual.calories,manual.protein,manual.carbs,manual.fat].map(Number);
    if(!locked && nums.some(n=>!Number.isFinite(n)||n<0)) return Alert.alert('Check food details','Enter valid non-negative nutrition values.');
    const payload={owner_id:profile.id,name:manual.name.trim(),serving:manual.serving.trim()||'1 serving',calories:nums[0],protein_g:nums[1],carbs_g:nums[2],fat_g:nums[3],source:'manual',public:false};
    const {data,error}=await supabase.from('foods').insert(payload).select('id,name,serving,calories,protein_g,carbs_g,fat_g,source').single();
    if(error) return Alert.alert('Could not save food',error.message); await addLog(data as Food); setManual({name:'',serving:'1 serving',calories:'',protein:'',carbs:'',fat:''}); setManualOpen(false);
  };

  const totals = sumLogs(todayLogs);
  const caloriesTarget = Number(profile.maintenance_calories ?? 0), proteinTarget = Number(profile.protein_target_g ?? 0);
  const caloriePct = caloriesTarget ? Math.round(totals.calories/caloriesTarget*100) : 0;
  const proteinPct = proteinTarget ? Math.round(totals.protein/proteinTarget*100) : 0;
  const macroTotal = totals.protein + totals.carbs + totals.fat;
  const macroPct = (v:number)=>macroTotal?Math.round(v/macroTotal*100):0;

  const grouped = useMemo(()=>{
    const map:Record<string,any[]>={}; allLogs.forEach(x=>(map[localKey(x.logged_at)]??=[]).push(x));
    return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0]));
  },[allLogs]);

  if (historyOpen) {
    const dayRows = selectedDate ? (grouped.find(([k])=>k===selectedDate)?.[1] ?? []) : [];
    if (selectedDate) {
      const t=sumLogs(dayRows);
      return <ScrollView contentContainerStyle={styles.wrap}><TopBack title={new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})} onBack={()=>setSelectedDate(null)}/>
        {!locked?<Card><SectionTitle title="Daily totals" subtitle="Compared with your current adult targets."/><ProgressMetric label="Calories" value={Math.round(t.calories)} target={caloriesTarget} unit="kcal"/><ProgressMetric label="Protein" value={Math.round(t.protein)} target={proteinTarget} unit="g"/><View style={styles.macroMiniRow}><Macro label="Protein" grams={t.protein} pct={macroPctFor(t.protein,t)}/><Macro label="Carbs" grams={t.carbs} pct={macroPctFor(t.carbs,t)}/><Macro label="Fat" grams={t.fat} pct={macroPctFor(t.fat,t)}/></View></Card>:null}
        <Card><SectionTitle title={locked?'Meals logged':'Foods eaten'}/>{dayRows.map((x:any)=><View key={x.id} style={styles.logRow}><View style={{flex:1}}><Text style={styles.foodName}>{x.food_name}</Text><Text style={styles.foodMeta}>{x.serving}</Text></View>{!locked?<Text style={styles.kcal}>{Math.round(Number(x.calories))} kcal</Text>:null}</View>)}</Card>
      </ScrollView>;
    }
    return <ScrollView contentContainerStyle={styles.wrap}><TopBack title="Food history" onBack={()=>setHistoryOpen(false)}/><Text style={styles.sub}>{locked?'Your meal journal from the last 90 days.':'Review previous days, foods eaten and whether your current adult targets were reached.'}</Text>
      {grouped.length?grouped.map(([key,rows])=>{const t=sumLogs(rows); const cHit=caloriesTarget>0&&t.calories>=caloriesTarget*.9&&t.calories<=caloriesTarget*1.1; const pHit=proteinTarget>0&&t.protein>=proteinTarget; return <Pressable key={key} onPress={()=>setSelectedDate(key)}><Card style={styles.historyCard}><View style={{flex:1}}><Text style={styles.historyDate}>{key===todayKey?'Today':new Date(`${key}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</Text><Text style={styles.foodMeta}>{rows.length} item{rows.length===1?'':'s'} logged</Text>{!locked?<Text style={styles.foodMeta}>{Math.round(t.calories)} kcal • {Math.round(t.protein)} g protein</Text>:null}</View>{!locked?<View style={styles.goals}><Text style={[styles.goalPill,cHit&&styles.hit]}>Calories {cHit?'✓':'•'}</Text><Text style={[styles.goalPill,pHit&&styles.hit]}>Protein {pHit?'✓':'•'}</Text></View>:<Text style={styles.chevron}>›</Text>}</Card></Pressable>}) : <Card><Text style={styles.sub}>No food history yet.</Text></Card>}
    </ScrollView>;
  }

  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <View style={styles.titleRow}><View><Text style={styles.title}>{locked?'Food & meals':'Food & macros'}</Text><Text style={styles.sub}>{locked?'A simple meal journal without calorie or macro targets.':'Track today, add food and review your history.'}</Text></View><OutlineButton title="History" onPress={()=>setHistoryOpen(true)} compact/></View>

    {!locked?<>
      <Card><SectionTitle title="Today" subtitle="Your daily progress resets at the start of each day."/><ProgressMetric label="Calories" value={Math.round(totals.calories)} target={caloriesTarget} unit="kcal"/><ProgressMetric label="Protein" value={Math.round(totals.protein)} target={proteinTarget} unit="g"/></Card>
      <Card><SectionTitle title="Macronutrient breakdown" subtitle="Grams and share of today's logged macros."/><MacroBar label="Protein" grams={totals.protein} pct={macroPct(totals.protein)} color={colors.blue}/><MacroBar label="Carbs" grams={totals.carbs} pct={macroPct(totals.carbs)} color={colors.green}/><MacroBar label="Fat" grams={totals.fat} pct={macroPct(totals.fat)} color={colors.gold}/></Card>
    </>:<Card><SectionTitle title="Under-18 meal journal" subtitle="FitHub keeps calorie and macro targets off for under-18 accounts. You can still record what you ate and look back at your meal history."/></Card>}

    <Card><SectionTitle title={locked?'Add a meal':'Find a food'}/><Input value={query} onChangeText={setQuery} placeholder={locked?'Search saved/common foods…':'Search chicken, oats, banana…'}/><View style={styles.buttonRow}>{!locked?<View style={{flex:1}}><OutlineButton title={searching?'Searching…':'Search online'} onPress={onlineSearch} disabled={searching}/></View>:null}<View style={{flex:1}}><OutlineButton title={manualOpen?'Close entry':'Add food manually'} onPress={()=>setManualOpen(!manualOpen)}/></View></View>
      {manualOpen?<View style={styles.manualBox}><Input value={manual.name} onChangeText={v=>setManual({...manual,name:v})} placeholder="Food or meal name"/><Input value={manual.serving} onChangeText={v=>setManual({...manual,serving:v})} placeholder="Serving, e.g. 1 bowl"/>{!locked?<><View style={styles.two}><Input style={{flex:1}} value={manual.calories} onChangeText={v=>setManual({...manual,calories:v})} keyboardType="decimal-pad" placeholder="Calories"/><Input style={{flex:1}} value={manual.protein} onChangeText={v=>setManual({...manual,protein:v})} keyboardType="decimal-pad" placeholder="Protein g"/></View><View style={styles.two}><Input style={{flex:1}} value={manual.carbs} onChangeText={v=>setManual({...manual,carbs:v})} keyboardType="decimal-pad" placeholder="Carbs g"/><Input style={{flex:1}} value={manual.fat} onChangeText={v=>setManual({...manual,fat:v})} keyboardType="decimal-pad" placeholder="Fat g"/></View></>:null}<OutlineButton title="Save & add" onPress={saveManual}/></View>:null}
    </Card>

    <SectionTitle title="Foods" subtitle={query?`Matches for “${query}”`:'Common foods and your saved foods'}/>
    {[...usdaFoods,...filtered].slice(0,35).map((food,i)=><FoodRow key={`${food.source}-${food.id??food.name}-${i}`} food={food} onAdd={()=>addLog(food)} hideNutrition={locked}/>)}

    <Card><SectionTitle title={locked?"Today's meals":"Today's log"}/>{todayLogs.length?todayLogs.map(x=><View key={x.id} style={styles.logRow}><View style={{flex:1}}><Text style={styles.foodName}>{x.food_name}</Text><Text style={styles.foodMeta}>{x.serving}</Text></View>{!locked?<Text style={styles.kcal}>{Math.round(Number(x.calories))} kcal</Text>:null}</View>):<Text style={styles.sub}>Nothing logged yet today.</Text>}</Card>
  </ScrollView></KeyboardAvoidingView>;
}

function sumLogs(rows:any[]){return rows.reduce((a,x)=>({calories:a.calories+Number(x.calories??0),protein:a.protein+Number(x.protein_g??0),carbs:a.carbs+Number(x.carbs_g??0),fat:a.fat+Number(x.fat_g??0)}),{calories:0,protein:0,carbs:0,fat:0});}
function macroPctFor(v:number,t:any){const total=t.protein+t.carbs+t.fat;return total?Math.round(v/total*100):0;}
function ProgressMetric({label,value,target,unit}:{label:string;value:number;target:number;unit:string}){const {colors}=useTheme();const s=createStyles(colors);const pct=target?Math.round(value/target*100):0;return <View style={s.progressBlock}><View style={s.progressTop}><Text style={s.progressLabel}>{label}</Text><Text style={s.progressValue}>{value.toLocaleString()} / {target?target.toLocaleString():'—'} {unit} <Text style={{color:colors.blue}}>({target?`${pct}%`:'—'})</Text></Text></View><View style={s.track}><View style={[s.fill,{width:`${Math.min(100,pct)}%`}]} /></View></View>;}
function MacroBar({label,grams,pct,color}:{label:string;grams:number;pct:number;color:string}){const {colors}=useTheme();const s=createStyles(colors);return <View style={s.macroBlock}><View style={s.progressTop}><Text style={s.progressLabel}>{label}</Text><Text style={s.progressValue}>{Math.round(grams)} g • {pct}%</Text></View><View style={s.track}><View style={[s.fill,{width:`${pct}%`,backgroundColor:color}]} /></View></View>;}
function Macro({label,grams,pct}:{label:string;grams:number;pct:number}){const {colors}=useTheme();const s=createStyles(colors);return <View style={s.macroMini}><Text style={s.macroMiniValue}>{Math.round(grams)}g</Text><Text style={s.macroMiniLabel}>{label} • {pct}%</Text></View>;}
function FoodRow({food,onAdd,hideNutrition}:{food:Food;onAdd:()=>void;hideNutrition:boolean}){const {colors}=useTheme();const s=createStyles(colors);return <View style={s.foodRow}><View style={{flex:1}}><Text style={s.foodName}>{food.name}</Text><Text style={s.foodMeta}>{food.serving}{!hideNutrition?` · P ${Math.round(food.protein_g)}g · C ${Math.round(food.carbs_g)}g · F ${Math.round(food.fat_g)}g`:''}</Text></View><Pressable onPress={onAdd} style={s.add}><Text style={s.addText}>{hideNutrition?'+ Add':`+ ${Math.round(food.calories)}`}</Text></Pressable></View>;}
function TopBack({title,onBack}:{title:string;onBack:()=>void}){const {colors}=useTheme();const s=createStyles(colors);return <View style={s.backRow}><Pressable onPress={onBack}><Text style={s.back}>‹</Text></Pressable><Text style={s.backTitle}>{title}</Text></View>;}

const createStyles=(colors:any)=>StyleSheet.create({
  wrap:{padding:16,paddingTop:10,paddingBottom:40},titleRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:10},title:{color:colors.text,fontSize:29,fontWeight:'900'},sub:{color:colors.muted,lineHeight:19,marginTop:4,marginBottom:12,flexShrink:1},
  progressBlock:{marginBottom:13},progressTop:{flexDirection:'row',justifyContent:'space-between',gap:8,alignItems:'center'},progressLabel:{color:colors.text,fontWeight:'900',fontSize:12},progressValue:{color:colors.muted,fontSize:10,fontWeight:'800'},track:{height:9,borderRadius:999,backgroundColor:colors.panel2,overflow:'hidden',marginTop:7},fill:{height:'100%',backgroundColor:colors.blue,borderRadius:999},macroBlock:{marginBottom:11},macroMiniRow:{flexDirection:'row',gap:7,marginTop:8},macroMini:{flex:1,backgroundColor:colors.panel2,borderRadius:10,padding:9,alignItems:'center'},macroMiniValue:{color:colors.text,fontWeight:'900'},macroMiniLabel:{color:colors.muted,fontSize:8,marginTop:3,textAlign:'center'},
  buttonRow:{flexDirection:'row',gap:8},manualBox:{marginTop:10,borderTopWidth:1,borderTopColor:colors.border,paddingTop:12},two:{flexDirection:'row',gap:8},foodRow:{flexDirection:'row',alignItems:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:13,marginBottom:8},foodName:{color:colors.text,fontWeight:'900'},foodMeta:{color:colors.muted,fontSize:11,marginTop:3,lineHeight:16},kcal:{color:colors.blue,fontWeight:'900'},add:{backgroundColor:'#FFFFFF',borderRadius:12,borderWidth:1.5,borderColor:colors.blue,paddingHorizontal:11,paddingVertical:9,marginLeft:8},addText:{color:colors.blue,fontWeight:'900'},logRow:{flexDirection:'row',alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border},
  backRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},back:{color:colors.text,fontSize:38,fontWeight:'300',marginRight:10},backTitle:{color:colors.text,fontSize:25,fontWeight:'900'},historyCard:{flexDirection:'row',alignItems:'center'},historyDate:{color:colors.text,fontWeight:'900',fontSize:15},goals:{alignItems:'flex-end',gap:5},goalPill:{color:colors.muted,fontSize:9,fontWeight:'900',backgroundColor:colors.panel2,paddingHorizontal:7,paddingVertical:4,borderRadius:7},hit:{color:colors.green,backgroundColor:colors.greenSoft},chevron:{color:colors.muted,fontSize:25}
});
