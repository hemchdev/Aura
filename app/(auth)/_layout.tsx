import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';

export default function AuthLayout() {
  const { user, initialized } = useAuthStore();

  // Redirect to main app if user is authenticated
  if (initialized && user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}