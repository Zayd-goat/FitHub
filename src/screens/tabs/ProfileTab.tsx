import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Chip, Input, RefreshableScrollView, useTheme } from '../../components/UI';
import BirthdayFields from '../../components/BirthdayFields';
import { cmFrom, kgFrom, maintenanceCalories, proteinTarget } from '../../lib/health';
import { BirthDateParts, formatBirthDate, profileAge, splitBirthDate, validateBirthDate } from '../../lib/profileAge';
import { Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { FreshChevronIcon } from '../../components/FitHubFreshIcons';
import { ProfileDetailIcon, ProfileDetailIconKind, ProfileIdSceneIcon, ProfileSceneIcon } from '../../components/FitHubTrackerIcons';
import { YouCardArtwork } from '../../components/YouCardArtwork';

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
  const displayGoal = currentAge != null && currentAge < 18 && profile.goal === 'fat_loss' ? 'improve_fitness' : profile.goal ?? 'improve_fitness';
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

  return <RefreshableScrollView onRefresh={onProfileChanged} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.pageHead}><View><Text style={styles.eyebrow}>YOUR FITHUB</Text><Text style={styles.title}>You</Text></View><View style={styles.tokenPill}><Text style={styles.tokenMark}>✦</Text><Text style={styles.tokenText}>{profile.tokens}</Text></View></View>
    <Card style={styles.profileCard}><View style={styles.profileRow}><View style={styles.avatarStage}>{profile.avatar_url?<Image source={{uri:profile.avatar_url}} style={styles.avatar}/>:<ProfileSceneIcon size={104} color={colors.text} accentColor={colors.primary} surfaceColor={colors.panel}/>}<View style={styles.onlineDot}/></View><View style={{flex:1,minWidth:0}}><Text style={styles.name}>@{profile.username}</Text><Text style={styles.email} numberOfLines={1}>{profile.email}</Text><View style={styles.goalPill}><Text style={styles.goalText}>{displayGoal.replaceAll('_',' ')}</Text></View></View></View><Pressable onPress={uploadAvatar} disabled={busy} style={styles.photoButton}><Text style={styles.photoButtonText}>{busy?'UPLOADING…':'EDIT PROFILE PHOTO'}</Text></Pressable><View style={styles.snapshotRow}><Snapshot label="Experience" value={(profile.fitness_level??'new').replaceAll('_',' ')}/><View style={styles.snapshotDivider}/><Snapshot label="Training" value={`${profile.workout_days_target??3} days`}/><View style={styles.snapshotDivider}/><Snapshot label="Age" value={currentAge!=null?String(currentAge):'—'}/></View></Card>

    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Quick access</Text><Text style={styles.sectionHint}>Your tools in one place</Text></View>
    <View style={styles.actionGrid}>
      {!hiddenFeatures.includes('journey')?<ActionTile title="Journey" sub="Reports & progress" icon={<YouCardArtwork kind="journey" width={132} height={91}/>} onPress={onOpenJourney}/>:null}
      {!hiddenFeatures.includes('supplements')?<ActionTile title="Supplements" sub="Reminders & calendar" icon={<YouCardArtwork kind="supplements" width={126} height={91}/>} onPress={onOpenSupplements}/>:null}
      <ActionTile title="Workout split" sub="Plan your week" icon={<YouCardArtwork kind="workoutSplit" width={136} height={91}/>} onPress={onOpenSplit}/>
      <ActionTile title="Gym together" sub="Shared sessions" icon={<YouCardArtwork kind="gymTogether" width={136} height={91}/>} onPress={onOpenSharedGym}/>
    </View>

    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>App & account</Text><Text style={styles.sectionHint}>Settings and community</Text></View>
    <View style={styles.accountGrid}>
      <AccountArtCard icon={<YouCardArtwork kind="customize" width={112} height={102}/>} title="Customize FitHub" sub={`Theme, colours and units · ${themeKey.replace(/([A-Z])/g,' $1').trim()}`} onPress={onOpenCustomization}/>
      <AccountArtCard icon={<YouCardArtwork kind="weeklySplit" width={138} height={100}/>} title="Weekly split" sub="Plan training and recovery days" onPress={onOpenSplit}/>
      {!hiddenFeatures.includes('clubs')?<AccountArtCard wide icon={<YouCardArtwork kind="clubs" width={174} height={110}/>} title="Clubs" sub="Community milestones, challenges and progress" onPress={onOpenClubs}/>:null}
    </View>

    <Card style={styles.detailsCard}><View style={styles.detailsHeader}><View style={styles.detailsHero}><ProfileIdSceneIcon size={78} color={colors.text} accentColor={colors.primary} surfaceColor={colors.panel}/></View><View style={styles.detailsHeaderCopy}><Text style={styles.detailsTitle}>Personal details</Text><Text style={styles.detailsSub}>Keep your profile and preferences current.</Text></View><Pressable onPress={()=>setEditing(!editing)} style={styles.editPill} accessibilityRole="button"><Text style={styles.edit}>{editing?'CLOSE':'EDIT'}</Text></Pressable></View>
      {!editing?<>
        <DetailGroup title="PROFILE"><DetailRow kind="birthday" label="Birthday" value={formatBirthDate(profile.date_of_birth)}/><DetailRow kind="age" label="Age (automatic)" value={currentAge!=null?String(currentAge):'—'} last/></DetailGroup>
        <DetailGroup title="TRAINING"><DetailRow kind="experience" label="Experience" value={profile.fitness_level?.replaceAll('_',' ')??'—'}/><DetailRow kind="activity" label="Activity" value={profile.activity_level?.replaceAll('_',' ')??'—'}/><DetailRow kind="training" label="Training days" value={`${profile.workout_days_target??3} / week`} last/></DetailGroup>
        <DetailGroup title="PREFERENCES"><DetailRow kind="goal" label="Goal" value={displayGoal.replaceAll('_',' ')}/><DetailRow kind="height" label="Height" value={profile.height_cm?(profile.height_unit==='in'?`${Math.round(profile.height_cm/2.54*10)/10} in`:`${Math.round(profile.height_cm)} cm`):'—'}/><DetailRow kind="weight" label="Weight" value={profile.weight_kg?(profile.weight_unit==='lb'?`${Math.round(profile.weight_kg/0.45359237*10)/10} lb`:`${profile.weight_kg.toFixed(1)} kg`):'—'} last/></DetailGroup>
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

function Snapshot({label,value}:{label:string;value:string}) { const {colors}=useTheme(); const s=createStyles(colors); return <View style={s.snapshot}><Text style={s.snapshotValue} numberOfLines={1}>{value}</Text><Text style={s.snapshotLabel}>{label}</Text></View>; }
function ActionTile({title,sub,icon,onPress}:{title:string;sub:string;icon:React.ReactNode;onPress:()=>void}) { const {colors}=useTheme(); const s=createStyles(colors); return <Pressable onPress={onPress} style={({pressed})=>[s.actionTile,pressed&&{opacity:.7}]} accessibilityRole="button"><View style={s.actionIcon}>{icon}</View><View style={s.actionCopy}><Text style={s.actionTitle}>{title}</Text><Text style={s.actionSub}>{sub}</Text></View><FreshChevronIcon size={18} color={colors.muted}/></Pressable>; }
function AccountArtCard({icon,title,sub,onPress,wide=false}:{icon:React.ReactNode;title:string;sub:string;onPress:()=>void;wide?:boolean}) {
  const {colors}=useTheme(); const s=createStyles(colors);
  return <Pressable onPress={onPress} style={({pressed})=>[s.accountCard,wide&&s.accountCardWide,pressed&&{opacity:.72}]} accessibilityRole="button">
    <View style={[s.accountArt,wide&&s.accountArtWide]}>{icon}</View>
    <View style={[s.accountCopy,wide&&s.accountCopyWide]}><Text style={s.accountTitle}>{title}</Text><Text style={s.accountSub}>{sub}</Text></View>
    <View style={s.accountChevron}><FreshChevronIcon size={19} color={colors.muted}/></View>
  </Pressable>;
}
function DetailGroup({title,children}:{title:string;children:React.ReactNode}) { const {colors}=useTheme(); const s=createStyles(colors); return <View style={s.detailGroupWrap}><Text style={s.detailGroupLabel}>{title}</Text><View style={s.detailGroup}>{children}</View></View>; }
function DetailRow({kind,label,value,last=false}:{kind:ProfileDetailIconKind;label:string;value:string;last?:boolean}) { const {colors}=useTheme(); const s=createStyles(colors); return <View style={[s.detailRow,last&&s.detailRowLast]}><View style={s.detailRowIcon}><ProfileDetailIcon kind={kind} size={34} color={colors.text} accentColor={colors.primary}/></View><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue} numberOfLines={2}>{value}</Text></View>; }
const createStyles=(colors:any)=>StyleSheet.create({
  wrap:{padding:16,paddingBottom:112},pageHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:14},eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1},title:{color:colors.text,fontSize:32,fontWeight:'900',letterSpacing:-.7,marginTop:2},tokenPill:{minHeight:44,borderRadius:15,backgroundColor:colors.primarySoft,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:13},tokenMark:{color:colors.primary,fontSize:15},tokenText:{color:colors.text,fontWeight:'900',fontSize:13},
  profileCard:{borderRadius:24,padding:15,marginBottom:19},profileRow:{flexDirection:'row',alignItems:'center',gap:13},avatarStage:{width:106,height:106,alignItems:'center',justifyContent:'center',position:'relative'},avatar:{width:96,height:96,borderRadius:30,borderWidth:2,borderColor:colors.primary},onlineDot:{position:'absolute',right:4,bottom:7,width:18,height:18,borderRadius:9,backgroundColor:colors.green,borderWidth:3,borderColor:colors.panel},name:{color:colors.text,fontWeight:'900',fontSize:20},email:{color:colors.muted,fontSize:10,marginTop:5},goalPill:{alignSelf:'flex-start',backgroundColor:colors.primarySoft,borderRadius:99,paddingHorizontal:9,paddingVertical:6,marginTop:10},goalText:{color:colors.primary,fontSize:8,fontWeight:'900',textTransform:'capitalize'},photoButton:{minHeight:48,borderRadius:15,borderWidth:1,borderColor:colors.primary,alignItems:'center',justifyContent:'center',marginTop:12},photoButtonText:{color:colors.primary,fontSize:10,fontWeight:'900',letterSpacing:.3},snapshotRow:{flexDirection:'row',alignItems:'center',marginTop:14,paddingTop:13,borderTopWidth:1,borderTopColor:colors.border},snapshot:{flex:1,alignItems:'center',minWidth:0},snapshotValue:{color:colors.text,fontSize:12,fontWeight:'900',textTransform:'capitalize'},snapshotLabel:{color:colors.muted,fontSize:8,marginTop:3},snapshotDivider:{width:1,height:27,backgroundColor:colors.border},
  sectionHeading:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:9,marginTop:4},sectionTitle:{color:colors.text,fontSize:20,fontWeight:'900'},sectionHint:{color:colors.muted,fontSize:9,fontWeight:'700'},actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:20},actionTile:{width:'48.6%',minHeight:181,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,borderRadius:22,padding:11,shadowColor:colors.shadow,shadowOpacity:.09,shadowRadius:9,shadowOffset:{width:0,height:4},elevation:3},actionIcon:{height:104,alignItems:'center',justifyContent:'center'},actionCopy:{minHeight:48},actionTitle:{color:colors.text,fontSize:14,fontWeight:'900'},actionSub:{color:colors.muted,fontSize:9,lineHeight:13,marginTop:4},
  accountGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:21},accountCard:{width:'48.5%',minHeight:181,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel,borderRadius:22,padding:12,position:'relative',shadowColor:colors.shadow,shadowOpacity:.08,shadowRadius:9,shadowOffset:{width:0,height:4},elevation:2},accountCardWide:{width:'100%',minHeight:132,flexDirection:'row',alignItems:'center',paddingRight:42},accountArt:{height:100,alignItems:'center',justifyContent:'center'},accountArtWide:{width:112,height:108,flexShrink:0},accountCopy:{paddingHorizontal:3},accountCopyWide:{flex:1,paddingHorizontal:7},accountTitle:{color:colors.text,fontSize:14,fontWeight:'900'},accountSub:{color:colors.muted,fontSize:9,lineHeight:13,marginTop:4},accountChevron:{position:'absolute',right:12,top:14,width:28,height:28,alignItems:'center',justifyContent:'center'},
  detailsCard:{borderRadius:24,padding:14,marginBottom:14},detailsHeader:{flexDirection:'row',alignItems:'center',gap:9,paddingBottom:13,borderBottomWidth:1,borderBottomColor:colors.border},detailsHero:{width:80,height:80,borderRadius:22,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center',overflow:'hidden'},detailsHeaderCopy:{flex:1,minWidth:0},detailsTitle:{color:colors.text,fontSize:19,fontWeight:'900'},detailsSub:{color:colors.muted,fontSize:9,lineHeight:14,marginTop:3},editPill:{minWidth:56,minHeight:44,borderRadius:14,borderWidth:1,borderColor:colors.primary,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center',paddingHorizontal:9},edit:{color:colors.primary,fontWeight:'900',fontSize:10},detailGroupWrap:{marginTop:14},detailGroupLabel:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1.15,marginLeft:4,marginBottom:7},detailGroup:{borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel2,borderRadius:18,paddingHorizontal:11},detailRow:{minHeight:62,flexDirection:'row',alignItems:'center',gap:9,borderBottomWidth:1,borderBottomColor:colors.border},detailRowLast:{borderBottomWidth:0},detailRowIcon:{width:40,height:40,borderRadius:13,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},detailLabel:{flex:1,color:colors.muted,fontSize:11,fontWeight:'700'},detailValue:{maxWidth:'43%',color:colors.text,fontWeight:'900',fontSize:12,textAlign:'right',textTransform:'capitalize'},label:{color:colors.muted,fontWeight:'900',fontSize:10,marginTop:12,marginBottom:7},birthdayHelp:{color:colors.muted,fontSize:10,lineHeight:15,marginTop:-3,marginBottom:8},wrapChips:{flexDirection:'row',flexWrap:'wrap'},inline:{flexDirection:'row',gap:8,alignItems:'flex-start'},units:{flexDirection:'row',paddingTop:4}
});
