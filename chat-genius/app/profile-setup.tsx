import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SharedData } from './store';
import { supabase } from './lib/supabase'; 

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Page load hotay hi user ka email nikal lo
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
      } else {
        // Agar local testing kar rahe hain bina auth ke
        setUserEmail(SharedData.userProfile?.email || 'testing@local.com');
      }
    };
    fetchUser();
  }, []);

const handleFinishSetup = async () => {
    if (name.trim() === '') return;
    setIsLoading(true);

    try {
      // 1. Asli Supabase user get karein
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        
        // 🔴 FIX: Supabase ke 'Auth Metadata' mein naam lazmi save karein
        // Taake SettingsScreen usay fauran pehchan le!
        await supabase.auth.updateUser({
          data: { 
            name: name.trim(), 
            full_name: name.trim() 
          }
        });

        // 2. Database mein 'profiles' table mein data save karein 
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          name: name.trim(),
          email: user.email,
        });

        if (error) throw error;
      }

      // 3. Local store mein bhi save kar lein for fast access
      SharedData.userProfile.name = name.trim();
      SharedData.userProfile.email = userEmail;
      
      console.log("✅ Profile Saved in Supabase (Auth + Table)!");
      router.replace('/(tabs)');

    } catch (error: any) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", error.message || "Failed to save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        
        <View style={styles.headerBox}>
          <MaterialCommunityIcons name="account-circle-outline" size={60} color="#D946EF" />
          <Text style={styles.heading}>You're almost in.</Text>
          <Text style={styles.subText}>What should we call you?</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>YOUR NAME</Text>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Saad"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
              autoFocus={true}
              editable={!isLoading}
            />
          </View>
          <Text style={styles.emailText}>Logged in as: {userEmail}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.btn, (name.trim() === '' || isLoading) && styles.btnDisabled]} 
          activeOpacity={0.8} 
          onPress={handleFinishSetup}
          disabled={name.trim() === '' || isLoading}
        >
          <LinearGradient
            colors={name.trim() === '' ? ['#374151', '#1F2937'] : ['#FF3366', '#9333EA']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.btnGrad}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.btnText}>Start Analyzing</Text>
                <Feather name="arrow-right" size={18} color="#FFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05020B' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  headerBox: { alignItems: 'center', marginBottom: 40 },
  heading: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 16, marginBottom: 8 },
  subText: { color: '#9CA3AF', fontSize: 14 },
  inputBox: { marginBottom: 40 },
  label: { color: '#D946EF', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0514', borderWidth: 1, borderColor: 'rgba(217,70,239,0.3)', borderRadius: 14, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, color: '#FFF', fontSize: 16 },
  emailText: { color: '#6B7280', fontSize: 11, marginTop: 10, marginLeft: 4, fontStyle: 'italic' },
  btn: { borderRadius: 14, overflow: 'hidden' },
  btnDisabled: { opacity: 0.7 },
  btnGrad: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});