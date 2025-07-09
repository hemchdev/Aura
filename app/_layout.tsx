import 'react-native-url-polyfill/auto';
import { useEffect, useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useResponsiveScreen } from '@/hooks/useResponsiveScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { notificationService } from '@/lib/notificationService';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure splash screen animation
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  useFrameworkReady();
  
  const systemColorScheme = useColorScheme();
  const { initialize, initialized, profile } = useAuthStore();
  const { updateResolvedTheme, setTheme } = useThemeStore();
  const { isSmallScreen, isTablet } = useResponsiveScreen();

  useEffect(() => {
    async function prepare() {
      try {
        // Add screen size logging for debugging
        // console.log('Screen info:', { isSmallScreen, isTablet });
        
        // Initialize notification service early
        await notificationService.initialize();
        await notificationService.setupNotificationCategories();
        
        // Initialize auth store
        await initialize();
        
        // Simulate some loading time for better UX (you can remove this in production)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // console.log('App initialization complete');
      } catch (e) {
        console.warn('App initialization error:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
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

  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      SplashScreen.hide();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
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
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}