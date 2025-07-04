import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useResponsiveScreen } from '@/hooks/useResponsiveScreen';

// Global error handler
if (Platform.OS === 'android') {
  const ErrorUtils = require('ErrorUtils');
  ErrorUtils.setGlobalHandler((error: any) => {
    console.error('Global Error Handler:', error);
    // Don't crash the app, just log the error
  });
}

export default function RootLayout() {
  useFrameworkReady();
  
  const systemColorScheme = useColorScheme();
  const { initialize, profile } = useAuthStore();
  const { updateResolvedTheme, setTheme } = useThemeStore();
  const { isSmallScreen, isTablet } = useResponsiveScreen();

  useEffect(() => {
    // Add screen size logging for debugging
    console.log('Screen info:', { isSmallScreen, isTablet });
    
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
    <SafeAreaProvider>
      <Stack screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true 
      }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/confirm" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" translucent={false} />
    </SafeAreaProvider>
  );
}