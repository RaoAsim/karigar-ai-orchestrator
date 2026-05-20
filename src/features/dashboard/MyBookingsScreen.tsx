import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Platform, StatusBar, TouchableOpacity, Modal } from 'react-native';
import { getDb } from '../../database/schema';
import { useStore } from '../../store/useStore';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const currentUser = useStore((state) => state.currentUser);
  const bookingRefreshKey = useStore((state) => state.bookingRefreshKey);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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
          <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedBooking(item);
              setModalVisible(true);
            }}
          >
            <Text style={styles.name}>{item.providerName}</Text>
            <Text style={styles.details}>{item.serviceCategory.toUpperCase()} • {item.area} • {item.serviceTime}</Text>
            <View style={[styles.badgeContainer, item.status === 'COMPLETED' ? { backgroundColor: '#E6FCF5' } : {}]}>
              <Text style={[styles.badgeText, item.status === 'COMPLETED' ? { color: '#31A24C' } : {}]}>
                {item.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedBooking && (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Karigar Name</Text>
                  <Text style={styles.modalValue}>{selectedBooking.providerName}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Service</Text>
                  <Text style={styles.modalValue}>{selectedBooking.serviceCategory.toUpperCase()}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Location</Text>
                  <Text style={styles.modalValue}>{selectedBooking.area}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Schedule</Text>
                  <Text style={styles.modalValue}>{selectedBooking.serviceTime}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <Text style={[styles.modalValue, { color: selectedBooking.status === 'COMPLETED' ? '#31A24C' : '#1877F2' }]}>
                    {selectedBooking.status}
                  </Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalPrimaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  badgeText: { color: '#1877F2', fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#65676B', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F2F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E7F3FF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#050505',
  },
  modalCloseBtn: {
    fontSize: 18,
    color: '#65676B',
    fontWeight: '600',
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  modalLabel: {
    fontSize: 14,
    color: '#65676B',
    fontWeight: '500',
  },
  modalValue: {
    fontSize: 14,
    color: '#050505',
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    backgroundColor: '#1877F2',
    padding: 14,
    alignItems: 'center',
    margin: 16,
    borderRadius: 10,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
