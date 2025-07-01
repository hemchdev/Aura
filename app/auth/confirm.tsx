import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/hooks/useColors';

export default function AuthConfirm() {
  const router = useRouter();
  const colors = useColors();
  const { token_hash, type } = useLocalSearchParams<{
    token_hash: string;
    type: string;
  }>();

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        if (!token_hash || !type) {
          Alert.alert('Invalid Link', 'This magic link is invalid or has expired.');
          router.replace('/(auth)');
          return;
        }

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'email',
        });

        if (error) {
          console.error('Magic link verification error:', error);
          Alert.alert('Authentication Failed', error.message);
          router.replace('/(auth)');
          return;
        }

        if (data.user) {
          // Magic link authentication successful
          Alert.alert('Welcome!', 'You have been successfully signed in.');
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)');
        }
      } catch (error: any) {
        console.error('Magic link error:', error);
        Alert.alert('Error', 'Failed to authenticate with magic link.');
        router.replace('/(auth)');
      }
    };

    handleMagicLink();
  }, [token_hash, type, router]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: colors.background 
    }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ 
        marginTop: 16, 
        color: colors.foreground,
        fontSize: 16
      }}>
        Signing you in...
      </Text>
    </View>
  );
}
