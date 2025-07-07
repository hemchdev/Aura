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
    try {
      if (Platform.OS === 'web') {
        return typeof globalThis !== 'undefined' && 
          ('webkitSpeechRecognition' in globalThis || 
           'SpeechRecognition' in globalThis);
      }
      
      // For native platforms, check if Voice module is available
      if (!Voice) {
        console.log('Voice module not available');
        return false;
      }
      
      // For native platforms, we'll use @react-native-voice/voice which works on both iOS and Android
      return true;
    } catch (error) {
      console.error('Error checking speech recognition availability:', error);
      return false;
    }
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
    // Clean up any existing instances
    await Voice.destroy();
    
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
      let errorMessage = e.error?.message || 'Unknown error';
      
      // Provide more user-friendly error messages
      if (e.error?.code === '7') {
        errorMessage = 'No speech input detected. Please try again.';
      } else if (e.error?.code === '3') {
        errorMessage = 'Audio recording error. Please check microphone permissions.';
      } else if (e.error?.code === '6') {
        errorMessage = 'No internet connection available for speech recognition.';
      } else if (e.error?.code === '2') {
        errorMessage = 'Network timeout. Please check your internet connection.';
      }
      
      callbacks.onSpeechError?.(errorMessage);
    };
    
    Voice.onSpeechEnd = () => {
      callbacks.onSpeechEnd?.();
    };
    
    // Start recognition with better options
    await Voice.start(language, {
      EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
      EXTRA_MAX_RESULTS: 5,
      EXTRA_PARTIAL_RESULTS: true,
      REQUEST_PERMISSIONS_AUTO: true,
    });
    
  } catch (e) {
    console.error('Error starting native speech recognition:', e);
    let errorMessage = 'Failed to start speech recognition';
    
    const errorString = String(e);
    if (errorString.includes('permission')) {
      errorMessage = 'Microphone permission is required for voice input';
    } else if (errorString.includes('not available')) {
      errorMessage = 'Speech recognition is not available on this device';
    }
    
    callbacks.onSpeechError?.(errorMessage);
    throw e;
  }
}
