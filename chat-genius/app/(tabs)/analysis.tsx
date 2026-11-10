import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  Alert
} from 'react-native';
import Purchases from 'react-native-purchases';



import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { SharedData } from '../store';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Superwall, { PaywallPresentationHandler } from '@superwall/react-native-superwall';

const PRO_ENTITLEMENT_ID = 'Social Genius: Text Analyzer Pro';

const { width, height } = Dimensions.get('window');


// 🟢 IPAD RESPONSIVE LOGIC:
const isPad = width >= 768;
// Ab iPad par content 700px tak phailay ga taake sides par empty black space na bache
const PAD_PADDING = isPad ? Math.max((width - 700) / 2, 40) : 20;

// ── Gradient Text Helper ──────────────────────────────────────────────────────
const GradientText = ({ text, colors, style, start, end }: any) => (
  <MaskedView maskElement={<Text style={style}>{text}</Text>}>
    <LinearGradient
      colors={colors}
      start={start ?? { x: 0, y: 0 }}
      end={end ?? { x: 1, y: 0 }}
    >
      <Text style={[style, { opacity: 0 }]}>{text}</Text>
    </LinearGradient>
  </MaskedView>
);

// ── Animated Task Progress Component ────────────────────────
const AnimatedTaskProgress = ({ iconLib, iconName, title, subtext, delay }: any) => {
  const IconComponent = iconLib === 'Feather' ? Feather : MaterialCommunityIcons;

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [currentPercent, setCurrentPercent] = useState(0);

  useFocusEffect(
    useCallback(() => {
      opacityAnim.setValue(0);
      progressAnim.setValue(0);
      setCurrentPercent(0);

      const listenerId = progressAnim.addListener(({ value }) => {
        setCurrentPercent(Math.floor(value));
      });

      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 100,
          duration: 1700,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: false,
        })
      ]).start();

      return () => {
        progressAnim.removeListener(listenerId);
        progressAnim.stopAnimation();
        opacityAnim.stopAnimation();
      };
    }, [delay])
  );

  const widthInterpolation = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <Animated.View style={[styles.taskContainer, { opacity: opacityAnim }]}>
      <View style={styles.taskIconBox}>
        <IconComponent name={iconName} size={14} color="#8A2BE2" />
      </View>
      <View style={styles.taskTextContent}>
        <Text style={styles.taskTitle}>{title}</Text>
        <Text style={styles.taskSub}>{subtext}</Text>
        <View style={styles.thinProgressBarBg}>
          <Animated.View style={{ width: widthInterpolation, height: '100%', borderRadius: 2, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#8A2BE2', '#C026D3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>
      <Text style={styles.taskPercent}>{currentPercent}%</Text>
    </Animated.View>
  );
};

// ==========================================
// MAIN SCREEN
// ==========================================
export default function AnalysisScreen() {
  const router = useRouter();

  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertScale = useRef(new Animated.Value(0.92)).current;
  const mainProgressAnim = useRef(new Animated.Value(0)).current;

  const [mainPercent, setMainPercent] = useState(0);

useFocusEffect(
    useCallback(() => {
      let isActive = true;

      alertOpacity.setValue(0);
      alertScale.setValue(0.92);
      mainProgressAnim.setValue(0);
      setMainPercent(0);

      const listenerId = mainProgressAnim.addListener(({ value }) => {
        setMainPercent(Math.floor(value));
      });

      // 1. Alert Animation - (Popups up at 2.5s if API is taking time)
      Animated.sequence([
        Animated.delay(2500),
        Animated.parallel([
          Animated.timing(alertOpacity, {
            toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }),
          Animated.spring(alertScale, {
            toValue: 1, friction: 8, tension: 40, useNativeDriver: true,
          })
        ])
      ]).start();

      // 🔴 2. Initial Smooth Progress (Goes to 90% slowly over 10 seconds)
      Animated.timing(mainProgressAnim, {
        toValue: 90,
        duration: 5500, // 10 seconds tak aahista aahista chalegi
        easing: Easing.out(Easing.cubic), // Smooth slowing down effect
        useNativeDriver: false,
      }).start();

      // 3. Trigger Superwall / Result Flow
      const proceedToPaywallOrResult = async () => {
  if (!isActive) return;

  let proNow = false;
try {
  const info = await Purchases.getCustomerInfo();
  proNow = !!info.entitlements.active[PRO_ENTITLEMENT_ID];
  if (!proNow) {
    await AsyncStorage.removeItem('is_pro_user');
    (SharedData as any).isProUser = false;
  }
} catch {
  // RevenueCat tak nahi pahunche: paying user ko mat rokho
  proNow = (await AsyncStorage.getItem('is_pro_user')) === 'true' || !!(SharedData as any).isProUser;
}
if (proNow) {
  router.replace('/result' as any);
  return;
}

  let hasNavigated = false;

  // ✅ KEY FIX: Promise jo feature() complete hone par resolve hogi
  let featureResolve: (val: string) => void;
  const featurePromise = new Promise<string>((resolve) => {
    featureResolve = resolve;
  });

  let failsafeTimeout = setTimeout(() => {
    if (isActive && !hasNavigated) {
      hasNavigated = true;
      featureResolve('timeout'); // ✅ timeout pe bhi resolve karo
      if ((SharedData as any).isProUser) {
        router.replace('/result' as any);
      } else {
        router.replace('/(tabs)/home' as any);
      }
    }
  }, 5000);

  const handler = new PaywallPresentationHandler();

  handler.onPresent = () => {
    console.log("🟢 Paywall shown!");
    clearTimeout(failsafeTimeout);
  };

  handler.onDismiss = async () => {
    clearTimeout(failsafeTimeout);

    // ✅ FIX: feature() complete hone ka wait karo
    const result = await Promise.race([
      featurePromise,
      new Promise<string>((r) => setTimeout(() => r('timeout'), 1500))
    ]);

    console.log("onDismiss awaited result:", result);

    if (result === 'purchased') {
      
      return;
    }

  //   // Cancelled ya timeout
    if (!hasNavigated && !(SharedData as any).isProUser) {
      hasNavigated = true;
      Alert.alert("Premium Required", "You cancelled the paywall. PRO plan is required.");
      router.replace('/(tabs)/home' as any);
    }
  };

  handler.onError = (err: any) => {
    console.log("❌ Superwall Error:", err);
    clearTimeout(failsafeTimeout);
    featureResolve('error'); // ✅
    if (!hasNavigated) {
      hasNavigated = true;
      Alert.alert("Error", "Could not load the paywall.");
      router.replace('/(tabs)/home' as any);
    }
  };

  handler.onSkip = (reason: any) => {
    console.log("⚠️ Superwall Skipped:", reason);
    clearTimeout(failsafeTimeout);
    featureResolve('skipped'); // ✅
    if (!hasNavigated) {
      hasNavigated = true;
      if (!(SharedData as any).isProUser) {
        Alert.alert("Premium Required", "Upgrade to PRO to continue.");
        router.replace('/(tabs)/home' as any);
      } else {
        router.replace('/result' as any);
      }
    }
  };

  Superwall.shared.register({
    placement: "campaign_trigger",
    handler: handler,
    feature: async () => {
  hasNavigated = true;
  try {
    const info = await Purchases.getCustomerInfo();
    if (info.entitlements.active[PRO_ENTITLEMENT_ID]) {
      await AsyncStorage.setItem('is_pro_user', 'true');
      (SharedData as any).isProUser = true;
      // Server khud RevenueCat se verify karke Supabase update karega
      supabase.functions.invoke('sync-subscription').catch((e) =>
        console.log('[sync-subscription] failed (non-blocking)', e)
      );
      DeviceEventEmitter.emit('pro_status_changed');
    }
  } catch (err) {
    // verify nahi ho saka, lekin Superwall ne feature chalaya hai, to user ko rokna nahi
    console.log('verify error in feature():', err);
  } finally {
    featureResolve('purchased');
    router.replace('/result' as any);
  }
}
  });
};
      

      // 4. API Fetch Function
      const fetchAIResult = async () => {
        try {
          const payload = SharedData.requestPayload;
          if (!payload) return false;

          const BACKEND_URL = 'https://chat-genious.onrender.com/api/analyze-chat';
          const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (data.success && isActive) {
            SharedData.aiResult = data.data;
            AsyncStorage.setItem('last_ai_result', JSON.stringify(data.data));

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              supabase.from('analysis_history').insert({
                user_id: user.id, user_message: payload.userMessage, context: payload.context, tag: payload.tag, ai_result: data.data
              }).then(); 
            }
            DeviceEventEmitter.emit('ai_responded');
            return true;
          }
          return false;
        } catch (error) {
          console.error("Network Error:", error);
          return false;
        }
      };

      // 5. Execute AI Fetch
      fetchAIResult().then((isSuccess) => {
        if (!isActive) return;

        if (isSuccess && SharedData.aiResult) {
          // 🔴 AI Done! Smoothly complete the progress to 100%
          mainProgressAnim.stopAnimation();
          Animated.timing(mainProgressAnim, {
            toValue: 100,
            duration: 600, // 1.2 seconds natural completion speed (na zeyada fast, na slow)
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
          }).start(() => {
            proceedToPaywallOrResult();
          });
        } else {
          Alert.alert("Analysis Failed", "Could not analyze the message.");
          router.replace('/(tabs)/home' as any);
        }
      });

      return () => {
        isActive = false;
        mainProgressAnim.removeListener(listenerId);
        mainProgressAnim.stopAnimation();
        alertOpacity.stopAnimation();
        alertScale.stopAnimation();
      };

    }, [])
  );

  const mainWidthInterpolation = mainProgressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      {/* 🔴 Inline paddingHorizontal: PAD_PADDING apply kar diya gaya hai */}
      <View style={[styles.container, { paddingHorizontal: PAD_PADDING }]}>

        {/* ── Top Header Logo ── */}
        <View style={styles.topHeader}>
          <Text style={styles.logoWhite}>SOCIAL</Text>
          <GradientText
            text="GENIUS"
            colors={['#A855F7', '#D946EF']}
            style={styles.logoGradient}
          />
        </View>

        {/* ── Hero Mascot & Text ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroContentContainer}>
            <Image source={require('../../assets/mascot-detective.png')} style={styles.mascotImage} />
            <View style={styles.heroTextOverlay}>
              <Text style={styles.heroMainText}>reading between</Text>
              <View style={styles.highlightWrapper}>
                <GradientText text="the lines..." colors={['#A855F7', '#D946EF']} style={styles.heroGradientText} />
                <View style={styles.heroUnderline} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Status Pill ── */}
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            Hold on, something's <Text style={styles.highlightPink}>wrong</Text> here...
          </Text>
          <ActivityIndicator size="small" color="#FF3366" style={styles.spinner} />
        </View>

        {/* ── Progress Tasks List ── */}
        <View style={styles.tasksList}>
          <AnimatedTaskProgress iconLib="Feather" iconName="search" title="analyzing emotional energy..." subtext="detecting overthinking patterns" delay={200} />
          <AnimatedTaskProgress iconLib="Feather" iconName="eye" title="scanning conversation..." subtext="reading tone, timing & intent" delay={600} />
          <AnimatedTaskProgress iconLib="MaterialCommunityIcons" iconName="scale-balance" title="checking power dynamics..." subtext="who's leading this convo?" delay={1000} />
          <AnimatedTaskProgress iconLib="Feather" iconName="shield" title="detecting desperation levels..." subtext="measuring neediness signals" delay={1400} />
          <AnimatedTaskProgress iconLib="MaterialCommunityIcons" iconName="heart-pulse" title="calculating aura risk..." subtext="will this lower your value?" delay={1800} />
        </View>

        {/* ── Alert Box ── */}
        <Animated.View style={[styles.alertBox, { opacity: alertOpacity, transform: [{ scale: alertScale }] }]}>
          <View style={styles.alertIconBox}>
            <MaterialCommunityIcons name="waveform" size={18} color="#3b82f6" />
          </View>
          <Text style={styles.alertText}>
            i see the problem, but wait...{'\n'}
            this might <Text style={styles.highlightPink}>not</Text> be what you expect...👀
          </Text>
        </Animated.View>

        {/* ── Main Progress Bar ── */}
        <View style={styles.mainProgressSection}>
          <Text style={styles.mainPercentText}>{mainPercent}%</Text>
          <View style={styles.mainProgressBarBg}>
            <Animated.View style={[styles.mainProgressFillWrapper, { width: mainWidthInterpolation }]}>
              <LinearGradient
                colors={['#A855F7', '#D946EF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.progressThumb} />
            </Animated.View>
          </View>
          <Text style={styles.footerText}>
            almost there... genius is connecting the dots 🧠
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0514' },
  // 🔴 Yahan se 'paddingHorizontal: 20' hata diya hai, ab yeh upper View mein inline lag raha hai
  container: { flex: 1, paddingTop: 16, paddingBottom: 20, alignItems: 'center', justifyContent: 'space-evenly' },
  topHeader: { flexDirection: 'row', alignSelf: 'center', marginTop: 8 },
  logoWhite: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  logoGradient: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  heroSection: { alignItems: 'center' },
  heroContentContainer: { width: 240, height: 240, position: 'relative', alignItems: 'center' },
  mascotImage: { width: '100%', height: '100%', resizeMode: 'contain', position: 'absolute', top: 0, left: 0, zIndex: 1 },
  heroTextOverlay: { position: 'absolute', top: 160, alignItems: 'center', zIndex: 2, width: '100%' },
  heroMainText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  highlightWrapper: { alignItems: 'center', position: 'relative', marginTop: -4 },
  heroGradientText: { fontSize: 24, fontWeight: '900' },
  heroUnderline: { position: 'absolute', bottom: -2, width: 90, height: 3, backgroundColor: '#D946EF', borderRadius: 2, shadowColor: '#D946EF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 30 },
  statusText: { color: '#D1D5DB', fontSize: 12, fontWeight: '500' },
  highlightPink: { color: '#FF3366', fontWeight: 'bold' },
  spinner: { marginLeft: 8 },
  tasksList: { width: '100%', gap: 10 },
  taskContainer: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  taskIconBox: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(138, 43, 226, 0.08)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  taskTextContent: { flex: 1, justifyContent: 'center' },
  taskTitle: { color: '#D1D5DB', fontSize: 11, fontWeight: '500' },
  taskSub: { color: '#6B7280', fontSize: 9, marginTop: 1, marginBottom: 3 },
  thinProgressBarBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, width: '90%' },
  taskPercent: { color: '#D1D5DB', fontSize: 11, fontWeight: '600', width: 33, textAlign: 'right' },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)', padding: 11, borderRadius: 14, width: '100%' },
  alertIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  alertText: { color: '#E5E7EB', fontSize: 11, lineHeight: 15, flex: 1 },
  mainProgressSection: { width: '100%', alignItems: 'center' },
  mainPercentText: { color: '#A855F7', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  mainProgressBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 7 },
  mainProgressFillWrapper: { height: '100%', borderRadius: 3, position: 'relative', overflow: 'visible' },
  progressThumb: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF', position: 'absolute', right: -6, top: -3, shadowColor: '#FFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 5 },
  footerText: { color: '#6B7280', fontSize: 10 },
});