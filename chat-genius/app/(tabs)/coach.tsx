import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter
} from 'react-native';
import Purchases from 'react-native-purchases';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SharedData } from '../store';
import { syncProToExtension } from '../lib/proSync';
import { supabase } from '../lib/supabase';
import Superwall, { PaywallPresentationHandler } from '@superwall/react-native-superwall';

const { width } = Dimensions.get('window');

// 🟢 IPAD RESPONSIVE LOGIC
const isPad = width >= 768;
const PAD_PADDING = isPad ? Math.max((width - 700) / 2, 40) : 20;

// 🔴 Storage key — isse app mein kahin aur clash nahi hona chahiye
const STORAGE_KEY = 'coach_chat_history_v1';

export default function CoachScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  // 🔴 States for Chat
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const listRef = useRef<FlatList>(null);
  // 🔴 Taake pehli render pe hi save trigger na ho (jab tak history load na ho jaye)
  const hasLoadedRef = useRef(false);
  // 🔴 NAYA — reliable auto-scroll: har naye message/typing state par
  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (chatHistory.length === 0) return;
    scrollToBottom(true);
    // Thora delay ke baad dubara — taake agar text wrap/layout settle hone mein waqt le to bhi scroll ho jaye
    const t = setTimeout(() => scrollToBottom(true), 150);
    return () => clearTimeout(t);
  }, [chatHistory, isTyping]);

  // 🟢 App khulte hi saved chat load karo
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setChatHistory(parsed);
          }
        }
      } catch (err) {
        console.error("Chat history load error:", err);
        // Fail-safe: kuch na load ho to bhi app normal chalti rahegi, empty state dikhega
      } finally {
        hasLoadedRef.current = true;
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  // 🟢 Jab bhi chatHistory change ho, save karo (lekin sirf load hone ke baad)
  useEffect(() => {
    if (!hasLoadedRef.current) return; // initial load ke waqt overwrite na ho

    const saveHistory = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
      } catch (err) {
        console.error("Chat history save error:", err);
        // Fail-safe: save fail ho to bhi chat normally kaam karti rahegi is session mein
      }
    };
    saveHistory();
  }, [chatHistory]);


  const showPaywall = async () => {
    const handler = new PaywallPresentationHandler();
    let presented = false;

    handler.onPresent = () => { presented = true; };
    handler.onSkip = (reason: any) => {
      console.log('Superwall skipped:', reason);
      Alert.alert('Notice', "Paywall couldn't be loaded right now. Please try again later.");
    };
    handler.onError = (err: any) => {
      console.log('Superwall error:', err);
      Alert.alert('Error', 'Something went wrong loading the premium packages.');
    };

    try {
      await Superwall.shared.register({
        placement: 'campaign_trigger',
        handler,
        feature: async () => {
  if (!presented) return;
  try {
    const info = await Purchases.getCustomerInfo();
    if (info.entitlements.active['Social Genius: Text Analyzer Pro']) {
      await AsyncStorage.setItem('is_pro_user', 'true');
      syncProToExtension(true);
      (SharedData as any).isProUser = true;
      setIsPro(true);
      supabase.functions.invoke('sync-subscription').catch(() => {});
      DeviceEventEmitter.emit('pro_status_changed');
    }
  } catch (err) {
    console.error('Coach pro update error:', err);
  }
},
      });
    } catch (e) {
      console.log('Superwall register error:', e);
    }
  };
  // 🔴 Send Logic
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const cachedPro = (await AsyncStorage.getItem('is_pro_user')) === 'true';
    if (!isPro && !cachedPro) {
      Keyboard.dismiss();
      showPaywall();
      return;
    }
    Keyboard.dismiss();

    const userText = message;
    setMessage('');

    const updatedHistory = [...chatHistory, { role: 'user', content: userText }];
    setChatHistory(updatedHistory);
    setIsTyping(true);

    try {
      const response = await fetch('https://chat-genious.onrender.com/api/coach-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ messages: updatedHistory }),
      });

      const data = await response.json();

      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        console.error("Coach API Error:", data.error);
      }
    } catch (error) {
      console.error("Network Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = async (suggestionText: string) => {
    setMessage(suggestionText);
  };

  // 🔴 New Chat — confirmation ke sath, taake galti se history na ud jaye
  const handleNewChat = () => {
    if (chatHistory.length === 0) return;

    Alert.alert(
      "Start New Chat?",
      "This will clear your current conversation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "New Chat",
          style: "destructive",
          onPress: async () => {
            setChatHistory([]);
            setMessage('');
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
            } catch (err) {
              console.error("Clear storage error:", err);
            }
          }
        }
      ]
    );
  };
  const [isPro, setIsPro] = useState<boolean>((SharedData as any).isProUser === true);

  const syncProStatus = useCallback(async () => {
  try {
    const local = await AsyncStorage.getItem('is_pro_user');
    if (local === 'true') setIsPro(true);

    const info = await Purchases.getCustomerInfo();
    const pro = !!info.entitlements.active['Social Genius: Text Analyzer Pro'];
    setIsPro(pro);
    (SharedData as any).isProUser = pro;
    if (pro) await AsyncStorage.setItem('is_pro_user', 'true');
    else await AsyncStorage.removeItem('is_pro_user');
  } catch (err) {
    console.log('Coach syncProStatus error:', err); // network error: kuch mat badlo
  }
}, []);

  useFocusEffect(
    useCallback(() => {
      syncProStatus();
      const onPro = DeviceEventEmitter.addListener('pro_status_changed', () => setIsPro(true));
      const onReset = DeviceEventEmitter.addListener('pro_status_reset', () => setIsPro(false));
      return () => { onPro.remove(); onReset.remove(); };
    }, [syncProStatus])
  );
  // 🟢 Jab tak history load ho rahi hai, chhota loading state dikhao
  if (isLoadingHistory) {

    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#D946EF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* 🔴 Top Header */}
      <View style={[styles.header, { paddingHorizontal: PAD_PADDING }]}>
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="user" size={22} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerHeaderRow}>
          <Text style={styles.headerTitle}>Coach</Text>
          <Feather name="chevron-down" size={18} color="#D946EF" style={{ marginLeft: 4, marginTop: 2 }} />
        </TouchableOpacity>

        {/* 🔴 NEW CHAT BUTTON */}
        {chatHistory.length > 0 ? (
          <TouchableOpacity style={[styles.iconButton, { alignItems: 'flex-end' }]} onPress={handleNewChat}>
            <Feather name="edit" size={22} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.mainContent}>
            {chatHistory.length === 0 ? (
              // 🟢 EMPTY STATE — same as before, koi change nahi
              <View style={styles.emptyStateContainer}>
                <Image
                  source={{ uri: 'https://cdn3d.iconscout.com/3d/premium/thumb/ghost-4782298-3982463.png' }}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
                <Text style={styles.titleText}>How can I help you</Text>
                <Text style={styles.highlightText}>today?</Text>

                <View style={[styles.suggestionsContainer, { paddingHorizontal: PAD_PADDING }]}>
                  <TouchableOpacity
                    style={styles.suggestionCard}
                    activeOpacity={0.7}
                    onPress={() => handleSuggestionClick("He's not replying and it's been hours, what should I do?")}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#D946EF" />
                    </View>
                    <Text style={styles.suggestionText}>He's not replying, what should I do?</Text>
                    <View style={styles.chevronCircle}>
                      <Feather name="chevron-right" size={16} color="#FFF" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.suggestionCard}
                    activeOpacity={0.7}
                    onPress={() => handleSuggestionClick("Am I overthinking this or is she actually losing interest?")}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="head-question-outline" size={20} color="#D946EF" />
                    </View>
                    <Text style={styles.suggestionText}>Am I overthinking this or is it real?</Text>
                    <View style={styles.chevronCircle}>
                      <Feather name="chevron-right" size={16} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.floatingTextContainer}>
                  <Text style={styles.floatingText}>Ask anything...</Text>
                  <Text style={styles.floatingText}>I've got you!</Text>
                  <Ionicons name="sparkles" size={16} color="#D946EF" style={styles.sparkleIcon} />
                </View>
              </View>
            ) : (
              // 🟢 CHAT STATE
              <FlatList
                data={chatHistory}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                ref={listRef}
                onContentSizeChange={() => scrollToBottom(false)}
                onLayout={() => scrollToBottom(false)}
                keyExtractor={(_, index) => index.toString()}
                style={{ flex: 1, width: '100%', paddingHorizontal: PAD_PADDING }}
                contentContainerStyle={{ paddingVertical: 10, paddingBottom: 20, flexGrow: 1 }}
                renderItem={({ item }) => (
                  <View style={[
                    styles.messageBubble,
                    item.role === 'user' ? styles.userBubble : styles.coachBubble
                  ]}>
                    <Text style={[
                      styles.messageText,
                      item.role === 'user' ? styles.userText : styles.coachText
                    ]}>{item.content}</Text>
                  </View>
                )}
                ListFooterComponent={
                  isTyping ? (
                    <View style={[styles.messageBubble, styles.coachBubble, styles.typingBubble]}>
                      <View style={styles.typingDotsRow}>
                        <View style={styles.typingDot} />
                        <View style={[styles.typingDot, styles.typingDotMid]} />
                        <View style={styles.typingDot} />
                      </View>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* 🔴 Bottom Input Area — ab isi KeyboardAvoidingView ke andar hai */}
        <View style={[styles.bottomContainer, { paddingHorizontal: PAD_PADDING }]}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.cameraBtn}>
              <Feather name="camera" size={20} color="#E5E7EB" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Message Coach..."
              placeholderTextColor="#6B7280"
              value={message}
              onChangeText={setMessage}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              blurOnSubmit
            />

            <TouchableOpacity
              style={[styles.sendBtn, { opacity: message.trim() ? 1 : 0.5 }]}
              onPress={handleSendMessage}
              disabled={!message.trim()}
            >
              <Ionicons name="send" size={14} color="#FFF" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

// 🎨 STYLES
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05020B' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
  },
  centerHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  iconButton: { width: 40, alignItems: 'flex-start' },

  mainContent: { flex: 1, width: '100%' },
  emptyStateContainer: { alignItems: 'center', width: '100%', paddingTop: 20 },

  mascotImage: { width: 140, height: 140, marginBottom: 20 },
  titleText: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  highlightText: {
    color: '#D946EF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5,
    marginBottom: 40, textShadowColor: 'rgba(217, 70, 239, 0.4)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },

  suggestionsContainer: { width: '100%', marginBottom: 20 },
  suggestionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.15)', borderRadius: 20,
    padding: 16, marginBottom: 12,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168, 85, 247, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  suggestionText: { flex: 1, color: '#E5E7EB', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  chevronCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },

  floatingTextContainer: {
    position: 'absolute', right: 40, bottom: 30, transform: [{ rotate: '-8deg' }], alignItems: 'center'
  },
  floatingText: { color: '#A855F7', fontSize: 16, fontStyle: 'italic', fontWeight: '600' },
  sparkleIcon: { position: 'absolute', left: -20, top: 10 },

  messageBubble: { maxWidth: '80%', padding: 14, borderRadius: 20, marginBottom: 12 },
  userBubble: { backgroundColor: '#D946EF', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  coachBubble: { backgroundColor: 'rgba(255, 255, 255, 0.1)', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#FFF' },
  coachText: { color: '#E5E7EB' },

  bottomContainer: { paddingBottom: 20, paddingTop: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 30,
    paddingHorizontal: 8, paddingVertical: 8,
  },
  cameraBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, color: '#FFF', fontSize: 15, paddingHorizontal: 10, height: 40 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#D946EF',
    alignItems: 'center', justifyContent: 'center',
  },
  typingBubble: { paddingVertical: 16, paddingHorizontal: 18 },
  typingDotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  typingDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: 'rgba(229,231,235,0.6)',
  },
  typingDotMid: { opacity: 0.85 },
});