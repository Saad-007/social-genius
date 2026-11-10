import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Dimensions,
    StatusBar,
    ActivityIndicator,
    Alert,
    useWindowDimensions, // 🔴 NAYA: live width tracking
    KeyboardAvoidingView, // 🔴 NAYA: keyboard khulne par layout sahi tarah adjust hoti hai
    Platform, // 🔴 NAYA: iOS/Android behavior alag set karne ke liye
} from 'react-native';
import Purchases from 'react-native-purchases';

import { useRouter, useFocusEffect } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as ImagePicker from 'expo-image-picker';
import { SharedData } from '../store';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────
// 🔴🔴🔴 iPAD DETECTION — sirf yahan decide hota hai
// ─────────────────────────────────────────────────
const TABLET_BREAKPOINT = 768;        // 11" iPad aur upar
const LARGE_TABLET_BREAKPOINT = 1000; // 13" iPad aur upar (zyada bara screen)

const GradientText = ({ text, colors, style, start, end }: any) => (
    <MaskedView maskElement={<Text style={style}>{text}</Text>}>
        <LinearGradient colors={colors} start={start ?? { x: 0, y: 0 }} end={end ?? { x: 1, y: 0 }}>
            <Text style={[style, { opacity: 0 }]}>{text}</Text>
        </LinearGradient>
    </MaskedView>
);

const TrustBadge = ({ icon, text }: any) => (
    <View style={styles.trustBadge}>
        {icon}
        <Text style={styles.trustBadgeText}>{text}</Text>
    </View>
);
const PerspectiveToggle = ({ value, onChange }: any) => (
    <View style={styles.perspectiveRow}>
        {[
            { key: 'user', label: 'Your Text', icon: 'edit-3' },
            { key: 'opponent', label: 'Their Text', icon: 'message-circle' },
        ].map((o) => {
            const active = value === o.key;
            return (
                <TouchableOpacity
                    key={o.key}
                    activeOpacity={0.8}
                    style={[styles.perspectiveBtn, active && styles.perspectiveBtnActive]}
                    onPress={() => onChange(o.key)}
                >
                    <Feather name={o.icon as any} size={14} color={active ? '#E082FF' : '#888'} />
                    <Text style={[styles.perspectiveText, active && styles.perspectiveTextActive]}>{o.label}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

const OptionPill = ({ label, icon, isSelected, onPress, size = 12, fill = false }: any) => (
    <TouchableOpacity
        style={[styles.optionPill, fill && styles.optionPillFill, isSelected && styles.optionPillActive]}
        onPress={onPress}
    >
        {React.cloneElement(icon, { color: isSelected ? '#E082FF' : '#888', size })}
        <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
);

export default function HomeScreen() {
    const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [selectedContext, setSelectedContext] = useState<string | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [customOtherText, setCustomOtherText] = useState('');
    const [perspective, setPerspective] = useState<'user' | 'opponent'>('user');
    const isTheirs = perspective === 'opponent';
    const step2Title = isTheirs ? 'Text they sent you' : 'Text you were about to send';
    const step2Subtitle = isTheirs
        ? "Paste their message and we'll decode what it really means."
        : "Paste or type the message you're overthinking.";
    const step2Placeholder = isTheirs
        ? 'Paste the message they sent you...'
        : 'Type or paste your message here...';
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const router = useRouter();

    // 🔴 NAYA: live dimensions — rotation bhi handle hogi
    const { width: winWidth } = useWindowDimensions();
    const isTablet = winWidth >= TABLET_BREAKPOINT;
    const isLargeTablet = winWidth >= LARGE_TABLET_BREAKPOINT; // 13" iPad waghera

    // Bare screen par content thora chaura rakhte hain taake khaali jagah na bachay
    const maxContentWidth = isLargeTablet ? 920 : 720;
    // Side padding: centered column on tablet, normal on phone
    const sidePadding = isTablet
        ? Math.max((winWidth - maxContentWidth) / 2, 40)
        : 20;

    // Icon sizes jo screen size ke hisab se scale hoti hain
    const helpIconSize = isLargeTablet ? 30 : isTablet ? 28 : 24;
    const sparkleIconSize = isLargeTablet ? 22 : isTablet ? 20 : 16;
    const uploadIconSize = isLargeTablet ? 38 : isTablet ? 30 : 24;
    const smileIconSize = isLargeTablet ? 24 : isTablet ? 22 : 20;
    const ctaSparkleSize = isLargeTablet ? 26 : isTablet ? 24 : 20;
    const ctaArrowSize = isLargeTablet ? 22 : isTablet ? 20 : 16;
    const pillIconSize = isLargeTablet ? 15 : isTablet ? 13 : 12;

    useFocusEffect(
        useCallback(() => {
            const checkAndClearState = async () => {
                const forceLogout = await AsyncStorage.getItem('force_logout_bypass');
                if ((SharedData as any).isLoggingOut || forceLogout === 'true') {
                    console.log("🤫 HomeScreen: Logout in progress. Staying quiet.");
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();
                const isFake = await AsyncStorage.getItem('fake_logged_in');

                if (!session && isFake !== 'true') {
                    router.replace('/');
                    return;
                }

                // 🔒 Hard paywall guard: Pro nahi hai toh andar nahi (demo/fake login ko chhod kar)
                if (isFake !== 'true') {
                    let pro = false;
                    try {
                        const info = await Purchases.getCustomerInfo();
                        pro = !!info.entitlements.active['Social Genius: Text Analyzer Pro'];
                    } catch {
                        // offline: purane paying user ko mat rokho
                        pro = (await AsyncStorage.getItem('is_pro_user')) === 'true';
                    }
                    if (!pro) {
                        router.replace('/');   // index ka gate paywall dikhayega
                        return;
                    }
                }
                const fromAnalysis = await AsyncStorage.getItem('came_from_analysis');
                if (fromAnalysis !== 'true') {
                    setMessage('');
                    setSelectedImageBase64(null);
                    setSelectedContext(null);
                    setSelectedTag(null);
                    setCustomOtherText('');
                    setPerspective('user');
                    SharedData.requestPayload = null;
                }
                await AsyncStorage.removeItem('came_from_analysis');
            };

            checkAndClearState();
        }, [])
    );

    const handlePickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets[0].base64) {
                setSelectedImageBase64(result.assets[0].base64);
                console.log("Screenshot temporarily saved.");
            }
        } catch (error) {
            Alert.alert("Error", "Could not pick image.");
        }
    };

    const handleAnalyze = async () => {
        if (!message || message.trim() === '') {
            Alert.alert(
                "Missing Text",
                isTheirs ? "Please paste the text they sent you!" : "Please enter the text you were about to send!"
            );
            return;
        }

        const finalTag = selectedTag === 'Other' ? `Other: ${customOtherText}` : selectedTag;

        SharedData.requestPayload = {
            imageBase64: selectedImageBase64,
            userMessage: message,
            context: selectedContext,
            tag: finalTag,
            perspective,
        };

        await AsyncStorage.setItem('came_from_analysis', 'true');
        router.push('/analysis' as any);
    };

    // ─────────────────────────────────────────────────
    // 🔴 TABLET HERO: mascot aur text side-by-side
    // ─────────────────────────────────────────────────
    const renderHero = () => {
        if (isTablet) {
            return (
                <View style={[styles.heroSectionTablet, isLargeTablet && styles.heroSectionTabletLarge]}>
                    {/* Left: text */}
                    <View style={styles.heroLeftTablet}>
                        <Text style={[styles.heroSubTextTablet, isLargeTablet && styles.heroSubTextTabletLarge]}>Before you send that...</Text>
                        <Text style={[styles.heroMainTextTablet, isLargeTablet && styles.heroMainTextTabletLarge]}>let's check your</Text>
                        <View style={styles.highlightWrapper}>
                            <GradientText
                                text="social risk."
                                colors={['#FF4DD8', '#9333EA']}
                                style={[styles.heroHighlightTextTablet, isLargeTablet && styles.heroHighlightTextTabletLarge]}
                            />
                            <Image source={require('../../assets/underline.png')} style={styles.riskUnderlineImageTablet} />
                        </View>
                        {/* Trust badges under text on tablet */}
                        <View style={[styles.trustBadgesRow, styles.trustBadgesRowTablet, isLargeTablet && styles.trustBadgesRowTabletLarge]}>
                            <TrustBadge icon={<Feather name="shield" size={isLargeTablet ? 18 : 15} color="#D8B4E2" />} text="No judgment" />
                            <TrustBadge icon={<Feather name="lock" size={isLargeTablet ? 18 : 15} color="#D8B4E2" />} text="100% private" />
                            <TrustBadge icon={<Ionicons name="flash-outline" size={isLargeTablet ? 18 : 15} color="#D8B4E2" />} text="Brutally honest" />
                        </View>
                    </View>
                    {/* Right: mascot + bubble */}
                    <View style={[styles.heroRightTablet, isLargeTablet && styles.heroRightTabletLarge]}>
                        <View style={[styles.mascotBubbleTablet, isLargeTablet && styles.mascotBubbleTabletLarge]}>
                            <Text style={[styles.bubbleTextTablet, isLargeTablet && styles.bubbleTextTabletLarge]}>Let's make sure{'\n'}you don't fumble.</Text>
                            <View style={styles.bubblePointerTablet} />
                        </View>
                        <Image source={require('../../assets/mascot.png')} style={[styles.mascotImageTablet, isLargeTablet && styles.mascotImageTabletLarge]} />
                    </View>
                </View>
            );
        }

        // ── ORIGINAL MOBILE HERO (unchanged) ──
        return (
            <>
                <View style={styles.heroSection}>
                    <View style={styles.heroLeft}>
                        <Text style={styles.heroSubText}>Before you send that...</Text>
                        <Text style={styles.heroMainText}>let's check your</Text>
                        <View style={styles.highlightWrapper}>
                            <GradientText text="social risk." colors={['#FF4DD8', '#9333EA']} style={styles.heroHighlightText} />
                            <Image source={require('../../assets/underline.png')} style={styles.riskUnderlineImage} />
                        </View>
                    </View>
                    <View style={styles.heroRight}>
                        <View style={styles.mascotBubble}>
                            <Text style={styles.bubbleText}>Let's make sure{'\n'}you don't fumble.</Text>
                            <View style={styles.bubblePointer} />
                        </View>
                        <Image source={require('../../assets/mascot.png')} style={styles.mascotImage} />
                    </View>
                </View>
                {/* Mobile trust badges (original position) */}
                <View style={styles.trustBadgesRow}>
                    <TrustBadge icon={<Feather name="shield" size={14} color="#D8B4E2" />} text="No judgment" />
                    <TrustBadge icon={<Feather name="lock" size={14} color="#D8B4E2" />} text="100% private" />
                    <TrustBadge icon={<Ionicons name="flash-outline" size={14} color="#D8B4E2" />} text="Brutally honest" />
                </View>
            </>
        );
    };

    // ─────────────────────────────────────────────────
    // 🔴 TABLET UPLOAD BOX: taller so empty space fills
    // ─────────────────────────────────────────────────
    const uploadBoxStyle = isTablet
        ? [styles.uploadBox, styles.uploadBoxTablet, isLargeTablet && styles.uploadBoxTabletLarge, selectedImageBase64 && { borderColor: '#10B981', borderStyle: 'solid' as const }]
        : [styles.uploadBox, selectedImageBase64 && { borderColor: '#10B981', borderStyle: 'solid' as const }];

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            {/* 🔴 NAYA: KeyboardAvoidingView — jab TextInput par keyboard khulta hai to
          content jump/overlap nahi karta, jis se neeche wale pills par galti se
          click register hone ka masla khatam ho jaata hai */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContainer,
                        isTablet && styles.scrollContainerTablet,
                        isLargeTablet && styles.scrollContainerTabletLarge,
                        { paddingHorizontal: sidePadding },
                    ]}
                    showsVerticalScrollIndicator={false}
                    // 🔴 NAYA: is ke bina keyboard khule hue kisi doosre element (jese pills) par
                    // pehla tap sirf keyboard band karta hai — press register nahi hoti,
                    // jo bilkul wahi symptom hai jo report hua ("type kr rha hun tu neeche click ho rahi hai")
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >

                    {/* ── Header ── */}
                    <View style={[styles.header, isTablet && styles.headerTablet, isLargeTablet && styles.headerTabletLarge]}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoTopRow}>
                                <GradientText
                                    text="SOCIAL"
                                    colors={['#FF4DD8', '#9333EA']}
                                    style={[styles.logoTextGeneric, isTablet && styles.logoTextTablet, isLargeTablet && styles.logoTextTabletLarge]}
                                />
                                <Ionicons name="sparkles" size={sparkleIconSize} color="#FFFFFF" style={styles.logoStar} />
                            </View>
                            <GradientText
                                text="GENIUS"
                                colors={['#FF4DD8', '#9333EA']}
                                style={[styles.logoTextGeneric, isTablet && styles.logoTextTablet, isLargeTablet && styles.logoTextTabletLarge]}
                            />
                        </View>
                        <TouchableOpacity style={styles.helpIcon}>
                            <Ionicons name="help-circle-outline" size={helpIconSize} color="#A0A0A0" />
                        </TouchableOpacity>
                    </View>

                    {/* ── Hero + Trust Badges ── */}
                    {renderHero()}

                    {/* ─────────────────────────────────────────────
            TABLET: 2-column layout for Steps 1 & 2
            MOBILE: original single-column
        ───────────────────────────────────────────── */}
                    {isTablet ? (
                        // ── TABLET STEPS 1 + 2 side by side ──
                        <>
                            <PerspectiveToggle value={perspective} onChange={setPerspective} />
                            <View style={[styles.tabletStepsRow, isLargeTablet && styles.tabletStepsRowLarge]}>

                                {/* Step 1: Upload */}
                                <View style={[styles.stepContainer, styles.tabletStepHalf, isLargeTablet && styles.tabletStepHalfLarge]}>
                                    <View style={styles.stepHeader}>
                                        <View style={[styles.stepNumberBadge, isLargeTablet && styles.stepNumberBadgeLarge]}><Text style={[styles.stepNumber, isLargeTablet && styles.stepNumberLarge]}>1</Text></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.stepTitle, styles.stepTitleTablet, isLargeTablet && styles.stepTitleTabletLarge]}>
                                                Upload screenshot <Text style={{ color: '#888', fontSize: isLargeTablet ? 15 : 13, fontWeight: 'normal' }}>(Optional)</Text>
                                            </Text>
                                            <Text style={[styles.stepSubtitle, isLargeTablet && styles.stepSubtitleTabletLarge]}>Add the conversation for full context.</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity activeOpacity={0.8} onPress={handlePickImage} style={{ flex: 1 }}>
                                        <LinearGradient
                                            colors={selectedImageBase64
                                                ? ['rgba(16, 185, 129, 0.2)', 'rgba(61, 29, 89, 0.2)']
                                                : ['rgba(20, 10, 40, 0.4)', 'rgba(61, 29, 89, 0.2)']}
                                            style={uploadBoxStyle}
                                        >
                                            <View style={[styles.uploadContent, styles.uploadContentTablet]}>
                                                {selectedImageBase64 ? (
                                                    <>
                                                        <Feather name="check-circle" size={uploadIconSize} color="#10B981" style={styles.uploadIcon} />
                                                        <Text style={[styles.uploadText, isLargeTablet && styles.uploadTextLarge, { color: '#10B981' }]}>Screenshot Selected ✓</Text>
                                                        <Text style={[styles.uploadSubText, isLargeTablet && styles.uploadSubTextLarge]}>Tap to change image</Text>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Feather name="upload-cloud" size={uploadIconSize} color="#D8B4E2" style={styles.uploadIcon} />
                                                        <Text style={[styles.uploadText, isLargeTablet && styles.uploadTextLarge]}>Tap to upload screenshot</Text>
                                                        <Text style={[styles.uploadSubText, isLargeTablet && styles.uploadSubTextLarge]}>PNG, JPG • Max 10MB</Text>
                                                    </>
                                                )}
                                            </View>
                                            <View style={styles.decorativePhones}>
                                                <Image
                                                    source={require('../../assets/phones.png')}
                                                    style={[styles.phonesImage, selectedImageBase64 && { opacity: 0.3 }]}
                                                />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>

                                {/* Step 2: Message Input */}
                                <View style={[styles.stepContainer, styles.tabletStepHalf, isLargeTablet && styles.tabletStepHalfLarge]}>
                                    <View style={styles.stepHeader}>
                                        <View style={[styles.stepNumberBadge, isLargeTablet && styles.stepNumberBadgeLarge]}><Text style={[styles.stepNumber, isLargeTablet && styles.stepNumberLarge]}>2</Text></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.stepTitle, styles.stepTitleTablet, isLargeTablet && styles.stepTitleTabletLarge]}>{step2Title}</Text>
                                            <Text style={[styles.stepSubtitle, isLargeTablet && styles.stepSubtitleTabletLarge]}>{step2Subtitle}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.inputWrapper, styles.inputWrapperTablet, isLargeTablet && styles.inputWrapperTabletLarge]}>
                                        <View style={styles.inputTopRow}>
                                            <TextInput
                                                style={[styles.textInput, styles.textInputTablet, isLargeTablet && styles.textInputTabletLarge]}
                                                placeholder={step2Placeholder}
                                                placeholderTextColor="#666"
                                                multiline maxLength={500} value={message} onChangeText={setMessage}
                                            />
                                            <Feather name="smile" size={smileIconSize} color="#666" style={styles.smileIcon} />
                                        </View>
                                        <Text style={styles.charCount}>{message.length}/500</Text>
                                    </View>
                                </View>

                            </View>
                        </>
                    ) : (
                        // ── MOBILE Steps 1 & 2 (original, unchanged) ──
                        <>
                            {/* Step 1: Upload */}
                            <View style={styles.stepContainer}>
                                <View style={styles.stepHeader}>
                                    <View style={styles.stepNumberBadge}><Text style={styles.stepNumber}>1</Text></View>
                                    <View>
                                        <Text style={styles.stepTitle}>
                                            Upload screenshot <Text style={{ color: '#888', fontSize: 12, fontWeight: 'normal' }}>(Optional)</Text>
                                        </Text>
                                        <Text style={styles.stepSubtitle}>Add the conversation for full context.</Text>
                                    </View>
                                </View>

                                <TouchableOpacity activeOpacity={0.8} onPress={handlePickImage}>
                                    <LinearGradient
                                        colors={selectedImageBase64
                                            ? ['rgba(16, 185, 129, 0.2)', 'rgba(61, 29, 89, 0.2)']
                                            : ['rgba(20, 10, 40, 0.4)', 'rgba(61, 29, 89, 0.2)']}
                                        style={[styles.uploadBox, selectedImageBase64 && { borderColor: '#10B981', borderStyle: 'solid' }]}
                                    >
                                        <View style={styles.uploadContent}>
                                            {selectedImageBase64 ? (
                                                <>
                                                    <Feather name="check-circle" size={24} color="#10B981" style={styles.uploadIcon} />
                                                    <Text style={[styles.uploadText, { color: '#10B981' }]}>Screenshot Selected ✓</Text>
                                                    <Text style={styles.uploadSubText}>Tap to change image</Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Feather name="upload-cloud" size={24} color="#D8B4E2" style={styles.uploadIcon} />
                                                    <Text style={styles.uploadText}>Tap to upload screenshot</Text>
                                                    <Text style={styles.uploadSubText}>PNG, JPG • Max 10MB</Text>
                                                </>
                                            )}
                                        </View>
                                        <View style={styles.decorativePhones}>
                                            <Image
                                                source={require('../../assets/phones.png')}
                                                style={[styles.phonesImage, selectedImageBase64 && { opacity: 0.3 }]}
                                            />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            {/* Step 2: Message Input */}
                            <View style={styles.stepContainer}>
                                <PerspectiveToggle value={perspective} onChange={setPerspective} />   {/* 👈 NEW */}
                                <View style={styles.stepHeader}>
                                    <View style={styles.stepNumberBadge}><Text style={styles.stepNumber}>2</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stepTitle}>{step2Title}</Text>
                                        <Text style={styles.stepSubtitle}>{step2Subtitle}</Text>
                                    </View>
                                </View>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.inputTopRow}>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder={step2Placeholder}
                                            placeholderTextColor="#666"
                                            multiline maxLength={500} value={message} onChangeText={setMessage}
                                        />
                                        <Feather name="smile" size={20} color="#666" style={styles.smileIcon} />
                                    </View>
                                    <Text style={styles.charCount}>{message.length}/500</Text>
                                </View>
                            </View>
                        </>
                    )}

                    {/* ── Step 3: Context (same for both, pills wrap naturally) ── */}
                    <View style={[styles.stepContainer, isTablet && styles.stepContainerTablet, isLargeTablet && styles.stepContainerTabletLarge]}>
                        <View style={styles.stepHeader}>
                            <View style={[styles.stepNumberBadge, isLargeTablet && styles.stepNumberBadgeLarge]}><Text style={[styles.stepNumber, isLargeTablet && styles.stepNumberLarge]}>3</Text></View>
                            <View>
                                <Text style={[styles.stepTitle, isTablet && styles.stepTitleTablet, isLargeTablet && styles.stepTitleTabletLarge]}>What's really happening?</Text>
                                <Text style={[styles.stepSubtitle, isLargeTablet && styles.stepSubtitleTabletLarge]}>Optional, but helps us give sharper insights.</Text>
                            </View>
                        </View>

                        {/* Row 1 */}
                        <View style={[styles.optionsGrid, isTablet && styles.optionsGridTablet, isLargeTablet && styles.optionsGridTabletLarge]}>
                            <OptionPill label="Talking Stage" icon={<Feather name="heart" />} size={pillIconSize} fill={isTablet} isSelected={selectedContext === 'Talking Stage'} onPress={() => setSelectedContext('Talking Stage')} />
                            <OptionPill label="Relationship" icon={<Feather name="users" />} size={pillIconSize} fill={isTablet} isSelected={selectedContext === 'Relationship'} onPress={() => setSelectedContext('Relationship')} />
                            <OptionPill label="Ex" icon={<Feather name="user-minus" />} size={pillIconSize} fill={isTablet} isSelected={selectedContext === 'Ex'} onPress={() => setSelectedContext('Ex')} />
                            <OptionPill label="Friend" icon={<Feather name="user" />} size={pillIconSize} fill={isTablet} isSelected={selectedContext === 'Friend'} onPress={() => setSelectedContext('Friend')} />
                        </View>

                        {isTablet ? (
                            // 🔴 TABLET: "Other" Row 2 ke saath hi merge — 4+4 symmetric, koi khaali jagah nahi bachti
                            <View style={[styles.optionsGrid, styles.optionsGridTablet, isLargeTablet && styles.optionsGridTabletLarge]}>
                                <OptionPill label="Argument" icon={<MaterialCommunityIcons name="emoticon-angry-outline" />} size={pillIconSize} fill isSelected={selectedTag === 'Argument'} onPress={() => setSelectedTag('Argument')} />
                                <OptionPill label="Double Text" icon={<MaterialCommunityIcons name="message-processing-outline" />} size={pillIconSize} fill isSelected={selectedTag === 'Double Text'} onPress={() => setSelectedTag('Double Text')} />
                                <OptionPill label="Risky Message" icon={<MaterialCommunityIcons name="alert-outline" />} size={pillIconSize} fill isSelected={selectedTag === 'Risky Message'} onPress={() => setSelectedTag('Risky Message')} />
                                <OptionPill label="Other" icon={<MaterialCommunityIcons name="dots-horizontal" />} size={pillIconSize} fill isSelected={selectedTag === 'Other'} onPress={() => setSelectedTag('Other')} />
                            </View>
                        ) : (
                            // ── MOBILE: original rows (unchanged) ──
                            <>
                                {/* Row 2 */}
                                <View style={styles.optionsGrid}>
                                    <OptionPill label="Argument" icon={<MaterialCommunityIcons name="emoticon-angry-outline" />} isSelected={selectedTag === 'Argument'} onPress={() => setSelectedTag('Argument')} />
                                    <OptionPill label="Double Text" icon={<MaterialCommunityIcons name="message-processing-outline" />} isSelected={selectedTag === 'Double Text'} onPress={() => setSelectedTag('Double Text')} />
                                    <OptionPill label="Risky Message" icon={<MaterialCommunityIcons name="alert-outline" />} isSelected={selectedTag === 'Risky Message'} onPress={() => setSelectedTag('Risky Message')} />
                                </View>

                                {/* Row 3 */}
                                <View style={styles.optionsGrid}>
                                    <OptionPill label="Other" icon={<MaterialCommunityIcons name="dots-horizontal" />} isSelected={selectedTag === 'Other'} onPress={() => setSelectedTag('Other')} />
                                </View>
                            </>
                        )}

                        {selectedTag === 'Other' && (
                            <View style={styles.customOtherWrapper}>
                                <TextInput
                                    style={styles.customOtherInput}
                                    placeholder="Tell us what's happening..."
                                    placeholderTextColor="#666"
                                    value={customOtherText}
                                    onChangeText={setCustomOtherText}
                                    maxLength={100}
                                />
                            </View>
                        )}
                    </View>

                    {/* ── CTA Button ── */}
                    <TouchableOpacity
                        style={[styles.actionButton, isTablet && styles.actionButtonTablet, isLargeTablet && styles.actionButtonTabletLarge]}
                        activeOpacity={0.9}
                        onPress={handleAnalyze}
                        disabled={isAnalyzing}
                    >
                        <LinearGradient
                            colors={['#FF3366', '#9333EA', '#3b82f6']}
                            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                            style={[styles.actionButtonGrad, isTablet && styles.actionButtonGradTablet, isLargeTablet && styles.actionButtonGradTabletLarge]}
                        >
                            <View style={styles.actionButtonContent}>
                                {isAnalyzing
                                    ? <ActivityIndicator color="#FFF" size="small" />
                                    : <Ionicons name="sparkles-outline" size={ctaSparkleSize} color="#FFF" />}
                                <View>
                                    <Text style={[styles.actionBtnTitle, isTablet && styles.actionBtnTitleTablet, isLargeTablet && styles.actionBtnTitleTabletLarge]}>
                                        {isAnalyzing ? "Analyzing Request..." : (isTheirs ? "Decode Their Text" : "Analyze My Message")}
                                    </Text>
                                    <Text style={[styles.actionBtnSub, isLargeTablet && styles.actionBtnSubTabletLarge]}>
                                        {isAnalyzing ? "Please wait..." : (isTheirs ? "What do they really mean?" : "Tell me the truth.")}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.actionBtnArrow, isLargeTablet && styles.actionBtnArrowTabletLarge]}>
                                <Feather name="arrow-right" size={ctaArrowSize} color="#FFF" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0A0514' },
    scrollContainer: { paddingTop: 20, paddingBottom: 40, flexGrow: 1 },
    scrollContainerTablet: { paddingTop: 36, paddingBottom: 64 },
    scrollContainerTabletLarge: { paddingTop: 52, paddingBottom: 96 },

    // ── Header ──
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, marginTop: 10 },
    headerTablet: { marginBottom: 24, marginTop: 16 },
    headerTabletLarge: { marginBottom: 36, marginTop: 20 },
    logoContainer: { flexDirection: 'column' },
    logoTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
    logoTextGeneric: { fontSize: 24, fontWeight: '900', letterSpacing: 1, lineHeight: 28 },
    logoTextTablet: { fontSize: 30, lineHeight: 34 },
    logoTextTabletLarge: { fontSize: 38, lineHeight: 42 },
    logoStar: { color: '#E082FF', fontSize: 12, marginLeft: 2, marginTop: 2 },
    helpIcon: { padding: 8 },

    // ── Hero Mobile (unchanged) ──
    heroSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative', height: 180 },
    heroLeft: { width: '55%', justifyContent: 'center', zIndex: 3 },
    heroRight: { width: '45%', position: 'absolute', right: -10, top: -30, height: 200, zIndex: 2 },
    heroSubText: { color: '#A0A0A0', fontSize: 13, fontWeight: '500', marginBottom: 4 },
    heroMainText: { color: '#FFF', fontSize: 22, fontWeight: '900', lineHeight: 28 },
    highlightWrapper: { alignSelf: 'flex-start', position: 'relative' },
    heroHighlightText: { fontSize: 22, fontWeight: '900', lineHeight: 28 },
    riskUnderlineImage: { position: 'absolute', bottom: -5, right: 0, width: 55, height: 12, resizeMode: 'contain' },
    mascotBubble: { position: 'absolute', right: 110, top: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 8, zIndex: 3 },
    bubbleText: { color: '#FFF', fontSize: 10, fontWeight: '500' },
    bubblePointer: { position: 'absolute', bottom: -5, left: 20, width: 8, height: 8, backgroundColor: '#0A0514', borderBottomWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)', transform: [{ rotate: '45deg' }] },
    mascotImage: { position: 'absolute', right: 0, bottom: 0, width: 200, height: 200, resizeMode: 'contain', zIndex: 1 },

    // ── Hero Tablet (NEW) ──
    heroSectionTablet: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
        minHeight: 260,
    },
    heroSectionTabletLarge: { marginBottom: 56, minHeight: 340 },
    heroLeftTablet: { flex: 1, justifyContent: 'center', paddingRight: 24 },
    heroRightTablet: { width: 280, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    heroRightTabletLarge: { width: 360 },
    heroSubTextTablet: { color: '#A0A0A0', fontSize: 16, fontWeight: '500', marginBottom: 6 },
    heroSubTextTabletLarge: { fontSize: 19, marginBottom: 8 },
    heroMainTextTablet: { color: '#FFF', fontSize: 32, fontWeight: '900', lineHeight: 38 },
    heroMainTextTabletLarge: { fontSize: 40, lineHeight: 48 },
    heroHighlightTextTablet: { fontSize: 32, fontWeight: '900', lineHeight: 38 },
    heroHighlightTextTabletLarge: { fontSize: 40, lineHeight: 48 },
    riskUnderlineImageTablet: { position: 'absolute', bottom: -7, right: 0, width: 75, height: 14, resizeMode: 'contain' },
    mascotBubbleTablet: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 14, padding: 14,
        position: 'absolute', top: 0, left: 0, zIndex: 3,
    },
    mascotBubbleTabletLarge: { padding: 18, borderRadius: 16 },
    bubbleTextTablet: { color: '#FFF', fontSize: 13, fontWeight: '500' },
    bubbleTextTabletLarge: { fontSize: 15 },
    bubblePointerTablet: {
        position: 'absolute', bottom: -6, left: 24,
        width: 10, height: 10, backgroundColor: '#0A0514',
        borderBottomWidth: 1, borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        transform: [{ rotate: '45deg' }],
    },
    mascotImageTablet: { width: 260, height: 260, resizeMode: 'contain', marginTop: 46 },
    mascotImageTabletLarge: { width: 340, height: 340, marginTop: 56 },

    // ── Trust Badges ──
    trustBadgesRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 16, marginBottom: 32 },
    trustBadgesRowTablet: { marginTop: 20, marginBottom: 0, gap: 22 },
    trustBadgesRowTabletLarge: { marginTop: 26, gap: 28 },
    trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    trustBadgeText: { color: '#f5f3f5', fontSize: 12, fontWeight: '500' },

    // ── Steps ──
    stepContainer: { marginBottom: 32 },
    stepContainerTablet: { marginBottom: 40 },
    stepContainerTabletLarge: { marginBottom: 56 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    stepNumberBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3d1d59', justifyContent: 'center', alignItems: 'center' },
    stepNumberBadgeLarge: { width: 36, height: 36, borderRadius: 18 },
    stepNumber: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    stepNumberLarge: { fontSize: 17 },
    stepTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    stepTitleTablet: { fontSize: 18 },
    stepTitleTabletLarge: { fontSize: 22 },
    stepSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },
    stepSubtitleTabletLarge: { fontSize: 15, marginTop: 4 },

    // 🔴 TABLET: Steps 1 & 2 side-by-side row
    tabletStepsRow: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 0,
        alignItems: 'stretch',
    },
    tabletStepsRowLarge: { gap: 36 },
    tabletStepHalf: {
        flex: 1,
        marginBottom: 40,
    },
    tabletStepHalfLarge: { marginBottom: 56 },

    // ── Upload Box ──
    uploadBox: {
        width: '100%', height: 140,
        borderWidth: 1, borderColor: '#4d2b7a', borderStyle: 'dashed',
        borderRadius: 20, justifyContent: 'center', paddingLeft: 10, overflow: 'hidden',
    },
    uploadBoxTablet: {
        // 🔴 FIX: 'height: 100%' aur 'flex: 1' saath istemal karna Yoga layout engine
        // ke liye ambiguous hota hai — is se touch-area aur visible-area mismatch
        // ho sakta hai (jese neeche wale pills par galti se tap register hona).
        // Sirf flex:1 + minHeight kaafi hai, koi confusion nahi rehta.
        minHeight: 240,
        flex: 1,
    },
    uploadBoxTabletLarge: { minHeight: 340, borderRadius: 26 },
    uploadContent: { width: '55%', alignItems: 'center' },
    uploadContentTablet: { width: '60%' },
    uploadIcon: { marginBottom: 6 },
    uploadText: { color: '#D8B4E2', fontSize: 12, fontWeight: '600', marginBottom: 2, textAlign: 'center' },
    uploadTextLarge: { fontSize: 16, marginBottom: 4 },
    uploadSubText: { color: '#666', fontSize: 9, textAlign: 'center' },
    uploadSubTextLarge: { fontSize: 12 },
    decorativePhones: { position: 'absolute', right: -10, top: 0, bottom: 0, width: '50%', justifyContent: 'center', alignItems: 'center' },
    phonesImage: { width: '100%', height: '100%', right: 10, resizeMode: 'contain' },

    // ── Input ──
    inputWrapper: {
        backgroundColor: 'rgba(20, 10, 40, 0.4)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16, padding: 16, paddingBottom: 12,
        marginBottom: 12, height: 120, justifyContent: 'space-between',
    },
    inputWrapperTablet: {
        flex: 1,
        height: undefined,
        minHeight: 240,
    },
    inputWrapperTabletLarge: { minHeight: 340, borderRadius: 20, padding: 22 },
    inputTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1 },
    textInput: { color: '#FFF', fontSize: 14, flex: 1, textAlignVertical: 'top' },
    textInputTablet: { fontSize: 15 },
    textInputTabletLarge: { fontSize: 17 },
    smileIcon: { marginLeft: 10, marginTop: 2 },
    charCount: { color: '#666', fontSize: 11, textAlign: 'right' },


    perspectiveRow: {
        flexDirection: 'row', gap: 4, padding: 4, marginBottom: 16,
        backgroundColor: 'rgba(20, 10, 40, 0.4)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    },
    perspectiveBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 10,
        borderWidth: 1, borderColor: 'transparent',
    },
    perspectiveBtnActive: { backgroundColor: 'rgba(224, 130, 255, 0.12)', borderColor: '#E082FF' },
    perspectiveText: { color: '#888', fontSize: 13, fontWeight: '600' },
    perspectiveTextActive: { color: '#E082FF' },
    // ── Option Pills ──
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 10,
        width: '100%',
        marginBottom: 10,
    },
    optionsGridTablet: { gap: 14, marginBottom: 14, flexWrap: 'nowrap' },
    optionsGridTabletLarge: { gap: 18, marginBottom: 18 },
    optionPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(20, 10, 40, 0.4)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    },
    // 🔴 NAYA: tablet par pill apni row ki khaali jagah barabar share karke fill karti hai
    optionPillFill: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    optionPillActive: { backgroundColor: 'rgba(224, 130, 255, 0.05)', borderColor: '#E082FF' },
    optionText: { color: '#A0A0A0', fontSize: 11.5, fontWeight: '500' },
    optionTextActive: { color: '#E082FF' },
    customOtherWrapper: { marginTop: 4, backgroundColor: 'rgba(20, 10, 40, 0.4)', borderWidth: 1, borderColor: '#E082FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    customOtherInput: { color: '#FFF', fontSize: 13 },

    // ── CTA ──
    actionButton: { borderRadius: 14, marginTop: 10, overflow: 'hidden' },
    actionButtonTablet: { borderRadius: 18, marginTop: 24 },
    actionButtonTabletLarge: { borderRadius: 22, marginTop: 36 },
    actionButtonGrad: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    actionButtonGradTablet: { paddingHorizontal: 24, paddingVertical: 20 },
    actionButtonGradTabletLarge: { paddingHorizontal: 32, paddingVertical: 28 },
    actionButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionBtnTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    actionBtnTitleTablet: { fontSize: 18 },
    actionBtnTitleTabletLarge: { fontSize: 22 },
    actionBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
    actionBtnSubTabletLarge: { fontSize: 14, marginTop: 2 },
    actionBtnArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    actionBtnArrowTabletLarge: { width: 46, height: 46, borderRadius: 23 },
});