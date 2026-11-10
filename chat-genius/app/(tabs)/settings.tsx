import React, { useState, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, Modal, TextInput, Dimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SharedData } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import Superwall, { PaywallPresentationHandler } from '@superwall/react-native-superwall';
import * as StoreReview from 'expo-store-review';
import { syncProToExtension } from '../lib/proSync';
import Purchases from 'react-native-purchases';
const { width } = Dimensions.get('window');

// 🟢 IPAD RESPONSIVE LOGIC:
const isPad = width >= 768;
// Ab iPad par content 700px tak phailay ga taake sides par empty black space na bache
const PAD_PADDING = isPad ? Math.max((width - 700) / 2, 40) : 20;

export default function SettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Pro User Tracker
  const [isProPlan, setIsProPlan] = useState(false);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  // Delete Account States
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  // ✅ Central pro-status resolver
  const syncProStatus = useCallback(async (_userId?: string) => {
  try {
    const info = await Purchases.getCustomerInfo();
    const isPro = !!info.entitlements.active['Social Genius: Text Analyzer Pro'];
    setIsProPlan(isPro);
    (SharedData as any).isProUser = isPro;
    syncProToExtension(isPro);
    if (isPro) await AsyncStorage.setItem('is_pro_user', 'true');
    else await AsyncStorage.removeItem('is_pro_user');
  } catch (err) {
    console.log('syncProStatus error:', err);   // network error: kuch mat badlo
  }
}, []);
  // ✅ Runs every time this screen comes into focus — always fresh data
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchUser = async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();

          if (authUser && isActive) {
            setUserEmail(authUser.email || '');

            const name = SharedData.userProfile.name
              || authUser.user_metadata?.full_name
              || authUser.user_metadata?.name
              || '';
            setUserName(name);

            await syncProStatus(authUser.id);
          }
        } catch (error) {
          console.log("Error:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchUser();

      // ✅ Global listener — updates instantly on purchase
      const proListener = DeviceEventEmitter.addListener('pro_status_changed', () => {
        console.log("📡 pro_status_changed received in Settings");
        if (isActive) {
          setIsProPlan(true);
          (SharedData as any).isProUser = true;
          syncProToExtension(true);  // 👈 NEW
        }
      });

      return () => {
        isActive = false;
        proListener.remove();
      };
    }, [syncProStatus])
  );

  const handleEditNameClick = () => {
    setNewNameInput(userName);
    setIsEditModalVisible(true);
  };

  const handleSaveName = async () => {
    if (!newNameInput.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: newNameInput.trim(), full_name: newNameInput.trim() }
      });

      if (error) throw error;

      setUserName(newNameInput.trim());
      SharedData.userProfile.name = newNameInput.trim();
      setIsEditModalVisible(false);

    } catch (error: any) {
      console.log("Update Name Error:", error);
      Alert.alert("Update Failed", "Could not save your new name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleUpgradePro = async () => {
    console.log("🚀 Triggering Superwall from Settings...");

    const handler = new PaywallPresentationHandler();
    let paywallWasPresented = false;

    handler.onPresent = () => {
      console.log("🟢 Paywall shown!");
      paywallWasPresented = true;
    };

    handler.onDismiss = () => {
      console.log("Paywall dismissed by user");
    };

    handler.onSkip = (reason) => {
      console.log("⚠️ Superwall Skipped:", reason);
      Alert.alert("Notice", "Paywall couldn't be loaded right now. Please try again later.");
    };

    handler.onError = (err) => {
      console.log("❌ Superwall Error:", err);
      Alert.alert("Error", "Something went wrong loading the premium packages.");
    };

    // 🔴 FIX: Sirf 1 object pass karna hai, aur key ka naam 'event' rakhna hai!
    Superwall.shared.register({
      placement: "campaign_trigger",
      handler: handler,
      feature: async () => {
  if (!paywallWasPresented) {
    console.log("⛔ feature() fired without paywall presenting — ignoring.");
    return;
  }

  // real purchase check (RevenueCat ko sync hone mein thoda time lagta hai)
  let active = false;
  for (let i = 0; i < 4 && !active; i++) {
    try {
      const info = await Purchases.getCustomerInfo();
      active = !!info.entitlements.active['Social Genius: Text Analyzer Pro'];
    } catch { }
    if (!active) await new Promise(r => setTimeout(r, 700));
  }
  if (!active) {
    console.log("⛔ feature() fired but NO active entitlement — not granting.");
    return;
  }

  // Backend sync: non-blocking, fail ho to bhi user ka Pro grant ho
  supabase.functions.invoke('sync-subscription')
    .then(({ error }) => {
      if (error) console.error("❌ sync-subscription error:", error.message);
      else console.log("✅ sync-subscription done");
    })
    .catch((err) => console.error("🚨 sync-subscription failed:", err));

  // Local grant: sync ke result pe depend nahi karta
  setIsProPlan(true);
  (SharedData as any).isProUser = true;
  try { await AsyncStorage.setItem('is_pro_user', 'true'); } catch { }
  syncProToExtension(true);
  DeviceEventEmitter.emit('pro_status_changed');
  Alert.alert("Welcome to Premium! 👑", "Your PRO subscription is now active.");
}
    });
  };

  // LOGOUT FUNCTION
  const handleLogout = async () => {
    try {
      setIsLoading(true);

      await supabase.auth.signOut();
      try { await GoogleSignin.signOut(); } catch (e) { }

      setUserName('');
      setUserEmail('');
      setIsProPlan(false);

      SharedData.requestPayload = null;
      SharedData.aiResult = null;
      SharedData.userProfile = { name: '', email: '', photoUrl: null };
      (SharedData as any).isProUser = false;
      syncProToExtension(false);   // 👈 NEW
      try { await Purchases.logOut(); } catch { }

      await AsyncStorage.multiRemove([
        'fake_logged_in',
        'last_ai_result',
        'is_pro_user',
        'came_from_analysis'
      ]);

      console.log("🔒 Local session killed completely!");

      DeviceEventEmitter.emit('user_logged_out');
      DeviceEventEmitter.emit('pro_status_reset');

      router.replace({ pathname: '/', params: { explicitly_logged_out: 'true' } } as any);

    } catch (error: any) {
      console.log("Logout Error:", error);
      Alert.alert("Logout Failed", "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };
  // DELETE ACCOUNT FUNCTION
  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "No user session found.");
        setIsDeletingAccount(false);
        return;
      }

      // Step 1: User ko Supabase Auth se hamesha ke liye delete karein
      // (Supabase Edge Function ya direct RPC call use karna behtar hai agar RLS strict ho, 
      // warna admin rights chahiye hote hain. Agar client-side allowed nahi, toh yeh code likhein:)
      const { error } = await supabase.rpc('delete_user_account'); // Agar aapne SQL function banaya hai
      if (error) throw error;   // 👈 NEW: fail ho to logout/clear mat karo
      // YA
      // const { error } = await supabase.auth.admin.deleteUser(user.id); // (Sirf admin key se chalta hai)

      // 🔴 AGAR AAPKE PAAS SUPABASE RPC NAHI HAI, TOH TEMPORARY YE CHALA LEIN:
      // await supabase.from('users').delete().eq('id', user.id); 
      // (Note: Auth se delete karne ke liye Edge function zaroori hota hai real world app mein)

      // Step 2: Apple aur Google Sign-in ko clear karein
      try { await GoogleSignin.revokeAccess(); } catch (e) { }
      try { await GoogleSignin.signOut(); } catch (e) { }
      await supabase.auth.signOut();

      //     // Step 3: Local data saaf karein
      setUserName('');
      setUserEmail('');
      setIsProPlan(false);
      SharedData.requestPayload = null;
      SharedData.aiResult = null;
      SharedData.userProfile = { name: '', email: '', photoUrl: null };
      (SharedData as any).isProUser = false;
      syncProToExtension(false);   // 👈 NEW
      try { await Purchases.logOut(); } catch { }

      await AsyncStorage.multiRemove([
        'fake_logged_in',
        'last_ai_result',
        'is_pro_user',
        'came_from_analysis'
      ]);

      setIsDeleteModalVisible(false);

      // Step 4: User ko bahar nikal dein
      DeviceEventEmitter.emit('user_logged_out');
      DeviceEventEmitter.emit('pro_status_reset');
      router.replace({ pathname: '/', params: { explicitly_logged_out: 'true' } } as any);

    } catch (error: any) {
      console.log("Delete Account Error:", error);
      Alert.alert("Deletion Failed", "Something went wrong while deleting your account. Please contact support.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleOpenLink = async (action: string) => {
    if (action === 'review') {
      try {
        if (await StoreReview.hasAction()) {
          await StoreReview.requestReview();
        } else {
          Alert.alert("Store Error", "Store review is not available right now.");
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      router.push(`/${action}` as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      {/* 🔴 Applied paddingHorizontal dynamically here */}
      <ScrollView contentContainerStyle={[styles.container, { paddingHorizontal: PAD_PADDING }]}>

        <Text style={styles.screenTitle}>Settings</Text>

        {/* Profile Card */}
        <LinearGradient colors={['rgba(217,70,239,0.15)', 'rgba(0,0,0,0)']} style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarLetter}>{userName?.charAt(0)?.toUpperCase() || 'S'}</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{userName || 'Genius User'}</Text>
              <TouchableOpacity onPress={handleEditNameClick} style={styles.editIconBtn}>
                <Feather name="edit-2" size={12} color="#D946EF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userEmail}>{userEmail || 'user@example.com'}</Text>

            {/* DYNAMIC PRO BADGE */}
            <View style={[styles.proBadge, isProPlan && styles.proBadgeActive]}>
              <MaterialCommunityIcons name="star-four-points" size={10} color={isProPlan ? "#FFD700" : "#D946EF"} />
              <Text style={[styles.proBadgeText, isProPlan && { color: "#FFD700" }]}>
                {isProPlan ? "PRO PLAN" : "FREE PLAN"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>ACCOUNT & SUPPORT</Text>
        <View style={styles.optionsBox}>

          {!isProPlan && (
            <TouchableOpacity style={styles.optionRow} onPress={handleUpgradePro}>
              <View style={styles.optionIcon}><MaterialCommunityIcons name="crown-outline" size={16} color="#FBBF24" /></View>
              <Text style={styles.optionText}>Upgrade to Pro</Text>
              <Feather name="chevron-right" size={16} color="#4B5563" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.optionRow} onPress={() => handleOpenLink('review')}>
            <View style={styles.optionIcon}><Feather name="star" size={16} color="#D946EF" /></View>
            <Text style={styles.optionText}>Leave us a review</Text>
            <Feather name="chevron-right" size={16} color="#4B5563" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow} onPress={() => handleOpenLink('feedback')}>
            <View style={styles.optionIcon}><Feather name="message-circle" size={16} color="#D946EF" /></View>
            <Text style={styles.optionText}>Give Your Feedback</Text>
            <Feather name="chevron-right" size={16} color="#4B5563" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow} onPress={() => handleOpenLink('privacy')}>
            <View style={styles.optionIcon}><Feather name="shield" size={16} color="#D946EF" /></View>
            <Text style={styles.optionText}>Privacy Policy</Text>
            <Feather name="chevron-right" size={16} color="#4B5563" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionRow, { borderBottomWidth: 0 }]} onPress={() => handleOpenLink('terms')}>
            <View style={styles.optionIcon}><Feather name="file-text" size={16} color="#D946EF" /></View>
            <Text style={styles.optionText}>Terms & Conditions</Text>
            <Feather name="chevron-right" size={16} color="#4B5563" />
          </TouchableOpacity>

        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#F43F5E" size="small" /> : <><Feather name="log-out" size={16} color="#F43F5E" /><Text style={styles.logoutText}>Log Out</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setIsDeleteModalVisible(true)} disabled={isLoading}>
          <Feather name="trash-2" size={14} color="#6B7280" />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={isEditModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          {/* 🔴 Added maxWidth to prevent stretching on iPad */}
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Your Name</Text>
            <TextInput style={styles.nameInput} value={newNameInput} onChangeText={setNewNameInput} placeholder="Enter new name" placeholderTextColor="#6B7280" autoFocus={true} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: 'transparent' }]} onPress={() => setIsEditModalVisible(false)} disabled={isSavingName}>
                <Text style={{ color: '#9CA3AF', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveName} disabled={isSavingName}>
                {isSavingName ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.btnTextWhite}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* 🔴 Delete Account Modal */}
      <Modal visible={isDeleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          {/* 🔴 Added maxWidth to prevent stretching on iPad */}
          <View style={styles.deleteModalContent}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" style={{ alignSelf: 'center', marginBottom: 15 }} />
            <Text style={styles.deleteModalTitle}>Delete Account?</Text>
            <Text style={styles.deleteModalDesc}>
              Are you sure you want to permanently delete your account? All your analysis history and settings will be erased immediately. This action cannot be undone.
            </Text>

            <View style={styles.deleteModalBtns}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setIsDeleteModalVisible(false)} disabled={isDeletingAccount}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleDeleteAccount} disabled={isDeletingAccount}>
                {isDeletingAccount ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.deleteConfirmText}>Yes, Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05020B' },
  // 🔴 Removed hardcoded horizontal padding
  container: { paddingTop: 20, paddingBottom: 40 },
  screenTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', marginBottom: 20, letterSpacing: -0.5 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(217,70,239,0.3)', marginBottom: 24 },
  avatarBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(217,70,239,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D946EF' },
  avatarLetter: { color: '#D946EF', fontSize: 24, fontWeight: '900' },
  userInfo: { marginLeft: 16, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  userName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  editIconBtn: { marginLeft: 10, padding: 4, backgroundColor: 'rgba(217,70,239,0.1)', borderRadius: 10 },
  userEmail: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },

  proBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(217,70,239,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(217,70,239,0.3)' },
  proBadgeText: { color: '#D946EF', fontSize: 9, fontWeight: '800', marginLeft: 4, letterSpacing: 0.5 },
  proBadgeActive: { borderColor: 'rgba(255, 215, 0, 0.5)', backgroundColor: 'rgba(255, 215, 0, 0.1)' },

  sectionTitle: { color: '#6B7280', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  optionsBox: { backgroundColor: '#0A0514', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 24, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  optionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionText: { color: '#D1D5DB', fontSize: 14, flex: 1, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 10, backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)' },
  logoutText: { color: '#F43F5E', fontSize: 14, fontWeight: '700', marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  // 🔴 Added maxWidth
  modalContent: { width: '100%', maxWidth: 450, backgroundColor: '#0A0514', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(217,70,239,0.3)' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  nameInput: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFF', borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  saveBtn: { backgroundColor: '#D946EF' },
  btnTextWhite: { color: '#FFF', fontWeight: 'bold' },

  // Delete Button Styles
  deleteAccountBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 10 },
  deleteAccountText: { color: '#6B7280', fontSize: 13, fontWeight: '600', marginLeft: 6 },

  // Delete Modal Styles
  // 🔴 Added maxWidth
  deleteModalContent: { width: '100%', maxWidth: 450, backgroundColor: '#11091A', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  deleteModalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  deleteModalDesc: { color: '#9CA3AF', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  deleteModalBtns: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  deleteCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  deleteCancelText: { color: '#D1D5DB', fontWeight: 'bold' },
  deleteConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center' },
  deleteConfirmText: { color: '#FFF', fontWeight: 'bold' }
});