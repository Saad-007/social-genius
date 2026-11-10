import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
import 'react-native-reanimated';
import Superwall, { SubscriptionStatus } from '@superwall/react-native-superwall';
import Purchases from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SharedData } from './store';
import { syncProToExtension } from './lib/proSync';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ── Configure: render se pehle, sirf ek baar ──
const rcApiKey = Platform.OS === 'ios'
  ? 'appl_JYsbqzBAAkGZnFkiTHGkqyYpCoc'
  : 'goog_YOUR_ANDROID_KEY_HERE';
const swApiKey = Platform.OS === 'ios'
  ? 'pk_irzUXrL8CfsCSiY7wZDmw'
  : 'pk_QilRGHDBV923-pUZk2dOy';

Purchases.configure({ apiKey: rcApiKey });
Superwall.configure({ apiKey: swApiKey });

// Helper: Superwall ko safely Active/Inactive batane ke liye
const setSwStatus = async (activeIds: string[]) => {
  try {
    if (activeIds.length > 0) {
      try {
        await Superwall.shared.setSubscriptionStatus(
          SubscriptionStatus.Active(
            activeIds.map((id) => ({ id, type: 'SERVICE_LEVEL' } as any))
          )
        );
      } catch {
        await Superwall.shared.setSubscriptionStatus(
          SubscriptionStatus.Active(activeIds as any)
        );
      }
    } else {
      await Superwall.shared.setSubscriptionStatus(SubscriptionStatus.Inactive());
    }
  } catch (e) {
    console.log('Superwall status sync error:', e);
  }
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const verifyProStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Agar user logged in nahi hai -> Superwall ko INACTIVE set karo taake Onboarding paywall kabhi stuck na ho!
        if (!user) {
          await AsyncStorage.removeItem('is_pro_user');
          (SharedData as any).isProUser = false;
          syncProToExtension(false);
          await setSwStatus([]);
          return;
        }

        Superwall.shared.identify({ userId: user.id });
        await Purchases.logIn(user.id);

        // Check Supabase DB + RevenueCat
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('is_pro')
          .eq('user_id', user.id)
          .maybeSingle();

        const info = await Purchases.getCustomerInfo();
        const activeIds = Object.keys(info.entitlements.active);
        const active = !!subRow?.is_pro || activeIds.length > 0;

        if (active) {
          await AsyncStorage.setItem('is_pro_user', 'true');
          (SharedData as any).isProUser = true;
          syncProToExtension(true);
          await setSwStatus(activeIds.length ? activeIds : ['pro']);
          console.log('👑 PRO User Verified');
        } else {
          await AsyncStorage.removeItem('is_pro_user');
          (SharedData as any).isProUser = false;
          syncProToExtension(false);
          await setSwStatus([]);
          console.log('👤 Free User (Paywall will show)');
        }
      } catch (err) {
        console.log('verifyProStatus error:', err);
        await setSwStatus([]);
      }
    };

    verifyProStatus();
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}