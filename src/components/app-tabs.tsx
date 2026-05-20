import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useColorScheme, Platform } from 'react-native';
import { useStore } from '../store/useStore';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const currentUser = useStore((state) => state.currentUser);

  const getFirstTabName = () => {
    if (!currentUser) return 'Find Karigar';
    return currentUser.role === 'VENDOR' ? 'Jobs' : 'Find Karigar';
  };

  const getSecondTabName = () => {
    if (!currentUser) return 'Bookings';
    return currentUser.role === 'VENDOR' ? 'My Shop' : 'Bookings';
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1877F2',
        tabBarInactiveTintColor: '#8A8D91',
        tabBarStyle: { paddingTop: 6, backgroundColor: '#FFFFFF', paddingBottom: Platform.OS === 'ios' ? 20 : 8, height: Platform.OS === 'ios' ? 80 : 65 },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: getFirstTabName(),
          tabBarIcon: ({ color }) => (
            <Ionicons name={currentUser?.role === 'VENDOR' ? 'briefcase' : 'search'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: getSecondTabName(),
          tabBarIcon: ({ color }) => (
            <Ionicons name={currentUser?.role === 'VENDOR' ? 'person' : 'receipt'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

