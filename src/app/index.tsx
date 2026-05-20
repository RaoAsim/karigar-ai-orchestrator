import React from 'react';
import ChatScreen from '../features/chat/ChatScreen';
import VendorDashboard from '../features/dashboard/VendorDashboard';
import { useStore } from '../store/useStore';

export default function HomeScreen() {
  const currentUser = useStore((state) => state.currentUser);

  if (currentUser?.role === 'VENDOR') {
    return <VendorDashboard />;
  }

  return <ChatScreen />;
}
