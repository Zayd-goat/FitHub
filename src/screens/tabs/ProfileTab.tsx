import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Chip, Input, RefreshableScrollView, SectionTitle, useTheme } from '../../components/UI';
import BirthdayFields from '../../components/BirthdayFields';
import { cmFrom, kgFrom, maintenanceCalories, proteinTarget } from '../../lib/health';
import { BirthDateParts, formatBirthDate, profileAge, splitBirthDate, validateBirthDate } from '../../lib/profileAge';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';

type Props = {
  profile: Profile;
  onProfileChanged: () => void;
  onOpenCustomization: () => void;
  onOpenSupplements: () => void;
  onOpenSplit: () => void;
  onOpenClubs: () => void;
  onOpenJourney: () => void;
  onOpenSharedGym: () => void;
};

export type ProfileTabHandle = { goBack: () => boolean };

const ProfileTab = forwardRef<ProfileTabHandle, Props>(function ProfileTab({ profile, onProfileChanged, onOpenCustomization, onOpenSupplements, onOpenSplit, onOpenClubs, onOpenJourney, onOpenSharedGym }, ref) {
  const { colors, themeKey, hiddenFeatures } = useTheme();
  const styles = createStyles(colors);
  const currentAge = profileAge(profile);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [birthday,setBirthday]=useState<BirthDateParts>({month:'',day:'',year:''});
  const [fitness,setFitness]=useState('new');
  const [activity,setActivity]=useState('light');
  const [gender,setGender]=useState('prefer_not_to_say');
  const [goal,setGoal]=useState('improve_fitness');
  const [days,setDays]=useState('3');
  const [heightUnit,setHeightUnit]=useState<'cm'|'in'>('cm');
  const [weightUnit,setWeightUnit]=useState<'kg'|'lb'>('kg');
  const [height,setHeight]=useState('');
  const [weight,setWeight]=useState('');
  const editedAge = validateBirthDate(birthday).age ?? currentAge;
  const goalChoices: [string,string][] = editedAge != null && editedAge < 18
    ? [['improve_fitness','Improve fitness'],['build_consistency','Build consistency'],['sports_performance','Sports performance'],['maintain','General wellbeing']]
    : [['gain_muscle','Gain muscle'],['fat_loss','Lose fat'],['maintain','Maintain'],['improve_fitness','Improve fitness']];

  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (!editing) return false;
      setEditing(false);
      return true;
    },
  }), [editing]);

  useEffect(()=>{
    const hu=(profile.height_unit==='in'?'in':'cm') as 'cm'|'in';
    const wu=(profile.weight_unit==='lb'?'lb':'kg') as 'kg'|'lb';
    setHeightUnit(hu); setWeightUnit(wu);
    setBirthday(splitBirthDate(profile.date_of_birth));
    setFitness(profile.fitness_level??'new'); setActivity(profile.activity_level??'light'); setGender(profile.gender??'prefer_not_to_say'); setGoal(currentAge != null && currentAge < 18 && profile.goal === 'fat_loss' ? 'improve_fitness' : profile.goal??'improve_fitness'); setDays(String(profile.workout_days_target??3));
    setHeight(profile.height_cm?String(hu==='cm'?Math.round(profile.height_cm*10)/10:Math.round(profile.height_cm/2.54*10)/10):'');
    setWeight(profile.weight_kg?String(wu==='kg'?Math.round(profile.weight_kg*10)/10:Math.round(profile.weight_kg/0.45359237*10)/10):'');
  },[profile]);

  const uploadAvatar=async()=>{
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.8});
    if(result.canceled)return;
    setBusy(true);
    try{
      const asset=result.assets[0]; const bytes=await(await fetch(asset.uri)).arrayBuffer(); const ext=(asset.fileName?.split('.').pop()||'jpg').toLowerCase(); const path=`${profile.id}/avatar.${ext}`;
      const {error:up}=await supabase.storage.from('avatars').upload(path,bytes,{contentType:asset.mimeType??'image/jpeg',upsert:true}); if(up)throw up;
      const {data}=supabase.storage.from('avatars').getPublicUrl(path);
      const {error}=await supabase.from('profiles').update({avatar_url:`${data.publicUrl}?v=${Date.now()}`}).eq('id',profile.id); if(error)throw error;
      onProfileChanged();
    }catch(e:any){Alert.alert('Profile photo',e?.message??'Upload failed.');}finally{setBusy(false);}
  };

  const saveDetails=async()=>{
    const birth=validateBirthDate(birthday);
    const a=birth.age,w=Number(weight),h=Number(height),d=Number(days);
    if(birth.error||!birth.iso||a==null)return Alert.alert('Check your birthday',birth.error??'Enter a valid birthday.');
    if(!w||w<=0||!h||h<=0||!d||d<1||d>7)return Alert.alert('Check your details','Enter valid height, weight and training days.');
    const kg=kgFrom(w,weightUnit),cm=cmFrom(h,heightUnit),adult=a>=18;
    const safeGoal=!adult&&goal==='fat_loss'?'improve_fitness':goal;
    const payload:any={age:a,date_of_birth:birth.iso,fitness_level:fitness,activity_level:activity,gender,goal:safeGoal,workout_days_target:d,height_cm:cm,weight_kg:kg,height_unit:heightUnit,weight_unit:weightUnit,maintenance_calories:adult?maintenanceCalories(a,kg,cm,gender,activity):null,protein_target_g:adult?proteinTarget(kg,safeGoal):null};
    setBusy(true);
    let {error}=await supabase.from('profiles').update(payload).eq('id',profile.id);
    if(error&&/height_unit|weight_unit/i.test(error.message)){delete payload.height_unit;delete payload.weight_unit;({error}=await supabase.from('profiles').update(payload).eq('id',profile.id));}
    setBusy(false);
    if(error&&/date_of_birth/i.test(error.message))return Alert.alert('Database update required','Run the FitHub 1.6.18 Supabase SQL update, then save again.');
    if(error)return Alert.alert('Could not save',error.message);
    setEditing(false); onProfileChanged();
  };

  return <RefreshableScrollView onRefresh={onProfileChanged} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>You</Text>
    <Card><View style={styles.profileRow}>{profile.avatar_url?<Image source={{uri:profile.avatar_url}} style={styles.avatar}/>:<View style={[styles.avatar,styles.fallback]}><Text style={styles.initial}>{profile.username.slice(0,1).toUpperCase()}</Text></View>}<View style={{flex:1}}><Text style={styles.name}>@{profile.username}</Text><Text style={styles.meta}>{profile.email}</Text><Text style={styles.meta}>✦ {profile.tokens} tokens</Text></View></View><Button title={busy?'Uploading…':'Change profile picture'} onPress={uploadAvatar} disabled={busy} secondary/></Card>

    <Card><SectionTitle title="FitHub settings" subtitle={`Current theme: ${themeKey.replace(/([A-Z])/g,' $1').trim()}. Hidden features can always be restored.`}/>
      <SettingsRow title="Customize FitHub" sub="Themes, colours, light/dark mode, units and feature visibility" onPress={onOpenCustomization}/>
      {!hiddenFeatures.includes('supplements') ? <SettingsRow title="Supplement reminders" sub="Choose your own reminder label and daily time" onPress={onOpenSupplements}/> : null}
      <SettingsRow title="Workout split" sub="Set Push / Pull / Legs / Rest or your own weekly schedule" onPress={onOpenSplit}/>
      {!hiddenFeatures.includes('journey') ? <SettingsRow title="My Fitness Journey" sub="Weekly and monthly training reports" onPress={onOpenJourney}/> : null}
      <SettingsRow title="Shared gym sessions" sub="Invite friends and approve a joint completed-workout post" onPress={onOpenSharedGym}/>
      {!hiddenFeatures.includes('clubs') ? <SettingsRow title="Clubs" sub="Adult load-based milestones unlocked from PRs" onPress={onOpenClubs}/> : null}
    </Card>

    <Card><View style={styles.cardTitleRow}><SectionTitle title="Personal & fitness details" subtitle="Change your onboarding answers whenever you need to."/><Pressable onPress={()=>setEditing(!editing)}><Text style={styles.edit}>{editing?'Close':'Edit'}</Text></Pressable></View>
      {!editing?<>
        <Info label="Birthday" value={formatBirthDate(profile.date_of_birth)}/><Info label="Age (automatic)" value={profileAge(profile)!=null?String(profileAge(profile)):'—'}/><Info label="Experience" value={profile.fitness_level?.replaceAll('_',' ')??'—'}/><Info label="Activity" value={profile.activity_level?.replaceAll('_',' ')??'—'}/><Info label="Goal" value={profile.goal?.replaceAll('_',' ')??'—'}/><Info label="Height" value={profile.height_cm?`${Math.round(profile.height_cm)} cm`:'—'}/><Info label="Weight" value={profile.weight_kg?`${profile.weight_kg.toFixed(1)} kg`:'—'}/><Info label="Training days" value={`${profile.workout_days_target} / week`}/>
      </>:<View>
        <Text style={styles.label}>Birthday</Text><BirthdayFields value={birthday} onChange={setBirthday}/><Text style={styles.birthdayHelp}>Your age is calculated automatically from this date.</Text>
        <Text style={styles.label}>Training experience</Text><View style={styles.wrapChips}>{[['new','Completely new'],['occasional','Occasional'],['regular','Regular']].map(([v,l])=><Chip key={v} label={l} active={fitness===v} onPress={()=>setFitness(v)}/>)}</View>
        <Text style={styles.label}>Activity outside workouts</Text><View style={styles.wrapChips}>{[['sedentary','Mostly seated'],['light','Light'],['moderate','Moderate'],['high','High']].map(([v,l])=><Chip key={v} label={l} active={activity===v} onPress={()=>setActivity(v)}/>)}</View>
        <Text style={styles.label}>Profile option</Text><View style={styles.wrapChips}>{[['female','Female'],['male','Male'],['prefer_not_to_say','Prefer not to say']].map(([v,l])=><Chip key={v} label={l} active={gender===v} onPress={()=>setGender(v)}/>)}</View>
        <Text style={styles.label}>Height</Text><View style={styles.inline}><Input style={{flex:1}} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="Height"/><View style={styles.units}><Chip label="cm" active={heightUnit==='cm'} onPress={()=>setHeightUnit('cm')}/><Chip label="in" active={heightUnit==='in'} onPress={()=>setHeightUnit('in')}/></View></View>
        <Text style={styles.label}>Weight</Text><View style={styles.inline}><Input style={{flex:1}} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Weight"/><View style={styles.units}><Chip label="kg" active={weightUnit==='kg'} onPress={()=>setWeightUnit('kg')}/><Chip label="lb" active={weightUnit==='lb'} onPress={()=>setWeightUnit('lb')}/></View></View>
        <Text style={styles.label}>Main goal</Text><View style={styles.wrapChips}>{goalChoices.map(([v,l])=><Chip key={v} label={l} active={goal===v} onPress={()=>setGoal(v)}/>)}</View>
        <Text style={styles.label}>Workout days per week</Text><Input value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="1-7"/><Button title={busy?'Saving…':'Save changes'} onPress={saveDetails} disabled={busy}/>
      </View>}
    </Card>

    <Button title="Sign out" onPress={()=>supabase.auth.signOut()} secondary />
  </RefreshableScrollView>;
});

export default ProfileTab;

function SettingsRow({title,sub,onPress}:{title:string;sub:string;onPress:()=>void}) { const {colors}=useTheme(); const s=createStyles(colors); return <Pressable onPress={onPress} style={s.settingsRow}><View style={{flex:1}}><Text style={s.settingsTitle}>{title}</Text><Text style={s.settingsSub}>{sub}</Text></View><Text style={s.chev}>›</Text></Pressable>; }
function Info({label,value}:{label:string;value:string}) { const {colors}=useTheme(); const s=createStyles(colors); return <View style={s.info}><Text style={s.meta}>{label}</Text><Text style={s.infoValue}>{value}</Text></View>; }
const createStyles=(colors:any)=>StyleSheet.create({wrap:{padding:16,paddingBottom:40},title:{color:colors.text,fontSize:29,fontWeight:'900',marginBottom:14},profileRow:{flexDirection:'row',alignItems:'center',gap:12},avatar:{width:60,height:60,borderRadius:30},fallback:{backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},initial:{color:colors.primary,fontWeight:'900',fontSize:22},name:{color:colors.text,fontWeight:'900',fontSize:18},meta:{color:colors.muted,fontSize:11,marginTop:3},settingsRow:{flexDirection:'row',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.border},settingsTitle:{color:colors.text,fontWeight:'900'},settingsSub:{color:colors.muted,fontSize:10,marginTop:3,lineHeight:15},chev:{color:colors.muted,fontSize:24},cardTitleRow:{flexDirection:'row',gap:8,alignItems:'flex-start'},edit:{color:colors.blue,fontWeight:'900',fontSize:11,paddingTop:5},info:{flexDirection:'row',justifyContent:'space-between',gap:10,paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border},infoValue:{color:colors.text,fontWeight:'900',textTransform:'capitalize'},label:{color:colors.muted,fontWeight:'900',fontSize:10,marginTop:6,marginBottom:7},birthdayHelp:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:-3,marginBottom:8},wrapChips:{flexDirection:'row',flexWrap:'wrap'},inline:{flexDirection:'row',gap:8,alignItems:'flex-start'},units:{flexDirection:'row',paddingTop:4}});
