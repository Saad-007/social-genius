import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Easing,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from './lib/supabase';

const MAX_CHARS = 1000;
const MIN_CHARS = 3;

export default function FeedbackScreen() {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSubmittingRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleFocus = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const trimmedLength = feedback.trim().length;
  const remainingChars = MAX_CHARS - feedback.length;
  const isOverLimit = feedback.length > MAX_CHARS;
  const isNearLimit = remainingChars <= 80 && remainingChars >= 0;

  const borderColorInterpolation = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(217,70,239,0.18)', 'rgba(217,70,239,0.55)'],
  });

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    const trimmed = feedback.trim();

    if (trimmed.length < MIN_CHARS) {
      Alert.alert('Hold on', 'Please write a little more before submitting.');
      return;
    }

    if (trimmed.length > MAX_CHARS) {
      Alert.alert(
        'Too long',
        `Please keep your feedback under ${MAX_CHARS} characters.`
      );
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.log('Auth lookup warning:', authError.message);
      }

      const { error: insertError } = await supabase
        .from('feedbacks')
        .insert([
          {
            user_id: user ? user.id : null,
            message: trimmed,
            platform: Platform.OS,
          },
        ]);

      if (insertError) throw insertError;

      Alert.alert('Thank you! 🙏', 'Your feedback helps us make this app better.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Feedback submission error:', error);

      const isNetworkError =
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('fetch');

      Alert.alert(
        isNetworkError ? 'No Connection' : 'Something Went Wrong',
        isNetworkError
          ? 'Please check your internet connection and try again.'
          : 'We could not send your feedback. Please try again in a moment.'
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0} // ✅ FIX 1: Offset added
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color="#E5E7EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ✅ FIX 2 & 3: ScrollView with Keyboard Dismiss handler */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.container,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.iconBadge}>
                <LinearGradient
                  colors={['rgba(217,70,239,0.22)', 'rgba(168,85,247,0.06)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconBadgeGradient}
                >
                  <MaterialCommunityIcons name="message-draw" size={22} color="#E879F9" />
                </LinearGradient>
              </View>

              <Text style={styles.title}>How can we improve?</Text>
              <Text style={styles.subtitle}>
                We read every single piece of feedback. Tell us what you love, or
                what needs fixing.
              </Text>

              <Animated.View
                style={[
                  styles.inputContainer,
                  { borderColor: borderColorInterpolation },
                  isOverLimit && styles.inputContainerError,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Tell us what's on your mind..."
                  placeholderTextColor="#5B5466"
                  multiline
                  textAlignVertical="top"
                  value={feedback}
                  onChangeText={setFeedback}
                  autoFocus
                  maxLength={MAX_CHARS + 50}
                  accessibilityLabel="Feedback text input"
                  accessibilityHint="Write your feedback for the app"
                  editable={!isSubmitting}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </Animated.View>

              <View style={styles.metaRow}>
                <View style={styles.metaHint}>
                  {trimmedLength < MIN_CHARS && trimmedLength > 0 && (
                    <Text style={styles.metaHintText}>A few more words helps us understand</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.charCount,
                    isNearLimit && styles.charCountWarning,
                    isOverLimit && styles.charCountError,
                  ]}
                >
                  {remainingChars < 0
                    ? `${Math.abs(remainingChars)} over limit`
                    : `${remainingChars} left`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || trimmedLength < MIN_CHARS || isOverLimit}
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
                accessibilityState={{
                  disabled: isSubmitting || trimmedLength < MIN_CHARS || isOverLimit,
                }}
                activeOpacity={0.85}
                style={styles.submitBtnWrapper}
              >
                <LinearGradient
                  colors={
                    isSubmitting || trimmedLength < MIN_CHARS || isOverLimit
                      ? ['rgba(217,70,239,0.25)', 'rgba(168,85,247,0.18)']
                      : ['#D946EF', '#A855F7']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Send Feedback</Text>
                      <Feather name="send" size={15} color="#FFF" style={styles.submitBtnIcon} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }, // paddingBottom added for extra space

  iconBadge: { marginBottom: 18 },
  iconBadgeGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,70,239,0.25)',
  },

  title: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
    maxWidth: '94%',
  },

  inputContainer: {
    backgroundColor: '#0D0716',
    borderRadius: 18,
    borderWidth: 1.5,
    height: 196,
    padding: 18,
    shadowColor: '#D946EF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: 'rgba(244,63,94,0.6)',
  },
  input: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 15.5,
    lineHeight: 23,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 28,
    minHeight: 16,
  },
  metaHint: { flex: 1 },
  metaHintText: { color: '#6B7280', fontSize: 11.5 },
  charCount: {
    color: '#6B7280',
    fontSize: 11.5,
    fontWeight: '600',
  },
  charCountWarning: {
    color: '#FBBF24',
  },
  charCountError: {
    color: '#F43F5E',
  },

  submitBtnWrapper: {
    borderRadius: 16,
    shadowColor: '#D946EF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFF', fontSize: 15.5, fontWeight: '700', letterSpacing: 0.2 },
  submitBtnIcon: { marginLeft: 8 },
});