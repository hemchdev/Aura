import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { useColors } from '@/hooks/useColors';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onReady?: () => void;
}

export function CustomSplashScreen({ onReady }: SplashScreenProps) {
  const colors = useColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: 200,
      height: 200,
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primaryForeground,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.primaryForeground,
      opacity: 0.8,
      textAlign: 'center',
    },
    loadingContainer: {
      marginTop: 48,
    },
    loadingText: {
      fontSize: 14,
      color: colors.primaryForeground,
      opacity: 0.6,
    },
  });

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Aura</Text>
      <Text style={styles.subtitle}>Your AI-powered personal assistant</Text>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
}
