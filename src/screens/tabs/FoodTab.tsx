import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Card, Input, OutlineButton, SectionTitle, useTheme } from '../../components/UI';
import { presetFoods } from '../../data/presets';
import { Food, Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { searchUsda } from '../../lib/usda';
import { barcodeFood, foodDetails, searchFoods } from '../../lib/nutritionApi';
import NutritionLibraryScreen from '../NutritionLibraryScreen';

const localKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function FoodTab({ profile }: { profile: Profile }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const locked = (profile.age ?? 0) < 18;
  const [query, setQuery] = useState('');
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [usdaFoods, setUsdaFoods] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [waterLogs,setWaterLogs]=useState<any[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name:'', serving:'1 serving', calories:'', protein:'', carbs:'', fat:'' });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mealType,setMealType]=useState<'breakfast'|'lunch'|'dinner'|'snacks'>('breakfast');
  const [scannerOpen,setScannerOpen]=useState(false);
  const [cameraPermission,requestCameraPermission]=useCameraPermissions();
  const [scanned,setScanned]=useState(false);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const [finderOpen,setFinderOpen]=useState(false);
  const [nutritionOpen,setNutritionOpen]=useState(false);
  const [expandedMeals,setExpandedMeals]=useState<Record<string,boolean>>({breakfast:true,lunch:true,dinner:false,snacks:false});

  const load = async () => {
    const since = new Date();
    since.setDate(since.getDate()-90);
    since.setHours(0,0,0,0);
    const [foodsRes, logsRes,waterRes] = await Promise.all([
      supabase.from('foods').select('id,name,serving,calories,protein_g,carbs_g,fat_g,source').eq('owner_id',profile.id).order('created_at',{ascending:false}),
      supabase.from('food_logs').select('*').eq('user_id',profile.id).gte('logged_at',since.toISOString()).order('logged_at',{ascending:false}).limit(3000),
      supabase.from('water_logs').select('*').eq('user_id',profile.id).gte('logged_at',since.toISOString()).order('logged_at',{ascending:false}).limit(1000)
    ]);
    setCustomFoods((foodsRes.data ?? []) as Food[]);
    setAllLogs(logsRes.data ?? []);
    setWaterLogs(waterRes.data??[]);
  };

  useEffect(()=>{ load(); },[profile.id]);

  const todayKey = localKey(new Date());
  const todayLogs = allLogs.filter(x=>localKey(x.logged_at)===todayKey);
  const todayWater=waterLogs.filter(x=>localKey(x.logged_at)===todayKey);
  const waterTotal=todayWater.reduce((n,x)=>n+Number(x.amount_ml??0),0);
  const addWater=async(amount:number)=>{const{error}=await supabase.from('water_logs').insert({user_id:profile.id,amount_ml:amount});if(error)Alert.alert('Water',error.message);else load();};
  const removeWater=async(row:any)=>{await supabase.from('water_logs').delete().eq('id',row.id).eq('user_id',profile.id);load();};
  const filtered = useMemo(()=>{
    const all=[...customFoods,...presetFoods];
    if(!query.trim()) return all.slice(0,20);
    const q=query.toLowerCase();
    return all.filter(f=>f.name.toLowerCase().includes(q)).slice(0,25);
  },[query,customFoods]);

  const addLog = async (food: Food) => {
    const {error}=await supabase.from('food_logs').insert({
      user_id:profile.id,
      food_id:food.id??null,
      food_name:food.name,
      serving:food.serving,
      servings:1,
      calories:food.calories,
      protein_g:food.protein_g,
      carbs_g:food.carbs_g,
      fat_g:food.fat_g
      ,fibre_g:(food as any).fibre_g??0
      ,meal_type:mealType
      ,provider_food_id:(food as any).provider_food_id??null
      ,serving_id:(food as any).serving_id??null
    });
    if(error) Alert.alert('Could not log food',error.message); else load();
  };

  const removeLog=(row:any)=>Alert.alert('Remove logged food?',`${row.food_name} will be removed and today’s totals will update.`,[
    {text:'Cancel',style:'cancel'},
    {text:'Remove',style:'destructive',onPress:async()=>{const{error}=await supabase.from('food_logs').delete().eq('id',row.id).eq('user_id',profile.id);if(error)Alert.alert('Could not remove food',error.message);else load();}},
  ]);

  const onlineSearch=async()=>{
    if(!query.trim()||locked) return;
    setSearching(true);
    try{const result=await searchFoods(query);setUsdaFoods(result.foods??[]);}
    catch(e:any){Alert.alert('Food search',e?.message??'Online search failed.');}
    finally{setSearching(false);}
  };

  const scanBarcode=async({data}:{data:string})=>{
    if(scanned)return;setScanned(true);
    try{const match=await barcodeFood(data);if(!match.provider_food_id)throw new Error('No verified match was found.');const detail=await foodDetails(String(match.provider_food_id));setScannerOpen(false);await addLog(detail.food as Food);}
    catch(e:any){setScannerOpen(false);Alert.alert('Barcode not found',e?.message??'Use custom food to add it manually.');}
  };

  const saveManual=async()=>{
    if(!manual.name.trim()) return Alert.alert('Food name','Enter a food or meal name.');
    const nums=locked?[0,0,0,0]:[manual.calories,manual.protein,manual.carbs,manual.fat].map(Number);
    if(!locked && nums.some(n=>!Number.isFinite(n)||n<0)) return Alert.alert('Check food details','Enter valid non-negative nutrition values.');
    const payload={owner_id:profile.id,name:manual.name.trim(),serving:manual.serving.trim()||'1 serving',calories:nums[0],protein_g:nums[1],carbs_g:nums[2],fat_g:nums[3],source:'manual',public:false};
    const {data,error}=await supabase.from('foods').insert(payload).select('id,name,serving,calories,protein_g,carbs_g,fat_g,source').single();
    if(error) return Alert.alert('Could not save food',error.message);
    await addLog(data as Food);
    setManual({name:'',serving:'1 serving',calories:'',protein:'',carbs:'',fat:''});
    setManualOpen(false);
  };

  const totals = sumLogs(todayLogs);
  const caloriesTarget = Number(profile.maintenance_calories ?? 0);
  const proteinTarget = Number(profile.protein_target_g ?? 0);
  const carbsTarget = caloriesTarget > 0 ? Math.round((caloriesTarget * 0.45) / 4) : 0;
  const fatTarget = caloriesTarget > 0 ? Math.round((caloriesTarget * 0.30) / 9) : 0;
  const macroTotal = totals.protein + totals.carbs + totals.fat;
  const macroPct = (v:number)=>macroTotal?Math.round(v/macroTotal*100):0;

  const grouped = useMemo(()=>{
    const map:Record<string,any[]>={};
    allLogs.forEach(x=>(map[localKey(x.logged_at)]??=[]).push(x));
    return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0]));
  },[allLogs]);

  if(libraryOpen)return <NutritionLibraryScreen profile={profile} onBack={()=>setLibraryOpen(false)}/>;
  if (historyOpen) {
    const dayRows = selectedDate ? (grouped.find(([k])=>k===selectedDate)?.[1] ?? []) : [];
    if (selectedDate) {
      const t=sumLogs(dayRows);
      return <ScrollView contentContainerStyle={styles.wrap}>
        <TopBack title={new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})} onBack={()=>setSelectedDate(null)}/>
        {!locked?<Card>
          <SectionTitle title="Daily totals" subtitle="Your logged intake for this day."/>
          <View style={styles.historyRings}>
            <RingMetric label="Calories" value={Math.round(t.calories)} target={caloriesTarget} unit="kcal" color={colors.gold}/>
            <RingMetric label="Protein" value={Math.round(t.protein)} target={proteinTarget} unit="g" color={colors.green}/>
          </View>
          <View style={styles.macroMiniRow}>
            <Macro label="Protein" grams={t.protein} pct={macroPctFor(t.protein,t)}/>
            <Macro label="Carbs" grams={t.carbs} pct={macroPctFor(t.carbs,t)}/>
            <Macro label="Fat" grams={t.fat} pct={macroPctFor(t.fat,t)}/>
          </View>
        </Card>:null}
        <Card>
          <SectionTitle title={locked?'Meals logged':'Foods eaten'}/>
          {dayRows.map((x:any)=><View key={x.id} style={styles.logRow}>
            <View style={{flex:1}}><Text style={styles.foodName}>{x.food_name}</Text><Text style={styles.foodMeta}>{x.serving}</Text></View>
            {!locked?<Text style={styles.kcal}>{Math.round(Number(x.calories))} kcal</Text>:null}<Pressable onPress={()=>removeLog(x)}><Text style={styles.remove}>Remove</Text></Pressable>
          </View>)}
        </Card>
      </ScrollView>;
    }

    return <ScrollView contentContainerStyle={styles.wrap}>
      <TopBack title="Food history" onBack={()=>setHistoryOpen(false)}/>
      <Text style={styles.sub}>{locked?'Your meal journal from the last 90 days.':'Review previous days, foods eaten and goals reached.'}</Text>
      {grouped.length?grouped.map(([key,rows])=>{
        const t=sumLogs(rows);
        const cHit=caloriesTarget>0&&t.calories>=caloriesTarget*.9&&t.calories<=caloriesTarget*1.1;
        const pHit=proteinTarget>0&&t.protein>=proteinTarget;
        return <Pressable key={key} onPress={()=>setSelectedDate(key)}>
          <Card style={styles.historyCard}>
            <View style={{flex:1}}>
              <Text style={styles.historyDate}>{key===todayKey?'Today':new Date(`${key}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</Text>
              <Text style={styles.foodMeta}>{rows.length} item{rows.length===1?'':'s'} logged</Text>
              {!locked?<Text style={styles.foodMeta}>{Math.round(t.calories)} kcal • {Math.round(t.protein)} g protein</Text>:null}
            </View>
            {!locked?<View style={styles.goals}>
              <Text style={[styles.goalPill,cHit&&styles.hit]}>Calories {cHit?'✓':'•'}</Text>
              <Text style={[styles.goalPill,pHit&&styles.hit]}>Protein {pHit?'✓':'•'}</Text>
            </View>:<Text style={styles.chevron}>›</Text>}
          </Card>
        </Pressable>;
      }) : <Card><Text style={styles.sub}>No food history yet.</Text></Card>}
    </ScrollView>;
  }

  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <Modal visible={scannerOpen} animationType="slide" onRequestClose={()=>setScannerOpen(false)}>
      <View style={{flex:1,backgroundColor:'#000'}}>
        {cameraPermission?.granted?<CameraView style={{flex:1}} barcodeScannerSettings={{barcodeTypes:['ean13','ean8','upc_a','upc_e']}} onBarcodeScanned={scanBarcode}/>:<View style={{flex:1,justifyContent:'center',padding:24}}><Text style={{color:'#fff',textAlign:'center',marginBottom:16}}>Camera access is required only while scanning a food barcode.</Text><OutlineButton title="Allow camera" onPress={requestCameraPermission}/></View>}
        <View style={{padding:16}}><OutlineButton title="Cancel scanner" onPress={()=>setScannerOpen(false)}/></View>
      </View>
    </Modal>
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.title}>FOOD</Text>
        <Pressable onPress={()=>setHistoryOpen(true)}><Text style={styles.todayTitle}>▣  Today⌄</Text></Pressable>
      </View>

      <View style={styles.weekStrip}>{[-2,-1,0,1,2,3,4].map((offset)=>{const d=new Date();d.setDate(d.getDate()+offset);const active=offset===0;return <View key={offset} style={[styles.weekDay,active&&styles.weekDayOn]}><Text style={[styles.weekName,active&&styles.weekNameOn]}>{d.toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}</Text><Text style={[styles.weekNumber,active&&styles.weekNameOn]}>{d.getDate()}</Text></View>})}</View>

      <Card style={styles.diaryHero}><View style={{flex:1}}><Text style={styles.diaryEyebrow}>TODAY'S DIARY</Text><Text style={styles.diarySub}>Keep your meals organised in one place</Text><Text style={styles.diaryCount}>{new Set(todayLogs.map(x=>x.meal_type)).size} of 4 meals logged</Text><View style={styles.diaryTrack}><View style={[styles.diaryFill,{width:`${Math.min(100,new Set(todayLogs.map(x=>x.meal_type)).size/4*100)}%`}]}/></View></View><Text style={styles.diaryIcon}>♨</Text></Card>

      <View style={styles.quickActions}>{[
        ['⌕','Search',()=>setFinderOpen(true)],['▦','Scan',()=>{setScanned(false);setScannerOpen(true)}],['↶','Recent',()=>setHistoryOpen(true)],['♡','Saved Meals',()=>setLibraryOpen(true)],
      ].map(([icon,label,action]:any)=><Pressable key={label} onPress={action} style={styles.quickAction}><Text style={styles.quickIcon}>{icon}</Text><Text style={styles.quickLabel}>{label}</Text></Pressable>)}</View>

      {(['breakfast','lunch','dinner','snacks'] as const).map(type=><MealDiaryCard key={type} type={type} rows={todayLogs.filter(x=>(x.meal_type??'breakfast')===type)} expanded={expandedMeals[type]} locked={locked} onToggle={()=>setExpandedMeals({...expandedMeals,[type]:!expandedMeals[type]})} onAdd={()=>{setMealType(type);setFinderOpen(true)}} onRemove={removeLog}/>)}

      <Card style={styles.waterCard}><View style={styles.waterTop}><View><Text style={styles.waterTitle}>💧  WATER</Text><Text style={styles.waterSub}>{waterTotal.toLocaleString()} ml today</Text></View><Pressable onPress={()=>addWater(250)} style={styles.redPlus}><Text style={styles.redPlusText}>＋</Text></Pressable></View><View style={styles.waterGlasses}>{Array.from({length:6}).map((_,i)=><View key={i} style={[styles.waterGlass,i<Math.min(6,Math.floor(waterTotal/250))&&styles.waterGlassFull]}/>)}</View>{todayWater.length?<Pressable onPress={()=>removeWater(todayWater[0])}><Text style={styles.undo}>Undo last entry</Text></Pressable>:null}</Card>

      {!locked?<Card><Pressable onPress={()=>setNutritionOpen(!nutritionOpen)} style={styles.nutritionHeader}><View><Text style={styles.nutritionTitle}>↗  Nutrition overview</Text><Text style={styles.foodMeta}>View nutrients and serving details</Text></View><Text style={styles.chevron}>{nutritionOpen?'⌃':'⌄'}</Text></Pressable>{nutritionOpen?<><View style={styles.ringRow}><RingMetric label="Calories" value={Math.round(totals.calories)} target={caloriesTarget} unit="kcal" color={colors.gold}/><RingMetric label="Protein" value={Math.round(totals.protein)} target={proteinTarget} unit="g" color={colors.green}/><RingMetric label="Carbs" value={Math.round(totals.carbs)} target={carbsTarget} unit="g" color={colors.blue}/><RingMetric label="Fat" value={Math.round(totals.fat)} target={fatTarget} unit="g" color={colors.gold}/></View></>:null}</Card>:<Card><SectionTitle title="Meal journal" subtitle="You can record meals and review your routine. Nutrition targets are not shown for younger accounts."/></Card>}

      {finderOpen?<Card>
        <View style={styles.sectionHeader}><SectionTitle title={locked?'Add a meal':`Add to ${mealType}`}/><Pressable onPress={()=>setFinderOpen(false)}><Text style={styles.closeFinder}>×</Text></Pressable></View>
        <View style={styles.two}>{(['breakfast','lunch','dinner','snacks'] as const).map(x=><Pressable key={x} onPress={()=>setMealType(x)} style={[styles.goalPill,mealType===x&&styles.hit]}><Text style={styles.foodMeta}>{x[0].toUpperCase()+x.slice(1)}</Text></Pressable>)}</View>
        <Input value={query} onChangeText={setQuery} placeholder={locked?'Search saved/common foods…':'Search chicken, oats, banana…'}/>
        {!locked?<><OutlineButton title={searching?'Searching…':'Search verified foods'} onPress={onlineSearch} disabled={searching}/><OutlineButton title="Scan barcode" onPress={()=>{setScanned(false);setScannerOpen(true)}}/></>:null}
        {manualOpen?<View style={styles.manualBox}>
          <Input value={manual.name} onChangeText={v=>setManual({...manual,name:v})} placeholder="Food or meal name"/>
          <Input value={manual.serving} onChangeText={v=>setManual({...manual,serving:v})} placeholder="Serving, e.g. 1 bowl"/>
          {!locked?<>
            <View style={styles.two}><Input style={{flex:1}} value={manual.calories} onChangeText={v=>setManual({...manual,calories:v})} keyboardType="decimal-pad" placeholder="Calories"/><Input style={{flex:1}} value={manual.protein} onChangeText={v=>setManual({...manual,protein:v})} keyboardType="decimal-pad" placeholder="Protein g"/></View>
            <View style={styles.two}><Input style={{flex:1}} value={manual.carbs} onChangeText={v=>setManual({...manual,carbs:v})} keyboardType="decimal-pad" placeholder="Carbs g"/><Input style={{flex:1}} value={manual.fat} onChangeText={v=>setManual({...manual,fat:v})} keyboardType="decimal-pad" placeholder="Fat g"/></View>
          </>:null}
          <OutlineButton title="Save & add" onPress={saveManual}/>
        </View>:null}
        <SectionTitle title="Foods" subtitle={query?`Matches for “${query}”`:'Common foods and your saved foods'}/>{[...usdaFoods,...filtered].slice(0,35).map((food,i)=><FoodRow key={`${food.source}-${food.id??food.name}-${i}`} food={food} onAdd={()=>addLog(food)} hideNutrition={locked}/>)}
      </Card>:null}
      <Pressable onPress={()=>Linking.openURL('https://platform.fatsecret.com')}><Text style={[styles.sub,{textAlign:'center',color:colors.blue,textDecorationLine:'underline'}]}>Nutrition information powered by fatsecret Platform API</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function MealDiaryCard({type,rows,expanded,locked,onToggle,onAdd,onRemove}:{type:'breakfast'|'lunch'|'dinner'|'snacks';rows:any[];expanded:boolean;locked:boolean;onToggle:()=>void;onAdd:()=>void;onRemove:(row:any)=>void}){
  const {colors}=useTheme();const s=createStyles(colors);const icons={breakfast:'☼',lunch:'◉',dinner:'◒',snacks:'♧'};
  return <Card style={s.mealCard}><View style={s.mealHead}><Pressable onPress={onToggle} style={s.mealHeadText}><Text style={s.mealIcon}>{icons[type]}</Text><View><Text style={s.mealTitle}>{type[0].toUpperCase()+type.slice(1)}</Text>{!rows.length?<Text style={s.foodMeta}>Nothing logged yet</Text>:null}</View></Pressable><Text style={s.chevron}>{expanded?'⌃':'⌄'}</Text><Pressable onPress={onAdd} style={s.redPlus}><Text style={s.redPlusText}>＋</Text></Pressable></View>{expanded?rows.map(row=><View key={row.id} style={s.mealFood}><View style={s.foodThumb}><Text style={s.foodThumbText}>◌</Text></View><View style={{flex:1}}><Text style={s.foodName}>{row.food_name}</Text><Text style={s.foodMeta}>{row.serving}</Text></View>{!locked?<Text style={s.kcal}>{Math.round(Number(row.calories??0))}</Text>:null}<Pressable onPress={()=>onRemove(row)}><Text style={s.mealMore}>⋮</Text></Pressable></View>):null}</Card>;
}

function sumLogs(rows:any[]){
  return rows.reduce((a,x)=>({
    calories:a.calories+Number(x.calories??0),
    protein:a.protein+Number(x.protein_g??0),
    carbs:a.carbs+Number(x.carbs_g??0),
    fat:a.fat+Number(x.fat_g??0)
  }),{calories:0,protein:0,carbs:0,fat:0});
}

function macroPctFor(v:number,t:any){const total=t.protein+t.carbs+t.fat;return total?Math.round(v/total*100):0;}

function RingMetric({label,value,target,unit,color}:{label:string;value:number;target:number;unit:string;color:string}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  const pct=target>0?Math.round(value/target*100):0;
  return <View style={s.ringMetric}>
    <Text style={s.ringLabel}>{label}</Text>
    <SegmentRing pct={pct} color={color}/>
    <Text style={s.ringAmount}>{value.toLocaleString()} / {target?target.toLocaleString():'—'}</Text>
    <Text style={s.ringUnit}>{unit}</Text>
  </View>;
}

function SegmentRing({pct,color,size=68}:{pct:number;color:string;size?:number}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  const count=28;
  const active=Math.round(Math.min(100,Math.max(0,pct))/100*count);
  const center=size/2;
  const radius=size/2-6;
  return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
    {Array.from({length:count}).map((_,i)=>{
      const angle=(i/count)*Math.PI*2-Math.PI/2;
      const x=center+Math.cos(angle)*radius-1.5;
      const y=center+Math.sin(angle)*radius-4;
      return <View key={i} style={{position:'absolute',left:x,top:y,width:3,height:8,borderRadius:3,backgroundColor:i<active?color:colors.border,transform:[{rotate:`${(i/count)*360}deg`}]}}/>;
    })}
    <Text style={s.ringPct}>{Math.min(999,Math.max(0,pct))}%</Text>
  </View>;
}

function MacroDonut({protein,carbs,fat}:{protein:number;carbs:number;fat:number}){
  const {colors}=useTheme();
  const size=106,count=42,center=size/2,radius=size/2-8;
  const total=protein+carbs+fat;
  const p=total?protein/total:0;
  const c=total?carbs/total:0;
  return <View style={{width:size,height:size}}>
    {Array.from({length:count}).map((_,i)=>{
      const ratio=i/count;
      const tone=ratio<p?colors.blue:ratio<p+c?colors.cyan:ratio<1?colors.gold:colors.purple;
      const angle=(i/count)*Math.PI*2-Math.PI/2;
      const x=center+Math.cos(angle)*radius-2;
      const y=center+Math.sin(angle)*radius-6;
      return <View key={i} style={{position:'absolute',left:x,top:y,width:4,height:12,borderRadius:4,backgroundColor:total?tone:colors.border,transform:[{rotate:`${(i/count)*360}deg`}]}}/>;
    })}
    <View style={{position:'absolute',left:31,top:31,width:44,height:44,borderRadius:22,backgroundColor:colors.panel}}/>
  </View>;
}

function LegendRow({color,label,value}:{color:string;label:string;value:string}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  return <View style={s.legendRow}><View style={[s.legendDot,{backgroundColor:color}]}/><Text style={s.legendLabel}>{label}</Text><Text style={s.legendValue}>{value}</Text></View>;
}

function Macro({label,grams,pct}:{label:string;grams:number;pct:number}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  return <View style={s.macroMini}><Text style={s.macroMiniValue}>{Math.round(grams)}g</Text><Text style={s.macroMiniLabel}>{label} • {pct}%</Text></View>;
}

function FoodRow({food,onAdd,hideNutrition}:{food:Food;onAdd:()=>void;hideNutrition:boolean}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  return <View style={s.foodRow}>
    <View style={{flex:1}}><Text style={s.foodName}>{food.name}</Text><Text style={s.foodMeta}>{food.serving}{!hideNutrition?` · P ${Math.round(food.protein_g)}g · C ${Math.round(food.carbs_g)}g · F ${Math.round(food.fat_g)}g`:''}</Text></View>
    <Pressable onPress={onAdd} style={({pressed})=>[s.add,pressed&&{opacity:.72}]}><Text style={s.addText}>{hideNutrition?'+ Add':`+ ${Math.round(food.calories)}`}</Text></Pressable>
  </View>;
}

function TopBack({title,onBack}:{title:string;onBack:()=>void}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  return <View style={s.backRow}><Pressable onPress={onBack}><Text style={s.back}>‹</Text></Pressable><Text style={s.backTitle}>{title}</Text></View>;
}

const createStyles=(colors:any)=>StyleSheet.create({
  wrap:{padding:16,paddingTop:10,paddingBottom:40},
  headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  title:{color:colors.text,fontSize:29,fontWeight:'900'},
  todayTitle:{color:colors.text,fontSize:15,fontWeight:'900'},
  weekStrip:{flexDirection:'row',justifyContent:'space-between',marginBottom:14},
  weekDay:{width:39,alignItems:'center',paddingVertical:7,borderRadius:11},
  weekDayOn:{backgroundColor:colors.primary},
  weekName:{color:colors.muted,fontSize:8,fontWeight:'900'},
  weekNameOn:{color:'#FFFFFF'},
  weekNumber:{color:colors.text,fontSize:15,fontWeight:'900',marginTop:3},
  diaryHero:{flexDirection:'row',alignItems:'center',padding:17},
  diaryEyebrow:{color:colors.text,fontSize:17,fontWeight:'900'},
  diarySub:{color:colors.muted,fontSize:11,marginTop:4},
  diaryCount:{color:colors.text,fontSize:12,marginTop:14},
  diaryTrack:{height:6,borderRadius:99,backgroundColor:colors.panel2,overflow:'hidden',marginTop:8},
  diaryFill:{height:'100%',backgroundColor:colors.primary,borderRadius:99},
  diaryIcon:{color:colors.primary,fontSize:40,marginLeft:18},
  quickActions:{flexDirection:'row',gap:8,marginBottom:12},
  quickAction:{flex:1,minHeight:76,borderRadius:13,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,alignItems:'center',justifyContent:'center'},
  quickIcon:{color:colors.text,fontSize:24},
  quickLabel:{color:colors.text,fontSize:10,marginTop:6,textAlign:'center'},
  mealCard:{padding:0,overflow:'hidden'},
  mealHead:{minHeight:60,flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:10},
  mealHeadText:{flex:1,flexDirection:'row',alignItems:'center',gap:10},
  mealIcon:{color:colors.primary,fontSize:23},
  mealTitle:{color:colors.text,fontSize:17,fontWeight:'900'},
  redPlus:{width:36,height:36,borderRadius:18,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  redPlusText:{color:'#FFFFFF',fontSize:23,fontWeight:'600',lineHeight:27},
  mealFood:{flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:colors.border,padding:11},
  foodThumb:{width:54,height:45,borderRadius:10,backgroundColor:colors.panel2,alignItems:'center',justifyContent:'center'},
  foodThumbText:{color:colors.primary,fontSize:22},
  mealMore:{color:colors.muted,fontSize:24,paddingHorizontal:5},
  waterCard:{padding:14},waterTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},waterTitle:{color:colors.text,fontSize:16,fontWeight:'900'},waterSub:{color:colors.muted,fontSize:11,marginTop:3},
  waterGlasses:{flexDirection:'row',gap:9,marginTop:12},waterGlass:{width:27,height:33,borderWidth:2,borderColor:colors.muted,borderRadius:5},waterGlassFull:{backgroundColor:colors.blue,borderColor:colors.blue},undo:{color:colors.muted,fontSize:10,textDecorationLine:'underline',marginTop:10},
  nutritionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},nutritionTitle:{color:colors.text,fontSize:16,fontWeight:'900'},closeFinder:{color:colors.muted,fontSize:29,paddingHorizontal:8},
  sub:{color:colors.muted,lineHeight:19,marginTop:4,marginBottom:12,flexShrink:1},
  progressPanel:{backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:17,padding:13,marginBottom:12},
  dayRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},
  dayLabel:{color:colors.text,fontWeight:'900',fontSize:13},
  dayNote:{color:colors.muted,fontSize:10,fontWeight:'700'},
  ringRow:{flexDirection:'row',justifyContent:'space-between',gap:4},
  ringMetric:{flex:1,alignItems:'center',minWidth:0},
  ringLabel:{color:colors.text,fontWeight:'900',fontSize:10,marginBottom:3},
  ringPct:{color:colors.text,fontWeight:'900',fontSize:13},
  ringAmount:{color:colors.text,fontSize:8,fontWeight:'800',marginTop:3,textAlign:'center'},
  ringUnit:{color:colors.muted,fontSize:8,marginTop:1},
  macroCard:{paddingBottom:18},
  breakdownRow:{flexDirection:'row',alignItems:'center',gap:18},
  legend:{flex:1,gap:8},
  legendRow:{flexDirection:'row',alignItems:'center'},
  legendDot:{width:8,height:8,borderRadius:4,marginRight:8},
  legendLabel:{color:colors.text,fontWeight:'800',fontSize:11,flex:1},
  legendValue:{color:colors.muted,fontSize:10,fontWeight:'700'},
  sectionHeader:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:8},
  manualBox:{marginTop:10,borderTopWidth:1,borderTopColor:colors.border,paddingTop:12},
  two:{flexDirection:'row',gap:8},
  foodRow:{flexDirection:'row',alignItems:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:13,marginBottom:8},
  foodName:{color:colors.text,fontWeight:'900'},
  foodMeta:{color:colors.muted,fontSize:11,marginTop:3,lineHeight:16},
  kcal:{color:colors.blue,fontWeight:'900'},
  add:{backgroundColor:colors.panel,borderRadius:12,borderWidth:1.5,borderColor:colors.blue,paddingHorizontal:11,paddingVertical:9,marginLeft:8},
  addText:{color:colors.blue,fontWeight:'900'},
  logRow:{flexDirection:'row',alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border},
  historyRings:{flexDirection:'row',justifyContent:'space-around',marginBottom:10},
  macroMiniRow:{flexDirection:'row',gap:7,marginTop:8},
  macroMini:{flex:1,backgroundColor:colors.panel2,borderRadius:10,padding:9,alignItems:'center'},
  macroMiniValue:{color:colors.text,fontWeight:'900'},
  macroMiniLabel:{color:colors.muted,fontSize:8,marginTop:3,textAlign:'center'},
  backRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},
  back:{color:colors.text,fontSize:38,fontWeight:'300',marginRight:10},
  backTitle:{color:colors.text,fontSize:25,fontWeight:'900'},
  historyCard:{flexDirection:'row',alignItems:'center'},
  historyDate:{color:colors.text,fontWeight:'900',fontSize:15},
  goals:{alignItems:'flex-end',gap:5},
  goalPill:{color:colors.muted,fontSize:9,fontWeight:'900',backgroundColor:colors.panel2,paddingHorizontal:7,paddingVertical:4,borderRadius:7},
  hit:{color:colors.green,backgroundColor:colors.greenSoft},
  chevron:{color:colors.muted,fontSize:25},remove:{color:colors.danger,fontSize:9,fontWeight:'900',marginLeft:8}
});
