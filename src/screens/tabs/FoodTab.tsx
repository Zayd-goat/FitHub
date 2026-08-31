import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Card, Input, OutlineButton, RefreshableScrollView, SectionTitle, useTheme } from '../../components/UI';
import { presetFoods } from '../../data/presets';
import { Food, Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { barcodeFood, foodDetails, ProviderFoodSummary, searchFoods } from '../../lib/nutritionApi';
import NutritionLibraryScreen from '../NutritionLibraryScreen';
import {
  FreshChevronIcon, FreshCloseIcon, FreshCopyIcon,
  FreshMealBowlIcon, FreshMoreIcon, FreshNutritionIcon, FreshPlusIcon,
  FreshSavedIcon, FreshSearchIcon,
} from '../../components/FitHubFreshIcons';
import {
  FoodCalendarIcon, FoodChevronIcon, FoodPlusIcon, FoodRecentTrayIcon,
  FoodScreenBackdrop, FoodWaterDropIcon, FoodWaterGlassIcon,
} from '../../components/FitHubFoodIcons';
import { FitHubSpriteArt, type SpriteQuadrant } from '../../components/FitHubSpriteArt';
import { profileAge } from '../../lib/profileAge';

const localKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export type FoodTabHandle = { goBack: () => boolean };
type MealType = 'breakfast'|'lunch'|'dinner'|'snacks';

const foodShortcutSprites = require('../../../assets/food_ui_v4/food_shortcut_sprites.png');
const foodMealSprites = require('../../../assets/food_ui_v4/food_meal_sprites.png');
const foodHeroWaterSprites = require('../../../assets/food_ui_v4/food_hero_water_sprites.png');
const mealArtQuadrants: Record<MealType, SpriteQuadrant> = { breakfast: 0, lunch: 1, dinner: 2, snacks: 3 };

const FoodTab = forwardRef<FoodTabHandle, { profile: Profile }>(function FoodTab({ profile }, ref) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const locked = (profileAge(profile) ?? 0) < 18;
  const [query, setQuery] = useState('');
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [providerFoods, setProviderFoods] = useState<ProviderFoodSummary[]>([]);
  const [providerQuery, setProviderQuery] = useState('');
  const [providerPage, setProviderPage] = useState(0);
  const [providerTotal, setProviderTotal] = useState(0);
  const [providerHasMore, setProviderHasMore] = useState(false);
  const [providerMarket, setProviderMarket] = useState('default');
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [selectedProviderFood, setSelectedProviderFood] = useState<Food | null>(null);
  const [selectedServingId, setSelectedServingId] = useState<string | null>(null);
  const [servingCount, setServingCount] = useState('1');
  const [searching, setSearching] = useState(false);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [waterLogs,setWaterLogs]=useState<any[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name:'', serving:'1 serving', calories:'', protein:'', carbs:'', fat:'' });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mealType,setMealType]=useState<MealType>('breakfast');
  const [scannerOpen,setScannerOpen]=useState(false);
  const [cameraPermission,requestCameraPermission]=useCameraPermissions();
  const [scanned,setScanned]=useState(false);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const [finderOpen,setFinderOpen]=useState(false);
  const [nutritionOpen,setNutritionOpen]=useState(false);
  const [expandedMeals,setExpandedMeals]=useState<Record<string,boolean>>({breakfast:false,lunch:false,dinner:false,snacks:false});

  const clearProviderSearch=()=>{setProviderFoods([]);setProviderQuery('');setProviderPage(0);setProviderTotal(0);setProviderHasMore(false);setProviderMarket('default');};
  const closeFinder=()=>{setFinderOpen(false);setManualOpen(false);setQuery('');clearProviderSearch();setSelectedProviderFood(null);};
  const updateQuery=(value:string)=>{setQuery(value);if(value.trim().toLowerCase()!==providerQuery.trim().toLowerCase())clearProviderSearch();};
  useImperativeHandle(ref,()=>({goBack:()=>{
    if(scannerOpen){setScannerOpen(false);return true;}
    if(selectedProviderFood){setSelectedProviderFood(null);return true;}
    if(manualOpen){setManualOpen(false);return true;}
    if(selectedDate){setSelectedDate(null);return true;}
    if(historyOpen){setHistoryOpen(false);return true;}
    if(libraryOpen){setLibraryOpen(false);return true;}
    if(finderOpen){closeFinder();return true;}
    return false;
  }}),[scannerOpen,selectedProviderFood,manualOpen,finderOpen,selectedDate,historyOpen,libraryOpen]);

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

  const addLog = async (food: Food, servings = 1) => {
    const {error}=await supabase.from('food_logs').insert({
      user_id:profile.id,
      food_id:food.id??null,
      food_name:food.name,
      serving:food.serving,
      servings,
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

  const copyPreviousMeal=async(type:'breakfast'|'lunch'|'dinner'|'snacks')=>{
    const previous=new Date();previous.setDate(previous.getDate()-1);
    const rows=allLogs.filter(x=>localKey(x.logged_at)===localKey(previous)&&(x.meal_type??'breakfast')===type);
    if(!rows.length)return Alert.alert('Copy meal',`No ${type} was logged yesterday.`);
    const payload=rows.map(x=>({user_id:profile.id,food_id:x.food_id??null,food_name:x.food_name,serving:x.serving,servings:x.servings??1,calories:x.calories??0,protein_g:x.protein_g??0,carbs_g:x.carbs_g??0,fat_g:x.fat_g??0,fibre_g:x.fibre_g??0,meal_type:type,provider_food_id:x.provider_food_id??null,serving_id:x.serving_id??null}));
    const{error}=await supabase.from('food_logs').insert(payload);
    if(error)Alert.alert('Copy meal',error.message);else{await load();Alert.alert('Meal copied',`Yesterday’s ${type} was added to today.`);}
  };

  const saveCurrentMeal=async(type:'breakfast'|'lunch'|'dinner'|'snacks')=>{
    const rows=todayLogs.filter(x=>(x.meal_type??'breakfast')===type);
    if(!rows.length)return Alert.alert('Save meal',`Add something to ${type} first.`);
    const{data:meal,error}=await supabase.from('saved_meals').insert({user_id:profile.id,name:`${type[0].toUpperCase()+type.slice(1)} · ${new Date().toLocaleDateString()}`,meal_type:type}).select('id').single();
    if(error||!meal)return Alert.alert('Save meal',error?.message??'Could not create the saved meal.');
    const items=rows.map(x=>({meal_id:meal.id,food_name:x.food_name,serving:x.serving,servings:x.servings??1,calories:x.calories??0,protein_g:x.protein_g??0,carbs_g:x.carbs_g??0,fat_g:x.fat_g??0,fibre_g:x.fibre_g??0,provider_food_id:x.provider_food_id??null,serving_id:x.serving_id??null}));
    const{error:itemError}=await supabase.from('saved_meal_items').insert(items);
    if(itemError)Alert.alert('Save meal',itemError.message);else Alert.alert('Meal saved','You can reuse it from Saved Meals.');
  };

  const onlineSearch=async(page=0)=>{
    if(!query.trim()||locked) return;
    setSearching(true);
    try{
      const result=await searchFoods(query,page,50);
      setProviderFoods((current)=>{
        const combined=page===0?(result.foods??[]):[...current,...(result.foods??[])];
        return Array.from(new Map(combined.map((food)=>[food.provider_food_id,food])).values());
      });
      setProviderQuery(query.trim());setProviderPage(Number(result.page??page));setProviderTotal(Number(result.total??0));setProviderHasMore(Boolean(result.has_more));setProviderMarket(String(result.market??'default'));
    }
    catch(e:any){Alert.alert('Food search',e?.message??'Online search failed.');}
    finally{setSearching(false);}
  };

  const openProviderFood=async(food:ProviderFoodSummary)=>{
    if(locked)return;
    setDetailLoadingId(food.provider_food_id);
    try{const detail=await foodDetails(food.provider_food_id);const selected=detail.food as Food;setSelectedProviderFood(selected);setSelectedServingId(selected.serving_id??selected.available_servings?.[0]?.serving_id??null);setServingCount('1');}
    catch(e:any){Alert.alert('Food details',e?.message??'Could not load the available servings.');}
    finally{setDetailLoadingId(null);}
  };

  const addSelectedProviderFood=async()=>{
    if(!selectedProviderFood)return;
    const count=Number(servingCount);
    if(!Number.isFinite(count)||count<=0||count>20)return Alert.alert('Check servings','Enter a serving amount from 0.1 to 20.');
    const serving=selectedProviderFood.available_servings?.find((item)=>item.serving_id===selectedServingId);
    const base:Food=serving?{...selectedProviderFood,serving_id:serving.serving_id,serving:serving.label,calories:serving.calories,protein_g:serving.protein_g,carbs_g:serving.carbs_g,fat_g:serving.fat_g,fibre_g:serving.fibre_g??0}:selectedProviderFood;
    const scaled:Food={...base,serving:`${base.serving}${count===1?'':` × ${count}`}`,calories:Number(base.calories??0)*count,protein_g:Number(base.protein_g??0)*count,carbs_g:Number(base.carbs_g??0)*count,fat_g:Number(base.fat_g??0)*count,fibre_g:Number(base.fibre_g??0)*count};
    await addLog(scaled,count);setSelectedProviderFood(null);
  };

  const scanBarcode=async({data,type}:{data:string;type?:string})=>{
    if(locked||scanned)return;setScanned(true);
    try{const match=await barcodeFood(data,type);if(!match.provider_food_id)throw new Error('No verified match was found.');const selected=(match.food ?? (await foodDetails(String(match.provider_food_id))).food) as Food;setScannerOpen(false);setSelectedProviderFood(selected);setSelectedServingId(selected.serving_id??selected.available_servings?.[0]?.serving_id??null);setServingCount('1');}
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

  const providerDetailModal=<ProviderFoodDetailModal food={selectedProviderFood} selectedServingId={selectedServingId} servingCount={servingCount} mealType={mealType} onServing={setSelectedServingId} onServingCount={setServingCount} onClose={()=>setSelectedProviderFood(null)} onAdd={addSelectedProviderFood}/>;

  if(libraryOpen)return <NutritionLibraryScreen profile={profile} onBack={()=>setLibraryOpen(false)}/>;
  if (historyOpen) {
    const dayRows = selectedDate ? (grouped.find(([k])=>k===selectedDate)?.[1] ?? []) : [];
    if (selectedDate) {
      const t=sumLogs(dayRows);
      return <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap}>
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
      </RefreshableScrollView>;
    }

    return <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap}>
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
            </View>:<FreshChevronIcon size={22} color={colors.muted}/>}
          </Card>
        </Pressable>;
      }) : <Card><Text style={styles.sub}>No food history yet.</Text></Card>}
    </RefreshableScrollView>;
  }

  if(finderOpen)return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    {providerDetailModal}
    <Modal visible={scannerOpen} animationType="slide" onRequestClose={()=>setScannerOpen(false)}>
      <View style={{flex:1,backgroundColor:'#000'}}>
        {cameraPermission?.granted?<CameraView style={{flex:1}} barcodeScannerSettings={{barcodeTypes:['ean13','ean8','upc_a','upc_e']}} onBarcodeScanned={scanBarcode}/>:<View style={{flex:1,justifyContent:'center',padding:24}}><Text style={{color:'#fff',textAlign:'center',marginBottom:16}}>Camera access is required only while scanning a food barcode.</Text><OutlineButton title="Allow camera" onPress={requestCameraPermission}/></View>}
        <View style={{padding:16}}><OutlineButton title="Cancel scanner" onPress={()=>setScannerOpen(false)}/></View>
      </View>
    </Modal>
    <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <TopBack title={`Add to ${mealType}`} onBack={closeFinder}/>
      <Text style={styles.finderSubtitle}>{locked?'Search your foods or add a simple meal description.':`Search verified foods, recent items and saved foods for ${mealType}.`}</Text>
      <View style={styles.mealTabs}>{(['breakfast','lunch','dinner','snacks'] as const).map(x=><Pressable key={x} onPress={()=>setMealType(x)} style={[styles.mealTab,mealType===x&&styles.mealTabActive]}><Text style={[styles.mealTabText,mealType===x&&styles.mealTabTextActive]}>{x[0].toUpperCase()+x.slice(1)}</Text></Pressable>)}</View>
      <Card style={styles.searchPanel}>
        <View style={styles.searchField}><FreshSearchIcon size={23} color={colors.muted} accentColor={colors.primary}/><Input style={styles.searchInput} value={query} onChangeText={updateQuery} placeholder={locked?'Search saved and common foods…':'Search foods or brands…'}/></View>
        {!locked?<View style={styles.finderActions}><OutlineButton title={searching?'Searching…':'Search verified foods'} onPress={()=>onlineSearch(0)} disabled={searching}/><OutlineButton title="Scan barcode" onPress={()=>{setScanned(false);setScannerOpen(true)}}/></View>:null}
      </Card>
      <View style={styles.finderShortcutRow}>
        <Pressable onPress={()=>setHistoryOpen(true)} style={styles.finderShortcut}><FoodRecentTrayIcon color={colors.text} accentColor={colors.primary} surfaceColor={colors.panel}/><Text style={styles.finderShortcutText}>Recent</Text></Pressable>
        <Pressable onPress={()=>setLibraryOpen(true)} style={styles.finderShortcut}><FreshSavedIcon color={colors.text} accentColor={colors.primary}/><Text style={styles.finderShortcutText}>Saved meals</Text></Pressable>
        <Pressable onPress={()=>setManualOpen(!manualOpen)} style={styles.finderShortcut}><FreshPlusIcon size={28} color={colors.text}/><Text style={styles.finderShortcutText}>Custom food</Text></Pressable>
      </View>
      {manualOpen?<Card style={styles.customFoodCard}>
        <SectionTitle title="Create a custom food" subtitle="Add a name and household serving to your private meal journal."/>
        <Input value={manual.name} onChangeText={v=>setManual({...manual,name:v})} placeholder="Food or meal name"/>
        <Input value={manual.serving} onChangeText={v=>setManual({...manual,serving:v})} placeholder="Serving, e.g. 1 bowl"/>
        <OutlineButton title="Save and add to meal" onPress={saveManual}/>
      </Card>:null}
      {!locked&&providerFoods.length?<>
        <SectionTitle title="Verified database results" subtitle={`Showing ${providerFoods.length}${providerTotal?` of ${providerTotal.toLocaleString()}`:''} matches • ${providerMarket==='ZA'?'South Africa':'default market'}`}/>
        {providerFoods.map((food)=><ProviderFoodRow key={food.provider_food_id} food={food} loading={detailLoadingId===food.provider_food_id} onOpen={()=>openProviderFood(food)}/>)}
        {providerHasMore?<OutlineButton title={searching?'LOADING…':`LOAD MORE RESULTS · PAGE ${providerPage+2}`} onPress={()=>onlineSearch(providerPage+1)} disabled={searching}/>:null}
      </>:null}
      {!locked&&providerQuery&&providerFoods.length===0&&!searching?<Card><Text style={styles.sub}>No verified matches were returned for “{providerQuery}”. Try a broader food or brand name.</Text></Card>:null}
      <SectionTitle title={query?'Saved & common matches':'Suggested foods'} subtitle={query?`Local matches for “${query}”`:'Common foods and foods you created'}/>
      {filtered.map((food,i)=><FoodRow key={`${food.source}-${food.id??food.name}-${i}`} food={food} onAdd={()=>addLog(food)} hideNutrition={locked}/>)}
      {!locked?<Pressable onPress={()=>Linking.openURL('https://platform.fatsecret.com')}><Text style={[styles.sub,{textAlign:'center',color:colors.blue,textDecorationLine:'underline'}]}>Nutrition information powered by fatsecret Platform API</Text></Pressable>:null}
    </RefreshableScrollView>
  </KeyboardAvoidingView>;

  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View pointerEvents="none" style={styles.foodBackdrop}><FoodScreenBackdrop color={colors.primary}/></View>
    {providerDetailModal}
    <Modal visible={scannerOpen} animationType="slide" onRequestClose={()=>setScannerOpen(false)}>
      <View style={{flex:1,backgroundColor:'#000'}}>
        {cameraPermission?.granted?<CameraView style={{flex:1}} barcodeScannerSettings={{barcodeTypes:['ean13','ean8','upc_a','upc_e']}} onBarcodeScanned={scanBarcode}/>:<View style={{flex:1,justifyContent:'center',padding:24}}><Text style={{color:'#fff',textAlign:'center',marginBottom:16}}>Camera access is required only while scanning a food barcode.</Text><OutlineButton title="Allow camera" onPress={requestCameraPermission}/></View>}
        <View style={{padding:16}}><OutlineButton title="Cancel scanner" onPress={()=>setScannerOpen(false)}/></View>
      </View>
    </Modal>
    <RefreshableScrollView onRefresh={load} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.title}>FOOD</Text>
        <Pressable onPress={()=>setHistoryOpen(true)} style={styles.todayButton} accessibilityRole="button" accessibilityLabel="Open food history"><FoodCalendarIcon size={27} color={colors.primary} accentColor={colors.primary}/><Text style={styles.todayTitle}>Today</Text><FoodChevronIcon size={17} color={colors.primary} direction="down"/></Pressable>
      </View>

      <View style={styles.weekStrip}>{[-2,-1,0,1,2,3,4].map((offset)=>{const d=new Date();d.setDate(d.getDate()+offset);const active=offset===0;return <View key={offset} style={[styles.weekDay,active&&styles.weekDayOn]}><Text style={[styles.weekName,active&&styles.weekNameOn]}>{d.toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}</Text><Text style={[styles.weekNumber,active&&styles.weekNameOn]}>{d.getDate()}</Text></View>})}</View>

      <Card style={styles.diaryHero}><View style={styles.diaryIllustration}><FitHubSpriteArt source={foodHeroWaterSprites} quadrant={0} size={128}/></View><View style={styles.diaryCopy}><Text style={styles.diaryEyebrow}>TODAY'S DIARY</Text><Text style={styles.diarySub}>Plan your meals and hydration</Text><Text style={styles.diaryCount}>{new Set(todayLogs.map(x=>x.meal_type)).size} of 4 meals logged</Text><View style={styles.diaryTrack}><View style={[styles.diaryFill,{width:`${Math.min(100,new Set(todayLogs.map(x=>x.meal_type)).size/4*100)}%`}]}/></View></View></Card>

      <View style={styles.quickActions}>
        <Pressable onPress={()=>setFinderOpen(true)} style={({pressed})=>[styles.quickAction,pressed&&styles.quickActionPressed]} accessibilityRole="button" accessibilityLabel="Search foods"><View style={styles.quickIconCircle}><FitHubSpriteArt source={foodShortcutSprites} quadrant={0} size={62}/></View><Text style={styles.quickLabel}>Search</Text></Pressable>
        {!locked?<Pressable onPress={()=>{setScanned(false);setScannerOpen(true)}} style={({pressed})=>[styles.quickAction,pressed&&styles.quickActionPressed]} accessibilityRole="button" accessibilityLabel="Scan food barcode"><View style={styles.quickIconCircle}><FitHubSpriteArt source={foodShortcutSprites} quadrant={1} size={62}/></View><Text style={styles.quickLabel}>Scan</Text></Pressable>:null}
        <Pressable onPress={()=>setHistoryOpen(true)} style={({pressed})=>[styles.quickAction,pressed&&styles.quickActionPressed]} accessibilityRole="button" accessibilityLabel="Open recent meals"><View style={styles.quickIconCircle}><FitHubSpriteArt source={foodShortcutSprites} quadrant={2} size={62}/></View><Text style={styles.quickLabel}>Recent</Text></Pressable>
        <Pressable onPress={()=>setLibraryOpen(true)} style={({pressed})=>[styles.quickAction,pressed&&styles.quickActionPressed]} accessibilityRole="button" accessibilityLabel="Open saved meals"><View style={styles.quickIconCircle}><FitHubSpriteArt source={foodShortcutSprites} quadrant={3} size={62}/></View><Text style={styles.quickLabel}>Saved Meals</Text></Pressable>
      </View>

      <View style={styles.mealTimeline}>
        <View pointerEvents="none" style={styles.mealTimelineRail}/>
        {(['breakfast','lunch','dinner','snacks'] as const).map((type)=><View key={type} style={styles.mealTimelineRow}><View style={styles.mealTimelineLane}><View style={styles.mealTimelineDot}/></View><View style={styles.mealTimelineCard}><MealDiaryCard type={type} rows={todayLogs.filter(x=>(x.meal_type??'breakfast')===type)} expanded={expandedMeals[type]} locked={locked} onToggle={()=>setExpandedMeals({...expandedMeals,[type]:!expandedMeals[type]})} onAdd={()=>{setMealType(type);setFinderOpen(true)}} onRemove={removeLog} onCopy={()=>copyPreviousMeal(type)} onSave={()=>saveCurrentMeal(type)}/></View></View>)}
      </View>

      <Card style={styles.waterCard}><View style={styles.waterTop}><View style={styles.waterHeading}><FoodWaterDropIcon size={25} color={colors.text} accentColor={colors.primary}/><View><Text style={styles.waterTitle}>WATER</Text><Text style={styles.waterSub}>{waterTotal.toLocaleString()} ml today</Text></View></View><Pressable onPress={()=>addWater(250)} style={styles.waterPlus} accessibilityRole="button" accessibilityLabel="Add 250 millilitres of water"><FoodPlusIcon size={27} color="#FFFFFF"/></Pressable></View><View style={styles.waterHydrationRow}><View style={styles.waterBottleStage}><FitHubSpriteArt source={foodHeroWaterSprites} quadrant={1} size={76}/></View><View style={styles.waterGlasses}>{Array.from({length:6}).map((_,i)=><FoodWaterGlassIcon key={i} size={34} color={colors.primary} filled={i<Math.min(6,Math.floor(waterTotal/250))}/>)}</View></View>{todayWater.length?<Pressable onPress={()=>removeWater(todayWater[0])} style={styles.undoButton}><Text style={styles.undo}>Undo last entry</Text></Pressable>:null}</Card>

      {!locked?<Card style={styles.nutritionCard}><Pressable onPress={()=>setNutritionOpen(!nutritionOpen)} style={styles.nutritionHeader} accessibilityRole="button"><View style={styles.nutritionHeading}><View style={styles.nutritionIconStage}><FreshNutritionIcon size={30} color={colors.text} accentColor={colors.primary}/></View><View><Text style={styles.nutritionTitle}>Nutrition overview</Text><Text style={styles.foodMeta}>View nutrients and serving details</Text></View></View><FreshChevronIcon size={21} color={colors.muted} direction={nutritionOpen?'up':'down'}/></Pressable>{nutritionOpen?<View style={styles.ringRow}><RingMetric label="Calories" value={Math.round(totals.calories)} target={caloriesTarget} unit="kcal" color={colors.gold}/><RingMetric label="Protein" value={Math.round(totals.protein)} target={proteinTarget} unit="g" color={colors.green}/><RingMetric label="Carbs" value={Math.round(totals.carbs)} target={carbsTarget} unit="g" color={colors.blue}/><RingMetric label="Fat" value={Math.round(totals.fat)} target={fatTarget} unit="g" color={colors.gold}/></View>:null}</Card>:<Card><SectionTitle title="Meal journal" subtitle="You can record meals and review your routine. Nutrition targets are not shown for younger accounts."/></Card>}

      {finderOpen?<Card>
        <View style={styles.sectionHeader}><SectionTitle title={locked?'Add a meal':`Add to ${mealType}`}/><Pressable onPress={()=>setFinderOpen(false)} style={styles.closeTarget} accessibilityRole="button" accessibilityLabel="Close food finder"><FreshCloseIcon size={26} color={colors.muted} accentColor={colors.primary}/></Pressable></View>
        <View style={styles.two}>{(['breakfast','lunch','dinner','snacks'] as const).map(x=><Pressable key={x} onPress={()=>setMealType(x)} style={[styles.goalPill,mealType===x&&styles.hit]}><Text style={styles.foodMeta}>{x[0].toUpperCase()+x.slice(1)}</Text></Pressable>)}</View>
        <Input value={query} onChangeText={updateQuery} placeholder={locked?'Search saved/common foods…':'Search chicken, oats, banana…'}/>
        {!locked?<><OutlineButton title={searching?'Searching…':'Search verified foods'} onPress={()=>onlineSearch(0)} disabled={searching}/><OutlineButton title="Scan barcode" onPress={()=>{setScanned(false);setScannerOpen(true)}}/></>:null}
        {manualOpen?<View style={styles.manualBox}>
          <Input value={manual.name} onChangeText={v=>setManual({...manual,name:v})} placeholder="Food or meal name"/>
          <Input value={manual.serving} onChangeText={v=>setManual({...manual,serving:v})} placeholder="Serving, e.g. 1 bowl"/>
          {!locked?<>
            <View style={styles.two}><Input style={{flex:1}} value={manual.calories} onChangeText={v=>setManual({...manual,calories:v})} keyboardType="decimal-pad" placeholder="Calories"/><Input style={{flex:1}} value={manual.protein} onChangeText={v=>setManual({...manual,protein:v})} keyboardType="decimal-pad" placeholder="Protein g"/></View>
            <View style={styles.two}><Input style={{flex:1}} value={manual.carbs} onChangeText={v=>setManual({...manual,carbs:v})} keyboardType="decimal-pad" placeholder="Carbs g"/><Input style={{flex:1}} value={manual.fat} onChangeText={v=>setManual({...manual,fat:v})} keyboardType="decimal-pad" placeholder="Fat g"/></View>
          </>:null}
          <OutlineButton title="Save & add" onPress={saveManual}/>
        </View>:null}
        {!locked&&providerFoods.length?<><SectionTitle title="Verified database results" subtitle={`Showing ${providerFoods.length}${providerTotal?` of ${providerTotal.toLocaleString()}`:''} matches`}/>{providerFoods.map((food)=><ProviderFoodRow key={food.provider_food_id} food={food} loading={detailLoadingId===food.provider_food_id} onOpen={()=>openProviderFood(food)}/>)}{providerHasMore?<OutlineButton title={searching?'LOADING…':'LOAD MORE RESULTS'} onPress={()=>onlineSearch(providerPage+1)} disabled={searching}/>:null}</>:null}
        <SectionTitle title="Saved & common foods" subtitle={query?`Local matches for “${query}”`:'Common foods and your saved foods'}/>{filtered.map((food,i)=><FoodRow key={`${food.source}-${food.id??food.name}-${i}`} food={food} onAdd={()=>addLog(food)} hideNutrition={locked}/>)}
      </Card>:null}
      {!locked?<Pressable onPress={()=>Linking.openURL('https://platform.fatsecret.com')}><Text style={[styles.sub,{textAlign:'center',color:colors.blue,textDecorationLine:'underline'}]}>Nutrition information powered by fatsecret Platform API</Text></Pressable>:null}
    </RefreshableScrollView>
  </KeyboardAvoidingView>;
});

export default FoodTab;

function ProviderFoodRow({food,loading,onOpen}:{food:ProviderFoodSummary;loading:boolean;onOpen:()=>void}){
  const {colors}=useTheme();const s=createStyles(colors);
  return <View style={s.foodRow}><View style={s.providerBadge}><Text style={s.providerBadgeText}>FS</Text></View><View style={{flex:1}}><Text style={s.foodName}>{food.name}</Text>{food.brand?<Text style={s.providerBrand}>{food.brand}</Text>:null}<Text style={s.foodMeta} numberOfLines={2}>{food.description||'Open to choose a verified serving.'}</Text></View><Pressable disabled={loading} onPress={onOpen} style={({pressed})=>[s.add,pressed&&{opacity:.72},loading&&{opacity:.5}]}><Text style={s.addText}>{loading?'…':'VIEW'}</Text></Pressable></View>;
}

function ProviderFoodDetailModal({food,selectedServingId,servingCount,mealType,onServing,onServingCount,onClose,onAdd}:{food:Food|null;selectedServingId:string|null;servingCount:string;mealType:MealType;onServing:(id:string|null)=>void;onServingCount:(value:string)=>void;onClose:()=>void;onAdd:()=>void}){
  const {colors}=useTheme();const s=createStyles(colors);
  const servings=food?.available_servings??[];
  const selected=servings.find((item)=>item.serving_id===selectedServingId)??servings[0];
  const count=Math.max(0,Number(servingCount)||0);
  const calories=Number(selected?.calories??food?.calories??0)*count;
  const protein=Number(selected?.protein_g??food?.protein_g??0)*count;
  const carbs=Number(selected?.carbs_g??food?.carbs_g??0)*count;
  const fat=Number(selected?.fat_g??food?.fat_g??0)*count;
  return <Modal visible={Boolean(food)} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={s.detailBackdrop} onPress={onClose}>
      <Pressable style={s.detailSheet} onPress={(event)=>event.stopPropagation()}>
        <View style={s.detailHeader}><View style={{flex:1}}><Text style={s.detailEyebrow}>FATSECRET VERIFIED FOOD</Text><Text style={s.detailName}>{food?.name}</Text>{food?.brand?<Text style={s.providerBrand}>{food.brand}</Text>:null}</View><Pressable onPress={onClose} style={s.closeTarget} accessibilityRole="button" accessibilityLabel="Close food details"><FreshCloseIcon size={26} color={colors.muted} accentColor={colors.primary}/></Pressable></View>
        <Text style={s.detailLabel}>Choose serving</Text>
        <ScrollView style={s.servingList} nestedScrollEnabled>{servings.length?servings.map((serving)=><Pressable key={serving.serving_id??serving.label} onPress={()=>onServing(serving.serving_id)} style={[s.servingOption,serving.serving_id===selectedServingId&&s.servingOptionActive]}><Text style={[s.servingOptionText,serving.serving_id===selectedServingId&&s.servingOptionTextActive]}>{serving.label}</Text><Text style={s.servingCalories}>{Math.round(serving.calories)} kcal</Text></Pressable>):<View style={s.servingOption}><Text style={s.servingOptionText}>{food?.serving??'1 serving'}</Text></View>}</ScrollView>
        <Text style={s.detailLabel}>Number of servings</Text><Input value={servingCount} onChangeText={onServingCount} keyboardType="decimal-pad" placeholder="1"/>
        <View style={s.detailNutrition}><View><Text style={s.detailMetricValue}>{Math.round(calories)}</Text><Text style={s.detailMetricLabel}>kcal</Text></View><View><Text style={s.detailMetricValue}>{Math.round(protein)}g</Text><Text style={s.detailMetricLabel}>protein</Text></View><View><Text style={s.detailMetricValue}>{Math.round(carbs)}g</Text><Text style={s.detailMetricLabel}>carbs</Text></View><View><Text style={s.detailMetricValue}>{Math.round(fat)}g</Text><Text style={s.detailMetricLabel}>fat</Text></View></View>
        <OutlineButton title={`ADD TO ${mealType.toUpperCase()}`} onPress={onAdd}/>
      </Pressable>
    </Pressable>
  </Modal>;
}

function MealDiaryCard({type,rows,expanded,locked,onToggle,onAdd,onRemove,onCopy,onSave}:{type:'breakfast'|'lunch'|'dinner'|'snacks';rows:any[];expanded:boolean;locked:boolean;onToggle:()=>void;onAdd:()=>void;onRemove:(row:any)=>void;onCopy:()=>void;onSave:()=>void}){
  const {colors}=useTheme();
  const s=createStyles(colors);
  const icon=<FitHubSpriteArt source={foodMealSprites} quadrant={mealArtQuadrants[type]} size={78}/>;
  const title=type[0].toUpperCase()+type.slice(1);
  return <Card style={s.mealCard}>
    <View style={s.mealHead}>
      <View style={s.mealIconCircle}>{icon}</View>
      <Pressable onPress={onToggle} style={s.mealHeadText} accessibilityRole="button" accessibilityLabel={`${title}, ${rows.length} items, ${expanded?'collapse':'expand'}`}><Text style={s.mealTitle}>{title}</Text><Text style={s.foodMeta}>{rows.length?`${rows.length} item${rows.length===1?'':'s'} logged`:'Nothing logged yet'}</Text></Pressable>
      <Pressable onPress={onToggle} style={s.mealToggle} accessibilityRole="button" accessibilityLabel={expanded?'Collapse meal':'Expand meal'}><FoodChevronIcon size={22} color={colors.muted} direction={expanded?'up':'down'}/></Pressable>
      <Pressable onPress={onAdd} style={s.redPlus} accessibilityRole="button" accessibilityLabel={`Add to ${title}`}><FoodPlusIcon size={27} color="#FFFFFF"/></Pressable>
    </View>
    {expanded?rows.map(row=><View key={row.id} style={s.mealFood}><View style={s.foodThumb}><FreshMealBowlIcon size={31} color={colors.text} accentColor={colors.primary}/></View><View style={{flex:1,minWidth:0}}><Text style={s.foodName} numberOfLines={1}>{row.food_name}</Text><Text style={s.foodMeta} numberOfLines={1}>{row.serving}</Text></View>{!locked?<Text style={s.kcal}>{Math.round(Number(row.calories??0))}</Text>:null}<Pressable onPress={()=>onRemove(row)} style={s.moreTarget} accessibilityRole="button" accessibilityLabel={`Options for ${row.food_name}`}><FreshMoreIcon size={22} color={colors.muted}/></Pressable></View>):null}
    {expanded&&rows.length?<View style={s.mealFooter}><Pressable onPress={onCopy} style={s.mealFooterAction}><FreshCopyIcon size={19} color={colors.text} accentColor={colors.primary}/><Text style={s.mealFooterText}>Copy yesterday</Text></Pressable><View style={s.mealFooterDivider}/><Pressable onPress={onSave} style={s.mealFooterAction}><FreshSavedIcon size={19} color={colors.text} accentColor={colors.primary}/><Text style={s.mealFooterText}>Save meal</Text></Pressable></View>:null}
  </Card>;
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
  return <View style={s.backRow}><Pressable onPress={onBack} style={s.backTarget} accessibilityRole="button" accessibilityLabel="Go back"><FreshChevronIcon size={26} color={colors.text} direction="left"/></Pressable><Text style={s.backTitle}>{title}</Text></View>;
}

const createStyles=(colors:any)=>StyleSheet.create({
  foodBackdrop:{position:'absolute',top:0,right:0,bottom:0,left:0,overflow:'hidden'},
  wrap:{paddingHorizontal:16,paddingTop:14,paddingBottom:118},
  headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},
  title:{color:colors.text,fontSize:32,fontWeight:'900',letterSpacing:-.8},
  todayButton:{minHeight:48,flexDirection:'row',alignItems:'center',gap:6,paddingLeft:12,paddingRight:2},
  todayTitle:{color:colors.text,fontSize:16,fontWeight:'900'},todayChevron:{color:colors.primary,fontSize:16},
  weekStrip:{flexDirection:'row',justifyContent:'space-between',marginBottom:14},
  weekDay:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',minHeight:62,paddingVertical:8,borderRadius:17},
  weekDayOn:{backgroundColor:colors.primary},
  weekName:{color:colors.muted,fontSize:9,fontWeight:'900'},
  weekNameOn:{color:'#FFFFFF'},
  weekNumber:{color:colors.text,fontSize:17,fontWeight:'900',marginTop:4},
  diaryHero:{flexDirection:'row',alignItems:'center',minHeight:154,paddingHorizontal:13,paddingVertical:16,borderRadius:24,marginBottom:14,shadowColor:colors.shadow,shadowOpacity:.11,shadowRadius:11,shadowOffset:{width:0,height:4},elevation:3},
  diaryIllustration:{width:132,height:122,alignItems:'center',justifyContent:'center',marginRight:6},
  diaryCopy:{flex:1},
  diaryEyebrow:{color:colors.text,fontSize:20,fontWeight:'900',letterSpacing:-.25},
  diarySub:{color:colors.muted,fontSize:11,marginTop:6,lineHeight:16},
  diaryCount:{color:colors.text,fontSize:13,fontWeight:'600',marginTop:15},
  diaryTrack:{height:8,borderRadius:99,backgroundColor:colors.panel2,overflow:'hidden',marginTop:10},
  diaryFill:{height:'100%',backgroundColor:colors.primary,borderRadius:99},
  quickActions:{flexDirection:'row',alignItems:'stretch',gap:8,marginBottom:15},
  quickAction:{flex:1,minWidth:0,minHeight:112,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderRadius:20,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,shadowColor:colors.shadow,shadowOpacity:.09,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:2},quickActionPressed:{opacity:.68,transform:[{scale:.98}]},
  quickIconCircle:{width:64,height:64,alignItems:'center',justifyContent:'center'},
  quickLabel:{color:colors.text,fontSize:10,fontWeight:'900',marginTop:4,textAlign:'center'},
  mealTimeline:{position:'relative',marginBottom:4},
  mealTimelineRail:{position:'absolute',left:18,top:52,bottom:52,width:2,backgroundColor:colors.primary,borderRadius:2,opacity:.28},
  mealTimelineRow:{flexDirection:'row',alignItems:'center',marginBottom:10},
  mealTimelineLane:{width:37,alignSelf:'stretch',alignItems:'center',justifyContent:'center'},
  mealTimelineDot:{width:14,height:14,borderRadius:7,backgroundColor:colors.primary,borderWidth:3,borderColor:colors.bg,shadowColor:colors.primary,shadowOpacity:.34,shadowRadius:5,elevation:2},
  mealTimelineCard:{flex:1,minWidth:0},
  mealIconCircle:{width:84,height:84,alignItems:'center',justifyContent:'center'},
  mealCard:{padding:0,overflow:'hidden',marginBottom:0,minHeight:112,borderRadius:22,shadowColor:colors.shadow,shadowOpacity:.08,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:2},
  mealHead:{minHeight:112,flexDirection:'row',alignItems:'center',paddingLeft:5,paddingRight:9,gap:3},
  mealHeadText:{flex:1,minWidth:0,justifyContent:'center',alignSelf:'stretch'},
  mealToggle:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},
  mealTitle:{color:colors.text,fontSize:19,fontWeight:'900',letterSpacing:-.2},
  redPlus:{width:50,height:50,borderRadius:25,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',shadowColor:colors.primary,shadowOpacity:.24,shadowRadius:7,shadowOffset:{width:0,height:3},elevation:3},
  mealFood:{flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:colors.border,padding:11},
  mealFooter:{flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:colors.border,minHeight:48},
  mealFooterAction:{flex:1,minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  mealFooterDivider:{width:1,height:23,backgroundColor:colors.border},
  mealFooterText:{color:colors.text,fontSize:11,fontWeight:'700'},
  foodThumb:{width:48,height:44,borderRadius:14,backgroundColor:colors.panel2,alignItems:'center',justifyContent:'center'},
  moreTarget:{width:48,height:48,borderRadius:15,alignItems:'center',justifyContent:'center'},
  waterCard:{minHeight:188,padding:16,backgroundColor:colors.panel,borderColor:colors.border,borderRadius:23,marginTop:3,shadowColor:colors.shadow,shadowOpacity:.1,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:2},waterTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},waterHeading:{flexDirection:'row',alignItems:'center',gap:10},waterTitle:{color:colors.text,fontSize:20,fontWeight:'900'},waterSub:{color:colors.muted,fontSize:12,marginTop:3},waterPlus:{width:50,height:50,borderRadius:25,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',shadowColor:colors.primary,shadowOpacity:.24,shadowRadius:7,shadowOffset:{width:0,height:3},elevation:3},
  waterHydrationRow:{flexDirection:'row',alignItems:'flex-end',marginTop:11},
  waterBottleStage:{width:82,height:82,alignItems:'center',justifyContent:'flex-end',marginRight:4},
  waterGlasses:{flex:1,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',paddingBottom:4},
  undoButton:{minHeight:48,alignSelf:'flex-start',justifyContent:'center'},undo:{color:colors.muted,fontSize:10,textDecorationLine:'underline'},
  nutritionCard:{padding:12},
  nutritionHeader:{minHeight:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  nutritionHeading:{flexDirection:'row',alignItems:'center',gap:10,flex:1,minWidth:0},
  nutritionIconStage:{width:46,height:46,borderRadius:15,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},
  nutritionTitle:{color:colors.text,fontSize:16,fontWeight:'900'},closeTarget:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},
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
  finderSubtitle:{color:colors.muted,fontSize:12,lineHeight:18,marginBottom:12},
  mealTabs:{flexDirection:'row',gap:7,marginBottom:12},
  mealTab:{flex:1,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,borderRadius:10,paddingVertical:9,alignItems:'center'},
  mealTabActive:{borderColor:colors.primary,backgroundColor:colors.primarySoft},
  mealTabText:{color:colors.muted,fontSize:9,fontWeight:'800'},
  mealTabTextActive:{color:colors.primary},
  searchPanel:{padding:12},
  searchField:{flexDirection:'row',alignItems:'center',gap:8},
  searchInput:{flex:1,marginBottom:0},
  finderActions:{gap:8,marginTop:8},
  finderShortcutRow:{flexDirection:'row',gap:8,marginBottom:14},
  finderShortcut:{flex:1,minHeight:72,borderWidth:1,borderColor:colors.border,borderRadius:13,backgroundColor:colors.panel,alignItems:'center',justifyContent:'center'},
  finderShortcutText:{color:colors.text,fontWeight:'800',fontSize:10,marginTop:5},
  customFoodCard:{marginBottom:14},
  two:{flexDirection:'row',gap:8},
  foodRow:{flexDirection:'row',alignItems:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:13,marginBottom:8},
  foodName:{color:colors.text,fontWeight:'900'},
  providerBadge:{width:36,height:36,borderRadius:11,backgroundColor:colors.greenSoft,borderWidth:1,borderColor:colors.green,alignItems:'center',justifyContent:'center',marginRight:10},
  providerBadgeText:{color:colors.green,fontWeight:'900',fontSize:10},
  providerBrand:{color:colors.primary,fontSize:10,fontWeight:'800',marginTop:2},
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
  backRow:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:12},
  backTarget:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},
  backTitle:{color:colors.text,fontSize:25,fontWeight:'900'},
  historyCard:{flexDirection:'row',alignItems:'center'},
  historyDate:{color:colors.text,fontWeight:'900',fontSize:15},
  goals:{alignItems:'flex-end',gap:5},
  goalPill:{color:colors.muted,fontSize:9,fontWeight:'900',backgroundColor:colors.panel2,paddingHorizontal:7,paddingVertical:4,borderRadius:7},
  hit:{color:colors.green,backgroundColor:colors.greenSoft},
  remove:{color:colors.danger,fontSize:9,fontWeight:'900',marginLeft:8},
  detailBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.62)',justifyContent:'flex-end'},
  detailSheet:{maxHeight:'86%',backgroundColor:colors.panel,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:colors.border,padding:18,paddingBottom:28},
  detailHeader:{flexDirection:'row',alignItems:'flex-start',gap:10,marginBottom:12},detailEyebrow:{color:colors.green,fontSize:8,fontWeight:'900',letterSpacing:.5},detailName:{color:colors.text,fontSize:22,fontWeight:'900',marginTop:4},
  detailLabel:{color:colors.muted,fontSize:9,fontWeight:'900',textTransform:'uppercase',marginTop:8,marginBottom:7},servingList:{maxHeight:220,marginBottom:5},servingOption:{minHeight:46,borderWidth:1,borderColor:colors.border,borderRadius:11,paddingHorizontal:11,marginBottom:6,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:colors.panel2},servingOptionActive:{borderColor:colors.primary,backgroundColor:colors.primarySoft},servingOptionText:{color:colors.text,fontSize:11,fontWeight:'800',flex:1,paddingRight:8},servingOptionTextActive:{color:colors.primary},servingCalories:{color:colors.muted,fontSize:9},
  detailNutrition:{flexDirection:'row',justifyContent:'space-between',backgroundColor:colors.panel2,borderRadius:13,padding:12,marginBottom:8},detailMetricValue:{color:colors.text,fontWeight:'900',fontSize:13,textAlign:'center'},detailMetricLabel:{color:colors.muted,fontSize:8,marginTop:2,textAlign:'center'}
});
