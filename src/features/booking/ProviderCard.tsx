import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getDb } from '../../database/schema';
import { useStore } from '../../store/useStore';

export interface ProviderCardProps {
  id: number;
  name: string;
  serviceCategory: string;
  area: string;
  rating: number;
  hourlyRate?: number;
  distance?: number;
  onBookingSuccess?: () => void;
}

export default function ProviderCard({ id, name, serviceCategory, area, rating, hourlyRate, distance, onBookingSuccess }: ProviderCardProps) {
  const [isBooked, setIsBooked] = useState(false);
  const currentUser = useStore((state) => state.currentUser);
  const showNotification = useStore((state) => state.showNotification);
  const showVendorNotification = useStore((state) => state.showVendorNotification);
  const triggerBookingRefresh = useStore((state) => state.triggerBookingRefresh);
  const setLastBookedProviderId = useStore((state) => state.setLastBookedProviderId);

  const handleBook = () => {
    if (!currentUser) return;
    
    try {
      const db = getDb();
      db.runSync(
        "INSERT INTO Bookings (customer_id, provider_id, service_time, status) VALUES (?, ?, ?, ?)",
        [currentUser.id, id, "As soon as possible", "CONFIRMED"]
      );
      
      showNotification(`Your booking with ${name} is confirmed!`);
      // After a short delay show the simulated vendor notification
      setTimeout(() => {
        showVendorNotification(`New Job Request: ${serviceCategory.toUpperCase()} at ${area}`);
      }, 1200);
      triggerBookingRefresh();
      setLastBookedProviderId(id);
      setIsBooked(true);
      
      if (onBookingSuccess) {
        onBookingSuccess();
      }
    } catch (e: any) {
      console.error("Booking Error:", e.message);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>Matched via AI</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.details}>
        {serviceCategory.toUpperCase()} • {area}{distance ? ` • 📍 ${distance.toFixed(1)} km` : ''}
      </Text>
      <View style={styles.statsContainer}>
        <Text style={styles.statText}>⭐ {rating}</Text>
        {hourlyRate ? <Text style={styles.statText}>Rs. {hourlyRate}/hr</Text> : null}
      </View>
      <TouchableOpacity 
        style={[styles.bookButton, isBooked && styles.bookedButton]} 
        onPress={handleBook}
        disabled={isBooked}
      >
        <Text style={styles.bookButtonText}>{isBooked ? 'Booked ✓' : 'Book Now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    marginRight: 12,
    width: 260,
    borderWidth: 1,
    borderColor: '#E7F3FF',
  },
  badgeContainer: {
    backgroundColor: '#E7F3FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: '#1877F2',
    fontSize: 12,
    fontWeight: '500',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#050505',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#65676B',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#050505',
  },
  bookButton: {
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bookedButton: {
    backgroundColor: '#31A24C', // success color
  }
});
