import { Platform } from 'react-native';

// Platform-specific speech functionality
export const speechService = {
  speak: async (text: string, options?: { language?: string; pitch?: number; rate?: number }) => {
    if (Platform.OS === 'web') {
      // Web Speech API fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        if (options?.language) utterance.lang = options.language;
        if (options?.pitch) utterance.pitch = options.pitch;
        if (options?.rate) utterance.rate = options.rate;
        speechSynthesis.speak(utterance);
      }
      return;
    }

    // Native platforms - dynamically import expo-speech
    try {
      const Speech = await import('expo-speech');
      Speech.speak(text, {
        language: options?.language || 'en',
        pitch: options?.pitch || 1.0,
        rate: options?.rate || 0.9,
      });
    } catch (error) {
      console.warn('Speech not available:', error);
    }
  },

  stop: async () => {
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      return;
    }

    try {
      const Speech = await import('expo-speech');
      Speech.stop();
    } catch (error) {
      console.warn('Speech not available:', error);
    }
  },

  isSpeaking: async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return 'speechSynthesis' in window ? speechSynthesis.speaking : false;
    }

    try {
      const Speech = await import('expo-speech');
      return Speech.isSpeakingAsync();
    } catch (error) {
      console.warn('Speech not available:', error);
      return false;
    }
  }
};
