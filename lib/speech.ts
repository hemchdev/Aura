import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

// Platform-specific speech functionality
export const speechService = {
  speak: async (text: string, options?: { language?: string; pitch?: number; rate?: number }): Promise<void> => {
    if (!text || text.trim().length === 0) {
      return;
    }

    if (Platform.OS === 'web') {
      // Web Speech API fallback
      if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
        try {
          const utterance = new (globalThis as any).SpeechSynthesisUtterance(text);
          if (options?.language) utterance.lang = options.language;
          if (options?.pitch) utterance.pitch = Math.max(0.1, Math.min(2, options.pitch));
          if (options?.rate) utterance.rate = Math.max(0.1, Math.min(10, options.rate));
          (globalThis as any).speechSynthesis.speak(utterance);
        } catch (error) {
          console.warn('Web speech synthesis error:', error);
        }
      }
      return;
    }

    // Native platforms - use expo-speech
    try {
      await Speech.speak(text, {
        language: options?.language || 'en',
        pitch: options?.pitch || 1.0,
        rate: options?.rate || 0.9,
      });
    } catch (error) {
      console.warn('Native speech not available:', error);
    }
  },

  stop: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
        try {
          (globalThis as any).speechSynthesis.cancel();
        } catch (error) {
          console.warn('Web speech synthesis stop error:', error);
        }
      }
      return;
    }

    try {
      await Speech.stop();
    } catch (error) {
      console.warn('Native speech stop not available:', error);
    }
  },

  isSpeaking: async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
        try {
          return (globalThis as any).speechSynthesis.speaking;
        } catch (error) {
          console.warn('Web speech synthesis status error:', error);
          return false;
        }
      }
      return false;
    }

    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      console.warn('Native speech status not available:', error);
      return false;
    }
  }
};
