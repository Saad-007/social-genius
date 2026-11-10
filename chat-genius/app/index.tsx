import React, { useState, useRef, useEffect, useCallback } from 'react';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { DeviceEventEmitter } from 'react-native';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  ScrollView,
  TextInput,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SharedData } from './store';
import { syncProToExtension } from './lib/proSync';
import { supabase } from './lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Purchases from 'react-native-purchases';
import Superwall, { PaywallPresentationHandler, SubscriptionStatus, } from '@superwall/react-native-superwall';

const { width } = Dimensions.get('window');

const TABLET_BREAKPOINT = 768;
const isTabletWidth = (w: number) => w >= TABLET_BREAKPOINT;

const BACKEND_URL = 'https://chat-genious.onrender.com/api/analyze-chat';

const GradientText = ({ text, colors, style }: any) => (
  <MaskedView maskElement={<Text style={style}>{text}</Text>}>
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <Text style={[style, { opacity: 0 }]}>{text}</Text>
    </LinearGradient>
  </MaskedView>
);

const StepProgress = ({
  step,
  total = 9,
  from = 5, // is step se pehle ka progress count nahi hoga
}: { step: number; total?: number; from?: number }) => {
  const fillPercent = ((step - from) / (total - from)) * 100;

  return (
    <View style={styles.quizProgressRow}>
      <View style={styles.quizProgressBarBg}>
        <View style={[styles.quizProgressBarFill, { width: `${fillPercent}%` }]} />
      </View>
      <Text style={styles.quizProgressText}>{step}/{total}</Text>
    </View>
  );
};
// ==========================================
// QUIZ DATA — 5 screens
// ==========================================
const QUIZ_SCREENS = [
  {
    question: "What usually happens when you're texting someone you actually like?",
    subtitle: "Be honest. No judgment here.",
    mascot: require('../assets/mascot-quiz1.png'),
    options: [
      { icon: '💭', text: 'I overthink every reply' },
      { icon: '😵‍💫', text: 'I ask should I send this or not?' },
      { icon: '👀', text: 'I reread my text multiple times' },
      { icon: '😬', text: 'I send it, then instantly regret it' },
      { icon: '📱', text: 'I type, then delete it' },
      { icon: '🥶', text: "I act cold so I don't seem needy" },
      { icon: '🕵️', text: 'I overanalyze their replies' },
      { icon: '🎲', text: 'I just wing it and hope for the best' },
    ],
  },
  {
    question: 'What scares you most when texting someone you care about?',
    subtitle: '',
    mascot: require('../assets/mascot-quiz2.png'),
    options: [
      { icon: '😰', text: 'Coming across as needy or desperate' },
      { icon: '👻', text: 'Being left on read and not knowing why' },
      { icon: '💀', text: 'Saying something that completely kills the vibe' },
      { icon: '🤦', text: 'Misreading the situation and embarrassing myself' },
      { icon: '🫠', text: 'Caring way more than they do' },
      { icon: '📱', text: 'Sending too much and pushing them away' },
      { icon: '🥲', text: 'Saying the wrong thing and changing how they see me' },
    ],
  },
  {
    question: 'What do you usually wish you could undo?',
    subtitle: '',
    mascot: require('../assets/mascot-quiz3.png'),
    options: [
      { icon: '🥹', text: 'coming across as awkward, needy & desperate.' },
      { icon: '😭', text: 'Sending a message while emotional' },
      { icon: '📱', text: "Double texting when I said I wouldn't" },
      { icon: '📝', text: 'Sending way too much' },
      { icon: '🥲', text: 'Asking for reassurance' },
      { icon: '😬', text: 'Coming on too strong' },
      { icon: '👀', text: 'Reading too much into their reply' },
      { icon: '🫠', text: 'Honestly... most of my texts' },
    ],
  },
  {
    question: 'If you could change one thing about how you text, what would it be?',
    subtitle: '',
    mascot: require('../assets/mascot-quiz4.png'),
    options: [
      { icon: '🧠', text: 'Stop overthinking everything' },
      { icon: '😌', text: 'Feel confident before I send' },
      { icon: '🎯', text: 'Always know what to say' },
      { icon: '🫶', text: 'Say how I feel without seeming needy' },
      { icon: '💬', text: 'Know how my texts actually sound' },
      { icon: '🚫', text: 'Stop sending texts I regret' },
      { icon: '✨', text: 'Make every message work in my favor' },
    ],
  },
  {
    question: 'Be honest... how often do you wish you could unsend something?',
    subtitle: '',
    mascot: require('../assets/mascot-quiz5.png'),
    options: [
      { icon: '😭', text: 'Way too often' },
      { icon: '🫠', text: "More than I'd admit" },
      { icon: '😬', text: 'Sometimes, especially when emotional' },
      { icon: '👀', text: "Usually after they don't reply" },
      { icon: '💀', text: 'Almost every time I really care' },
      { icon: '😌', text: "Rarely, I know what I'm doing" },
      { icon: '🤡', text: "I've already made that mistake enough" },
    ],
  },
];

// ==========================================
// SCENARIO DATA (practice screen)
// ==========================================
const SCENARIO_OPTIONS = [
  { icon: '😰', text: "Hey, did I do something? You've been kinda distant. I feel like I'm overthinking this, but are we okay?" },
  { icon: '🥲', text: "Okay… are you mad at me or something? You're online but not replying and now I'm stressing 😭" },
  { icon: '💀', text: "I'm probably being annoying, but please just tell me. Did I say something wrong? I really don't want you upset with me." },
];

// ==========================================
// SCREEN INDEX MAP
// ==========================================

const HOOK_INDEX = 0;             // typewriter opening hook
const INTRO_INDEX = 1;            // "Meet Social Genius."
const QUIZ_START_INDEX = 2;       // 5 quiz screens: 2..6
const PRACTICE_INTRO_INDEX = 7;
const SCENARIO_INDEX = 8;
const ANALYZING_INDEX = 9;
const RESULTS_INDEX = 10;
const FEATURE_START_INDEX = 11;   // 4 screens: 11..14
const DYNAMIC_INDEX = 15;
const REVIEWS_INDEX = 16;
const CLOSING_INDEX = 17;         // 👈 Reviews ke baad "You've got this!" + Paywall
const LOGIN_INDEX = 18;           // 👈 Paywall purchase hone ke BAAD Account Creation
const TOTAL_SCREENS = 19;

// ==========================================
// FEATURE SHOWCASE DATA — 4 screens (phone mockup)
// thumb = apni video ka screenshot/poster, e.g. require('../assets/feat-video1.jpg')
// ==========================================
const FEATURE_SCREENS: any[] = [
  {
    step: 12,
    headline: [
      { t: 'Know How Your Text Sounds\n' },
      { t: 'Before You Send It.', pink: true },
    ],
    subheadline:
      'Paste your text and Social Genius tells you how it comes across, then gives you a better version to send.',
    buttonText: "That's Really Helpful",
    sideLabel: 'Same\nwords.\nDifferent\nvibe.',
    mockType: 'before-after',
    thumb: null,
    video: require('../assets/feat-video1.mp4'),
    duration: '0:30 / 0:52',
  },
  {
    step: 13,
    headline: [
      { t: 'Understand What Their Text\n' },
      { t: 'Really Means.', pink: true },
    ],
    subheadline:
      'Paste their message and Social Genius explains what they might really mean, and what you should reply.',
    buttonText: 'I Need This',
    sideLabel: 'Read\nbetween\nthe lines.',
    mockType: 'their-text',
    thumb: null,
    video: require('../assets/feat-video2.mp4'),
    duration: '0:18 / 0:52',
  },
  {
    step: 14,
    headline: [
      { t: 'Get Practical Advice For Any\n' },
      { t: 'Situation.', pink: true },
    ],
    subheadline:
      "Tell Social Genius what happened and get clear, honest advice on what to do and what's not to.",
    buttonText: "Okay, I'm Sold",
    sideLabel: 'Real\nadvice.\nNot just\nopinions.',
    mockType: 'advice',
    thumb: null,
    video: require('../assets/feat-video3.mp4'),
    duration: '0:12 / 0:52',
  },
  {
    step: 15,
    headline: [
      { t: 'Analyze Texts Without\n' },
      { t: 'Leaving the Chat.', pink: true },
    ],
    subheadline:
      'Tap Social Genius in your keyboard to instantly analyze, rewrite, or reply, right where you\u2019re texting.',
    buttonText: "That's So Convenient",
    sideLabel: 'Right\nin your\nchat.',
    mockType: 'keyboard',
    thumb: null,
    video: require('../assets/feat-video4.mp4'),
    duration: '',
  },
];
// ==========================================
// FEATURE SHOWCASE — PHONE MOCKUP COMPONENTS
// ==========================================
const FEAT_PINK = '#FF3366';
const FEAT_PURPLE = '#D946EF';

const FEAT_TONES: any = {
  neutral: { bg: 'rgba(59,130,246,0.10)', border: 'rgba(96,165,250,0.55)', label: '#93C5FD', icon: '#60A5FA' },
  bad: { bg: 'rgba(168,85,247,0.16)', border: 'rgba(217,70,239,0.7)', label: '#F0ABFC', icon: '#E879F9' },
  good: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(74,222,128,0.6)', label: '#4ADE80', icon: '#4ADE80' },
};

const FeatInfoCard = ({ tone, icon, label, children, right }: any) => {
  const t = FEAT_TONES[tone];
  return (
    <View style={[fs.card, { backgroundColor: t.bg, borderColor: t.border, shadowColor: t.border }]}>
      <View style={[fs.cardIcon, { borderColor: t.border }]}>
        <MaterialCommunityIcons name={icon} size={13} color={t.icon} />
      </View>
      <View style={{ flex: 1 }}>
        {label ? <Text style={[fs.cardLabel, { color: t.label }]}>{label}</Text> : null}
        <Text style={fs.cardText}>{children}</Text>
      </View>
      {right}
    </View>
  );
};

const FeatAppHeader = () => (
  <View style={fs.appHeader}>
    <Feather name="arrow-left" size={11} color="#9CA3AF" />
    <View style={fs.appBrandRow}>
      <MaterialCommunityIcons name="crown" size={11} color={FEAT_PURPLE} />
      <Text style={fs.appBrand}>
        Social<Text style={{ color: FEAT_PINK }}>Genius</Text>
      </Text>
    </View>
    <Text style={{ fontSize: 10 }}>😊</Text>
  </View>
);

const FeatVideoBlock = ({ thumb, duration }: any) => (
  <View style={fs.video}>
    {thumb ? (
      <Image source={thumb} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      <LinearGradient
        colors={['#3B1D63', '#1A0F2E', '#0A0514']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <View style={fs.videoSilhouette}>
          <Ionicons name="person" size={64} color="rgba(255,255,255,0.12)" />
        </View>
      </LinearGradient>
    )}
    <View style={fs.playBtn}>
      <Feather name="play" size={15} color="#FFF" style={{ marginLeft: 2 }} />
    </View>
    <View style={fs.videoBar}>
      <View style={fs.videoSeekTrack}>
        <View style={fs.videoSeekFill} />
        <View style={fs.videoSeekDot} />
      </View>
      <View style={fs.videoTimeRow}>
        <Text style={fs.videoTime}>{duration}</Text>
        <Feather name="maximize" size={8} color="#E5E7EB" />
      </View>
    </View>
  </View>
);

const FEAT_KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const FeatKeyboardMock = () => (
  <View style={fs.kb}>
    {FEAT_KEY_ROWS.map((row, i) => (
      <View key={i} style={[fs.kbRow, i === 1 && { paddingHorizontal: 8 }]}>
        {row.split('').map((k) => (
          <View key={k} style={fs.kbKey}>
            <Text style={fs.kbKeyText}>{k}</Text>
          </View>
        ))}
      </View>
    ))}
    <View style={fs.kbRow}>
      <View style={[fs.kbKey, { width: 26 }]}><Text style={fs.kbKeyText}>123</Text></View>
      <View style={[fs.kbKey, { flex: 1 }]}><Text style={fs.kbKeyText}>space</Text></View>
      <View style={[fs.kbKey, { width: 26 }]}><Feather name="mic" size={8} color="#E5E7EB" /></View>
    </View>
  </View>
);

const FeatPhoneMockup = ({ data }: any) => (
  <View style={fs.phone}>
    <View style={fs.notch} />
    {/* status bar */}
    <View style={fs.statusRow}>
      <Text style={fs.statusTime}>9:41</Text>
      <View style={fs.statusIcons}>
        <Ionicons name="cellular" size={9} color="#FFF" />
        <Ionicons name="wifi" size={9} color="#FFF" />
        <Ionicons name="battery-full" size={11} color="#FFF" />
      </View>
    </View>

    {data.mockType !== 'keyboard' && (
      <>
        <FeatAppHeader />
        <FeatVideoBlock thumb={data.thumb} duration={data.duration} />
      </>
    )}

    {data.mockType === 'before-after' && (
      <View style={fs.cards}>
        <FeatInfoCard tone="neutral" icon="account-outline" label="Your text:">
          {'"Heyy, are you mad at me? 😓 I feel like you\u2019ve been acting different lately. Did I do something wrong?"'}
        </FeatInfoCard>
        <FeatInfoCard
          tone="bad"
          icon="emoticon-sad-outline"
          label="How it comes across:"
          right={<MaterialCommunityIcons name="close-circle-outline" size={14} color="#E879F9" />}
        >
          Looks needy & insecure
        </FeatInfoCard>
        <FeatInfoCard tone="good" icon="check" label="Better version:">
          {'"Hey! I\u2019ve been thinking about you and just wanted to check in. Hope you\u2019re doing well!"'}
        </FeatInfoCard>
      </View>
    )}

    {data.mockType === 'their-text' && (
      <View style={fs.cards}>
        <FeatInfoCard tone="neutral" icon="message-text-outline" label="Their text:">
          {'"It\u2019s fine."'}
        </FeatInfoCard>
        <FeatInfoCard tone="bad" icon="thought-bubble-outline" label="What they might really mean:">
          They&apos;re upset, but don&apos;t want to confront you directly.
        </FeatInfoCard>
        <FeatInfoCard tone="good" icon="reply-outline" label="You could reply:">
          {'"I get it, I was just checking in. Want to talk about it?"'}
        </FeatInfoCard>
      </View>
    )}

    {data.mockType === 'advice' && (
      <View style={fs.cards}>
        <FeatInfoCard tone="neutral" icon="help-circle-outline" label="What happened?">
          He left me on read... what should I do?
        </FeatInfoCard>
        <View style={[fs.card, fs.adviceBox]}>
          <View style={{ flex: 1 }}>
            <View style={fs.adviceTitleRow}>
              <MaterialCommunityIcons name="crown" size={10} color={FEAT_PURPLE} />
              <Text style={fs.adviceTitle}>Social Genius advice:</Text>
            </View>
            {[
              "Don't double text right away",
              'Give it 1-2 days',
              'Focus on your own energy',
              'Then send a light, confident message',
            ].map((line, i) => (
              <View key={i} style={fs.adviceRow}>
                <MaterialCommunityIcons name="check-circle" size={11} color="#4ADE80" />
                <Text style={fs.adviceText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    )}

    {data.mockType === 'keyboard' && (
      <>
        {/* chat header */}
        <View style={fs.chatHeader}>
          <Feather name="chevron-left" size={12} color="#60A5FA" />
          <View style={fs.chatAvatar}>
            <Ionicons name="person" size={10} color="#FFF" />
          </View>
          <Text style={fs.chatName}>Alex</Text>
          <View style={{ flex: 1 }} />
          <Feather name="video" size={10} color="#60A5FA" style={{ marginRight: 6 }} />
          <Feather name="phone" size={10} color="#60A5FA" />
        </View>
        <View style={fs.chatBody}>
          <View style={fs.chatBubble}>
            <Text style={fs.chatBubbleText}>
              {'"Heyy, are you mad at me? 😓 I feel like you\u2019ve been acting different lately. Did I do something wrong?"'}
            </Text>
          </View>
        </View>
        {/* Social Genius popup menu */}
        <View style={fs.kbMenu}>
          <View style={fs.kbMenuHeader}>
            <MaterialCommunityIcons name="crown" size={10} color={FEAT_PURPLE} />
            <Text style={fs.kbMenuBrand}>
              Social<Text style={{ color: FEAT_PINK }}>Genius</Text>
            </Text>
          </View>
          {[
            { icon: 'magnify', label: 'Analyze Text' },
            { icon: 'pencil-outline', label: 'Rewrite' },
            { icon: 'message-reply-outline', label: 'Reply' },
          ].map((it, i) => (
            <View key={i} style={fs.kbMenuRow}>
              <MaterialCommunityIcons name={it.icon as any} size={12} color={FEAT_PURPLE} />
              <Text style={fs.kbMenuText}>{it.label}</Text>
            </View>
          ))}
        </View>
        <View style={fs.inputBar}>
          <Text style={fs.inputPlaceholder}>iMessage</Text>
          <View style={fs.sendBtn}>
            <Feather name="arrow-up" size={10} color="#FFF" />
          </View>
        </View>
        <FeatKeyboardMock />
      </>
    )}
  </View>
);
const GradientBg = ({ children, style }: any) => (
  <View style={[{ flex: 1, backgroundColor: '#000' }, style]}>
    <LinearGradient
      colors={['#5f007e', '#18024d']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.35 }}
      style={StyleSheet.absoluteFill}
    />
    <LinearGradient
      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.93)', '#000000']}
      locations={[0, 0.35, 0.6, 0.8, 1]}
      style={StyleSheet.absoluteFill}
    />
    {children}
  </View>
);

const BgSafeArea = ({ children }: any) => (
  <GradientBg>
    <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
  </GradientBg>
);
const BrandLogo = () => (
  <View style={fs.brandRow}>
    <MaterialCommunityIcons name="crown" size={18} color={FEAT_PURPLE} />
    <Text style={fs.brandText}>
      Social<Text style={{ color: FEAT_PINK }}>Genius</Text>
    </Text>
  </View>
);



const PHONE_ASPECT = 0.49;            // asli iPhone 15 Pro jaisa width/height
const SHOW_FAKE_STATUS_BAR = false;   // true karo agar tumhari video me khud ka status bar nahi hai

const FeaturePhone = ({ source, active }: { source: any; active: boolean }) => {
  const player = useVideoPlayer(source ?? null, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const { height: winH } = useWindowDimensions();
  const enter = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!active) {
      enter.setValue(0);
      if (source) player.pause();
      return;
    }

    // phone neeche se aane tak video ruki rahe aur shuru se ho
    enter.setValue(0);
    if (source) {
      player.pause();
      player.currentTime = 0;
    }

    let cancelled = false;
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: 950,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    // modal/scroll transition khatam hone ka thoda wait, phir animation
    const startTimer = setTimeout(() => {
      anim.start(({ finished }) => {
        if (finished && !cancelled && source) player.play();
      });
    }, 650);

    // safety: agar iOS animation drop kar de to bhi phone dikhe aur video chale
    const safetyTimer = setTimeout(() => {
      if (cancelled) return;
      enter.stopAnimation();
      enter.setValue(1);
      if (source) player.play();
    }, 2400);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(safetyTimer);
      anim.stop();
    };
  }, [active, source, w > 0]);
  // sab size phone ki width se nikalte hain, taake har screen par proportion wahi rahe
  const pw = w || 200;
  const H = pw / PHONE_ASPECT;
  const R = pw * 0.15;                       // bahar ka corner radius
  const rim = Math.max(2.5, pw * 0.014);     // titanium rim
  const bezel = pw * 0.028;                  // kaala bezel
  const screenR = R - rim - bezel;           // screen ka corner radius
  const btnW = Math.max(3, pw * 0.017);      // side button ki motai
  const islandW = pw * 0.30;
  const islandH = pw * 0.085;
  const sbFont = pw * 0.044;
  const sbIcon = pw * 0.05;

  const SideBtn = ({ side, top, h }: { side: 'left' | 'right'; top: number; h: number }) => (
    <LinearGradient
      colors={side === 'left' ? ['#1d1b22', '#8a8592', '#3a3642'] : ['#3a3642', '#8a8592', '#1d1b22']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={{
        position: 'absolute', top: top * H, height: h * H, width: btnW,
        [side]: -(btnW - 1),
        borderRadius: btnW / 2,
      } as any}
    />
  );

  return (
    <Animated.View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{
        height: '100%', aspectRatio: PHONE_ASPECT, alignSelf: 'center',
        opacity: enter.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [winH * 0.75, 0] }) },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
        ],
      }}
    >
      {/* side buttons (action, volume up, volume down, power) */}
      <SideBtn side="left" top={0.115} h={0.035} />
      <SideBtn side="left" top={0.175} h={0.07} />
      <SideBtn side="left" top={0.26} h={0.07} />
      <SideBtn side="right" top={0.21} h={0.105} />

      {/* titanium frame */}
      <View
        style={{
          flex: 1, borderRadius: R, backgroundColor: '#2b2830',
          shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55, shadowRadius: 24, elevation: 14,
        }}
      >
        <LinearGradient
          colors={['#a39eab', '#3a3642', '#7d7886', '#25222b', '#9a95a3']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: R }]}
        />

        {/* kaala bezel */}
        <View
          style={{
            flex: 1, margin: rim, borderRadius: R - rim,
            backgroundColor: '#000', padding: bezel,
          }}
        >
          {/* screen */}
          <View style={{ flex: 1, borderRadius: screenR, overflow: 'hidden', backgroundColor: '#0A0514' }}>
            {source ? (
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                nativeControls={false}
              />
            ) : (
              <LinearGradient
                colors={['#3B1D63', '#1A0F2E', '#0A0514']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
              >
                <Ionicons name="play-circle-outline" size={pw * 0.26} color="rgba(255,255,255,0.35)" />
              </LinearGradient>
            )}

            {/* halka glass glare */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.45 }}
              style={StyleSheet.absoluteFill}
            />

            {/* optional status bar */}
            {SHOW_FAKE_STATUS_BAR ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute', top: pw * 0.03, left: pw * 0.09, right: pw * 0.08,
                  height: islandH, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: sbFont, fontWeight: '700' }}>9:41</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: pw * 0.012 }}>
                  <Ionicons name="cellular" size={sbIcon} color="#FFF" />
                  <Ionicons name="wifi" size={sbIcon} color="#FFF" />
                  <Ionicons name="battery-full" size={sbIcon * 1.25} color="#FFF" />
                </View>
              </View>
            ) : null}

            {/* dynamic island + camera */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', top: pw * 0.03, alignSelf: 'center',
                width: islandW, height: islandH, borderRadius: islandH / 2,
                backgroundColor: '#000', justifyContent: 'center', alignItems: 'flex-end',
                paddingRight: islandH * 0.28,
              }}
            >
              <View
                style={{
                  width: islandH * 0.36, height: islandH * 0.36, borderRadius: islandH * 0.18,
                  backgroundColor: '#0B1030', borderWidth: 1, borderColor: '#1B2150',
                }}
              />
            </View>

            {/* home indicator */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', bottom: pw * 0.022, alignSelf: 'center',
                width: pw * 0.34, height: Math.max(3, pw * 0.018), borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.85)',
              }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};


const FeatureScreenContent = ({ data, isTablet, active }: { data: any; isTablet?: boolean; active: boolean }) => (
  <View style={{ flex: 1 }}>
    <View style={fv.phoneArea}>
      <FeaturePhone source={data.video} active={active} />
    </View>

    <Text style={[fv.heading, isTablet && { fontSize: 28, lineHeight: 35 }]}>
      {data.headline.map((seg: any, i: number) => (
        <Text key={i} style={seg.pink ? { color: FEAT_PINK } : undefined}>{seg.t}</Text>
      ))}
    </Text>
    <Text style={fv.sub}>{data.subheadline}</Text>
  </View>
);

// ==========================================
// SLIDE 16 — "one text changes the dynamic"
// Asli photos lagani hon to yahan require(...) daalein
// ==========================================
const DYNAMIC_LEFT_IMG: any = require('../assets/girl-happy.png');
const DYNAMIC_RIGHT_IMG: any = require('../assets/girl-sad.png');

const HeroPerson = ({ img, side }: { img: any; side: 'left' | 'right' }) => (
  <View style={[ns.heroPerson, side === 'left' ? { left: 0 } : { right: 0 }]}>
    {img ? (
      // contain = poori image dikhegi, koi crop / fade nahi
      <Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    ) : (
      <LinearGradient
        colors={side === 'left' ? ['#4C1D95', '#1A0F2E'] : ['#3F1D2E', '#0A0514']}
        style={StyleSheet.absoluteFill}
      >
        <View style={ns.heroPersonIcon}>
          <Ionicons name="person" size={90} color="rgba(255,255,255,0.14)" />
        </View>
      </LinearGradient>
    )}
  </View>
);

const DYNAMIC_POINTS = [
  { icon: 'comment-processing-outline', text: 'One text can change how they see you.' },
  { icon: 'emoticon-sad-outline', text: "Make you look desperate when you weren't." },
  { icon: 'heart-broken', text: 'Push them away when you wanted them closer.' },
  { icon: 'history', text: 'And leave you wishing you could take it back.' },
];

const DynamicScreenContent = ({ isTablet }: { isTablet?: boolean }) => (
  <View style={{ flex: 1 }}>
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      bounces
      alwaysBounceVertical
      nestedScrollEnabled
      overScrollMode="always"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={ns.hero}>
        <HeroPerson img={DYNAMIC_LEFT_IMG} side="left" />
        <HeroPerson img={DYNAMIC_RIGHT_IMG} side="right" />
        <Image source={require('../assets/mascot-quiz1.png')} style={ns.heroMascot} />
      </View>

      <Text style={[ns.dynHeading, isTablet && { fontSize: 31, lineHeight: 37 }]}>
        Sometimes, one text is all it takes to change the{' '}
        <Text style={{ color: FEAT_PINK }}>entire dynamic.</Text>
      </Text>

      <View style={ns.dynList}>
        {DYNAMIC_POINTS.map((pt, i) => (
          <View key={i} style={ns.dynRow}>
            <View style={ns.dynIconCircle}>
              <MaterialCommunityIcons name={pt.icon as any} size={15} color="#E5E7EB" />
            </View>
            <Text style={ns.dynText}>{pt.text}</Text>
          </View>
        ))}
      </View>

      <Text style={ns.dynFinal}>
        Now, you have <Text style={{ color: FEAT_PINK }}>Social Genius</Text> on your side.
      </Text>
    </ScrollView>

    {/* neeche halka fade: scroll hone ka hint */}
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
      style={ns.dynFade}
    />
  </View>
);
// ==========================================
// SLIDE 17 — testimonials
// avatar: null  -> placeholder; real photo ke liye require(...) daalein
// ==========================================
const REVIEWS: { avatar: any; name: string; text: string }[] = [
  {
    avatar: require('../assets/review-1.jpg'),
    name: 'Sarah, 24',
    text: '"I genuinely wish I had this sooner. I used to type something, overthink it, send it, and immediately regret it. Now I run it through Social Genius first. It tells me how I actually sound and gives me a better way to say it."',
  },
  {
    avatar: require('../assets/review-2.jpg'),
    name: 'Jake, 27',
    text: '"The coach is honestly my favorite part 😭 I can literally tell it what happened in a conversation and get advice on what to say, what NOT to say, and what I should do next. It feels like asking the brutally honest friend I needed."',
  },
  {
    avatar: require('../assets/review-3.jpg'),
    name: 'Mia, 22',
    text: '"This has saved me from SO many embarrassing texts 💀 I used to overthink every conversation and send way too much. Now I have somewhere to check myself before my emotions take over."',
  },
  {
    avatar: require('../assets/review-4.jpg'),
    name: 'Daniel, 29',
    text: '"I downloaded it for the text analysis but the decode feature is what keeps me coming back. When I don\'t understand what someone\'s message means, I just paste it in and Social Genius breaks it down for me."',
  },
  {
    avatar: require('../assets/review-5.jpg'),
    name: 'Emma, 25',
    text: '"This is actually so convenient. I don\'t even have to leave the chat anymore. I can analyze a message, rewrite it, or get a reply right there in chats before I send it."',
  },
];
const AVATAR_TINTS = ['#7C3AED', '#DB2777', '#2563EB', '#9333EA', '#0EA5E9'];

const ReviewsScreenContent = ({ isTablet }: { isTablet?: boolean }) => (
  <View style={{ flex: 1 }}>
    <Text style={[ns.revHeading, isTablet && { fontSize: 28, lineHeight: 34 }]}>
      People Are Already Texting <Text style={{ color: FEAT_PINK }}>Smarter</Text> With{' '}
      <Text style={{ color: FEAT_PINK }}>Social Genius.</Text>
    </Text>

    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ns.revList}
      >
        {REVIEWS.map((r, i) => {
          const tint = AVATAR_TINTS[i % AVATAR_TINTS.length];
          return (
            <View key={i} style={ns.revCard}>
              <View style={ns.revTop}>
                <View style={[ns.revAvatar, { backgroundColor: r.avatar ? 'rgba(255,255,255,0.06)' : `${tint}33` }]}>
                  {r.avatar ? (
                    <Image source={r.avatar} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  ) : (
                    <Ionicons name="person" size={28} color={tint} />
                  )}
                </View>
                <Text style={ns.revName}>{r.name}</Text>
              </View>
              <Text style={ns.revText}>{r.text}</Text>
              <Text style={ns.revStars}>★★★★★</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* neeche Continue button ke paas cards fade ho jayen (video jaisa) */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
        style={ns.revFade}
      />
    </View>
  </View>
);
// ==========================================
// SCREEN 1 — "Meet Social Genius."
// Mascot + phone wali single image yahan lagayein:
//   const INTRO_HERO_IMG = require('../assets/intro-hero.png');
// (jab tak null hai, mascot-quiz1.png placeholder dikhega)
// ==========================================
const INTRO_HERO_IMG: any = require('../assets/intro-hero.png');

const INTRO_FEATURES = [
  { icon: 'message-processing-outline', title: 'Real-time analysis', desc: 'See how your text actually comes across.' },
  { icon: 'heart-outline', title: 'Smarter rewrites', desc: 'Get better versions that say what you mean.' },
  { icon: 'brain', title: 'Less overthinking', desc: 'Stop the endless \u201cdid I sound weird?\u201d loop.' },
  { icon: 'send-outline', title: 'More confidence', desc: 'Send with clarity, not anxiety.' },
];

const IntroScreenContent = ({ isTablet }: { isTablet?: boolean }) => {
  const { height: winH } = useWindowDimensions();
  // image ki height screen ke hisaab se adjust hoti hai (min 300, max 440)
  const heroH = Math.min(Math.max(winH * 0.46, 300), isTablet ? 520 : 440);

  return (
    <ScrollView
      style={{ flex: 1, marginTop: -20 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 10 }}
    >
      {/* LEFT: title + text  |  RIGHT: mascot + phone image */}
      <View style={[ins.topBlock, { minHeight: heroH }]}>
        <Image
          source={INTRO_HERO_IMG || require('../assets/mascot-quiz1.png')}
          style={[ins.heroImg, { height: heroH }]}
          resizeMode="contain"
        />
        <Text style={[ins.spark, { top: 10, left: 4 }]}>✦</Text>
        <Text style={[ins.spark, { bottom: 8, right: 2, fontSize: 18 }]}>✦</Text>

        {/* text image ke neeche se shuru hota hai (paddingTop = heroH ka 6%) */}
        <View style={[ins.leftCol, { paddingTop: heroH * 0.2 }]}>
          <View style={ins.titleWrap}>
            <Text style={[ins.titleWhite, isTablet && { fontSize: 40, lineHeight: 44 }]}>Meet</Text>
            <GradientText
              text="Social Genius."
              colors={['#FFB4EE', '#E879F9']}
              style={[ins.titleGrad, isTablet && { fontSize: 40, lineHeight: 44 }]}
            />
          </View>

          <View style={ins.bodyCol}>
            <Text style={ins.body}>
              Before you hit send, see how your text will actually sound:{' '}
              <Text style={ins.bodyPink}>needy, desperate, emotional, confusing… or too much.</Text>
            </Text>
            <Text style={[ins.body, { marginTop: 8 }]}>
              Then get a better version of that text to send instead, that says what you mean, without working against you.
            </Text>
            <Text style={[ins.bodyPink, { marginTop: 8 }]}>Know how it'll sound. Then send.</Text>
          </View>
        </View>
      </View>

      {/* feature rows */}
      <View style={ins.features}>
        {INTRO_FEATURES.map((f, i) => (
          <View key={i} style={ins.featRow}>
            <View style={ins.featIconCircle}>
              <MaterialCommunityIcons name={f.icon as any} size={18} color="#E879F9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ins.featTitle}>{f.title}</Text>
              <Text style={ins.featDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const ResultScoreCard = ({ title, icon, value, status, isDanger }: any) => {
  const valText = String(value ?? '0').replace('%', '');
  const hasPercent = String(value ?? '').includes('%');
  const borderColors: readonly [string, string] = isDanger
    ? ['rgba(239,68,68,0.8)', 'rgba(239,68,68,0.1)']
    : ['rgba(168,85,247,0.3)', 'rgba(255,255,255,0.02)'];
  const bgColors: readonly [string, string] = isDanger
    ? ['rgba(239,68,68,0.15)', 'rgba(10,5,20,1)']
    : ['rgba(30,20,45,0.5)', '#0A0514'];

  return (
    <LinearGradient colors={borderColors} style={rs.scoreCardWrapper}>
      <LinearGradient colors={bgColors} style={rs.scoreCardInner}>
        <Text style={rs.scoreCardTitle} numberOfLines={2}>{title}</Text>
        <MaterialCommunityIcons name={icon} size={20} color={isDanger ? '#EF4444' : '#A855F7'} style={{ marginBottom: 6 }} />
        <Text style={rs.scoreCardValue} numberOfLines={1} adjustsFontSizeToFit>
          {valText}{hasPercent ? <Text style={rs.scoreCardPercent}>%</Text> : null}
        </Text>
        <Text style={[rs.scoreCardStatus, { color: isDanger ? '#EF4444' : '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit>
          {status || '-'}
        </Text>
      </LinearGradient>
    </LinearGradient>
  );
};

const ResultBreakdownItem = ({ icon, iconColor, title, subtext, summary }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => setIsExpanded(!isExpanded)}>
      <View style={rs.breakdownRow}>
        <View style={[rs.breakdownIconBox, { backgroundColor: `${iconColor}18` }]}>
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rs.breakdownTitle}>{title}</Text>
          <Text style={[rs.breakdownSubtitle, { color: iconColor }]} numberOfLines={1}>{subtext || 'Awaiting insight...'}</Text>
        </View>
        <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
      </View>
      {isExpanded && summary ? (
        <View style={rs.breakdownSummaryBox}>
          <Text style={rs.breakdownSummaryText}>{summary}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};
const ExpandableDescription = ({ text }: { text: any }) => {
  const [expanded, setExpanded] = useState(false);
  const safeText = typeof text === 'string' ? text : String(text ?? '');
  const isLong = safeText.length > 150;

  return (
    <TouchableOpacity
      activeOpacity={isLong ? 0.7 : 1}
      onPress={() => isLong && setExpanded(prev => !prev)}
      style={{ marginBottom: 10 }}
    >
      <Text
        style={[rs.verdictSubText, { marginBottom: 2 }]}
        numberOfLines={expanded ? undefined : 5}
        ellipsizeMode="tail"
      >
        {safeText}
      </Text>
      {isLong ? (
        <Text style={rs.readMoreText}>{expanded ? 'Show less' : 'Tap to read full'}</Text>
      ) : null}
    </TouchableOpacity>
  );
};
const ScenarioPickerScreen = React.memo(function ScenarioPickerScreen({
  isTablet,
  winWidth,
  tabletSidePadding,
  tabletContentMaxWidth,
  onAnalyze,
}: {
  isTablet: boolean;
  winWidth: number;
  tabletSidePadding: number;
  tabletContentMaxWidth: number;
  onAnalyze: (text: string) => void;
}) {
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [customReplyText, setCustomReplyText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const canAnalyze = (showCustomInput && customReplyText.trim().length > 0) ||
    (!showCustomInput && selectedScenario !== null);

  const handleAnalyze = () => {
    const textToAnalyze = showCustomInput
      ? customReplyText.trim()
      : (selectedScenario !== null ? SCENARIO_OPTIONS[selectedScenario].text : '');
    if (!textToAnalyze) return;
    onAnalyze(textToAnalyze);
  };

  const content = (
    <>
      <View style={styles.scenarioHeadingRow}>
        <View style={styles.scenarioHeadingCol}>
          <Text style={[styles.scenarioHeading, isTablet && styles.scenarioHeadingTablet]}>
            They left you on seen & it's been <Text style={styles.pinkHighlight}>3 hours.</Text>{'\n'}What would you actually send?
          </Text>
        </View>
        <Image
          source={require('../assets/mascot-quiz1.png')}
          style={styles.scenarioMascot}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.scenarioOptionsList}>
          {SCENARIO_OPTIONS.map((opt, index) => {
            const isSelected = selectedScenario === index && !showCustomInput;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.scenarioOption, isSelected && styles.scenarioOptionSelected]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedScenario(index);
                  setShowCustomInput(false);
                  setCustomReplyText('');
                }}
              >
                <Text style={styles.scenarioOptionIcon}>{opt.icon}</Text>
                <Text style={[styles.scenarioOptionText, isSelected && styles.scenarioOptionTextSelected]}>
                  "{opt.text}"
                </Text>
                <Feather name="chevron-right" size={16} color="#6B7280" />
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.scenarioOption, showCustomInput && styles.scenarioOptionSelected]}
            activeOpacity={0.8}
            onPress={() => {
              setShowCustomInput(true);
              setSelectedScenario(null);
            }}
          >
            <Text style={styles.scenarioOptionIcon}>✍️</Text>
            <Text style={[styles.scenarioOptionText, showCustomInput && styles.scenarioOptionTextSelected]}>
              Write your own...
            </Text>
            <Feather name="chevron-right" size={16} color="#6B7280" />
          </TouchableOpacity>

          {showCustomInput && (
            <TextInput
              style={styles.scenarioCustomInput}
              placeholder="Type what you'd actually send..."
              placeholderTextColor="#6B7280"
              value={customReplyText}
              onChangeText={setCustomReplyText}
              multiline
            />
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.scenarioAnalyzeBtn, !canAnalyze && { opacity: 0.5 }]}
        activeOpacity={0.8}
        onPress={handleAnalyze}
        disabled={!canAnalyze}
      >
        <LinearGradient
          colors={['#FF3366', '#9333EA']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.scenarioAnalyzeBtnGrad}
        >
          <Text style={styles.scenarioAnalyzeBtnText}>Analyze My Text</Text>
          <Feather name="arrow-right" size={17} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  // Keyboard khulne par layout na uchlne de
  const Wrapper: any = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const wrapperProps = Platform.OS === 'ios' ? { behavior: 'padding' as const, keyboardVerticalOffset: 100 } : {};

  if (!isTablet) {
    return (
      <Wrapper style={[styles.screenContainer, { flex: 1 }]} {...wrapperProps}>
        {content}
      </Wrapper>
    );
  }

  return (
    <View style={[styles.screenContainer, styles.screenContainerTablet, { width: winWidth, paddingHorizontal: tabletSidePadding }]}>
      <Wrapper style={{ width: '100%', maxWidth: tabletContentMaxWidth, alignSelf: 'center', flex: 1 }} {...wrapperProps}>
        {content}
      </Wrapper>
    </View>
  );
});
// ==========================================
// STABLE helpers (smooth transitions ke liye)
// ==========================================

// ScreenWrap ab component ke BAHAR hai. Pehle ye OnboardingScreen ke andar bana tha,
// is wajah se har re-render par naya component type ban jata tha aur saari screens
// unmount/remount hoti thin (yehi jhatke / lag ki sabse badi wajah thi).
const ScreenWrap = ({ children, style }: any) => {
  const { width: winWidth } = useWindowDimensions();
  const isTablet = isTabletWidth(winWidth);
  const tabletContentMaxWidth = 680;
  const tabletSidePadding = Math.max((winWidth - tabletContentMaxWidth) / 2, 24);

  if (!isTablet) {
    return <View style={[styles.screenContainer, { flex: 1 }, style]}>{children}</View>;
  }
  return (
    <View
      style={[
        styles.screenContainer,
        styles.screenContainerTablet,
        { width: winWidth, paddingHorizontal: tabletSidePadding },
        style,
      ]}
    >
      <View style={{ width: '100%', maxWidth: tabletContentMaxWidth, alignSelf: 'center', flex: 1 }}>
        {children}
      </View>
    </View>
  );
};

const computeTopProgress = (idx: number) => {
  if (idx === HOOK_INDEX) return null;
  if (idx <= QUIZ_START_INDEX + 4) { // intro + 5 quiz = 6 steps
    return { fill: (idx / 6) * 100, label: `${idx}/6` };
  }
  if (idx >= PRACTICE_INTRO_INDEX && idx <= RESULTS_INDEX) {
    const step = idx - 1; // 6..9
    return { fill: ((step - 5) / 4) * 100, label: `${step}/9` };
  }
  if (idx >= FEATURE_START_INDEX && idx <= REVIEWS_INDEX) {
    const step = idx + 1; // 12..17
    return { fill: ((step - 11) / 6) * 100, label: `${step}/17` };
  }
  return null;
};
// Har page swipe ke waqt halka fade + scale (neighbor pages rest par poori tarah invisible)
const AnimatedPage = ({ index, scrollX, pageWidth, children }: any) => {
  const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const scale = scrollX.interpolate({ inputRange, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' });
  return (
    <Animated.View style={{ width: pageWidth, opacity, transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
};

const AnimatedFlatList: any = Animated.createAnimatedComponent(FlatList);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// ==========================================
// FULL ANALYSIS — "wow moment" components
// ==========================================
const toNum = (v: any): number | null => {
  const n = parseFloat(String(v ?? '').replace('%', ''));
  return isNaN(n) ? null : Math.max(0, Math.min(100, n));
};
const str = (v: any): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';

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

const AuraRing = ({ score, color }: { score: number; color: string }) => {
  const size = 176;
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
    <View style={fa.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={fa.ringCenter}>
        <Text style={[fa.ringScore, { color }]}>{shown}</Text>
        <Text style={fa.ringLabel}>AURA SCORE</Text>
      </View>
    </View>
  );
};

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

  const valueText = str(value) || '-';
  return (
    <View style={fa.meterRow}>
      <View style={fa.meterTop}>
        <View style={fa.meterLeft}>
          <MaterialCommunityIcons name={icon} size={16} color={color} />
          <Text style={fa.meterLabel}>{label}</Text>
        </View>
        <Text style={[fa.meterValue, { color }]}>{valueText}</Text>
      </View>
      <View style={fa.meterTrack}>
        <Animated.View
          style={[
            fa.meterFill,
            { backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
      {str(status) ? <Text style={[fa.meterStatus, { color }]}>{str(status)}</Text> : null}
    </View>
  );
};

const BreakdownCard = ({ icon, color, label, title, summary }: any) => (
  <View style={[fa.bdCard, { borderColor: `${color}55` }]}>
    <View style={fa.bdHead}>
      <View style={[fa.bdIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[fa.bdLabel, { color }]}>{label}</Text>
    </View>
    <Text style={fa.bdTitle}>{str(title) || 'Analyzing...'}</Text>
    {str(summary) ? <Text style={fa.bdSummary}>{str(summary)}</Text> : null}
  </View>
);

const FullAnalysisView = ({ data, userText, onClose, onContinue }: any) => {
  const aura = toNum(data?.aura_score);
  const hasAura = aura !== null;
  const color = !hasAura ? '#D1D5DB' : aura! <= 30 ? '#F43F5E' : aura! <= 60 ? '#FBBF24' : '#4ADE80';
  const tier = !hasAura ? '' : aura! <= 30 ? 'DANGER ZONE' : aura! <= 60 ? 'MIXED SIGNALS' : 'STRONG VIBE';
  const AVG = 63;
  const diff = hasAura ? Math.round(aura! - AVG) : 0;

  const social: any = data?.social_impact || {};
  const bd: any = data?.breakdown || {};
  const truths: string[] = Array.isArray(data?.brutal_truth)
    ? data.brutal_truth.filter((t: any) => typeof t === 'string')
    : [];
  const description = str(data?.verdict?.description) || str(data?.analysis_reason);
  const fix = str(data?.verdict?.fix);

  return (
    <BgSafeArea>
      <View style={rs.fullHeader}>
        <View style={rs.fullCloseBtn} />
        <Text style={rs.fullHeaderTitle}>YOUR FULL ANALYSIS</Text>
        <TouchableOpacity style={rs.fullCloseBtn} onPress={onClose} activeOpacity={0.7}>
          <Feather name="x" size={20} color="#D946EF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={fa.body}>
        {/* HERO: ring + verdict */}
        <Reveal>
          <LinearGradient colors={[`${color}33`, 'rgba(10,5,20,1)']} style={fa.heroCard}>
            {hasAura ? <AuraRing score={aura!} color={color} /> : null}
            {tier ? <Text style={[fa.tier, { color }]}>{tier}</Text> : null}
            <Text style={fa.verdictMain}>{str(data?.verdict?.vibe_tag) || str(data?.verdict?.main) || 'Mixed Signals'}</Text>
            {str(data?.verdict?.sub) ? <Text style={fa.verdictSub}>{str(data?.verdict?.sub)}</Text> : null}
            {hasAura ? (
              <View style={fa.compareChip}>
                <Text style={fa.compareText}>
                  {`${Math.abs(diff)} points ${diff < 0 ? 'below' : 'above'} the average (${AVG})`}
                </Text>
              </View>
            ) : null}
          </LinearGradient>
        </Reveal>

        {/* WHAT YOU SENT */}
        {userText ? (
          <Reveal delay={150}>
            <Text style={rs.sectionHeading}>WHAT YOU SENT</Text>
            <View style={fa.sentBubble}>
              <Text style={fa.sentText}>{`"${userText}"`}</Text>
            </View>
          </Reveal>
        ) : null}

        {/* WHAT'S REALLY GOING ON */}
        {description ? (
          <Reveal delay={250}>
            <Text style={rs.sectionHeading}>THE READ</Text>
            <View style={fa.readCard}>
              <Text style={fa.readText}>{description}</Text>
            </View>
          </Reveal>
        ) : null}

        {/* SOCIAL IMPACT */}
        <Reveal delay={350}>
          <Text style={rs.sectionHeading}>SOCIAL IMPACT</Text>
          <View style={fa.meterCard}>
            <MeterRow icon="shield-alert-outline" label="Social Risk" value={social?.risk?.value} status={social?.risk?.status} isDanger={social?.risk?.isDanger} delay={600} />
            <View style={fa.meterDivider} />
            <MeterRow icon="heart-pulse" label="Neediness" value={social?.neediness?.value} status={social?.neediness?.status} isDanger={social?.neediness?.isDanger} delay={750} />
            <View style={fa.meterDivider} />
            <MeterRow icon="star-outline" label="Confidence" value={social?.confidence?.value} status={social?.confidence?.status} isDanger={social?.confidence?.isDanger} delay={900} />
          </View>
        </Reveal>

        {/* BREAKDOWN */}
        <Reveal delay={450}>
          <Text style={rs.sectionHeading}>BREAKDOWN</Text>
          <BreakdownCard icon="emoticon-outline" color="#F43F5E" label="EMOTIONAL ENERGY" title={bd?.emotional_energy?.title} summary={bd?.emotional_energy?.summary} />
          <View style={{ height: 10 }} />
          <BreakdownCard icon="message-text-outline" color="#A855F7" label="WHAT YOU'RE SIGNALING" title={bd?.signaling?.title} summary={bd?.signaling?.summary} />
          <View style={{ height: 10 }} />
          <BreakdownCard icon="trending-up" color="#FBBF24" label="LIKELY OUTCOME" title={bd?.likely_outcome?.title} summary={bd?.likely_outcome?.summary} />
        </Reveal>

        {/* BRUTAL TRUTH */}
        {truths.length > 0 ? (
          <Reveal delay={550}>
            <Text style={rs.sectionHeading}>BRUTAL TRUTH</Text>
            <LinearGradient colors={['rgba(61,29,89,0.55)', 'rgba(10,5,20,1)']} style={fa.truthBox}>
              {truths.slice(0, 3).map((t, i) => (
                <View key={i} style={fa.truthRow}>
                  <View style={fa.truthNum}>
                    <Text style={fa.truthNumText}>{i + 1}</Text>
                  </View>
                  <Text style={fa.truthText}>{t}</Text>
                </View>
              ))}
            </LinearGradient>
          </Reveal>
        ) : null}

        {/* THE FIX */}
        {fix ? (
          <Reveal delay={650}>
            <Text style={rs.sectionHeading}>THE FIX</Text>
            <View style={fa.fixCard}>
              <View style={fa.fixIcon}>
                <MaterialCommunityIcons name="check-decagram" size={22} color="#4ADE80" />
              </View>
              <Text style={fa.fixText}>{fix}</Text>
            </View>
          </Reveal>
        ) : null}

        {/* CTA */}
        <Reveal delay={750}>
          <TouchableOpacity style={[rs.fullContinueBtn, { marginTop: 22 }]} activeOpacity={0.85} onPress={onContinue}>
            <LinearGradient
              colors={['#FF3366', '#7C3AED']}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={rs.fullContinueBtnGrad}
            >
              <Text style={rs.fullContinueBtnText}>This Changes Everything</Text>
              <Feather name="arrow-right" size={17} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Reveal>
      </ScrollView>
    </BgSafeArea>
  );
};

// ==========================================
// OPENING HOOK — typewriter
// ==========================================
// ==========================================
// OPENING HOOK — typewriter
// ==========================================
const HOOK_LINES: { text: string; pause?: number; final?: boolean }[] = [
  { text: 'There’s a version of you who always knows what to say & how to communicate confidently..', pause: 800 },
  { text: 'They don’t overthink.', pause: 550 },
  { text: 'They don’t ask “Did I just sound desperate?”', pause: 700 },
  { text: 'They know exactly what to say, and exactly how it will sound', pause: 900 },
  { text: 'You’re about to become that person.', final: true },
];
const CLOSING_LINES: { text: string; pause?: number; final?: boolean }[] = [
  { text: 'You’ve come this far.', pause: 700 },
  { text: 'Social Genius shows you how your text sounds', pause: 500 },
  { text: '& gives you a better version that says what you mean, without the wrong vibe.', pause: 800 },
  { text: 'So you can communicate with confidence,', pause: 700 },
  { text: 'You’ve got this!', final: true },
];
type HookRow = { text: string; width: number | null };

const HookLine = ({
  line, fontSize, lineHeight, instant, onTyped, onGone,
}: {
  line: { text: string; pause?: number; final?: boolean };
  fontSize: number; lineHeight: number; instant?: boolean;
  onTyped?: () => void; onGone?: () => void;
}) => {
  const [rows, setRows] = useState<HookRow[] | null>(null);
  const rowsSet = useRef(false);
  const [n, setN] = useState(0); // ab tak kitne letters likhe gaye
  const [phase, setPhase] = useState<'wait' | 'type' | 'hold' | 'end'>(instant ? 'end' : 'wait');
  const [blink, setBlink] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  const fs = line.final ? fontSize + 6 : fontSize;
  const lh = line.final ? lineHeight + 8 : lineHeight;
  const textStyle = [
    hk.line,
    { fontSize: fs, lineHeight: lh },
    line.final && { color: FEAT_PINK, fontWeight: '800' as const },
  ];

  const clean = (s: string) => s.replace(/\n/g, '');
  const total = rows ? rows.reduce((sum, r) => sum + clean(r.text).length, 0) : 0;

  // cursor blink
  useEffect(() => {
    const id = setInterval(() => setBlink((v) => !v), 500);
    return () => clearInterval(id);
  }, []);

  // agar measure na ho sake to ek hi row se kaam chalao
  useEffect(() => {
    const t = setTimeout(() => {
      if (!rowsSet.current) {
        rowsSet.current = true;
        setRows([{ text: line.text, width: null }]);
      }
    }, 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!rows) return;

    if (instant) {
      setN(total);
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const full = rows.map((r) => clean(r.text)).join('');

    (async () => {
      await sleep(550); // pehle sirf cursor akela blink karta hai
      if (cancelled) return;
      setPhase('type');

      for (let i = 1; i <= total; i++) {
        if (cancelled) return;
        setN(i);
        const ch = full[i - 1];
        await sleep(
          ch === '.' || ch === '?' ? 300
            : ch === ',' ? 170
              : ch === ' ' ? 26
                : 34 + Math.random() * 22
        );
      }
      if (cancelled) return;

      if (line.final) {
        setPhase('end');
        onTyped?.();
        return;
      }

      setPhase('hold');
      await sleep((line.pause ?? 600) + total * 16); // padhne ka waqt
      if (cancelled) return;

      await new Promise<void>((r) =>
        Animated.timing(opacity, {
          toValue: 0, duration: 360,
          easing: Easing.out(Easing.quad), useNativeDriver: true,
        }).start(() => r())
      );
      if (cancelled) return;
      onGone?.();
    })();

    return () => { cancelled = true; };
  }, [rows]);

  // cursor kis row me hai
  let cursorRow = 0;
  if (rows) {
    let acc = 0;
    cursorRow = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      const len = clean(rows[i].text).length;
      if (n < acc + len) { cursorRow = i; break; }
      acc += len;
    }
  }
  const cursorVisible = phase === 'end' ? false : phase === 'type' ? true : blink;

  let consumed = 0;

  return (
    <Animated.View style={{ width: '100%', opacity }}>
      {/* sirf naap ke liye: bilkul nazar nahi aata (opacity 0) */}
      {!rows ? (
        <Text
          pointerEvents="none"
          style={[textStyle, { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 }]}
          onTextLayout={(e) => {
            if (rowsSet.current) return;
            rowsSet.current = true;
            setRows(e.nativeEvent.lines.map((l) => ({ text: l.text, width: l.width })));
          }}
        >
          {line.text}
        </Text>
      ) : (
        rows.map((r, i) => {
          const t = clean(r.text);
          const shown = Math.max(0, Math.min(t.length, n - consumed));
          consumed += t.length;
          return (
            <View
              key={i}
              style={{
                height: lh,
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                width: r.width ? Math.ceil(r.width) + 10 : undefined,
              }}
            >
              <Text
                style={[textStyle, { textAlign: 'left', flexShrink: 0 }]}
                numberOfLines={r.width ? 1 : undefined}
                ellipsizeMode="clip"
              >
                {t.slice(0, shown)}
              </Text>
              {i === cursorRow && cursorVisible ? (
                <View
                  style={{
                    width: 2, height: fs * 1.05, marginLeft: 2, borderRadius: 1,
                    backgroundColor: FEAT_PINK,
                  }}
                />
              ) : null}
            </View>
          );
        })
      )}
    </Animated.View>
  );
};
const HookScreenContent = ({
  active, done, onDone, lines = HOOK_LINES,      // 👈 lines prop
}: { active: boolean; done: boolean; onDone: () => void; lines?: typeof HOOK_LINES }) => {
  const { height: winH } = useWindowDimensions();
  const [lineIdx, setLineIdx] = useState(0);
  const LAST = lines.length - 1;                 // 👈 HOOK_LINES ki jagah lines

  const fontSize = winH < 700 ? 19 : winH < 800 ? 21 : 23;
  const lineHeight = Math.round(fontSize * 1.5);

  // tap se skip: seedha aakhri line (instant)
  const idx = done ? LAST : lineIdx;
  const instant = done && lineIdx !== LAST;

  return (
    <View style={hk.wrap}>
      {active || done ? (
        <HookLine
          key={`${idx}-${instant ? 'i' : 'n'}`}
          line={lines[idx]}
          fontSize={fontSize}
          lineHeight={lineHeight}
          instant={instant}
          onGone={() => setLineIdx((i) => Math.min(i + 1, LAST))}
          onTyped={onDone}
        />
      ) : null}
    </View>
  );
};

const hk = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  line: { color: '#FFF', fontWeight: '600', letterSpacing: -0.2 },
});





const PRO_ENTITLEMENT_ID = 'Social Genius: Text Analyzer Pro';

type ProInfo = {
  isPro: boolean;
  expirationDate: string | null;
  productId: string | null;
  error: boolean; // true = verify nahi ho saka (network/API), "expired" nahi
};

// Poori app mein sirf yahi entitlement check hoga
const verifyPro = async (userId?: string): Promise<ProInfo> => {
  try {
    const info = userId
      ? (await Purchases.logIn(userId)).customerInfo
      : await Purchases.getCustomerInfo();
    const ent = info.entitlements.active[PRO_ENTITLEMENT_ID];
    return {
      isPro: !!ent,
      expirationDate: ent?.expirationDate ?? null,
      productId: ent?.productIdentifier ?? null,
      error: false,
    };
  } catch (e) {
    console.log('[verifyPro] error', e);
    return { isPro: false, expirationDate: null, productId: null, error: true };
  }
};

const verifyProWithRetry = async (userId?: string, tries = 3): Promise<ProInfo> => {
  let last: ProInfo = { isPro: false, expirationDate: null, productId: null, error: true };
  for (let i = 0; i < tries; i++) {
    last = await verifyPro(userId);
    if (last.isPro) return last;
    await new Promise((r) => setTimeout(r, 900 * (i + 1)));
  }
  return last;
};

// Verified Pro ke baad local state + Superwall + Supabase repair
const applyVerifiedPro = async (info: ProInfo) => {
  await AsyncStorage.setItem('is_pro_user', 'true');
  (SharedData as any).isProUser = true;
  syncProToExtension(true);
  try {
    await Superwall.shared.setSubscriptionStatus(
      SubscriptionStatus.Active([{ id: PRO_ENTITLEMENT_ID, type: 'SERVICE_LEVEL' } as any])
    );
  } catch { }
  // Server RevenueCat se khud verify karega, client ki value par bharosa nahi
  supabase.functions.invoke('sync-subscription').catch((e) =>
    console.log('[sync-subscription] failed (non-blocking)', e)
  );
  DeviceEventEmitter.emit('pro_status_changed');
};
export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isTablet = isTabletWidth(winWidth);
  const tabletContentMaxWidth = 680;
  const tabletSidePadding = Math.max((winWidth - tabletContentMaxWidth) / 2, 24);
  const isCompactHeight = winHeight < 700;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOnlyLogin, setShowOnlyLogin] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const [quizSelections, setQuizSelections] = useState<{ [key: number]: number[] }>({});

  // ── Analyzing / API state ──
  const analyzeProgress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [analyzePercent, setAnalyzePercent] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false); // 👈 NEW
  const [analyzedText, setAnalyzedText] = useState(''); // user ne kya bheja tha
  const analyzeActiveRef = useRef(false);

  const [closingDone, setClosingDone] = useState(false);
  const [paywallCover, setPaywallCover] = useState(false);
  const closingSkippedRef = useRef(false);
  const closingBtn = useRef(new Animated.Value(0)).current;
  // ── Smooth transition values ──
  const scrollX = useRef(new Animated.Value(0)).current;      // page swipe position
  const progressAnim = useRef(new Animated.Value(0)).current; // top progress bar (0..100)

  const [hookDone, setHookDone] = useState(false);
  const hookBtn = useRef(new Animated.Value(0)).current;
  const gatingRef = useRef(false);
  const dbgRef = useRef('');   // TEMP: TestFlight debug
  const paywallUpRef = useRef(false);   // paywall abhi screen pe hai?
  const alertUpRef = useRef(false);     // Alert abhi screen pe hai?
  const [purchasedBeforeLogin, setPurchasedBeforeLogin] = useState(false); // 👈 NEW: Paywall pass kar ke Login pe aaya hai?

  // 2. checkPro: RevenueCat + Superwall dono ka status sync rakhta hai
  const checkPro = async (specificUserId?: string): Promise<boolean> => {
    try {
      let uid = specificUserId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) {
        try { await Superwall.shared.setSubscriptionStatus(SubscriptionStatus.Inactive()); } catch { }
        return false;
      }

      let info = await verifyProWithRetry(uid, 2);

      // Reinstall / naya device: Apple receipt re-sync
      if (!info.isPro && !info.error) {
        try { await Purchases.syncPurchases(); } catch { }
        info = await verifyPro();
      }

      if (info.isPro) {
        await applyVerifiedPro(info);
        return true;
      }

      // RevenueCat tak pahunch nahi paye: expired mat samjho, pehle wala cached Pro rehne do
      if (info.error) {
        return (await AsyncStorage.getItem('is_pro_user')) === 'true';
      }

      // RevenueCat ne confirm kiya ke Pro nahi hai
      await AsyncStorage.removeItem('is_pro_user');
      (SharedData as any).isProUser = false;
      syncProToExtension(false);
      try { await Superwall.shared.setSubscriptionStatus(SubscriptionStatus.Inactive()); } catch { }
      return false;
    } catch {
      return false;
    }
  };
  const openIfPro = async () => {
    if (await checkPro()) {
      goHome();
    } else {
      setLoadingSession(false);
      finishOnboarding();
    }
  };

  const handleHookDone = useCallback(() => {
    setHookDone(true);
    Animated.timing(hookBtn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '705724238925-rnbomfturj2r4r2mqg4ilichqj15ji8t.apps.googleusercontent.com',

      iosClientId: '705724238925-0efie116mami24ejofd3a1cgsk3hbto4.apps.googleusercontent.com',
    });
  }, []);
  useEffect(() => {
    if (
      currentIndex === HOOK_INDEX ||
      currentIndex === QUIZ_START_INDEX ||
      currentIndex === PRACTICE_INTRO_INDEX ||
      currentIndex === SCENARIO_INDEX
    ) {
      fetch('https://chat-genious.onrender.com/', { method: 'GET' })
        .then(() => console.log('✅ Server warmed up'))
        .catch(() => console.log('⚠️ Warm-up ping failed (non-critical)'));
    }
  }, [currentIndex]);

  // Top progress bar ko smoothly animate karo (jhatke se jump nahi)
  useEffect(() => {
    const p = computeTopProgress(currentIndex);
    if (p) {
      Animated.timing(progressAnim, {
        toValue: p.fill,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [currentIndex]);

  useEffect(() => {
    const checkUserSession = async () => {
      if (params.explicitly_logged_out === 'true') {
        setLoadingSession(false);
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: LOGIN_INDEX, animated: false });
            setCurrentIndex(LOGIN_INDEX);
          }
        }, 100);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isFakeLoggedIn = await AsyncStorage.getItem('fake_logged_in');

        if (isFakeLoggedIn === 'true') {
          router.replace('/(tabs)/home');      // fake/demo login jaisa tha waisa
        } else if (session) {
          await openIfPro();                   // spinner chalta rahega, paywall upar aayega
        } else {
          setLoadingSession(false);            // (focus wale mein: if (isMounted) ...)
        }
      } catch (error) {
        setLoadingSession(false);
      }
    };

    checkUserSession();
  }, [params.explicitly_logged_out]);

  const renderScenarioPicker = () => (
    <ScenarioPickerScreen
      isTablet={isTablet}
      winWidth={winWidth}
      tabletSidePadding={tabletSidePadding}
      tabletContentMaxWidth={tabletContentMaxWidth}
      onAnalyze={startAnalyzing}
    />
  );
  useEffect(() => {
    const logoutSignal = DeviceEventEmitter.addListener('user_logged_out', () => {
      gatingRef.current = false;
      setShowOnlyLogin(true);
      setLoadingSession(false);
    });

    return () => logoutSignal.remove();
  }, []);

  // 4. Aapka useFocusEffect bilkul theek hai, bas isko aise hi rakhein:
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const checkUserSession = async () => {
        const justLoggedOut = await AsyncStorage.getItem('force_logout_bypass');

        if (justLoggedOut === 'true' || (SharedData as any).isLoggingOut) {
          if (isMounted) {
            setLoadingSession(false);
            setShowOnlyLogin(false);
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: LOGIN_INDEX, animated: false });
              setCurrentIndex(LOGIN_INDEX);
            }, 100);
          }

          setTimeout(() => {
            AsyncStorage.removeItem('force_logout_bypass');
            (SharedData as any).isLoggingOut = false;
          }, 2000);

          return;
        }

        // Agar onboarding already chal rahi hai (loadingSession false ho chuka hai), 
        // toh beech mein focus change hone par paywall gate mat chalao
        if (!loadingSession) return;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const isFakeLoggedIn = await AsyncStorage.getItem('fake_logged_in');

          if (isFakeLoggedIn === 'true') {
            router.replace('/(tabs)/home');
          } else if (session) {
            await openIfPro();
          } else {
            if (isMounted) setLoadingSession(false);
          }
        } catch (error) {
          if (isMounted) setLoadingSession(false);
        }
      };

      checkUserSession();
      return () => { isMounted = false; };
    }, [loadingSession])
  );
  useEffect(() => {
    if (currentIndex !== ANALYZING_INDEX || analysisError) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [currentIndex, analysisError]);





  const handleClosingDone = useCallback(() => {
    setClosingDone(true);
    Animated.timing(closingBtn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);



  const goHome = () => router.replace('/(tabs)/home');

  // 3. Updated finishOnboarding:
  const finishOnboarding = async () => {
    if (paywallUpRef.current || alertUpRef.current || gatingRef.current) return;
    gatingRef.current = true;
    setPaywallCover(true); // paywalls ke beech "You've got this" / black na dikhe

    try {
      await Superwall.shared.setSubscriptionStatus(SubscriptionStatus.Inactive());
    } catch (e) {
      console.log('setSubscriptionStatus error:', e);
    }

    let hasHandledSuccess = false;
    let failCount = 0;
    let successRunning = false;

    const verifyRevenueCatEntitlement = async (): Promise<boolean> => {
      try { await Purchases.syncPurchases(); } catch { }
      return (await verifyPro()).isPro;
    };

    const onPaywallPurchaseSuccess = async () => {
      if (hasHandledSuccess || successRunning) return;
      successRunning = true;
      try {
        paywallUpRef.current = false;
        alertUpRef.current = false;

        const { data: { session } } = await supabase.auth.getSession();
        const info = await verifyProWithRetry(session?.user?.id, 4);

        if (!info.isPro) {
          gatingRef.current = false;
          setPaywallCover(false);
          Alert.alert(
            info.error ? 'Connection Problem' : 'Almost There',
            info.error
              ? "We couldn't verify your subscription. Check your connection and try again."
              : "We couldn't confirm your purchase yet. Tap Restore if you already paid.",
            [
              {
                text: 'Retry',
                onPress: async () => {
                  gatingRef.current = true;
                  setPaywallCover(true);
                  await onPaywallPurchaseSuccess();
                },
              },
              {
                text: 'Restore Purchases',
                onPress: async () => {
                  try { await Purchases.restorePurchases(); } catch { }
                  gatingRef.current = true;
                  setPaywallCover(true);
                  await onPaywallPurchaseSuccess();
                },
              },
            ],
            { cancelable: false }
          );
          return;
        }

        hasHandledSuccess = true;
        gatingRef.current = false;
        await applyVerifiedPro(info);

        if (session?.user) {
          goHome();
        } else {
          setPurchasedBeforeLogin(true);
          setShowOnlyLogin(false);
          goToIndex(LOGIN_INDEX);
          setTimeout(() => setPaywallCover(false), 500);
        }
      } finally {
        successRunning = false;
      }
    };
    const attachHandler = (
      handler: any,
      callbacks: {
        onPresent: (info?: any) => void;
        onDismiss: (info?: any, result?: any) => void;
        onError: (err: any) => void;
        onSkip: (reason: any) => void;
      }
    ) => {
      if (typeof handler.onPresent === 'function') handler.onPresent(callbacks.onPresent);
      else handler.onPresent = callbacks.onPresent;

      if (typeof handler.onDismiss === 'function') handler.onDismiss(callbacks.onDismiss);
      else handler.onDismiss = callbacks.onDismiss;

      if (typeof handler.onError === 'function') handler.onError(callbacks.onError);
      else handler.onError = callbacks.onError;

      if (typeof handler.onSkip === 'function') handler.onSkip(callbacks.onSkip);
      else handler.onSkip = callbacks.onSkip;
    };

    const presentPlacement = async (
      placement: string,
      onClosedWithoutPurchase: (reason: 'declined' | 'skipped' | 'error') => void,
      onBusy?: () => void
    ) => {
      if (hasHandledSuccess) return;
      paywallUpRef.current = false; // stale flag reset (chupchaap return se atakna band)

      let settled = false;
      let didPresent = false;

      const settle = (r: 'declined' | 'skipped' | 'error') => {
        if (settled || hasHandledSuccess) return;
        settled = true;
        paywallUpRef.current = false;
        onClosedWithoutPurchase(r);
      };

      const failsafe = setTimeout(() => {
        if (paywallUpRef.current || hasHandledSuccess) return;
        dbgRef.current = `timeout on ${placement}`;
        settle('error');
      }, 15000);

      const handler = new PaywallPresentationHandler();

      attachHandler(handler, {
        onPresent: () => {
          console.log(`✅ Paywall presented: ${placement}`);
          didPresent = true;
          paywallUpRef.current = true;
          clearTimeout(failsafe);
        },
        onDismiss: async (_info?: any, result?: any) => {
          console.log(`❌ Paywall dismissed: ${placement}`, JSON.stringify(result));
          clearTimeout(failsafe);
          paywallUpRef.current = false;

          const resType = String((result as any)?.type ?? '').toLowerCase();

          // Asli purchase/restore: RevenueCat late ho to retry, phir bhi Superwall ka result trust
          if (resType === 'purchased' || resType === 'restored') {
            for (let i = 0; i < 3; i++) {
              if (await verifyRevenueCatEntitlement()) break;
              await new Promise((r) => setTimeout(r, 800));
            }
            settled = true;
            await onPaywallPurchaseSuccess();
            return;
          }

          // X dabaya: sirf tez cached check (pehle se Pro ho to hi aage)
          try {
            if ((await verifyPro()).isPro) {
              settled = true;          
              await onPaywallPurchaseSuccess();
              return;                    
            }
          } catch { }

          settle('declined');
        },
        onError: (err: any) => {
          clearTimeout(failsafe);
          const msg = String(err?.message ?? JSON.stringify(err));

          // Koi paywall (Superwall ka apna offer) pehle se khula hai
          if (msg.includes('one paywall at a time')) {
            settled = true;
            onBusy?.();
            return;
          }

          dbgRef.current = `error (${placement}): ` + msg;
          console.log('Superwall error:', err);
          settle('error');
        },
        onSkip: async (reason: any) => {
          clearTimeout(failsafe);
          const name = String((reason as any)?.type ?? reason?.constructor?.name ?? JSON.stringify(reason));
          dbgRef.current = `skip (${placement}): ${name}`;
          console.log('Superwall skipped:', name, reason);
          settle('skipped');
        },
      });

      try {
        try {
          await Superwall.shared.setSubscriptionStatus(SubscriptionStatus.Inactive());
        } catch { }

        console.log('🚀 Registering Superwall placement:', placement);
        await Superwall.shared.register({
          placement,
          handler,
          feature: async () => {
            clearTimeout(failsafe);
            if (!didPresent) {
              dbgRef.current = `feature-ran-without-paywall (${placement})`;
              settle('skipped');
              return;
            }
            // Paywall dikha tha: asli entitlement confirm karo (3 koshish)
            for (let i = 0; i < 3; i++) {
              if (await verifyRevenueCatEntitlement()) {
                settled = true;
                await onPaywallPurchaseSuccess();
                return;
              }
              await new Promise((r) => setTimeout(r, 1000));
            }
            settle('declined');
          },
        });
      } catch (e: any) {
        clearTimeout(failsafe);
        dbgRef.current = `catch (${placement}): ` + String(e?.message ?? e);
        settle('error');
      }
    };

    let retryTimer: any = null;
    const retryMainLater = (ms = 2500) => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(async () => {
        if (hasHandledSuccess || alertUpRef.current) return;

        // Offer par kharid ho gayi ho to seedha aage
        try {
          if ((await verifyPro()).isPro) {
            await onPaywallPurchaseSuccess();
            return;
          }
        } catch { }

        // Offer band ho chuka ho to main paywall wapas
        if (!paywallUpRef.current) startPaywallFlow();
      }, ms);
    };
    const showBlockedAlert = () => {
      if (alertUpRef.current || hasHandledSuccess) return;
      alertUpRef.current = true;
      gatingRef.current = false;

      setTimeout(() => {
        Alert.alert(
          'Pro Required',
          'Social Genius requires an active Pro subscription to continue. Please choose a plan.',

          [
            {
              text: 'Restore Purchases',
              onPress: async () => {
                alertUpRef.current = false;
                try {
                  const info = await Purchases.restorePurchases();
                  if (info.entitlements.active[PRO_ENTITLEMENT_ID]) { await onPaywallPurchaseSuccess(); return; }
                  Alert.alert(
                    'No Subscription Found',
                    "We couldn't find an active subscription for this Apple ID.",
                    [{ text: 'OK', onPress: () => showBlockedAlert() }],
                    { cancelable: false }
                  );
                } catch {
                  Alert.alert(
                    'Restore Failed',
                    'Please try again.',
                    [{ text: 'OK', onPress: () => showBlockedAlert() }],
                    { cancelable: false }
                  );
                }
              },
            },
            {
              text: 'See Plans',
              onPress: () => {
                alertUpRef.current = false;
                gatingRef.current = true;
                failCount = 0;
                startPaywallFlow();
              },
            },
          ],
          { cancelable: false }
        );
      }, 400);
    };

    // 2️⃣ Offer Paywall (main paywall par X dabane par)
    const showOfferPaywall = () => {
      setTimeout(() => {
        presentPlacement('onboarding_offer', (reason) => {
          if (hasHandledSuccess) return;

          if (reason === 'declined') {
            // Offer par X -> seedha Main Paywall (no alert)
            failCount = 0;
            setTimeout(() => startPaywallFlow(), 600);
          } else {
            failCount++;
            if (failCount >= 4) {
              failCount = 0;
              showBlockedAlert();
            } else {
              setTimeout(() => startPaywallFlow(), 800);
            }
          }
        }, retryMainLater);
      }, 600);
    };

    // 1️⃣ Main Paywall
    const startPaywallFlow = async () => {
      presentPlacement('campaign_trigger', (reason) => {
        if (hasHandledSuccess) return;

        if (reason === 'declined') {
          failCount = 0;
          showOfferPaywall();
        } else {
          failCount++;
          if (failCount >= 4) {
            failCount = 0;
            showBlockedAlert();
          } else {
            showOfferPaywall();
          }
        }
      }, retryMainLater);
    };

    await startPaywallFlow();
  };
  // Closing text khatam hone ke baad thoda ruk kar paywall / home
  useEffect(() => {
    if (!closingDone) return;
    const t = setTimeout(() => {
      if (closingSkippedRef.current) return;
      finishOnboarding();
    }, 1200);
    return () => clearTimeout(t);
  }, [closingDone]);
  if (loadingSession) {
    return (
      <GradientBg style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D946EF" />
      </GradientBg>
    );
  }

  const restoreLastSession = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        SharedData.aiResult = data.ai_result;
        SharedData.requestPayload = {
          userMessage: data.user_message,
          context: data.context,
          tag: data.tag,
        };
      }
    } catch (e) {
      console.log("No previous session found.");
    }
  };
  const onLoginSuccess = async (userId?: string) => {
    if (!userId) return;

    try {
      Superwall.shared.identify({ userId });
    } catch (e) {
      console.log('Superwall identify error:', e);
    }

    await restoreLastSession(userId);

    // CASE 1: paywall par purchase kiya, ab account bana raha hai
    if (purchasedBeforeLogin) {
      const info = await verifyProWithRetry(userId, 4); // logIn(userId) isi ke andar hota hai
      if (info.isPro) {
        await applyVerifiedPro(info);
        goHome();
      } else {
        Alert.alert(
          'Verifying Purchase',
          info.error
            ? 'Connection issue. Please try again.'
            : "We couldn't find your purchase on this account yet. Try Restore Purchases.",
          [
            { text: 'Retry', onPress: () => onLoginSuccess(userId) },
            {
              text: 'Restore',
              onPress: async () => {
                try { await Purchases.restorePurchases(); } catch { }
                onLoginSuccess(userId);
              },
            },
          ],
          { cancelable: false }
        );
      }
      return;
    }

    // CASE 2: existing user ne Sign In kiya
    const isExistingPro = await checkPro(userId);
    if (isExistingPro) {
      goHome();
      return;
    }

    Alert.alert(
      'No Active Subscription',
      'We signed you in, but this account does not have an active Pro subscription yet. Please choose a plan or restore your purchase.',
      [{ text: 'See Plans', onPress: () => finishOnboarding() }],
      { cancelable: false }
    );
  };
  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const { data: authData, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple', token: credential.identityToken,
        });
        if (error) throw error;
        if (credential.fullName?.givenName) {
          SharedData.userProfile.name = credential.fullName.givenName;
        }
        await onLoginSuccess(authData.user?.id);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple Login Error', e.message);
    }
  };
  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (idToken) {
        const { data: authData, error } = await supabase.auth.signInWithIdToken({
          provider: 'google', token: idToken,
        });
        if (error) throw error;
        if (response.data?.user?.name) SharedData.userProfile.name = response.data.user.name;
        if (response.data?.user?.email) SharedData.userProfile.email = response.data.user.email;
        await onLoginSuccess(authData.user?.id);
      }
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED && error.code !== statusCodes.IN_PROGRESS) {
        Alert.alert('Google Login Error', error.message);
      }
    }
  };

  const selectQuizOption = (screenIndex: number, optionIndex: number) => {
    setQuizSelections(prev => {
      const current = prev[screenIndex] || [];
      const updated = current.includes(optionIndex)
        ? current.filter(i => i !== optionIndex)
        : [...current, optionIndex];
      return { ...prev, [screenIndex]: updated };
    });
  };

  const goToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex === SCENARIO_INDEX) return;
    if (currentIndex === CLOSING_INDEX) { finishOnboarding(); return; }   // 👈 ye add karo
    if (currentIndex < TOTAL_SCREENS - 1) {
      goToIndex(currentIndex + 1);
    } else {
      goHome();
    }
  };
  const handleBack = () => {
    if (currentIndex === RESULTS_INDEX) {
      goToIndex(SCENARIO_INDEX);   // Analyzing ko skip karo
      return;
    }
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  };

  const getButtonText = () => {
    if (currentIndex === INTRO_INDEX) return "That's Really Helpful";
    if (currentIndex >= QUIZ_START_INDEX && currentIndex < QUIZ_START_INDEX + 5) return "Continue";
    if (currentIndex === PRACTICE_INTRO_INDEX) return "Let's Do This";
    if (currentIndex >= FEATURE_START_INDEX && currentIndex < FEATURE_START_INDEX + 4) {
      return FEATURE_SCREENS[currentIndex - FEATURE_START_INDEX].buttonText;
    }
    if (currentIndex === DYNAMIC_INDEX) return "Continue";
    if (currentIndex === REVIEWS_INDEX) return "I Want This Too";
    if (currentIndex === HOOK_INDEX) return "I'm Ready";
    if (currentIndex === CLOSING_INDEX) return "Let's Go";
    return "Continue";
  };

  // ── Real backend call + animated progress ──
  const MIN_ANALYZE_MS = 2800;
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const startAnalyzing = async (textToAnalyze: string) => {
    if (!textToAnalyze) return;

    setAnalysisResult(null);
    setAnalyzedText(textToAnalyze);
    setAnalysisError(null);
    analyzeActiveRef.current = true;
    goToIndex(ANALYZING_INDEX);

    const startedAt = Date.now();
    analyzeProgress.stopAnimation();
    analyzeProgress.setValue(0);
    setAnalyzePercent(0);
    const listenerId = analyzeProgress.addListener(({ value }) => {
      setAnalyzePercent(Math.floor(value));
    });

    // Kabhi na rukne wali progress: tez shuru, phir dheere dheere 98% tak
    const crawl = Animated.sequence([
      Animated.timing(analyzeProgress, { toValue: 35, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(analyzeProgress, { toValue: 70, duration: 7000, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(analyzeProgress, { toValue: 90, duration: 15000, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(analyzeProgress, { toValue: 98, duration: 45000, easing: Easing.linear, useNativeDriver: false }),
    ]);
    progressAnimRef.current = crawl;
    crawl.start();

    const callApi = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      try {
        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: textToAnalyze,
            perspective: 'user',
            context: 'They left me on seen for 3 hours and I want to check in.',
            tag: 'onboarding-practice',
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      let data: any;
      try {
        data = await callApi();
      } catch (e) {
        if (!analyzeActiveRef.current) return;
        data = await callApi(); // server so raha tha to ek baar khamoshi se dobara try
      }

      if (!analyzeActiveRef.current) return;
      if (!(data?.success && data?.data)) throw new Error(data?.error || 'Analysis failed');

      setAnalysisResult(data.data);

      // bohot jaldi response aaye tab bhi kam az kam itni der loading dikhao
      const wait = Math.max(0, MIN_ANALYZE_MS - (Date.now() - startedAt));
      if (wait) await sleep(wait);
      if (!analyzeActiveRef.current) return;

      // ab smoothly 100% tak
      crawl.stop();
      await new Promise<void>((resolve) =>
        Animated.timing(analyzeProgress, {
          toValue: 100, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
        }).start(() => resolve())
      );
      await sleep(250);
      if (analyzeActiveRef.current) goToIndex(RESULTS_INDEX);
    } catch (err: any) {
      console.log('🔴 ANALYZE ERROR:', err);
      crawl.stop();
      if (!analyzeActiveRef.current) return;
      analyzeProgress.stopAnimation();

      const errorMsg = err?.name === 'AbortError' || err?.message?.includes('canceled')
        ? 'Our server is just waking up. This can take a moment the first time. Please try again.'
        : "Couldn't analyze your text right now. Check your connection and try again.";
      setAnalysisError(errorMsg);
    } finally {
      analyzeProgress.removeListener(listenerId);
    }
  };

  const retryAnalyzing = () => {
    goToIndex(SCENARIO_INDEX);
    setAnalysisError(null);
  };

  // ── QUIZ SCREEN RENDERER ──
  const renderQuizScreen = (screenIndex: number) => {
    const data = QUIZ_SCREENS[screenIndex];
    const selectedOptions = quizSelections[screenIndex] || [];
    const mascotSize = isTablet ? 210 : (isCompactHeight ? 110 : 130);

    return (
      <ScreenWrap style={{ flex: 1 }}>
        <View style={styles.quizHeaderRow}>
          <View style={styles.quizHeadingCol}>
            <Text style={[
              styles.quizHeading,
              isTablet && styles.quizHeadingTablet,
              isCompactHeight && styles.quizHeadingCompact,
            ]}>
              {data.question}
            </Text>
            {data.subtitle ? <Text style={styles.quizSubtitle}>{data.subtitle}</Text> : null}
          </View>
          <Image
            source={data.mascot}
            style={[styles.quizMascot, { width: mascotSize, height: mascotSize }]}
          />
        </View>

        <ScrollView
          style={styles.quizScrollArea}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.quizOptionsList}
        >
          {data.options.map((opt, index) => {
            const isSelected = selectedOptions.includes(index);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.quizOption, isSelected && styles.quizOptionSelected]}
                activeOpacity={0.7}
                onPress={() => selectQuizOption(screenIndex, index)}
              >
                <Text style={styles.quizOptionIcon}>{opt.icon}</Text>
                <Text style={[styles.quizOptionText, isSelected && styles.quizOptionTextSelected]}>{opt.text}</Text>
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={15} color="#D946EF" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ScreenWrap>
    );
  };

  // ── PRACTICE INTRO SCREEN ──
  const renderPracticeIntro = () => (
    <ScreenWrap>
      <View style={styles.piMascotWrap}>
        <Image source={require('../assets/mascot-experience1.png')} style={styles.piMascot} />
      </View>
      <View style={styles.piHeadingWrap}>
        <Text style={[styles.piHeading, isTablet && styles.piHeadingTablet]}>
          Alright. Let's see how you <Text style={styles.pinkHighlight}>actually sound.</Text>
        </Text>
      </View>
      <Text style={styles.piSubtext}>
        We're putting you through a real texting situation.{'\n\n'}
        Answer honestly. Social Genius will analyze your response and show you how it actually sounds, and what they might feel reading it.
      </Text>
    </ScreenWrap>

  );



  // ── ANALYZING SCREEN (real API, animated, error state) ──
  const renderAnalyzingScreen = () => {

    const statusMsg =
      analyzePercent < 35 ? 'Reading the tone…'
        : analyzePercent < 70 ? 'Figuring out what it really says…'
          : analyzePercent < 92 ? 'Checking how they might feel…'
            : 'Putting your results together…';
    if (analysisError) {
      return (

        <ScreenWrap>
          <View style={styles.anzErrorWrap}>
            <MaterialCommunityIcons name="wifi-off" size={40} color="#F43F5E" style={{ marginBottom: 14 }} />
            <Text style={styles.anzErrorTitle}>Something went wrong</Text>
            <Text style={styles.anzErrorText}>{analysisError}</Text>
            <TouchableOpacity style={styles.anzRetryBtn} activeOpacity={0.85} onPress={retryAnalyzing}>
              <Text style={styles.anzRetryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </ScreenWrap>
      );
    }

    const ringSize = 160;
    const strokeWidth = 11;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const strokeDashoffset = analyzeProgress.interpolate({
      inputRange: [0, 100],
      outputRange: [circumference, 0],
    });

    // Step thresholds: Tone 0-33, Intent 33-66, Emotional 66-100
    const toneActive = analyzePercent >= 1;
    const intentActive = analyzePercent >= 33;
    const emotionActive = analyzePercent >= 66;

    const line1Width = analyzeProgress.interpolate({
      inputRange: [0, 33, 100],
      outputRange: ['0%', '100%', '100%'],
      extrapolate: 'clamp',
    });
    const line2Width = analyzeProgress.interpolate({
      inputRange: [0, 33, 66, 100],
      outputRange: ['0%', '0%', '100%', '100%'],
      extrapolate: 'clamp',
    });

    return (
      <ScreenWrap>
        <View style={styles.anzHeadingWrap}>
          <Text style={[styles.anzHeading, isTablet && styles.anzHeadingTablet]}>Analyzing your text...</Text>
          <Text style={styles.anzSubtext}>Hang tight, we're checking the vibe, the tone, and what they might actually feel reading it.</Text>
        </View>

        {/* 🔴 Proper animated circular gradient progress ring */}
        <View style={styles.anzRingWrap}>
          <Svg width={ringSize} height={ringSize}>
            <Defs>
              <SvgLinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FF3366" />
                <Stop offset="100%" stopColor="#D946EF" />
              </SvgLinearGradient>
            </Defs>
            {/* Background track */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="rgba(217,70,239,0.12)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Animated progress stroke */}
            <AnimatedCircle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="url(#ringGrad)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${ringSize / 2}, ${ringSize / 2}`}
            />
          </Svg>
          <View style={styles.anzRingCenterOverlay}>
            <Text style={styles.anzRingPercent}>{analyzePercent}%</Text>
          </View>

        </View>
        <Text style={styles.anzStatus}>{statusMsg}</Text>
        {/* Mascot neeche, ring ke neeche */}
        <Animated.View
          style={[
            styles.anzMascotWrap,
            { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] },
          ]}
        >
          <Image source={require('../assets/mascot-experience2.png')} style={styles.anzMascot} />
        </Animated.View>

        {/* 🔴 Steps row with animated connecting lines */}
        <View style={styles.anzStepsRow}>
          <View style={styles.anzStepItem}>
            <View style={[styles.anzStepIconBox, toneActive && styles.anzStepIconBoxActive]}>
              <MaterialCommunityIcons name="waveform" size={16} color={toneActive ? '#FFF' : '#D946EF'} />
            </View>
            <Text style={[styles.anzStepText, toneActive && styles.anzStepTextActive]}>Tone{'\n'}Analysis</Text>
          </View>

          <View style={styles.anzStepLineTrack}>
            <Animated.View style={[styles.anzStepLineFill, { width: line1Width }]} />
          </View>

          <View style={styles.anzStepItem}>
            <View style={[styles.anzStepIconBox, intentActive && styles.anzStepIconBoxActive]}>
              <MaterialCommunityIcons name="brain" size={16} color={intentActive ? '#FFF' : '#D946EF'} />
            </View>
            <Text style={[styles.anzStepText, intentActive && styles.anzStepTextActive]}>Intent{'\n'}Check</Text>
          </View>

          <View style={styles.anzStepLineTrack}>
            <Animated.View style={[styles.anzStepLineFill, { width: line2Width }]} />
          </View>

          <View style={styles.anzStepItem}>
            <View style={[styles.anzStepIconBox, emotionActive && styles.anzStepIconBoxActive]}>
              <MaterialCommunityIcons name="heart-pulse" size={16} color={emotionActive ? '#FFF' : '#D946EF'} />
            </View>
            <Text style={[styles.anzStepText, emotionActive && styles.anzStepTextActive]}>Emotional{'\n'}Impact</Text>
          </View>
        </View>
      </ScreenWrap>
    );
  };


  const renderResultsScreen = () => {
    const auraScore = Math.max(0, Math.min(100, analysisResult?.aura_score ?? 34));
    const averageScore = 63;

    const verdictDescription =
      analysisResult?.verdict?.description ||
      analysisResult?.analysis_reason ||
      "Your text may be sending a very different message than you intended.";

    return (
      <ScreenWrap>
        {/* Heading (left) + Mascot (right) */}
        <View style={styles.resTopRow}>
          <View style={styles.resHeadingCol}>
            <Text style={[styles.resHeading, isTablet && styles.resHeadingTablet]}>
              😬 We got some{'\n'}<Text style={styles.pinkHighlight}>bad news.</Text>
            </Text>
          </View>
          <Image source={require('../assets/mascot-quiz1.png')} style={styles.resMascot} />
        </View>

        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowFullSummary(true)}>
          <Text style={styles.resSubtext} numberOfLines={2} ellipsizeMode="tail">
            {verdictDescription}
          </Text>
          <Text style={styles.resReadMore}>Tap to read full</Text>
        </TouchableOpacity>
        {/* Score cards */}
        <View style={styles.resScoresRow}>
          <View style={[styles.resScoreCard, styles.resScoreCardBad]}>
            <View style={styles.resBarTrack}>
              <View style={[styles.resBarFill, { height: `${auraScore}%`, backgroundColor: '#FF3366' }]} />
            </View>
            <View style={styles.resScoreInfo}>
              <Text style={styles.resScoreLabel}>Your Score</Text>
              <Text style={styles.resScoreValueBad}>{auraScore}%</Text>
              <View style={styles.resScoreIconRow}>
                <MaterialCommunityIcons name="emoticon-sad-outline" size={34} color="#FF3366" />
              </View>
            </View>
          </View>

          <View style={[styles.resScoreCard, styles.resScoreCardGood]}>
            <View style={styles.resBarTrack}>
              <View style={[styles.resBarFill, { height: `${averageScore}%`, backgroundColor: '#4ADE80' }]} />
            </View>
            <View style={styles.resScoreInfo}>
              <Text style={styles.resScoreLabel}>Average Score</Text>
              <Text style={styles.resScoreValueGood}>{averageScore}%</Text>
              <View style={styles.resScoreIconRow}>
                <MaterialCommunityIcons name="emoticon-happy-outline" size={34} color="#4ADE80" />
              </View>
            </View>
          </View>
        </View>

        {/* But this isn't permanent */}
        <View style={styles.resPermanentBox}>
          <View style={styles.resPermanentIconBox}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color="#D946EF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resPermanentTitle}>But this isn't permanent.</Text>
            <Text style={styles.resPermanentText}>
              You can now see & learn how your texts actually sound, stop sending texts you'll regret, and communicate with confidence.
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.resPrimaryBtn} activeOpacity={0.85} onPress={() => setShowFullAnalysis(true)}>
          <Text style={styles.resPrimaryBtnText}>See My Full Analysis</Text>
          <Feather name="arrow-right" size={17} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.resSecondaryBtn} activeOpacity={0.85} onPress={() => goToIndex(FEATURE_START_INDEX)}>
          <Text style={styles.resSecondaryBtnText}>I Want To Improve</Text>
          <Feather name="arrow-right" size={17} color="#FFF" />
        </TouchableOpacity>
        <Modal
          visible={showFullSummary}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFullSummary(false)}
        >
          <TouchableOpacity
            style={styles.resModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFullSummary(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.resModalCard} onPress={() => { }}>
              <View style={styles.resModalHeader}>
                <Text style={styles.resModalTitle}>Full Analysis</Text>
                <TouchableOpacity onPress={() => setShowFullSummary(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="x" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
                <Text style={styles.resModalText}>{verdictDescription}</Text>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ScreenWrap>
    );
  };
  const renderFullAnalysisModal = () => (
    <Modal
      visible={showFullAnalysis}
      animationType="slide"
      onRequestClose={() => setShowFullAnalysis(false)}
    >
      {showFullAnalysis ? (
        <FullAnalysisView
          data={analysisResult || {}}
          userText={analyzedText}
          onClose={() => setShowFullAnalysis(false)}
          onContinue={() => {
            setShowFullAnalysis(false);
            setTimeout(() => goToIndex(FEATURE_START_INDEX), 450);
          }}
        />
      ) : null}
    </Modal>
  );
  const renderFeatureScreen = (idx: number) => {
    const data = FEATURE_SCREENS[idx];
    return (
      <ScreenWrap>
        <FeatureScreenContent
          data={data}
          isTablet={isTablet}
          active={currentIndex === FEATURE_START_INDEX + idx}
        />
      </ScreenWrap>
    );
  };

  const renderHookScreen = () => (
    <ScreenWrap>
      <HookScreenContent
        active={currentIndex === HOOK_INDEX}
        done={hookDone}
        onDone={handleHookDone}
      />
    </ScreenWrap>
  );
  // ── SCREEN 1: INTRO ──
  const renderIntroScreen = () => (
    <ScreenWrap style={{ paddingTop: 0 }}>
      <IntroScreenContent isTablet={isTablet} />
    </ScreenWrap>
  );

  // ── SLIDE 16 ──
  const renderDynamicScreen = () => (
    <ScreenWrap>
      <DynamicScreenContent isTablet={isTablet} />
    </ScreenWrap>
  );

  // ── SLIDE 17 ──
  const renderReviewsScreen = () => (
    <ScreenWrap>
      <ReviewsScreenContent isTablet={isTablet} />
    </ScreenWrap>
  );

  // ── PRIVACY SCREEN ──

  // ── LOGIN SCREEN ──
  // ── LOGIN SCREEN ──
  const renderLoginScreen = () => (
    <ScreenWrap>
      <View style={styles.s10TopRow}>
        <View style={styles.s10SpeechBubble}>
          <Text style={styles.s10SpeechText}>
            {purchasedBeforeLogin
              ? 'You’re in! 🎉\n\nLink your\naccount to\nsave Pro.'
              : 'Alright.\n\nLemme\nsupervise\nyour texts.'}
          </Text>
        </View>
        <Image source={require('../assets/mascot-detective15.png')} style={[styles.s10Mascot, isTablet && styles.s10MascotTablet]} />
      </View>

      <View style={styles.s10HeadingWrapper}>
        <Text style={[styles.s10Heading, isTablet && styles.s10HeadingTablet]}>
          {showOnlyLogin && !purchasedBeforeLogin ? 'Sign in to\n' : 'Create your\n'}
          <Text style={styles.pinkHighlight}>SocialGenius</Text>
          {'\n'}account.
        </Text>
      </View>

      <TouchableOpacity style={[styles.s10AppleBtn, isTablet && styles.s10BtnTablet]} activeOpacity={0.85} onPress={handleAppleLogin}>
        <View style={styles.s10BtnInner}>
          <MaterialCommunityIcons name="apple" size={22} color="#000" />
          <Text style={styles.s10AppleBtnText}>Continue with Apple</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.s10GoogleBtn, isTablet && styles.s10BtnTablet]} activeOpacity={0.85} onPress={handleGoogleLogin}>
        <View style={styles.s10BtnInner}>
          <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
          <Text style={styles.s10GoogleBtnText}>Continue with Google</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.s10LoginDisclaimer}>
        By continuing, you agree to our Terms & Privacy Policy and consent to your text inputs being processed by OpenAI for analysis. Your data is not used to train public models.
      </Text>

      <View style={styles.s10Footer}>
        <MaterialCommunityIcons name="shield-check-outline" size={13} color="#4B5563" />
        <Text style={styles.s10FooterText}>Fast. Secure. No extra steps.</Text>
      </View>
    </ScreenWrap>
  );

  if (showOnlyLogin) {
    return (
      <BgSafeArea>
        <StatusBar barStyle="light-content" />
        <View style={styles.logoHeader}>
          {currentIndex === INTRO_INDEX ? (
            <TouchableOpacity
              onPress={() => setShowOnlyLogin(false)}
              style={styles.topBackBtn}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color="#D946EF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.topBackBtn} />
          )}
          <BrandLogo />
          <View style={styles.topBackBtn} />
        </View>
        {renderLoginScreen()}
      </BgSafeArea>
    );
  }

  const hideBottomBar =
    currentIndex === ANALYZING_INDEX ||
    currentIndex === RESULTS_INDEX ||
    currentIndex === LOGIN_INDEX ||
    currentIndex === CLOSING_INDEX;

  const hideBackBtn =
    (currentIndex === ANALYZING_INDEX && !analysisError) ||
    currentIndex === CLOSING_INDEX ||
    currentIndex === LOGIN_INDEX;


  const isHookLike = currentIndex === HOOK_INDEX || currentIndex === CLOSING_INDEX;
  const hookLikeDone = currentIndex === HOOK_INDEX ? hookDone : closingDone;
  const btnFade = currentIndex === HOOK_INDEX ? hookBtn : closingBtn;

  // ── Global progress bar (logo ke UPAR) ──
  const topProgress = computeTopProgress(currentIndex);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });


  // ── Har screen ko index se render karo ──
  const renderScreenAt = (index: number) => {
    if (index === HOOK_INDEX) return renderHookScreen();
    if (index === INTRO_INDEX) return renderIntroScreen();
    if (index >= QUIZ_START_INDEX && index < QUIZ_START_INDEX + 5) return renderQuizScreen(index - QUIZ_START_INDEX);
    if (index === PRACTICE_INTRO_INDEX) return renderPracticeIntro();
    if (index === SCENARIO_INDEX) return renderScenarioPicker();
    if (index === ANALYZING_INDEX) return renderAnalyzingScreen();
    if (index === RESULTS_INDEX) return renderResultsScreen();
    if (index >= FEATURE_START_INDEX && index < FEATURE_START_INDEX + 4) {
      return renderFeatureScreen(index - FEATURE_START_INDEX);
    }
    if (index === DYNAMIC_INDEX) return renderDynamicScreen();
    if (index === REVIEWS_INDEX) return renderReviewsScreen();

    if (index === LOGIN_INDEX) return renderLoginScreen();
    if (index === CLOSING_INDEX) {
      return (
        <ScreenWrap>
          <HookScreenContent
            lines={CLOSING_LINES}
            active={currentIndex === CLOSING_INDEX}
            done={closingDone}
            onDone={handleClosingDone}
          />
        </ScreenWrap>
      );
    }
    return null;
  };

  return (
    <BgSafeArea>
      <StatusBar barStyle="light-content" />

      {topProgress && (
        <View style={[styles.topProgressWrap, isTablet && { paddingHorizontal: tabletSidePadding }]}>
          <View style={styles.quizProgressBarBg}>
            <Animated.View style={[styles.quizProgressBarFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.quizProgressText}>{topProgress.label}</Text>
        </View>
      )}

      <View style={[styles.logoHeader, topProgress && { paddingTop: 12 }, currentIndex === INTRO_INDEX && { marginBottom: 0 }]}>
        {currentIndex > 0 && !hideBackBtn ? (
          <TouchableOpacity
            onPress={() => {
              if (currentIndex === ANALYZING_INDEX) {
                analyzeActiveRef.current = false;
                progressAnimRef.current?.stop();
              }
              handleBack();
            }}
            style={styles.topBackBtn}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color="#D946EF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBackBtn} />
        )}
        <BrandLogo />
        <View style={styles.topBackBtn} />
      </View>

      <AnimatedFlatList
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
        ref={flatListRef}
        data={Array.from({ length: TOTAL_SCREENS }, (_, i) => String(i))}
        keyExtractor={(item: string) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        getItemLayout={(_: unknown, index: number) => ({ length: winWidth, offset: winWidth * index, index })}
        renderItem={({ index }: { index: number }) => (
          <AnimatedPage index={index} scrollX={scrollX} pageWidth={winWidth}>
            {renderScreenAt(index)}
          </AnimatedPage>
        )}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={false}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
      />

      {!hideBottomBar && currentIndex !== SCENARIO_INDEX && (!isHookLike || hookLikeDone) && (
        <Animated.View
          style={[
            styles.bottomControls,
            isTablet && styles.bottomControlsTablet,
            isHookLike && { opacity: btnFade },
          ]}
        >
          <TouchableOpacity style={[styles.mainBtn, isTablet && styles.mainBtnTablet]} activeOpacity={0.8} onPress={handleNext}>
            <LinearGradient
              colors={['#FF3366', '#9333EA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.mainBtnGrad}
            >
              <Text style={styles.mainBtnText}>{getButtonText()}</Text>
              <Feather name="arrow-right" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* 👇 NEW: Intro screen par Existing Users ke liye Sign In button */}
          {currentIndex === INTRO_INDEX && (
            <TouchableOpacity
              onPress={() => {
                setPurchasedBeforeLogin(false);
                setShowOnlyLogin(true);
              }}
              activeOpacity={0.7}
              style={{ marginTop: 14, alignItems: 'center', paddingVertical: 4 }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '600' }}>
                Already have an account?{' '}
                <Text style={{ color: '#D946EF', fontWeight: '800' }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
      {currentIndex === HOOK_INDEX && !hookDone && (
        <TouchableOpacity
          style={styles.skipBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => goToIndex(INTRO_INDEX)}
        >
          <Text style={styles.skipBtnText}>Skip</Text>
          <Feather name="chevrons-right" size={14} color="#D946EF" />
        </TouchableOpacity>
      )}
      {currentIndex === CLOSING_INDEX && !closingDone && (
        <TouchableOpacity
          style={styles.skipBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => {
            if (closingSkippedRef.current) return;   // double tap se bachao
            closingSkippedRef.current = true;
            finishOnboarding();
          }}
        >
          <Text style={styles.skipBtnText}>Skip</Text>
          <Feather name="chevrons-right" size={14} color="#D946EF" />
        </TouchableOpacity>
      )}
      {renderFullAnalysisModal()}
      {paywallCover && (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <GradientBg style={{ justifyContent: 'center', alignItems: 'center' }}>
            <BrandLogo />
            <ActivityIndicator size="small" color="#D946EF" style={{ marginTop: 18 }} />
          </GradientBg>
        </View>
      )}
    </BgSafeArea>
  );
}

// ==========================================
// FEATURE SHOWCASE STYLES (phone mockup)
// ==========================================
const fs = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  brandText: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  headRow: { flexDirection: 'row', marginBottom: 10, position: 'relative' },
  heading: { color: '#FFF', fontSize: 19, fontWeight: '900', lineHeight: 23, marginBottom: 6 },
  sub: { color: '#C4B5D9', fontSize: 10.5, lineHeight: 14, fontWeight: '500' },
  mascot: { position: 'absolute', right: -4, top: -10, width: 76, height: 76, resizeMode: 'contain' },

  phoneArea: { flex: 1, position: 'relative' },
  scrollContent: { paddingBottom: 30 },
  mockRow: { flexDirection: 'row', alignItems: 'flex-start', position: 'relative' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 34 },
  spark: { position: 'absolute', color: '#D946EF', fontSize: 12 },

  sideLabelCol: { width: 62, paddingTop: 70, paddingLeft: 4, paddingRight: 4, transform: [{ rotate: '-8deg' }] },
  sideLabel: { color: '#D946EF', fontSize: 10.5, fontWeight: '700', fontStyle: 'italic', lineHeight: 13 },

  // ── phone ──
  phone: {
    flex: 1,
    backgroundColor: '#0A0514',
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#7C3AED',
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 14,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 10,
  },
  notch: {
    position: 'absolute', top: 6, alignSelf: 'center',
    width: 54, height: 13, borderRadius: 7, backgroundColor: '#000', zIndex: 3,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, marginBottom: 6 },
  statusTime: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 2 },
  appBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  appBrand: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  // ── video ──
  video: {
    width: '100%', aspectRatio: 2, borderRadius: 10, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', marginBottom: 7,
    borderWidth: 1, borderColor: 'rgba(217,70,239,0.25)',
  },
  videoSilhouette: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end' },
  playBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  videoBar: { position: 'absolute', left: 6, right: 6, bottom: 4 },
  videoSeekTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, justifyContent: 'center' },
  videoSeekFill: { width: '55%', height: 2, backgroundColor: '#FF3366', borderRadius: 1 },
  videoSeekDot: { position: 'absolute', left: '55%', width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3366' },
  videoTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  videoTime: { color: '#E5E7EB', fontSize: 7, fontWeight: '600' },

  // ── info cards ──
  cards: { gap: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1.2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 6,
  },
  cardIcon: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 8.5, fontWeight: '800', marginBottom: 2 },
  cardText: { color: '#F3F4F6', fontSize: 9, lineHeight: 12.5, fontWeight: '500' },

  adviceBox: { backgroundColor: 'rgba(168,85,247,0.14)', borderColor: 'rgba(217,70,239,0.6)', shadowColor: '#D946EF', alignItems: 'flex-start' },
  adviceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  adviceTitle: { color: '#F0ABFC', fontSize: 9, fontWeight: '800' },
  adviceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  adviceText: { color: '#F3F4F6', fontSize: 9, flex: 1 },

  // ── chat / keyboard screen ──
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  chatAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center' },
  chatName: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  chatBody: { paddingVertical: 8, alignItems: 'flex-end' },
  chatBubble: { backgroundColor: '#2563EB', borderRadius: 12, borderBottomRightRadius: 3, padding: 7, maxWidth: '82%' },
  chatBubbleText: { color: '#FFF', fontSize: 8.5, lineHeight: 12 },

  kbMenu: {
    alignSelf: 'flex-start', width: '62%', backgroundColor: '#0D0718',
    borderWidth: 1.2, borderColor: 'rgba(217,70,239,0.6)', borderRadius: 10, padding: 8, gap: 7,
    shadowColor: '#D946EF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8,
    marginBottom: 6,
  },
  kbMenuHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kbMenuBrand: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  kbMenuRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kbMenuText: { color: '#E5E7EB', fontSize: 9, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingLeft: 10, paddingRight: 3, height: 22, marginBottom: 5,
  },
  inputPlaceholder: { color: '#6B7280', fontSize: 8.5 },
  sendBtn: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },

  kb: { backgroundColor: '#1F1B2E', borderRadius: 6, padding: 4, gap: 4 },
  kbRow: { flexDirection: 'row', justifyContent: 'center', gap: 3 },
  kbKey: {
    flex: 0, minWidth: 14, height: 17, paddingHorizontal: 2, borderRadius: 3,
    backgroundColor: '#3A3550', alignItems: 'center', justifyContent: 'center',
  },
  kbKeyText: { color: '#E5E7EB', fontSize: 8, fontWeight: '600' },
});

const ns = StyleSheet.create({
  // slide 16
  hero: { height: 275, marginBottom: 20, position: 'relative', alignItems: 'center', justifyContent: 'flex-end' },
  heroPerson: { position: 'absolute', bottom: 0, width: '52%', height: 265 },
  heroEdgeFade: { position: 'absolute', top: 0, bottom: 0, width: '45%' },
  heroPersonIcon: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end' },
  heroPersonFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 55 },
  heroMascot: { width: 150, height: 180, resizeMode: 'contain', zIndex: 2, marginBottom: 2, top: 16 },
  bubble: {
    position: 'absolute', zIndex: 3, maxWidth: 118,
    backgroundColor: '#0A0514', borderWidth: 1, borderColor: 'rgba(168,85,247,0.7)',
    borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6,
  },
  bubbleRight: { borderColor: 'rgba(255,51,102,0.75)' },
  bubbleText: { color: '#FFF', fontSize: 9.5, fontWeight: '600', lineHeight: 13 },
  spark: { position: 'absolute', color: '#D946EF', fontSize: 14 },

  dynHeading: { color: '#FFF', fontSize: 24, fontWeight: '900', lineHeight: 29, marginBottom: 14 },
  dynList: { gap: 10, marginBottom: 14 },
  dynRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dynIconCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  dynText: { color: '#E5E7EB', fontSize: 12.5, fontWeight: '500', flex: 1, lineHeight: 17 },
  dynFinal: { color: '#FFF', fontSize: 14, fontWeight: '800', lineHeight: 20 },

  // slide 17
  // slide 17 — reviews
  revHeading: {
    color: '#FFF', fontSize: 23, fontWeight: '800', lineHeight: 29,
    textAlign: 'center', marginTop: 4, marginBottom: 18, paddingHorizontal: 8,
  },
  revList: { gap: 14, paddingBottom: 40 },
  revCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 18,
  },
  revTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  revAvatar: {
    width: 64, height: 64, borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  revName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  revText: { color: '#D1D5DB', fontSize: 14.5, lineHeight: 23, fontWeight: '400' },
  revStars: { color: '#F5A623', fontSize: 18, letterSpacing: 4, marginTop: 14 },
  revFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 },
  dynFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 },
});

const ins = StyleSheet.create({
  topBlock: { position: 'relative', marginBottom: 7 },
  heroImg: { position: 'absolute', right: -10, top: -12, width: '52%' },
  spark: { position: 'absolute', color: '#D946EF', fontSize: 14 },

  leftCol: { zIndex: 2 },
  titleWrap: { marginTop: 2 },
  titleWhite: { color: '#FFF', fontSize: 30, fontWeight: '900', lineHeight: 34, letterSpacing: -0.4 },
  titleGrad: { fontSize: 30, fontWeight: '900', lineHeight: 34, letterSpacing: -0.4 },

  bodyCol: { width: '52%', marginTop: 10 },
  body: { color: '#F3F4F6', fontSize: 12, lineHeight: 17, fontWeight: '500' },
  bodyPink: { color: '#E879F9', fontSize: 12, lineHeight: 17, fontWeight: '800' },

  features: { gap: 10 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featIconCircle: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.6, borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6,
  },
  featTitle: { color: '#E879F9', fontSize: 13, fontWeight: '800', marginBottom: 1 },
  featDesc: { color: '#F3F4F6', fontSize: 11, lineHeight: 15, fontWeight: '500' },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05020B' },

  logoHeader: {
    paddingHorizontal: 24, paddingTop: 40, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  topProgressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 40 },
  topBackBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  logoSocial: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1, lineHeight: 20 },
  logoStar: { color: '#A855F7', fontSize: 13, marginLeft: 2 },
  logoGenius: { color: '#FF3366', fontSize: 18, fontWeight: '900', letterSpacing: 1, lineHeight: 20 },

  screenContainer: { width: width, paddingHorizontal: 24, paddingTop: 6 },
  screenContainerTablet: { flex: 1, justifyContent: 'center', paddingTop: 0, paddingBottom: 20 },

  pinkHighlight: { color: '#FF3366' },

  // ── Quiz Screens ──
  quizProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 2 },
  quizProgressBarBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  quizProgressBarFill: { height: 4, backgroundColor: '#D946EF', borderRadius: 2 },
  quizProgressText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },

  quizHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  quizHeadingCol: { flex: 1 },
  quizHeading: { color: '#FFF', fontSize: 19, fontWeight: '800', lineHeight: 25, textAlign: 'left', width: 220 },
  quizHeadingTablet: { fontSize: 24, lineHeight: 31 },
  quizHeadingCompact: { fontSize: 16, lineHeight: 21 },
  quizSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 6, fontWeight: '500', textAlign: 'left' },
  quizMascot: { resizeMode: 'contain', flexShrink: 0 },

  quizScrollArea: { flex: 1 },
  quizOptionsList: { gap: 9, paddingBottom: 20 },
  quizOption: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  quizOptionSelected: {
    borderColor: '#D946EF',
    backgroundColor: 'rgba(217,70,239,0.1)',
    shadowColor: '#D946EF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  quizOptionIcon: { fontSize: 17 },
  quizOptionText: { color: '#D1D5DB', fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 17 },
  quizOptionTextSelected: { color: '#FFF', fontWeight: '700' },

  // ── Practice Intro Screen ──
  piMascotWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 20, },
  piMascot: { width: 250, height: 300, resizeMode: 'contain' },
  piHeadingWrap: { marginBottom: 16 },
  piHeading: { color: '#FFF', fontSize: 26, fontWeight: '900', lineHeight: 33, textAlign: 'center' },
  piHeadingTablet: { fontSize: 32, lineHeight: 40 },
  piSubtext: { color: '#9CA3AF', fontSize: 13, lineHeight: 20, textAlign: 'center', fontWeight: '500' },
  anzStatus: { color: '#E879F9', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  // ── Scenario Picker Screen ──
  scenarioHeadingWrap: { marginBottom: 18 },
  scenarioHeading: { color: '#FFF', fontSize: 19, fontWeight: '800', lineHeight: 25 },
  scenarioHeadingTablet: { fontSize: 24, lineHeight: 31 },
  scenarioOptionsList: { gap: 10, paddingBottom: 10 },
  scenarioOption: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  scenarioOptionSelected: {
    borderColor: '#D946EF',
    backgroundColor: 'rgba(217,70,239,0.1)',
  },
  scenarioOptionIcon: { fontSize: 18, marginTop: 1 },
  scenarioOptionText: { color: '#D1D5DB', fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 19, fontStyle: 'italic' },
  scenarioOptionTextSelected: { color: '#FFF', fontWeight: '600' },
  scenarioCustomInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(217,70,239,0.4)',
    borderRadius: 14, color: '#FFF', fontSize: 13,
    padding: 14, minHeight: 80, textAlignVertical: 'top',
  },
  scenarioAnalyzeBtn: { height: 54, borderRadius: 14, overflow: 'hidden', marginTop: 14, marginBottom: 10 },
  scenarioAnalyzeBtnGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scenarioAnalyzeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  scenarioHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  scenarioHeadingCol: { flex: 1 },
  scenarioMascot: { width: 120, height: 150, resizeMode: 'contain', flexShrink: 0 },


  // ── Analyzing Screen ──
  anzHeadingWrap: { alignItems: 'center', marginTop: 10, marginBottom: 18 },
  anzHeading: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  anzHeadingTablet: { fontSize: 27 },
  anzSubtext: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },


  // 🔴 Mascot ab ring ke neeche, apne hi row mein, overlap nahi
  anzRingWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 10, position: 'relative' },
  anzRingCenterOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  anzRingPercent: { color: '#FFF', fontSize: 30, fontWeight: '900' },

  anzStepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingHorizontal: 4 },
  anzStepItem: { alignItems: 'center', gap: 6 },
  anzStepIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(217,70,239,0.1)', borderWidth: 1, borderColor: 'rgba(217,70,239,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  anzStepIconBoxActive: {
    backgroundColor: '#D946EF', borderColor: '#D946EF',
    shadowColor: '#D946EF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6,
  },
  anzStepText: { color: '#6B7280', fontSize: 9, textAlign: 'center', fontWeight: '600', lineHeight: 12 },
  anzStepTextActive: { color: '#D946EF' },
  anzStepLineTrack: { width: 24, height: 2, backgroundColor: 'rgba(217,70,239,0.15)', marginHorizontal: 4, borderRadius: 1, overflow: 'hidden', alignSelf: 'center', marginBottom: 16 },
  anzStepLineFill: { height: '100%', backgroundColor: '#D946EF' },
  anzMascotWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 18 },
  anzMascot: { width: 300, height: 200, resizeMode: 'contain' },




  // ── Analyzing: error state ──
  anzErrorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  anzErrorTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  anzErrorText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  anzRetryBtn: { backgroundColor: '#D946EF', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  anzRetryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // ── Results Screen ──
  resTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, marginBottom: 10,
  },
  resHeadingCol: { flex: 1 },
  resHeading: { color: '#FFF', fontSize: 26, fontWeight: '900', lineHeight: 33, textAlign: 'left' },
  resHeadingTablet: { fontSize: 32, lineHeight: 40 },
  resMascot: { width: 120, height: 120, resizeMode: 'contain', flexShrink: 0 },
  resSubtext: { color: '#E5E7EB', fontSize: 14, textAlign: 'left', lineHeight: 21, fontWeight: '500', marginBottom: 6 },

  resScoresRow: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  resScoreCard: {
    flex: 1, flexDirection: 'row', gap: 14,
    borderRadius: 18, padding: 14, borderWidth: 1.5, height: 160,
  },
  resScoreCardBad: {
    backgroundColor: 'rgba(255,51,102,0.08)', borderColor: '#FF3366',
    shadowColor: '#FF3366', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8,
  },
  resScoreCardGood: {
    backgroundColor: 'rgba(74,222,128,0.08)', borderColor: '#4ADE80',
    shadowColor: '#4ADE80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8,
  },
  resBarTrack: {
    width: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  resBarFill: { width: '100%', borderRadius: 6 },
  resScoreInfo: { flex: 1, justifyContent: 'space-between' },
  resScoreLabel: { color: '#E5E7EB', fontSize: 12, fontWeight: '600' },
  resScoreValueBad: { color: '#FF3366', fontSize: 34, fontWeight: '900' },
  resScoreValueGood: { color: '#4ADE80', fontSize: 34, fontWeight: '900' },
  resScoreIconRow: { alignItems: 'flex-end' },

  resPermanentBox: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderWidth: 1.5, borderColor: '#7C3AED', borderRadius: 16,
    padding: 14, marginBottom: 20,
  },
  resPermanentIconBox: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D946EF',
    backgroundColor: 'rgba(217,70,239,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  resPermanentTitle: { color: '#C084FC', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  resPermanentText: { color: '#D1D5DB', fontSize: 12.5, lineHeight: 19 },

  resPrimaryBtn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  resPrimaryBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  resSecondaryBtn: {
    flexDirection: 'row', gap: 8,
    borderWidth: 1.5, borderColor: '#9333EA', borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center',
  },
  resSecondaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  resReadMore: { color: '#D946EF', fontSize: 12, fontWeight: '700', marginBottom: 4 },

  resModalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  resModalCard: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#0A0514',
    borderWidth: 1.5, borderColor: '#7C3AED', borderRadius: 18,
    padding: 18,
  },
  resModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  resModalTitle: { color: '#C084FC', fontSize: 16, fontWeight: '800' },
  resModalText: { color: '#E5E7EB', fontSize: 14, lineHeight: 22 },

  skipBtn: {
    position: 'absolute', top: 43, right: 24, zIndex: 20, elevation: 20,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 32, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(217,70,239,0.35)',
  },
  skipBtnText: { color: '#E5E7EB', fontSize: 12.5, fontWeight: '700' },
  // ── Login Screen ──
  s10TopRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', height: 200, marginBottom: 20 },
  s10Mascot: { width: 250, height: 240, resizeMode: 'contain', zIndex: 2, top: 30 },
  s10MascotTablet: { width: 285, height: 273 },
  s10SpeechBubble: { position: 'absolute', left: 0, top: 40, backgroundColor: '#0A0514', borderWidth: 1, borderColor: 'rgba(168,85,247,0.45)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, zIndex: 3 },
  s10SpeechText: { color: '#FFF', fontSize: 12, fontWeight: '600', lineHeight: 18 },

  s10HeadingWrapper: { marginBottom: 32, top: 25, alignItems: 'center' },
  s10Heading: { color: '#FFF', fontSize: 32, fontWeight: '900', lineHeight: 42, textAlign: 'center', letterSpacing: -0.5 },
  s10HeadingTablet: { fontSize: 38, lineHeight: 48 },

  s10AppleBtn: { backgroundColor: '#FFFFFF', borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center', marginBottom: 12, top: 30 },
  s10GoogleBtn: { backgroundColor: '#FFFFFF', borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center', marginBottom: 16, top: 30 },
  s10BtnTablet: { width: '70%', alignSelf: 'center' },
  s10BtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  s10AppleBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  s10GoogleBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  s10LoginDisclaimer: { color: '#6B7280', fontSize: 10.5, textAlign: 'center', lineHeight: 15, paddingHorizontal: 10, top: 60 },
  s10Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, top: 50 },
  s10FooterText: { color: '#4B5563', fontSize: 11 },

  // ── Bottom Controls ──
  bottomControls: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 10 },
  bottomControlsTablet: { paddingHorizontal: 0, alignItems: 'center' },
  mainBtn: { height: 54, borderRadius: 14, overflow: 'hidden' },
  mainBtnTablet: { width: 420, maxWidth: '100%' },
  mainBtnGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mainBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
const rs = StyleSheet.create({
  verdictBorder: {
    borderRadius: 20, padding: 1.5, marginTop: 4, marginBottom: 6,
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16,
  },
  verdictInner: {
    backgroundColor: '#0A0514', borderRadius: 19, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  verdictLeft: { flex: 0.6, paddingRight: 10 },
  verdictBadge: {
    backgroundColor: 'rgba(217,70,239,0.12)', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8,
  },
  verdictBadgeText: { color: '#D946EF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  verdictMainText: { color: '#FFF', fontSize: 18, fontWeight: '900', lineHeight: 24, marginBottom: 6 },
  highlightYellow: { color: '#FBBF24', fontSize: 13, fontWeight: '700' },
  verdictSubText: { color: '#D1D5DB', fontSize: 11.5, lineHeight: 17, marginBottom: 10 },
  readMoreText: { color: '#D946EF', fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  fixSection: { paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#4ADE80' },
  fixHeading: { color: '#4ADE80', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  fixPoints: { color: '#D1D5DB', fontSize: 10.5, lineHeight: 15 },
  verdictRight: { flex: 0.38, alignItems: 'center', position: 'relative' },
  auraTitle: { color: '#D946EF', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  auraScore: { fontSize: 42, fontWeight: '900' },
  verdictMascot: { width: 72, height: 72, resizeMode: 'contain', marginTop: -6 },

  sectionHeading: { color: '#6B7280', fontSize: 10.5, fontWeight: '800', letterSpacing: 1, marginTop: 16, marginBottom: 10 },
  scoresRow: { flexDirection: 'row', gap: 8 },

  breakdownContainer: {
    backgroundColor: '#0D0718', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)',
    overflow: 'hidden',
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  breakdownIconBox: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  breakdownTitle: { color: '#F9FAFB', fontSize: 11.5, fontWeight: '700', marginBottom: 1 },
  breakdownSubtitle: { fontSize: 10, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 52 },
  breakdownSummaryBox: { paddingLeft: 52, paddingRight: 12, paddingBottom: 12 },
  breakdownSummaryText: { color: '#9CA3AF', fontSize: 11, fontStyle: 'italic', lineHeight: 16 },

  scoreCardWrapper: { flex: 1, borderRadius: 10, padding: 1 },
  scoreCardInner: { flex: 1, borderRadius: 9, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  scoreCardTitle: { color: '#D1D5DB', fontSize: 9, fontWeight: '500', textAlign: 'center', marginBottom: 6, height: 24 },
  scoreCardValue: { color: '#FFF', fontSize: 19, fontWeight: 'bold', marginBottom: 2 },
  scoreCardPercent: { fontSize: 10, color: '#D1D5DB' },
  scoreCardStatus: { fontSize: 8, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },

  brutalTruthBox: {
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', position: 'relative', overflow: 'hidden',
  },
  brutalLeft: { marginRight: 10, zIndex: 2, justifyContent: 'center' },
  brutalMascot: { width: 45, height: 45, resizeMode: 'contain' },
  brutalCenter: { flex: 1, zIndex: 2, justifyContent: 'center', paddingRight: 60 },
  brutalBullet: { color: '#D1D5DB', fontSize: 11, lineHeight: 16 },
  watermarkText: {
    position: 'absolute', right: 10, top: 25, fontSize: 22, fontWeight: '900',
    color: '#A855F7', opacity: 0.8, fontStyle: 'italic', lineHeight: 32, textAlign: 'right',
    zIndex: 1, transform: [{ rotate: '-6deg' }],
  },

  fullHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 12,
  },
  fullHeaderTitle: { color: '#D946EF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  fullCloseBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  fullBody: { paddingHorizontal: 24, paddingBottom: 30 },
  fullContinueBtn: { borderRadius: 14, overflow: 'hidden', height: 54, marginTop: 4 },
  fullContinueBtnGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  fullContinueBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
const fa = StyleSheet.create({
  body: { paddingHorizontal: 24, paddingBottom: 40 },

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
  compareChip: {
    marginTop: 14, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  compareText: { color: '#D1D5DB', fontSize: 11.5, fontWeight: '600' },

  sentBubble: {
    alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: '#2563EB',
    borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
  },
  sentText: { color: '#FFF', fontSize: 13, lineHeight: 19 },

  readCard: {
    backgroundColor: '#0D0718', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)', padding: 14,
  },
  readText: { color: '#E5E7EB', fontSize: 13, lineHeight: 20 },

  meterCard: {
    backgroundColor: '#0D0718', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)', padding: 14,
  },
  meterRow: { paddingVertical: 4 },
  meterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  meterLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meterLabel: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  meterValue: { fontSize: 15, fontWeight: '900' },
  meterTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4 },
  meterStatus: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, marginTop: 6 },
  meterDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 },

  bdCard: { backgroundColor: '#0D0718', borderRadius: 14, borderWidth: 1.2, padding: 14 },
  bdHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bdIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bdLabel: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.2 },
  bdTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  bdSummary: { color: '#B8BDC9', fontSize: 12.5, lineHeight: 19 },

  truthBox: {
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', padding: 14, gap: 12,
  },
  truthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  truthNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(217,70,239,0.2)',
    borderWidth: 1, borderColor: '#D946EF', alignItems: 'center', justifyContent: 'center',
  },
  truthNumText: { color: '#F0ABFC', fontSize: 12, fontWeight: '900' },
  truthText: { flex: 1, color: '#E5E7EB', fontSize: 13, lineHeight: 19, fontWeight: '500' },

  fixCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1.2, borderColor: 'rgba(74,222,128,0.55)',
    borderRadius: 14, padding: 14,
  },
  fixIcon: { marginTop: 1 },
  fixText: { flex: 1, color: '#E5E7EB', fontSize: 13, lineHeight: 20, fontWeight: '500' },
});

const fv = StyleSheet.create({
  phoneArea: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-end',
    overflow: 'hidden', paddingHorizontal: 20, paddingVertical: 14, marginBottom: 6,
  },
  phone: {
    height: '100%', aspectRatio: 9 / 19, maxWidth: '78%',
    backgroundColor: '#000', borderRadius: 40, borderWidth: 6, borderColor: '#2A1A45',
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 22,
    elevation: 12, overflow: 'hidden',
  },
  screen: { flex: 1, borderRadius: 32, overflow: 'hidden', backgroundColor: '#0A0514' },
  island: {
    position: 'absolute', top: 9, alignSelf: 'center',
    width: 74, height: 20, borderRadius: 10, backgroundColor: '#000',
  },
  heading: { color: '#FFF', fontSize: 22, fontWeight: '900', lineHeight: 29, textAlign: 'center', marginBottom: 8 },
  sub: { color: '#C4B5D9', fontSize: 12.5, lineHeight: 18, fontWeight: '500', textAlign: 'center', paddingHorizontal: 6, marginBottom: 6 },
});