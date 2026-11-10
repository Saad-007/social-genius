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

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
          <Text style={styles.heading}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By creating an account and using SocialGenius, you agree to these Terms and Conditions. If you do not agree, please do not use the application.
          </Text>

          <Text style={styles.heading}>2. Subscription & Payments</Text>
          <Text style={styles.paragraph}>
            SocialGenius offers premium features through auto-renewing subscriptions (Pro Plan). Payments will be charged to your Apple/Google account upon confirmation. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
          </Text>

          <Text style={styles.heading}>3. App Usage & AI Limitations</Text>
          <Text style={styles.paragraph}>
            The AI analysis provided by SocialGenius is for informational and entertainment purposes. We do not guarantee specific outcomes in your personal or professional relationships based on the text suggestions provided by the app.
          </Text>

          <Text style={styles.heading}>4. User Conduct</Text>
          <Text style={styles.paragraph}>
            You agree not to use SocialGenius to generate illegal, harassing, or malicious content. We reserve the right to suspend accounts that violate these guidelines.
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