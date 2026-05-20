import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Platform, StatusBar } from 'react-native';
import { getDb } from '../../database/schema';
import { useStore } from '../../store/useStore';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const currentUser = useStore((state) => state.currentUser);
  const bookingRefreshKey = useStore((state) => state.bookingRefreshKey);

  const fetchBookings = () => {
    if (!currentUser) return;
    try {
      const db = getDb();
      const results = db.getAllSync<any>(
        `SELECT b.id, p.service_category as serviceCategory, p.location_area as area, u.name as providerName, b.service_time as serviceTime, b.status 
         FROM Bookings b 
         JOIN Providers p ON b.provider_id = p.id 
         JOIN Users u ON p.user_id = u.id 
         WHERE b.customer_id = ? ORDER BY b.id DESC`,
        [currentUser.id]
      );
      setBookings(results);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser, bookingRefreshKey]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>
      <FlatList 
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No bookings found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.providerName}</Text>
            <Text style={styles.details}>{item.serviceCategory.toUpperCase()} • {item.area} • {item.serviceTime}</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 8 : 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7F3FF',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#050505' },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E7F3FF',
  },
  name: { fontSize: 18, fontWeight: '700', color: '#050505', marginBottom: 4 },
  details: { fontSize: 14, color: '#65676B', marginBottom: 12 },
  badgeContainer: { backgroundColor: '#E7F3FF', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#1877F2', fontSize: 12, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#65676B', fontSize: 16 }
});
