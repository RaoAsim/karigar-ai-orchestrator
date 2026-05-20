import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, StatusBar, Modal } from 'react-native';
import { getDb } from '../../database/schema';
import { useStore } from '../../store/useStore';

interface Booking {
  id: number;
  customerName: string;
  serviceTime: string;
  status: string;
  serviceCategory: string;
  locationArea: string;
  distanceKm: number;
}

export default function VendorDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const currentUser = useStore((state) => state.currentUser);
  const logout = useStore((state) => state.logout);

  const handleComplete = (bookingId: number) => {
    try {
      const db = getDb();
      db.runSync('UPDATE Bookings SET status = ? WHERE id = ?', ['COMPLETED', bookingId]);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'COMPLETED' } : b));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    try {
      const db = getDb();
      const provider = db.getFirstSync<{ id: number; service_category: string }>(
        'SELECT id, service_category FROM Providers WHERE user_id = ?',
        [currentUser.id]
      );
      if (provider) {
        const results = db.getAllSync<any>(
          `SELECT b.id, u.name as customerName, b.service_time as serviceTime, b.status, 
                  p.service_category as serviceCategory, p.location_area as locationArea, p.distance_km as distanceKm
           FROM Bookings b 
           JOIN Users u ON b.customer_id = u.id 
           JOIN Providers p ON b.provider_id = p.id
           WHERE b.provider_id = ? OR (p.service_category = ? AND b.status = 'CONFIRMED')
           ORDER BY b.id DESC`,
          [provider.id, provider.service_category]
        );
        setBookings(results);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const confirmedCount = bookings.filter(b => b.status === 'CONFIRMED').length;
  const completedCount = bookings.filter(b => b.status === 'COMPLETED').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Total Jobs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF4E6' }]}>
          <Text style={[styles.statNumber, { color: '#E8590C' }]}>{confirmedCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E6FCF5' }]}>
          <Text style={[styles.statNumber, { color: '#31A24C' }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      <FlatList 
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>New customer requests will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedBooking(item);
              setModalVisible(true);
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.customerName}</Text>
              <View style={[
                styles.statusBadge,
                item.status === 'COMPLETED' && styles.statusBadgeCompleted
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  item.status === 'COMPLETED' && styles.statusBadgeTextCompleted
                ]}>{item.status === 'COMPLETED' ? '✓ Done' : '● Active'}</Text>
              </View>
            </View>
            <Text style={styles.categoryBadge}>{item.serviceCategory.toUpperCase()}</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>📍 {item.locationArea || 'Islamabad'}</Text>
              <Text style={styles.infoText}>⏰ {item.serviceTime}</Text>
            </View>
            {item.distanceKm && (
              <Text style={styles.etaText}>🚗 ~{Math.ceil(item.distanceKm * 3)} min away</Text>
            )}

            {item.status !== 'COMPLETED' && (
              <TouchableOpacity 
                style={styles.completeBtn}
                onPress={() => handleComplete(item.id)}
              >
                <Text style={styles.completeBtnText}>Mark as Completed ✓</Text>
              </TouchableOpacity>
            )}
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
              <Text style={styles.modalTitle}>Job Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedBooking && (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Customer Name</Text>
                  <Text style={styles.modalValue}>{selectedBooking.customerName}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Service Requested</Text>
                  <Text style={styles.modalValue}>{selectedBooking.serviceCategory.toUpperCase()}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Location Area</Text>
                  <Text style={styles.modalValue}>{selectedBooking.locationArea}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Requested Schedule</Text>
                  <Text style={styles.modalValue}>{selectedBooking.serviceTime}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <Text style={[styles.modalValue, { color: selectedBooking.status === 'COMPLETED' ? '#31A24C' : '#E8590C' }]}>
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
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 8 : 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E7F3FF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#050505',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#1877F2',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#E7F3FF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1877F2',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#65676B',
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7F3FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#050505',
  },
  categoryBadge: {
    fontSize: 11,
    color: '#1877F2',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#65676B',
    fontWeight: '500',
  },
  etaText: {
    fontSize: 12,
    color: '#65676B',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeCompleted: {
    backgroundColor: '#E6FCF5',
  },
  statusBadgeText: {
    color: '#E8590C',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextCompleted: {
    color: '#31A24C',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#050505',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#65676B',
  },
  completeBtn: {
    backgroundColor: '#1877F2',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
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
