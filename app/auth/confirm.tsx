import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function AuthConfirm() {
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    // Since we've removed magic link functionality, redirect to auth
    router.replace('/(auth)');
  }, [router]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: colors.background 
    }}>
      <Text style={{ color: colors.foreground }}>Redirecting...</Text>
    </View>
  );
}
