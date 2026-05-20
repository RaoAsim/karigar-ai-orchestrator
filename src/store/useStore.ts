import { create } from 'zustand';
import { triggerLocalNotification } from '../utils/notifications';

export type UserRole = 'CUSTOMER' | 'VENDOR';

export interface User {
  id: number;
  phone_number: string;
  role: UserRole;
  name: string;
}

// Predefined service categories — only these are allowed in the system
export const SERVICE_CATEGORIES = [
  'plumber',
  'electrician',
  'ac technician',
  'painter',
  'carpenter',
  'cleaner',
  'tutor',
  'beautician',
  'mechanic',
  'driver',
  'cook',
  'security guard',
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  notification: string | null;
  vendorNotification: string | null;
  showNotification: (msg: string) => void;
  showVendorNotification: (msg: string) => void;
  hideNotification: () => void;
  bookingRefreshKey: number;
  triggerBookingRefresh: () => void;
  lastBookedProviderId: number | null;
  setLastBookedProviderId: (id: number) => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: null }),
  notification: null,
  vendorNotification: null,
  showNotification: (msg) => {
    set({ notification: msg });
    triggerLocalNotification('Customer Alert', msg);
    setTimeout(() => {
      set({ notification: null });
    }, 4500);
  },
  showVendorNotification: (msg) => {
    set({ vendorNotification: msg });
    triggerLocalNotification('Vendor Alert', msg);
    setTimeout(() => {
      set({ vendorNotification: null });
    }, 5000);
  },
  hideNotification: () => set({ notification: null }),
  bookingRefreshKey: 0,
  triggerBookingRefresh: () => set((state) => ({ bookingRefreshKey: state.bookingRefreshKey + 1 })),
  lastBookedProviderId: null,
  setLastBookedProviderId: (id) => set({ lastBookedProviderId: id }),
}));
