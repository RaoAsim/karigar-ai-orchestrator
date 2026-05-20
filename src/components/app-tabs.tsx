import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme } from 'react-native';
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
    <NativeTabs
      backgroundColor="#FFFFFF"
      indicatorColor="transparent"
      labelStyle={{ 
        color: '#8A8D91',
        fontWeight: '500',
        fontSize: 11,
        selected: { color: '#1877F2', fontWeight: '700' }
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{getFirstTabName()}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{getSecondTabName()}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

