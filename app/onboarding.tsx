import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleGetStarted = () => {
    router.replace('/(auth)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Welcome to Aura
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your AI-powered personal assistant for daily life management.
        </Text>
        
        <View style={styles.features}>
          <Text style={[styles.feature, { color: colors.foreground }]}>
            • Smart reminders and calendar integration
          </Text>
          <Text style={[styles.feature, { color: colors.foreground }]}>
            • Voice-powered chat assistance
          </Text>
          <Text style={[styles.feature, { color: colors.foreground }]}>
            • Personalized recommendations
          </Text>
          <Text style={[styles.feature, { color: colors.foreground }]}>
            • Cross-platform synchronization
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleGetStarted}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            Get Started
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    marginBottom: 40,
    alignSelf: 'stretch',
  },
  feature: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
