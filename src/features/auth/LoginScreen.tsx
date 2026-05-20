import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { getDb } from '../../database/schema';
import { useStore, User } from '../../store/useStore';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const lastBookedProviderId = useStore((state) => state.lastBookedProviderId);

  const handleLogin = () => {
    if (!phoneNumber || !password) {
      setErrorMessage('Please enter both phone number and password');
      return;
    }
    setErrorMessage('');

    try {
      const db = getDb();

      // If logging in as the demo vendor, and a provider was recently booked,
      // resolve that provider's owner instead so they see their actual booking.
      if (phoneNumber === '03007654321' && lastBookedProviderId !== null) {
        const bookedProvider = db.getFirstSync<{ user_id: number }>(
          'SELECT user_id FROM Providers WHERE id = ?',
          [lastBookedProviderId]
        );
        if (bookedProvider) {
          const vendorUser = db.getFirstSync<User>(
            'SELECT id, phone_number, role, name FROM Users WHERE id = ?',
            [bookedProvider.user_id]
          );
          if (vendorUser && vendorUser.role === 'VENDOR') {
            setCurrentUser(vendorUser);
            return;
          }
        }
      }

      const user = db.getFirstSync<User>(
        'SELECT id, phone_number, role, name FROM Users WHERE phone_number = ? AND password = ?',
        [phoneNumber, password]
      );

      if (user) {
        setCurrentUser(user);
      } else {
        setErrorMessage('Invalid phone number or password');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('An error occurred during login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.brandContainer}>
              <Text style={styles.brandTitle}>karigar</Text>
              <Text style={styles.brandTagline}>Urdu-First AI Matchmaking for Services</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.header}>Sign In</Text>
              <Text style={styles.subtitle}>Enter your details to manage bookings</Text>

              <View style={styles.form}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 03001234567"
                    placeholderTextColor="#8A8D91"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#8A8D91"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={styles.showHideButton} 
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                  >
                    <Text style={styles.showHideText}>{secureTextEntry ? "Show" : "Hide"}</Text>
                  </TouchableOpacity>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                  <Text style={styles.buttonText}>Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5', 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24, 
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1877F2',
    letterSpacing: -1,
  },
  brandTagline: {
    fontSize: 14,
    color: '#65676B',
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 24, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E7F3FF',
  },
  header: {
    fontSize: 22, 
    fontWeight: '800',
    color: '#050505', 
    marginBottom: 4, 
  },
  subtitle: {
    fontSize: 14, 
    color: '#65676B', 
    marginBottom: 24, 
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13, 
    fontWeight: '700',
    color: '#4B4F56', 
    marginBottom: 6, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F0F2F5', 
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12, 
    fontSize: 16, 
    color: '#050505', 
    borderWidth: 1,
    borderColor: '#E4E6EB',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E6EB',
    marginBottom: 24,
    paddingRight: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#050505',
  },
  showHideButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  showHideText: {
    color: '#1877F2',
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#1877F2', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFD4D4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#CC3333',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
