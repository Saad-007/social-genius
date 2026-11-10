import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  Share, // 🔴 Added Share for WhatsApp/Insta etc
  Dimensions,
  useWindowDimensions, // 🔴 NAYA: live width tracking (rotation ke liye bhi)
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useRouter } from 'expo-router';
import { SharedData } from '../store';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────
// 🔴🔴🔴 iPAD DETECTION — sirf yahan decide hota hai
// ─────────────────────────────────────────────────
const TABLET_BREAKPOINT = 768;        // 11" iPad aur upar
const LARGE_TABLET_BREAKPOINT = 1000; // 13" iPad aur upar

// ── Gradient Text Helper ──
const GradientText = ({ text, colors, style }: any) => (
  <MaskedView maskElement={<Text style={style}>{text}</Text>}>
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <Text style={[style, { opacity: 0 }]}>{text}</Text>
    </LinearGradient>
  </MaskedView>
);

// ── Filter Pill Component ──
const FilterPill = ({ title, icon, iconLib, color, isActive, onPress, isTablet, isLargeTablet }: any) => {
  const IconComp = iconLib === 'Ionicons'
    ? Ionicons
    : (iconLib === 'FontAwesome5' ? FontAwesome5 : MaterialCommunityIcons);

  const iconSize = isLargeTablet ? 15 : isTablet ? 13 : 10;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.filterPill,
        isTablet && styles.filterPillTablet,
        isLargeTablet && styles.filterPillTabletLarge,
        isActive ? { backgroundColor: color, borderColor: color } : { borderColor: 'rgba(255,255,255,0.1)' }
      ]}
    >
      {icon && <IconComp name={icon} size={iconSize} color={isActive ? '#FFF' : color} style={{ marginRight: isTablet ? 6 : 3 }} />}
      <Text
        style={[styles.filterText, isTablet && styles.filterTextTablet, isLargeTablet && styles.filterTextTabletLarge, { color: isActive ? '#FFF' : '#D1D5DB' }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// ── Reply Card Component ──
// 🔴 Modified to handle selection, copying, and sharing
const ReplyCard = ({ icon, iconLib, color, tone, risk, riskColor, message, explanation, isSelected, onSelect, isTablet, isLargeTablet, cardStyle }: any) => {
  const IconComp = iconLib === 'FontAwesome5' ? FontAwesome5 : MaterialCommunityIcons;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message);
    Alert.alert("Copied! ✨", "Message copied to clipboard.", [{ text: "OK" }], { cancelable: true });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onSelect} // Allow clicking the whole card to select
      style={[
        styles.replyCard,
        isTablet && styles.replyCardTablet,
        cardStyle,
        { borderColor: isSelected ? color : `${color}40` },
        isSelected && { backgroundColor: `${color}10` } // Highlight if selected
      ]}
    >
      <View style={styles.replyHeader}>
        <View style={styles.replyToneBox}>
          <IconComp name={icon} size={isTablet ? 17 : 14} color={color} />
          <Text style={[styles.replyTone, isTablet && styles.replyToneTablet, { color: color }]}>{tone}</Text>
          <View style={[styles.riskBadge, isTablet && styles.riskBadgeTablet, { backgroundColor: `${riskColor}15` }]}>
            <Text style={[styles.riskText, isTablet && styles.riskTextTablet, { color: riskColor }]}>{risk}</Text>
          </View>
        </View>

        <View style={styles.replyActions}>
          <TouchableOpacity style={[styles.actionBtn, isTablet && styles.actionBtnTablet]} onPress={handleCopy}>
            <Text style={[styles.copyText, isTablet && styles.copyTextTablet]}>Copy</Text>
          </TouchableOpacity>
          {/* Checkbox Icon representing selection */}
          <View style={[styles.iconBtn, isTablet && styles.iconBtnTablet]}>
            <Feather
              name={isSelected ? "check-circle" : "circle"}
              size={isTablet ? 15 : 12}
              color={isSelected ? color : "#D1D5DB"}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.replyMessage, isTablet && styles.replyMessageTablet, isLargeTablet && styles.replyMessageTabletLarge]}>{message}</Text>

      <Text style={[styles.replyExplanation, isTablet && styles.replyExplanationTablet]}>
        <Text style={styles.whyItWorks}>Why it works: </Text>
        {explanation}
      </Text>
    </TouchableOpacity>
  );
};

// ==========================================
// MAIN SCREEN
// ==========================================
export default function RepliesScreen() {
  const router = useRouter();

  // 🔴 NAYA: live dimensions — rotation bhi handle hogi
  const { width: winWidth } = useWindowDimensions();
  const isTablet = winWidth >= TABLET_BREAKPOINT;
  const isLargeTablet = winWidth >= LARGE_TABLET_BREAKPOINT;

  // Bare screen par content thora chaura rakhte hain taake khaali jagah na bachay
  const maxContentWidth = isLargeTablet ? 920 : 700;
  const PAD_PADDING = isTablet ? Math.max((winWidth - maxContentWidth) / 2, 40) : 20;

  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null); // State to hold selected message

  const data = SharedData.aiResult || {};
  const aiReplies = data.replies || [];
  const originalMessage = data.extracted_message || "Analyzing screenshot...";
  const isTheirs = (SharedData as any).requestPayload?.perspective === 'opponent';

  const getToneConfig = (tone: string) => {
    switch (tone?.toLowerCase()) {
      case 'calm': return { icon: "spa", iconLib: "FontAwesome5", color: "#60A5FA", risk: "LOW RISK", riskColor: "#60A5FA" };
      case 'high-value': return { icon: "diamond-stone", iconLib: "MaterialCommunityIcons", color: "#A855F7", risk: "VERY LOW RISK", riskColor: "#A855F7" };
      case 'charismatic': return { icon: "crown", iconLib: "MaterialCommunityIcons", color: "#FBBF24", risk: "LOW RISK", riskColor: "#FBBF24" };
      case 'playful': return { icon: "emoticon-outline", iconLib: "MaterialCommunityIcons", color: "#34D399", risk: "LOW RISK", riskColor: "#34D399" };
      case 'respected': return { icon: "shield-check-outline", iconLib: "MaterialCommunityIcons", color: "#60A5FA", risk: "VERY LOW RISK", riskColor: "#60A5FA" };
      case 'light': return { icon: "emoticon-outline", iconLib: "MaterialCommunityIcons", color: "#34D399", risk: "LOW RISK", riskColor: "#34D399" };
      default: return { icon: "sparkles", iconLib: "Ionicons", color: "#9333EA", risk: "LOW RISK", riskColor: "#9333EA" };
    }
  };

  const filteredReplies = activeFilter === 'All'
    ? aiReplies
    : aiReplies.filter((r: any) => r.tone?.toLowerCase() === activeFilter.toLowerCase());

  // 🔴 Function to handle sharing
  const handleSendNow = async () => {
    if (!selectedMessage) {
      Alert.alert("Hold up", "Please select a message to send first.");
      return;
    }

    try {
      const result = await Share.share({
        message: selectedMessage,
        // url could also be provided here if needed for iOS specific rich sharing, but text is fine.
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
          console.log("Shared with: ", result.activityType);
        } else {
          // shared
          console.log("Shared successfully");
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
        console.log("Share dismissed");
      }
    } catch (error: any) {
      Alert.alert("Error sharing", error.message);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      {/* 🔴 Applied PAD_PADDING to header directly */}
      <View style={[styles.header, isTablet && styles.headerTablet, { paddingHorizontal: PAD_PADDING }]}>
        <TouchableOpacity style={[styles.navButton, isTablet && styles.navButtonTablet]} onPress={() => router.back()}>
          <Feather name="chevron-left" size={isTablet ? 28 : 24} color="#D1D5DB" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, isTablet && styles.navButtonTablet]} onPress={handleSendNow}>
          <Feather name="share" size={isTablet ? 24 : 20} color={selectedMessage ? "#D946EF" : "#D1D5DB"} />
        </TouchableOpacity>
      </View>

      {/* 🔴 Applied PAD_PADDING to scrollContainer */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isTablet && styles.scrollContainerTablet,
          isLargeTablet && styles.scrollContainerTabletLarge,
          { paddingHorizontal: PAD_PADDING },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero Section ── */}
        {/* 🔴 Removed inline marginHorizontal/paddingHorizontal from sections below */}
        <View style={[styles.heroSection, isTablet && styles.heroSectionTablet, isLargeTablet && styles.heroSectionTabletLarge]}>
          <View style={styles.heroTextContent}>
            <GradientText
              text="Winning Texts ✨"
              colors={['#FF3366', '#D946EF']}
              style={[styles.heroTitle, isTablet && styles.heroTitleTablet, isLargeTablet && styles.heroTitleTabletLarge]}
            />
            <Text style={[styles.heroSubtitle, isTablet && styles.heroSubtitleTablet]}>Pick your tone. Copy. Send. Win.</Text>
            <View style={[styles.heroBadge, isTablet && styles.heroBadgeTablet]}>
              <Ionicons name="sparkles" size={isTablet ? 15 : 12} color="#F87171" style={{ marginRight: 6 }} />
              <Text style={[styles.heroBadgeText, isTablet && styles.heroBadgeTextTablet]}>{isTheirs ? 'Their text. Your best reply.' : 'Your message. But better.'}</Text>
            </View>
          </View>
          <Image
            source={require('../../assets/mascot-detective3.png')}
            style={[styles.heroMascot, isTablet && styles.heroMascotTablet, isLargeTablet && styles.heroMascotTabletLarge]}
          />
        </View>

        {/* ── Original Message Box ── */}
        <View style={[styles.originalMsgBox, isTablet && styles.originalMsgBoxTablet]}>
          <View style={styles.originalMsgHeader}>
            <Text style={[styles.originalMsgLabel, isTablet && styles.originalMsgLabelTablet]}>{isTheirs ? 'THEIR MESSAGE' : 'ANALYZED MESSAGE'}</Text>
            {!isTheirs && (
            <View style={styles.originalRiskBadge}>
              <Text style={[styles.originalRiskLabel, isTablet && styles.originalRiskLabelTablet]}>RISK LEVEL</Text>
              <View style={[styles.highRiskPill, isTablet && styles.highRiskPillTablet]}>
                <MaterialCommunityIcons name="shield-alert-outline" size={isTablet ? 13 : 10} color="#F87171" style={{ marginRight: 3 }} />
                <Text style={[styles.highRiskText, isTablet && styles.highRiskTextTablet]}>HIGH</Text>
              </View>
            </View>
            )}
          </View>

          <View style={[styles.msgBubble, isTablet && styles.msgBubbleTablet]}>
            <Text style={[styles.msgBubbleText, isTablet && styles.msgBubbleTextTablet]}>
              {originalMessage ? `"${originalMessage}"` : "AI is analyzing screenshot..."}
            </Text>
          </View>

          <Text style={[styles.originalMsgFooter, isTablet && styles.originalMsgFooterTablet]}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={isTablet ? 15 : 12} color="#D946EF" />
            {isTheirs ? 'Pick the reply that fits your goal.' : 'These replies keep your energy high and your value higher.'}
          </Text>
        </View>

        {/* ── Filter Tabs ── */}
        <View style={[styles.filtersContainer, isTablet && styles.filtersContainerTablet]}>
          <FilterPill title="All" icon="sparkles" iconLib="Ionicons" color="#9333EA" isActive={activeFilter === 'All'} onPress={() => setActiveFilter('All')} isTablet={isTablet} isLargeTablet={isLargeTablet} />
          <FilterPill title="Calm" icon="spa" iconLib="FontAwesome5" color="#60A5FA" isActive={activeFilter === 'Calm'} onPress={() => setActiveFilter('Calm')} isTablet={isTablet} isLargeTablet={isLargeTablet} />
          <FilterPill title="High-Value" icon="diamond-stone" iconLib="MaterialCommunityIcons" color="#A855F7" isActive={activeFilter === 'High-Value'} onPress={() => setActiveFilter('High-Value')} isTablet={isTablet} isLargeTablet={isLargeTablet} />
          <FilterPill title="Charismatic" icon="crown" iconLib="MaterialCommunityIcons" color="#FBBF24" isActive={activeFilter === 'Charismatic'} onPress={() => setActiveFilter('Charismatic')} isTablet={isTablet} isLargeTablet={isLargeTablet} />
          <FilterPill title="Playful" icon="emoticon-outline" iconLib="MaterialCommunityIcons" color="#34D399" isActive={activeFilter === 'Playful'} onPress={() => setActiveFilter('Playful')} isTablet={isTablet} isLargeTablet={isLargeTablet} />
          <FilterPill title="Respected" icon="shield-check-outline" iconLib="MaterialCommunityIcons" color="#60A5FA" isActive={activeFilter === 'Respected'} onPress={() => setActiveFilter('Respected')} isTablet={isTablet} isLargeTablet={isLargeTablet} />
        </View>

        {/* ── Reply Cards List ── */}
        {/* 🔴 TABLET: 2-column grid taake khaali jagah na bachay; MOBILE: original single column */}
        <View style={[styles.cardsList, isTablet && styles.cardsListTablet]}>
          {filteredReplies.length > 0 ? (
            filteredReplies.map((reply: any, index: number) => {
              const config = getToneConfig(reply.tone);
              const isSelected = selectedMessage === reply.message;
              return (
                <ReplyCard
                  key={index}
                  icon={config.icon} iconLib={config.iconLib} color={config.color} tone={reply.tone || "Alternative"}
                  risk={config.risk} riskColor={config.riskColor}
                  message={reply.message}
                  explanation={reply.explanation}
                  isSelected={isSelected}
                  onSelect={() => setSelectedMessage(reply.message)} // Update selected message
                  isTablet={isTablet}
                  isLargeTablet={isLargeTablet}
                  cardStyle={isTablet ? styles.replyCardGridItem : undefined}
                />
              );
            })
          ) : (
            <Text style={{ color: '#6B7280', textAlign: 'center', marginVertical: 20, width: '100%' }}>No replies found for this tone.</Text>
          )}
        </View>

        {/* ── Bottom Actions ── */}
        <View style={[styles.bottomActions, isTablet && styles.bottomActionsTablet]}>
          <TouchableOpacity
            style={[styles.sendBtn, isTablet && styles.sendBtnTablet, !selectedMessage && { opacity: 0.5 }]} // Dim button if nothing selected
            activeOpacity={0.8}
            onPress={handleSendNow}
          >
            <LinearGradient
              colors={['#FF3366', '#9333EA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.sendBtnGrad}
            >
              <Feather name="send" size={isTablet ? 19 : 16} color="#FFF" />
              <Text style={[styles.sendBtnText, isTablet && styles.sendBtnTextTablet]}>
                 {selectedMessage ? "Send Selected Message" : "Select a Message to Send"}
              </Text>
              <Ionicons name="sparkles" size={isTablet ? 19 : 16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Footer Lock ── */}
        <View style={styles.footerLock}>
          <Feather name="lock" size={12} color="#A855F7" />
          <Text style={[styles.footerLockText, isTablet && styles.footerLockTextTablet]}>Pro users unlock unlimited versions & advanced tones</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05020B' },
  // 🔴 Added paddingTop, removed paddingBottom if it conflicts, but let's keep paddingBottom:40
  scrollContainer: { paddingBottom: 40 },
  scrollContainerTablet: { paddingBottom: 64, paddingTop: 4 },
  scrollContainerTabletLarge: { paddingBottom: 90 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
  },
  headerTablet: { paddingVertical: 18 },
  navButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  navButtonTablet: { width: 48, height: 48, borderRadius: 14 },

  // ── Hero ──
  heroSection: {
    flexDirection: 'row', marginTop: 10, marginBottom: 20,
    position: 'relative', minHeight: 120,
  },
  heroSectionTablet: { marginTop: 14, marginBottom: 32, minHeight: 170, alignItems: 'center' },
  heroSectionTabletLarge: { minHeight: 210 },
  heroTextContent: { flex: 1, zIndex: 2, paddingTop: 10 },
  heroTitle: { fontSize: 23, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  heroTitleTablet: { fontSize: 34, marginBottom: 8 },
  heroTitleTabletLarge: { fontSize: 40 },
  heroSubtitle: { color: '#9CA3AF', fontSize: 11, marginBottom: 12 },
  heroSubtitleTablet: { fontSize: 15, marginBottom: 18 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248, 113, 113, 0.1)',
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.2)'
  },
  heroBadgeTablet: { paddingHorizontal: 16, paddingVertical: 9 },
  heroBadgeText: { color: '#E5E7EB', fontSize: 11, fontWeight: '600' },
  heroBadgeTextTablet: { fontSize: 14 },
  heroMascot: {
    position: 'absolute', right: 0, top: -20,
    width: 160, height: 160, resizeMode: 'contain', zIndex: 1,
  },
  heroMascotTablet: { width: 230, height: 230, top: -10, right: 4 },
  heroMascotTabletLarge: { width: 280, height: 280 },

  // ── Original Message ──
  originalMsgBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.05)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)', marginBottom: 14,
  },
  originalMsgBoxTablet: { borderRadius: 16, padding: 20, marginBottom: 24 },
  originalMsgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  originalMsgLabel: { color: '#F43F5E', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5 },
  originalMsgLabelTablet: { fontSize: 11.5 },
  originalRiskBadge: { alignItems: 'flex-end' },
  originalRiskLabel: { color: '#EF4444', fontSize: 7.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  originalRiskLabelTablet: { fontSize: 10, marginBottom: 4 },
  highRiskPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  highRiskPillTablet: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  highRiskText: { color: '#F87171', fontSize: 8.5, fontWeight: '800' },
  highRiskTextTablet: { fontSize: 11 },
  msgBubble: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 10 },
  msgBubbleTablet: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, marginBottom: 16 },
  msgBubbleText: { color: '#9CA3AF', fontStyle: 'italic', fontSize: 13.5, fontWeight: '500' },
  msgBubbleTextTablet: { fontSize: 17 },
  originalMsgFooter: { color: '#9CA3AF', fontSize: 9.5, lineHeight: 14 },
  originalMsgFooterTablet: { fontSize: 13, lineHeight: 19 },

  // ── Filters ──
  filtersContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 4, width: '100%' },
  filtersContainerTablet: { marginBottom: 28, gap: 10 },
  filterPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 2, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  filterPillTablet: { paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16 },
  filterPillTabletLarge: { paddingVertical: 17 },
  filterText: { fontSize: 8, fontWeight: '700' },
  filterTextTablet: { fontSize: 12.5 },
  filterTextTabletLarge: { fontSize: 14 },

  // ── Reply Cards ──
  cardsList: { gap: 8, marginBottom: 20 },
  // 🔴 TABLET: 2-column grid — cards row mein wrap hokar khaali jagah fill karte hain
  cardsListTablet: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 28 },
  replyCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 12, borderWidth: 1 },
  replyCardTablet: { borderRadius: 18, padding: 20 },
  // Grid item width sirf tablet par lagti hai (do columns)
  replyCardGridItem: { width: '48.5%' },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  replyToneBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyTone: { fontSize: 12.5, fontWeight: '700' },
  replyToneTablet: { fontSize: 15 },
  riskBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  riskBadgeTablet: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  riskText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  riskTextTablet: { fontSize: 10 },
  replyActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionBtnTablet: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  copyText: { color: '#D1D5DB', fontSize: 10.5, fontWeight: '600' },
  copyTextTablet: { fontSize: 13 },
  iconBtn: { width: 24, height: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  iconBtnTablet: { width: 30, height: 30, borderRadius: 8 },
  replyMessage: { color: '#FFF', fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 4 },
  replyMessageTablet: { fontSize: 17, lineHeight: 25, marginBottom: 8 },
  replyMessageTabletLarge: { fontSize: 18.5, lineHeight: 27 },
  replyExplanation: { color: '#9CA3AF', fontSize: 10 },
  replyExplanationTablet: { fontSize: 13, lineHeight: 19 },
  whyItWorks: { color: '#6B7280' },

  // ── Bottom Actions ──
  bottomActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bottomActionsTablet: { marginBottom: 20 },
  sendBtn: { flex: 2, height: 48, borderRadius: 12, overflow: 'hidden' },
  sendBtnTablet: { height: 64, borderRadius: 16 },
  sendBtnGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  sendBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '700' },
  sendBtnTextTablet: { fontSize: 17 },
  regenerateBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  regenerateText: { color: '#D1D5DB', fontSize: 12, fontWeight: '600' },

  footerLock: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
  footerLockText: { color: '#6B7280', fontSize: 10, fontWeight: '500' },
  footerLockTextTablet: { fontSize: 13 },
});