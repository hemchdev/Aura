import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/useAuthStore';
import { useColors } from '@/hooks/useColors';
import { useResponsiveScreen } from '@/hooks/useResponsiveScreen';

export default function Index() {
  const { user, initialized } = useAuthStore();
  const colors = useColors();
  const { window, isSmallScreen, isTablet } = useResponsiveScreen();
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    // Log device information for debugging
    // console.log('Device Info:', {
    //   platform: Platform.OS,
    //   version: Platform.Version,
    //   screenSize: { width: window.width, height: window.height },
    //   scale: window.scale,
    //   fontScale: window.fontScale,
    //   isSmallScreen,
    //   isTablet,
    // });

    // Check environment variables
    const requiredEnvVars = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_GEMINI_API_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const errorMsg = `Missing environment variables: ${missingVars.join(', ')}`;
      console.error(errorMsg);
      setErrorInfo(errorMsg);
      
      if (__DEV__) {
        Alert.alert('Configuration Error', errorMsg);
      }
    }

    // Test basic functionality
    try {
      // console.log('App initialization successful');
    } catch (error) {
      console.error('App initialization error:', error);
      setErrorInfo(`Initialization error: ${error}`);
    }
  }, []);

  if (errorInfo && __DEV__) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: 20
      }}>
        <Text style={{ 
          color: colors.foreground, 
          textAlign: 'center',
          fontSize: isSmallScreen ? 14 : 16,
          marginBottom: 20
        }}>
          Development Error:
        </Text>
        <Text style={{ 
          color: colors.destructive, 
          textAlign: 'center',
          fontSize: isSmallScreen ? 12 : 14
        }}>
          {errorInfo}
        </Text>
      </SafeAreaView>
    );
  }

  if (!initialized) {
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator 
          size={isSmallScreen ? "small" : "large"} 
          color={colors.primary} 
        />
        <Text style={{
          color: colors.foreground,
          marginTop: 16,
          fontSize: isSmallScreen ? 14 : 16
        }}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)" />;
}