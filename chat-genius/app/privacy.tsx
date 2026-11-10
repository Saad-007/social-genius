import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  Easing, 
  StatusBar 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  // ✅ Subtle entrance animation for a premium feel
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#05020B" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} // ✅ Easier to tap
        >
          <Feather name="arrow-left" size={22} color="#D946EF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Animated Content */}
      <Animated.ScrollView 
        contentContainerStyle={styles.container}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: June 2026</Text>
        
        <View style={styles.contentBox}>
          <Text style={styles.heading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            When you use SocialGenius, we collect information you provide directly to us, such as your name, email address, and the text messages you submit for analysis. We use secure servers to process this data.
          </Text>

          <Text style={styles.heading}>2. How We Use Your Data</Text>
          <Text style={styles.paragraph}>
            Your text inputs are processed by AI models solely to provide you with social analysis and alternative message suggestions. We do not use your personal messages to train public AI models or share them with third-party advertisers.
          </Text>

          <Text style={styles.heading}>3. Data Storage & Security</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard security measures to protect your account. Your analysis history is stored securely and can be deleted by you at any time by logging out or requesting account deletion.
          </Text>

          <Text style={styles.heading}>4. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            We may use third-party services like Supabase for authentication and Superwall for subscription management. These services have their own privacy policies.
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05020B' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 8, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(217,70,239,0.05)' // ✅ Slight background for better touch feedback
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  container: { padding: 24, paddingTop: 30 },
  
  lastUpdated: { color: '#9CA3AF', fontSize: 13, marginBottom: 30, fontStyle: 'italic', letterSpacing: 0.5 },
  
  contentBox: {
    backgroundColor: '#0A0514',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(217,70,239,0.15)',
    shadowColor: '#D946EF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  heading: { 
    color: '#D946EF', 
    fontSize: 16, 
    fontWeight: '800', 
    marginBottom: 10, 
    marginTop: 20,
    letterSpacing: 0.2,
  },
  paragraph: { 
    color: '#D1D5DB', 
    fontSize: 14.5, 
    lineHeight: 24, 
    marginBottom: 10,
    letterSpacing: 0.1,
  },
});