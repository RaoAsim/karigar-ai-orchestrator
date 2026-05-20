import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { initDb, seedDb } from '../database/schema';
import { useStore } from '../store/useStore';
import LoginScreen from '../features/auth/LoginScreen';
import { registerForPushNotificationsAsync } from '../utils/notifications';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const currentUser = useStore((state) => state.currentUser);

  useEffect(() => {
    initDb();
    seedDb();
    registerForPushNotificationsAsync();
  }, []);

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
