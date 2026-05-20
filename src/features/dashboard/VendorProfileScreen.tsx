import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Platform, ScrollView, StatusBar } from 'react-native';
import { getDb } from '../../database/schema';
import { useStore } from '../../store/useStore';

export default function VendorProfileScreen() {
  const currentUser = useStore((state) => state.currentUser);
  const showNotification = useStore((state) => state.showNotification);
  
  const [hourlyRate, setHourlyRate] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState(4.8);
  const [providerId, setProviderId] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const db = getDb();
      const provider = db.getFirstSync<any>(
        'SELECT p.id, p.hourly_rate, p.location_area, p.status, p.service_category, p.rating FROM Providers p WHERE p.user_id = ?',
        [currentUser.id]
      );
      if (provider) {
        setProviderId(provider.id);
        setHourlyRate(provider.hourly_rate ? provider.hourly_rate.toString() : '500');
        setArea(provider.location_area || '');
        setStatus(provider.status || 'AVAILABLE');
        setCategory(provider.service_category || 'plumber');
        setRating(provider.rating || 4.8);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const handleSave = () => {
    if (!providerId) return;
    try {
      const db = getDb();
      db.runSync(
        'UPDATE Providers SET hourly_rate = ?, location_area = ?, status = ? WHERE id = ?',
        [parseFloat(hourlyRate) || 500, area, status, providerId]
      );
      showNotification('Profile updated successfully!');
    } catch (e) {
      console.error(e);
    }
  };

  // Extract initials
  const getInitials = (name: string) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Artisan Shopfront</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {currentUser && (
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarBubble}>
                <Text style={styles.avatarText}>{getInitials(currentUser.name)}</Text>
              </View>
              <View style={styles.avatarDetails}>
                <Text style={styles.artisanName}>{currentUser.name}</Text>
                <Text style={styles.artisanPhone}>📞 {currentUser.phone_number}</Text>
                <Text style={styles.artisanPhone}>📍 {area || 'Not set'}</Text>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>🛠️ MASTER {category.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statWidget}>
                <Text style={styles.statEmoji}>⭐</Text>
                <View>
                  <Text style={styles.statNumber}>{rating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
              <View style={styles.statWidget}>
                <Text style={styles.statEmoji}>📦</Text>
                <View>
                  <Text style={styles.statNumber}>14</Text>
                  <Text style={styles.statLabel}>Jobs Completed</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Shop Settings</Text>

          <Text style={styles.label}>Hourly Rate (Rs.)</Text>
          <TextInput
            style={styles.input}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            keyboardType="numeric"
            placeholder="E.g. 1200"
            placeholderTextColor="#8A8D91"
          />

          <Text style={styles.label}>Service Location Area</Text>
          <TextInput
            style={styles.input}
            value={area}
            onChangeText={setArea}
            placeholder="E.g. G-13, Gulberg Green"
            placeholderTextColor="#8A8D91"
          />

          <Text style={styles.label}>Duty Status</Text>
          <View style={styles.statusToggle}>
            <TouchableOpacity 
              style={[styles.statusBtn, status === 'AVAILABLE' && styles.statusBtnActive]}
              onPress={() => setStatus('AVAILABLE')}
            >
              <Text style={[styles.statusText, status === 'AVAILABLE' && styles.statusTextActive]}>🟢 AVAILABLE</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statusBtn, status === 'BUSY' && styles.statusBtnActive]}
              onPress={() => setStatus('BUSY')}
            >
              <Text style={[styles.statusText, status === 'BUSY' && styles.statusTextActive]}>🔴 BUSY</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Shop Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContainer: { padding: 16, gap: 16 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7F3FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarBubble: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E7F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1877F2',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1877F2',
  },
  avatarDetails: {
    flex: 1,
    gap: 4,
  },
  artisanName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#050505',
  },
  artisanPhone: {
    fontSize: 14,
    color: '#65676B',
  },
  badgeContainer: {
    backgroundColor: '#E7F3FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  badgeText: {
    color: '#1877F2',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    paddingTop: 16,
  },
  statWidget: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 10,
  },
  statEmoji: {
    fontSize: 22,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#050505',
  },
  statLabel: {
    fontSize: 11,
    color: '#65676B',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7F3FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#050505',
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#65676B', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#F0F2F5', padding: 14, borderRadius: 12, fontSize: 16, marginBottom: 18,
    borderWidth: 1, borderColor: '#E7F3FF', color: '#050505'
  },
  statusToggle: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statusBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E7F3FF', alignItems: 'center', backgroundColor: '#F0F2F5'
  },
  statusBtnActive: { backgroundColor: '#1877F2', borderColor: '#1877F2' },
  statusText: { color: '#65676B', fontWeight: '700', fontSize: 13 },
  statusTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: '#1877F2', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});
