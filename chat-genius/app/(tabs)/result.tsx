import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SharedData } from '../store';

const TABLET_BREAKPOINT = 768;
const LARGE_TABLET_BREAKPOINT = 1000;
const AVG_SCORE = 63;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── helpers ──
const toNum = (v: any): number | null => {
  const n = parseFloat(String(v ?? '').replace('%', ''));
  return isNaN(n) ? null : Math.max(0, Math.min(100, n));
};
const str = (v: any): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';

// ── slide-in reveal ──
const Reveal = ({ delay = 0, children }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 520, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
};

// ── aura ring with count-up ──
const AuraRing = ({ score, color, size = 176 }: { score: number; color: string; size?: number }) => {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const prog = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = prog.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(prog, {
      toValue: score, duration: 1600, delay: 300,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
    return () => prog.removeListener(id);
  }, [score]);

  const offset = prog.interpolate({ inputRange: [0, 100], outputRange: [circ, 0] });

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringScore, { color }]}>{shown}</Text>
        <Text style={styles.ringLabel}>AURA SCORE</Text>
      </View>
    </View>
  );
};

// ── animated meter ──
const MeterRow = ({ icon, label, value, status, isDanger, delay = 0 }: any) => {
  const pct = toNum(value);
  const color = isDanger ? '#F43F5E' : '#4ADE80';
  const w = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pct !== null) {
      Animated.timing(w, {
        toValue: pct, duration: 1000, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }).start();
    }
  }, [pct]);

  return (
    <View style={styles.meterRow}>
      <View style={styles.meterTop}>
        <View style={styles.meterLeft}>
          <MaterialCommunityIcons name={icon} size={16} color={color} />
          <Text style={styles.meterLabel}>{label}</Text>
        </View>
        <Text style={[styles.meterValue, { color }]}>{str(value) || '-'}</Text>
      </View>
      <View style={styles.meterTrack}>
        <Animated.View
          style={[
            styles.meterFill,
            { backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
      {str(status) ? <Text style={[styles.meterStatus, { color }]}>{str(status)}</Text> : null}
    </View>
  );
};

// ── breakdown card ──
const BreakdownCard = ({ icon, color, label, title, summary }: any) => (
  <View style={[styles.bdCard, { borderColor: `${color}55` }]}>
    <View style={styles.bdHead}>
      <View style={[styles.bdIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.bdLabel, { color }]}>{label}</Text>
    </View>
    <Text style={styles.bdTitle}>{str(title) || 'Analyzing...'}</Text>
    {str(summary) ? <Text style={styles.bdSummary}>{str(summary)}</Text> : null}
  </View>
);

// ==========================================
// MAIN SCREEN
// ==========================================
export default function ResultScreen() {
  const router = useRouter();
  const { width: winWidth } = useWindowDimensions();
  const isTablet = winWidth >= TABLET_BREAKPOINT;
  const isLargeTablet = winWidth >= LARGE_TABLET_BREAKPOINT;

  const maxContentWidth = isLargeTablet ? 920 : 700;
  const PAD = isTablet ? Math.max((winWidth - maxContentWidth) / 2, 40) : 20;

  const data: any = SharedData.aiResult || {};
  const userText = str((SharedData as any).requestPayload?.userMessage);
  const isTheirs = (SharedData as any).requestPayload?.perspective === 'opponent';

  const aura = toNum(data?.aura_score);
  const hasAura = aura !== null;
  const color = !hasAura ? '#D1D5DB' : aura! <= 30 ? '#F43F5E' : aura! <= 60 ? '#FBBF24' : '#4ADE80';
  const tier = !hasAura ? '' : aura! <= 30 ? 'DANGER ZONE' : aura! <= 60 ? 'MIXED SIGNALS' : 'STRONG VIBE';
  const diff = hasAura ? Math.round(aura! - AVG_SCORE) : 0;

  const social: any = data?.social_impact || {};
  const bd: any = data?.breakdown || {};
  const truths: string[] = Array.isArray(data?.brutal_truth)
    ? data.brutal_truth.filter((t: any) => typeof t === 'string')
    : [];
  const description = str(data?.verdict?.description) || str(data?.analysis_reason);
  const fix = str(data?.verdict?.fix);
  const headline = str(data?.verdict?.vibe_tag) || str(data?.verdict?.main) || 'Analyzing...';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: PAD }]}>
        <TouchableOpacity style={[styles.iconButton, isTablet && styles.iconButtonTablet]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={isTablet ? 26 : 22} color="#D1D5DB" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>Analysis Complete</Text>
        <TouchableOpacity style={[styles.iconButton, isTablet && styles.iconButtonTablet]}>
          <Feather name="share" size={isTablet ? 24 : 20} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 48 }}
      >
        {/* HERO */}
        <Reveal>
          <LinearGradient colors={[`${color}33`, 'rgba(10,5,20,1)']} style={styles.heroCard}>
            {hasAura ? <AuraRing score={aura!} color={color} size={isTablet ? 220 : 176} /> : null}
            {tier ? <Text style={[styles.tier, { color }]}>{tier}</Text> : null}
            <Text style={[styles.verdictMain, isTablet && { fontSize: 30 }]}>{headline}</Text>
            {str(data?.verdict?.sub) ? <Text style={styles.verdictSub}>{str(data?.verdict?.sub)}</Text> : null}
            {hasAura ? (
              <View style={styles.compareChip}>
                <Text style={styles.compareText}>
                  {`${Math.abs(diff)} points ${diff < 0 ? 'below' : 'above'} the average (${AVG_SCORE})`}
                </Text>
              </View>
            ) : null}
          </LinearGradient>
        </Reveal>

        {/* WHAT YOU SENT */}
      {userText ? (
  <Reveal delay={150}>
    <Text style={styles.sectionHeading}>{isTheirs ? 'WHAT THEY SENT' : 'WHAT YOU SENT'}</Text>
    <View style={[styles.sentBubble, isTheirs && styles.theirBubble]}>
      <Text style={styles.sentText}>{`"${userText}"`}</Text>
    </View>
  </Reveal>
) : null}

        {/* THE READ */}
        {description ? (
          <Reveal delay={250}>
            <Text style={styles.sectionHeading}>THE READ</Text>
            <View style={styles.readCard}>
              <Text style={[styles.readText, isTablet && { fontSize: 15, lineHeight: 23 }]}>{description}</Text>
            </View>
          </Reveal>
        ) : null}

        {/* SOCIAL IMPACT */}
        <Reveal delay={350}>
          <Text style={styles.sectionHeading}>SOCIAL IMPACT</Text>
          <View style={styles.meterCard}>
            <MeterRow icon="shield-alert-outline" label="Social Risk" value={social?.risk?.value} status={social?.risk?.status} isDanger={social?.risk?.isDanger} delay={600} />
            <View style={styles.meterDivider} />
            <MeterRow icon="heart-pulse" label="Neediness" value={social?.neediness?.value} status={social?.neediness?.status} isDanger={social?.neediness?.isDanger} delay={700} />
            <View style={styles.meterDivider} />
            <MeterRow icon="brain" label="Emotional Control" value={social?.emotional_control?.value} status={social?.emotional_control?.status} isDanger={social?.emotional_control?.isDanger} delay={800} />
            <View style={styles.meterDivider} />
            <MeterRow icon="star-outline" label="Confidence Signal" value={social?.confidence?.value} status={social?.confidence?.status} isDanger={social?.confidence?.isDanger} delay={900} />
            <View style={styles.meterDivider} />
            <MeterRow icon="eye-outline" label="Perception Impact" value={social?.perception?.value} status={social?.perception?.status} isDanger={social?.perception?.isDanger} delay={1000} />
          </View>
        </Reveal>

        {/* BREAKDOWN */}
        <Reveal delay={450}>
          <Text style={styles.sectionHeading}>BREAKDOWN</Text>
          <BreakdownCard icon="emoticon-outline" color="#F43F5E" label="EMOTIONAL ENERGY" title={bd?.emotional_energy?.title} summary={bd?.emotional_energy?.summary} />
          <View style={{ height: 10 }} />
          <BreakdownCard icon="message-text-outline" color="#A855F7" label={isTheirs ? "WHAT THEY'RE REALLY SIGNALING" : "WHAT YOU'RE REALLY SIGNALING"} title={bd?.signaling?.title} summary={bd?.signaling?.summary} />
          <View style={{ height: 10 }} />
          <BreakdownCard icon="account-outline" color="#3B82F6" label={isTheirs ? "HOW YOU'LL LIKELY FEEL" : "HOW THEY'LL LIKELY FEEL"} title={bd?.how_they_feel?.title} summary={bd?.how_they_feel?.summary} />
          <View style={{ height: 10 }} />
          <BreakdownCard icon="trending-up" color="#FBBF24" label="LIKELY OUTCOME" title={bd?.likely_outcome?.title} summary={bd?.likely_outcome?.summary} />
        </Reveal>

        {/* BRUTAL TRUTH */}
        {truths.length > 0 ? (
          <Reveal delay={550}>
            <Text style={styles.sectionHeading}>BRUTAL TRUTH</Text>
            <LinearGradient colors={['rgba(61,29,89,0.55)', 'rgba(10,5,20,1)']} style={styles.truthBox}>
              {truths.map((t, i) => (
                <View key={i} style={styles.truthRow}>
                  <View style={styles.truthNum}>
                    <Text style={styles.truthNumText}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.truthText, isTablet && { fontSize: 15, lineHeight: 22 }]}>{t}</Text>
                </View>
              ))}
              <Image source={require('../../assets/mascot-detective2.png')} style={styles.truthMascot} />
            </LinearGradient>
          </Reveal>
        ) : null}

        {/* THE FIX */}
        {fix ? (
          <Reveal delay={650}>
            <Text style={styles.sectionHeading}>THE FIX</Text>
            <View style={styles.fixCard}>
              <MaterialCommunityIcons name="check-decagram" size={22} color="#4ADE80" />
              <Text style={styles.fixText}>{fix}</Text>
            </View>
          </Reveal>
        ) : null}

        {/* CTA */}
        <Reveal delay={750}>
          <TouchableOpacity
            style={[styles.betterBtn, isTablet && { height: 66, borderRadius: 16 }]}
            activeOpacity={0.85}
            onPress={() => router.push('/replies' as any)}
          >
            <LinearGradient
              colors={['#FF3366', '#7C3AED']}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={styles.betterGrad}
            >
              <Ionicons name="sparkles" size={isTablet ? 22 : 18} color="#FFF" />
              <Text style={[styles.betterText, isTablet && { fontSize: 17 }]}>{isTheirs ? 'See Reply Options' : 'See Better Versions'}</Text>
              <MaterialCommunityIcons name="magic-staff" size={isTablet ? 22 : 18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footerLock}>
            <Feather name="lock" size={12} color="#6B7280" />
            <Text style={styles.footerLockText}>Pro users get deeper breakdowns & advanced insights</Text>
          </View>
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05020B' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, paddingTop: Platform.OS === 'android' ? 35 : 15,
  },
  iconButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  iconButtonTablet: { width: 48, height: 48, borderRadius: 14 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  headerTitleTablet: { fontSize: 20 },

  sectionHeading: { color: '#6B7280', fontSize: 10.5, fontWeight: '800', letterSpacing: 1, marginTop: 16, marginBottom: 10 },

  // hero
  heroCard: {
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)',
    paddingVertical: 22, paddingHorizontal: 18, alignItems: 'center', marginTop: 4,
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 18,
  },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringScore: { fontSize: 52, fontWeight: '900' },
  ringLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: -2 },
  tier: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 14 },
  verdictMain: { color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  verdictSub: { color: '#FBBF24', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  compareChip: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  compareText: { color: '#D1D5DB', fontSize: 11.5, fontWeight: '600' },

  // sent
  sentBubble: {
    alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: '#2563EB',
    borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
  },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#2A2438', borderBottomRightRadius: 18, borderBottomLeftRadius: 4 },
  sentText: { color: '#FFF', fontSize: 13, lineHeight: 19 },

  // read
  readCard: { backgroundColor: '#0D0718', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', padding: 14 },
  readText: { color: '#E5E7EB', fontSize: 13, lineHeight: 20 },

  // meters
  meterCard: { backgroundColor: '#0D0718', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', padding: 14 },
  meterRow: { paddingVertical: 4 },
  meterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  meterLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meterLabel: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  meterValue: { fontSize: 15, fontWeight: '900' },
  meterTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4 },
  meterStatus: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, marginTop: 6 },
  meterDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 },

  // breakdown
  bdCard: { backgroundColor: '#0D0718', borderRadius: 14, borderWidth: 1.2, padding: 14 },
  bdHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bdIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bdLabel: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.2 },
  bdTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  bdSummary: { color: '#B8BDC9', fontSize: 12.5, lineHeight: 19 },

  // truth
  truthBox: {
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    padding: 14, gap: 12, overflow: 'hidden',
  },
  truthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  truthNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(217,70,239,0.2)',
    borderWidth: 1, borderColor: '#D946EF', alignItems: 'center', justifyContent: 'center',
  },
  truthNumText: { color: '#F0ABFC', fontSize: 12, fontWeight: '900' },
  truthText: { flex: 1, color: '#E5E7EB', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  truthMascot: { position: 'absolute', right: 6, bottom: 4, width: 44, height: 44, resizeMode: 'contain', opacity: 0.35 },

  // fix
  fixCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1.2, borderColor: 'rgba(74,222,128,0.55)',
    borderRadius: 14, padding: 14,
  },
  fixText: { flex: 1, color: '#E5E7EB', fontSize: 13, lineHeight: 20, fontWeight: '500' },

  // CTA
  betterBtn: { height: 54, borderRadius: 14, overflow: 'hidden', marginTop: 22 },
  betterGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  betterText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  footerLock: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
  footerLockText: { color: '#6B7280', fontSize: 10.5, fontWeight: '500' },
});