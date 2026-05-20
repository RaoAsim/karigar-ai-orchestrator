import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    SystemUI.setBackgroundColorAsync('#FFFFFF').catch(() => {});
    registerForPushNotificationsAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {currentUser ? (
          <>
            <AnimatedSplashOverlay />
            <AppTabs />
          </>
        ) : (
          <LoginScreen />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
