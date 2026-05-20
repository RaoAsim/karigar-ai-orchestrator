import React from 'react';
import { useStore } from '../store/useStore';
import MyBookingsScreen from '../features/dashboard/MyBookingsScreen';
import VendorProfileScreen from '../features/dashboard/VendorProfileScreen';
import { View, Text } from 'react-native';

export default function TabTwoScreen() {
  const currentUser = useStore((state) => state.currentUser);

  if (!currentUser) return <View><Text>Loading...</Text></View>;

  if (currentUser.role === 'VENDOR') {
    return <VendorProfileScreen />;
  }

  return <MyBookingsScreen />;
}
