import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';

export default function RootLayout() {
  useFrameworkReady();
  
  const systemColorScheme = useColorScheme();
  const { initialize, profile } = useAuthStore();
  const { updateResolvedTheme, setTheme } = useThemeStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    updateResolvedTheme(systemColorScheme as 'light' | 'dark' | null);
  }, [systemColorScheme]);

  // Sync theme from user profile when profile changes
  useEffect(() => {
    if (profile?.settings?.theme) {
      setTheme(profile.settings.theme);
    }
  }, [profile?.settings?.theme]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/confirm" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}