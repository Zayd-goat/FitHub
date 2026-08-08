import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Profile } from '../lib/types';
import { useTheme } from '../components/UI';
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
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<Tab>('home');
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.content}>
        {tab === 'home' && <DashboardTab profile={profile} onStartWorkout={() => setTab('workout')} />}
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
              <Image source={icon} style={[styles.navIcon, { tintColor: active ? colors.primary : colors.muted }]} />
              <Text style={[styles.navLabel, active && { color: colors.primary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  nav: { minHeight: 70, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.nav, paddingBottom: 5, paddingTop: 4 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 22, height: 22, resizeMode: 'contain' },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 4 }
});
