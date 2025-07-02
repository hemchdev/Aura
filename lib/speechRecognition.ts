import { Platform } from 'react-native';
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';

type SpeechRecognitionCallback = {
  onSpeechStart?: () => void;
  onSpeechResults?: (text: string) => void;
  onSpeechError?: (error: string) => void;
  onSpeechEnd?: () => void;
};

/**
 * Cross-platform speech recognition service that works on native devices and web
 */
export const speechRecognitionService = {
  /**
   * Check if speech recognition is available on the current platform
   */
  isAvailable: (): boolean => {
    if (Platform.OS === 'web') {
      return typeof globalThis !== 'undefined' && 
        'webkitSpeechRecognition' in globalThis || 
        'SpeechRecognition' in globalThis;
    }
    
    // For native platforms, we'll use @react-native-voice/voice which works on both iOS and Android
    return true;
  },
  
  /**
   * Start speech recognition
   * @param callbacks Object with callback functions for speech events
   * @param language Language code (e.g., 'en-US')
   */
  startListening: async (callbacks: SpeechRecognitionCallback, language = 'en-US'): Promise<void> => {
    if (Platform.OS === 'web') {
      return startWebSpeechRecognition(callbacks, language);
    } else {
      return startNativeSpeechRecognition(callbacks, language);
    }
  },
  
  /**
   * Stop speech recognition
   */
  stopListening: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      stopWebSpeechRecognition();
    } else {
      try {
        await Voice.stop();
      } catch (e) {
        console.error('Error stopping voice recognition:', e);
      }
    }
  },

  /**
   * Clean up speech recognition resources
   * Call this in component unmount
   */
  destroy: async (): Promise<void> => {
    if (Platform.OS !== 'web') {
      try {
        await Voice.destroy();
      } catch (e) {
        console.error('Error destroying voice instance:', e);
      }
    } else {
      stopWebSpeechRecognition();
    }
  }
};

// Global reference to the Web Speech Recognition instance
let webRecognition: any = null;

/**
 * Start speech recognition for web platforms
 */
function startWebSpeechRecognition(callbacks: SpeechRecognitionCallback, language = 'en-US'): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Use the appropriate constructor based on browser support
      const SpeechRecognition = (globalThis as any).SpeechRecognition || 
                               (globalThis as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        callbacks.onSpeechError?.('Speech recognition not supported in this browser');
        reject(new Error('Speech recognition not supported'));
        return;
      }
      
      if (webRecognition) {
        webRecognition.abort();
      }
      
      webRecognition = new SpeechRecognition();
      webRecognition.continuous = true;
      webRecognition.interimResults = true;
      webRecognition.lang = language;
      
      // Set up event handlers
      webRecognition.onstart = () => {
        callbacks.onSpeechStart?.();
        resolve();
      };
      
      webRecognition.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          callbacks.onSpeechResults?.(finalTranscript);
        }
      };
      
      webRecognition.onerror = (event: any) => {
        callbacks.onSpeechError?.(event.error);
        reject(event.error);
      };
      
      webRecognition.onend = () => {
        callbacks.onSpeechEnd?.();
      };
      
      // Start recognition
      webRecognition.start();
      
    } catch (error) {
      callbacks.onSpeechError?.('Failed to start speech recognition');
      reject(error);
    }
  });
}

/**
 * Stop web speech recognition
 */
function stopWebSpeechRecognition(): void {
  if (webRecognition) {
    try {
      webRecognition.stop();
      webRecognition = null;
    } catch (e) {
      console.error('Error stopping web speech recognition:', e);
    }
  }
}

/**
 * Start speech recognition for native platforms (iOS and Android)
 */
async function startNativeSpeechRecognition(
  callbacks: SpeechRecognitionCallback,
  language = 'en-US'
): Promise<void> {
  try {
    // Set up event listeners
    Voice.onSpeechStart = () => {
      callbacks.onSpeechStart?.();
    };
    
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        callbacks.onSpeechResults?.(e.value[0]);
      }
    };
    
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      callbacks.onSpeechError?.(e.error?.message || 'Unknown error');
    };
    
    Voice.onSpeechEnd = () => {
      callbacks.onSpeechEnd?.();
    };
    
    // Start recognition
    await Voice.start(language);
    
  } catch (e) {
    console.error('Error starting native speech recognition:', e);
    callbacks.onSpeechError?.('Failed to start speech recognition');
    throw e;
  }
}
