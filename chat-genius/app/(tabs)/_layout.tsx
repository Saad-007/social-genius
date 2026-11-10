import { Tabs, usePathname } from 'expo-router'; 
import React, { useState, useEffect } from 'react';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 
import { DeviceEventEmitter } from 'react-native';
import { SharedData } from '../store';
import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname(); 
  
  const [showAiTabs, setShowAiTabs] = useState(false);
  const [isProUser, setIsProUser] = useState(false); 

  useEffect(() => {
    const checkProStatus = async () => {
      const localPro = await AsyncStorage.getItem('is_pro_user');
      const isPro = localPro === 'true' || (SharedData as any).isProUser;
      
      setIsProUser(isPro);

      if (!isPro) {
        setShowAiTabs(false);
      } else if (SharedData.aiResult && isPro) {
        setShowAiTabs(true);
      }
    };

    checkProStatus();
  }, [pathname]); 

  useEffect(() => {
    const aiSub = DeviceEventEmitter.addListener('ai_responded', async () => {
      const localPro = await AsyncStorage.getItem('is_pro_user');
      const isPro = localPro === 'true' || (SharedData as any).isProUser;
      
      if (isPro) {
        setShowAiTabs(true);
      }
    });

    const logoutSub = DeviceEventEmitter.addListener('clear_ai_tabs', () => {
      setShowAiTabs(false);
      setIsProUser(false);
      console.log("🧹 AI tabs hidden after logout");
    });

    return () => {
      aiSub.remove();
      logoutSub.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#e84393',
        tabBarInactiveTintColor: '#8e8e93',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#0f0c29',
          borderTopWidth: 0, 
          elevation: 0, 
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}>
      
      {/* 🟢 1. HOME */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="home" color={color} />,
        }}
      />
      
      {/* 🟡 2. RESULTS */}
      <Tabs.Screen
        name="result"
        options={{
          title: 'Results',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="document-text" color={color} />,
          href: (showAiTabs && isProUser) ? '/result' : null, 
        }}
      />

      {/* 🟡 3. REPLIES */}
      <Tabs.Screen
        name="replies"
        options={{
          title: 'Replies',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="chatbubbles" color={color} />,
          href: (showAiTabs && isProUser) ? '/replies' : null, 
        }}
      />

      {/* 🟣 4. NEW COACH TAB (Pehle yeh History tha) */}
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="robot-outline" size={26} color={color} />,
        }}
      />

      {/* 🟢 5. SETTINGS */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="settings" color={color} />,
        }}
      />

      {/* 🔴 ALWAYS HIDDEN TABS */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="PayWall" options={{ href: null }} />
      <Tabs.Screen name="analysis" options={{ href: null }} />
    </Tabs>
  );
}