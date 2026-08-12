import React, { useState } from 'react';
import { Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Profile } from '../lib/types';
import { useTheme } from '../components/UI';
import DashboardTab, { DailyActivityFocus, HomeProgressFocus } from './tabs/DashboardTab';
import FoodTab from './tabs/FoodTab';
import WorkoutTab from './tabs/WorkoutTab';
import FriendsTab from './tabs/FriendsTab';
import ProfileTab from './tabs/ProfileTab';
import ProgressScreen, { ProgressFocus } from './ProgressScreen';
import WorkoutHistoryScreen from './WorkoutHistoryScreen';
import DailyActivityScreen from './DailyActivityScreen';

const tabs = [
  ['home', require('../../assets/nav/home.png'), 'Home'],
  ['food', require('../../assets/nav/food.png'), 'Food'],
  ['workout', require('../../assets/nav/workout.png'), 'Train'],
  ['friends', require('../../assets/nav/friends.png'), 'Friends'],
  ['profile', require('../../assets/nav/profile.png'), 'You'],
] as const;

type Tab = typeof tabs[number][0];
type Page = 'main' | 'progress' | 'history' | 'daily';

export default function MainApp({ profile, onProfileChanged }: { profile: Profile; onProfileChanged: () => void }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('home');
  const [page, setPage] = useState<Page>('main');
  const [progressFocus, setProgressFocus] = useState<ProgressFocus>('overview');
  const [dailyFocus, setDailyFocus] = useState<DailyActivityFocus>('volume');
  const [historySessionId, setHistorySessionId] = useState<string | undefined>();
  const styles = createStyles(colors);

  const chooseTab = (next: Tab) => { setTab(next); setPage('main'); };
  const openProgress = (focus: HomeProgressFocus = 'overview') => { setProgressFocus(focus); setPage('progress'); };
  const openHistory = (sessionId?: string) => { setHistorySessionId(sessionId); setPage('history'); };
  const openDaily = (focus: DailyActivityFocus) => { setDailyFocus(focus); setPage('daily'); };

  return (
    <View style={styles.safe}>
      <StatusBar hidden translucent backgroundColor="transparent" />
      <View style={styles.content}>
        {page === 'progress' ? <ProgressScreen profile={profile} focus={progressFocus} onBack={() => setPage('main')} /> :
         page === 'history' ? <WorkoutHistoryScreen profile={profile} initialSessionId={historySessionId} onBack={() => setPage('main')} /> :
         page === 'daily' ? <DailyActivityScreen profile={profile} focus={dailyFocus} onBack={() => setPage('main')} /> : <>
          {tab === 'home' && <DashboardTab profile={profile} onStartWorkout={() => chooseTab('workout')} onViewProgress={openProgress} onViewWorkouts={openHistory} onViewDailyActivity={openDaily} />}
          {tab === 'food' && <FoodTab profile={profile} />}
          {tab === 'workout' && <WorkoutTab profile={profile} onProfileChanged={onProfileChanged} />}
          {tab === 'friends' && <FriendsTab profile={profile} />}
          {tab === 'profile' && <ProfileTab profile={profile} onProfileChanged={onProfileChanged} />}
        </>}
      </View>
      <View style={styles.nav}>
        {tabs.map(([key, icon, label]) => {
          const active = page === 'main' && tab === key;
          return (
            <Pressable key={key} onPress={() => chooseTab(key)} style={styles.navItem}>
              <Image source={icon} style={[styles.navIcon, { tintColor: active ? colors.primary : colors.muted }]} />
              <Text style={[styles.navLabel, active && { color: colors.primary, fontWeight: '900' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  nav: { minHeight: 66, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.nav, paddingBottom: 5, paddingTop: 4 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 23, height: 23, resizeMode: 'contain' },
  navLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 3 },
});
