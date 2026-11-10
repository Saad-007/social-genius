import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// 🔴 1. Title Colors add kiye taake pink/purple alternate ho
const FEATURES = [
  {
    icon: 'message-processing-outline',
    gradient: ['#FF3366', '#D946EF'] as const,
    titleColor: '#FF3366',
    title: '1. Reality:',
    desc: 'One bad text can change everything — this stops that',
  },
  {
    icon: 'eye-outline',
    gradient: ['#7C3AED', '#4C1D95'] as const,
    titleColor: '#A855F7',
    title: '2. Instant social check:',
    desc: 'See how you actually sound, before they do',
  },
  {
    icon: 'pencil-outline',
    gradient: ['#FF3366', '#D946EF'] as const,
    titleColor: '#FF3366',
    title: '3. Smart rewrites:',
    desc: 'Same message, better positioning & tone that works for you',
  },
  {
    icon: 'shield-outline',
    gradient: ['#7C3AED', '#4C1D95'] as const,
    titleColor: '#A855F7',
    title: '4. Stop panic texting:',
    desc: "Stops you before you send something you can't take back",
  },
  {
    icon: 'infinity',
    gradient: ['#FF3366', '#D946EF'] as const,
    titleColor: '#FF3366',
    title: '5. Unlimited analyses:',
    desc: 'Protect your value and edge on every conversation',
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<'yearly' | 'trial'>('yearly');

  const handleContinue = () => {
    router.replace('/result' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>

        {/* Logo */}
        <View style={styles.logoHeader}>
          <Text style={styles.logoSocial}>SOCIAL<Text style={styles.logoStar}>✦</Text></Text>
          <Text style={styles.logoGenius}>GENIUS</Text>
        </View>

        {/* Top: Heading + Mascot */}
        <View style={styles.topRow}>
          <View style={styles.headingWrapper}>
            <Text style={styles.heading}>
              Unlock your{'\n'}
              <Text style={styles.headingPink}>Social </Text>
              <Text style={styles.headingPurple}>Genius,</Text>
              {'\n'}before you{'\n'}press send
            </Text>
          </View>
          <Image
            source={require('../../assets/mascot-detective16.png')}
            style={styles.mascot}
          />
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          {FEATURES.map((f, index) => (
            <View key={index} style={styles.featureItem}>
              {/* 🔴 2. Gradient Border banaya image ki tarah */}
              <LinearGradient
                colors={f.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureIconWrap}
              >
                <View style={styles.featureIconInner}>
                  <MaterialCommunityIcons name={f.icon as any} size={18} color="#D1D5DB" />
                </View>
              </LinearGradient>
              <View style={styles.featureText}>
                {/* 🔴 3. Title color array se map kiya */}
                <Text style={[styles.featureTitle, { color: f.titleColor }]}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Yearly Plan */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => setSelected('yearly')}>
          <LinearGradient
            colors={selected === 'yearly'
              ? ['rgba(255,51,102,0.6)', 'rgba(124,58,237,0.3)']
              : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.planGradientBorder}
          >
            <View style={styles.yearlyBox}>
              <View style={styles.bestOfferBadge}>
                <Text style={styles.bestOfferText}>BEST OFFER</Text>
              </View>
              <View style={styles.yearlyLeft}>
                <LinearGradient colors={['#9333EA', '#4C1D95']} style={styles.yearlyIconWrap}>
                  <MaterialCommunityIcons name="star-circle-outline" size={22} color="#FFF" />
                </LinearGradient>
                <View>
                  <Text style={styles.yearlyTitle}>YEARLY ACCESS</Text>
                  <Text style={styles.yearlySubtitle}>
                    Just <Text style={styles.yearlyPrice}>$39.99</Text> per year
                  </Text>
                </View>
              </View>
              <View style={styles.yearlyRight}>
                <Text style={styles.weeklyPrice}>$0.77</Text>
                <Text style={styles.perWeek}>per week</Text>
                <Text style={styles.saveText}>Save 90%</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Trial Plan */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelected('trial')}
          style={{ marginTop: 8 }}
        >
          <LinearGradient
            colors={selected === 'trial'
              ? ['rgba(124,58,237,0.6)', 'rgba(124,58,237,0.2)']
              : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.planGradientBorder}
          >
            <View style={styles.trialBox}>
              <LinearGradient colors={['#4C1D95', '#2D1B69']} style={styles.trialIconWrap}>
                <MaterialCommunityIcons name="calendar-outline" size={22} color="#A855F7" />
              </LinearGradient>
              <Text style={styles.trialTitle}>3-DAY FREE TRIAL</Text>
              <View style={styles.trialRight}>
                <Text style={styles.trialThen}>then <Text style={styles.trialPrice}>$6.99</Text></Text>
                <Text style={styles.trialPerWeek}>per week</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.85} onPress={handleContinue}>
          <LinearGradient
            colors={['#FF3366', '#9333EA']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.continueBtnGrad}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Feather name="arrow-right" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Cancel anytime */}
        <View style={styles.cancelRow}>
          <MaterialCommunityIcons name="close-circle-outline" size={13} color="#6B7280" />
          <Text style={styles.cancelText}>Cancel anytime</Text>
        </View>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity><Text style={styles.footerLink}>Terms of Use</Text></TouchableOpacity>
          <Text style={styles.footerDivider}>|</Text>
          <TouchableOpacity><Text style={styles.footerLink}>Privacy Policy</Text></TouchableOpacity>
          <Text style={styles.footerDivider}>|</Text>
          <TouchableOpacity><Text style={styles.footerLink}>Restore Purchases</Text></TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05020B' },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 12,
  },

  // Logo
  logoHeader: { paddingTop: 40, marginBottom: 0 },
  logoSocial: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, lineHeight: 17 },
  logoStar: { color: '#A855F7', fontSize: 10 },
  logoGenius: { color: '#FF3366', fontSize: 14, fontWeight: '900', letterSpacing: 1, lineHeight: 17 },

  // Top row
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingWrapper: { flex: 1, paddingRight: 8 },
  heading: { color: '#FFF', fontSize: 22, fontWeight: '900', lineHeight: 29, letterSpacing: -0.5 },
  headingPink: { color: '#FF3366' },
  headingPurple: { color: '#A855F7' },
  mascot: { width: 180, height: 180, resizeMode: 'contain' },

  // Features
  featuresList: { gap: 7 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  // 🔴 4. Icons ki styling update ki (Border style)
  featureIconWrap: { width: 38, height: 38, borderRadius: 11, padding: 1.5, flexShrink: 0 },
  featureIconInner: { flex: 1, backgroundColor: '#05020B', borderRadius: 9.5, alignItems: 'center', justifyContent: 'center' },
  
  featureText: { flex: 1 },
  featureTitle: { fontSize: 12, fontWeight: '800', marginBottom: 1 }, // Color dynamically map hoga
  featureDesc: { color: '#D1D5DB', fontSize: 11, lineHeight: 15 },

  // Plans
  planGradientBorder: { borderRadius: 14, padding: 1 },

  yearlyBox: { backgroundColor: '#0D0520', borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'visible' },
  bestOfferBadge: { position: 'absolute', top: -9, right: 12, backgroundColor: '#FF3366', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, zIndex: 10 },
  bestOfferText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  yearlyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  yearlyIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  yearlyTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  yearlySubtitle: { color: '#9CA3AF', fontSize: 11, marginTop: 1 },
  yearlyPrice: { color: '#FF3366', fontWeight: '800' },
  yearlyRight: { alignItems: 'flex-end' },
  weeklyPrice: { color: '#FF3366', fontSize: 22, fontWeight: '900', lineHeight: 26 },
  perWeek: { color: '#9CA3AF', fontSize: 10 },
  saveText: { color: '#FF3366', fontSize: 11, fontWeight: '700', marginTop: 1 },

  trialBox: { backgroundColor: '#0D0520', borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trialIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  trialTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', flex: 1, letterSpacing: 0.3 },
  trialRight: { alignItems: 'flex-end' },
  trialThen: { color: '#9CA3AF', fontSize: 10 },
  trialPrice: { color: '#A855F7', fontWeight: '800', fontSize: 12 },
  trialPerWeek: { color: '#9CA3AF', fontSize: 10 },

  // Continue button
  continueBtn: { height: 52, borderRadius: 14, overflow: 'hidden' },
  continueBtnGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  continueBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Footer
  cancelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  cancelText: { color: '#6B7280', fontSize: 11 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerLink: { color: '#6B7280', fontSize: 10 },
  footerDivider: { color: '#4B5563', fontSize: 10 },
});