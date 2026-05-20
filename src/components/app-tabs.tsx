import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const currentUser = useStore((state) => state.currentUser);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 14);

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
        sceneStyle: { backgroundColor: '#F0F2F5' },
        tabBarStyle: {
          height: 58 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E7F3FF',
          elevation: 12,
          shadowColor: '#050505',
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: { paddingVertical: 4 },
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

