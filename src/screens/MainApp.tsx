import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Profile } from '../lib/types';
import { colors } from '../components/UI';
import DashboardTab from './tabs/DashboardTab';
import FoodTab from './tabs/FoodTab';
import WorkoutTab from './tabs/WorkoutTab';
import FriendsTab from './tabs/FriendsTab';
import ProfileTab from './tabs/ProfileTab';

const tabs = [
  ['home', require('../../assets/nav/home.png'), 'Home'],
  ['food', require('../../assets/nav/food.png'), 'Food'],
  ['workout', require('../../assets/nav/workout.png'), 'Train'],
  ['friends', require('../../assets/nav/friends.png'), 'Friends'],
  ['profile', require('../../assets/nav/profile.png'), 'You']
] as const;

type Tab = typeof tabs[number][0];

export default function MainApp({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const [tab, setTab] = useState<Tab>('home');
  const nutritionLocked = (profile.age ?? 0) < 18;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>FitHub</Text>
          <Text style={styles.hello}>@{profile.username}</Text>
        </View>
        <View style={styles.caloriePill}>
          <Text style={styles.calorieLabel}>MAINTENANCE</Text>
          <Text style={styles.calorieValue}>{nutritionLocked ? '18+ only' : `${profile.maintenance_calories ?? '—'} kcal`}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'home' && <DashboardTab profile={profile} />}
        {tab === 'food' && <FoodTab profile={profile} />}
        {tab === 'workout' && <WorkoutTab profile={profile} onProfileChanged={onProfileChanged} />}
        {tab === 'friends' && <FriendsTab profile={profile} />}
        {tab === 'profile' && <ProfileTab profile={profile} onProfileChanged={onProfileChanged} />}
      </View>

      <View style={styles.nav}>
        {tabs.map(([key, icon, label]) => {
          const active = tab === key;
          return (
            <Pressable key={key} onPress={() => setTab(key)} style={styles.navItem}>
              <View style={[styles.iconShell, active && styles.iconShellActive]}>
                <Image source={icon} style={[styles.navIcon, { tintColor: active ? '#FFFFFF' : colors.muted }]} />
              </View>
              <Text style={[styles.navLabel, active && styles.activeLabel]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { minHeight: 72, paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg },
  brand: { color: colors.text, fontSize: 23, fontWeight: '900', letterSpacing: -.5 },
  hello: { color: colors.muted, fontSize: 12, marginTop: 2 },
  caloriePill: { backgroundColor: colors.blueSoft, borderColor: colors.blue, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 7, alignItems: 'flex-end' },
  calorieLabel: { color: colors.blue, fontWeight: '900', fontSize: 9, letterSpacing: .8 },
  calorieValue: { color: colors.text, fontWeight: '900', fontSize: 17 },
  nav: { minHeight: 72, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg, paddingBottom: 4 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconShell: { width: 38, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconShellActive: { backgroundColor: colors.primary },
  navIcon: { width: 22, height: 22, resizeMode: 'contain' },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 2 },
  activeLabel: { color: colors.primary }
});
