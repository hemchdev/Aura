import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';

type SpeechRecognitionCallback = {
  onSpeechStart?: () => void;
  onSpeechResults?: (text: string, isFinal?: boolean) => void;
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
      
      // Additional check for Android to ensure proper initialization
      if (Platform.OS === 'android') {
        // Check if critical Voice methods exist
        const hasRequiredMethods = typeof Voice.start === 'function' && 
                                 typeof Voice.stop === 'function' && 
                                 typeof Voice.destroy === 'function';
        
        if (!hasRequiredMethods) {
          console.log('Voice module methods not properly available on Android');
          return false;
        }
      }
      
      // For native platforms, we'll use @react-native-voice/voice which works on both iOS and Android
      return true;
    } catch (error) {
      console.error('Error checking speech recognition availability:', error);
      return false;
    }
  },

  /**
   * Request microphone permissions for Android with improved user experience
   */
  requestMicrophonePermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true; // iOS handles permissions automatically
    }

    try {
      // First check if permission is already granted
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      
      if (hasPermission) {
        return true;
      }

      // Show alert before requesting permission to explain why we need it
      return new Promise((resolve) => {
        Alert.alert(
          'Microphone Permission Required',
          'Aura needs access to your microphone to enable voice input. This allows you to speak your messages instead of typing them.',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => {
                resolve(false);
              },
            },
            {
              text: 'Allow',
              onPress: async () => {
                try {
                  const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                      title: 'Microphone Permission',
                      message: 'Aura needs access to your microphone to enable voice input for better user experience.',
                      buttonNeutral: 'Ask Me Later',
                      buttonNegative: 'Cancel',
                      buttonPositive: 'OK',
                    },
                  );

                  const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
                  
                  if (!isGranted) {
                    // Show another alert with instructions to enable manually
                    Alert.alert(
                      'Permission Denied',
                      'To use voice input, please go to Settings > Apps > Aura > Permissions > Microphone and enable it.',
                      [{ text: 'OK' }]
                    );
                  }
                  
                  resolve(isGranted);
                } catch (err) {
                  console.error('Error requesting microphone permission:', err);
                  Alert.alert(
                    'Permission Error',
                    'Failed to request microphone permission. Please enable it manually in your device settings.',
                    [{ text: 'OK' }]
                  );
                  resolve(false);
                }
              },
            },
          ],
          { cancelable: false }
        );
      });
    } catch (err) {
      console.error('Error in requestMicrophonePermission:', err);
      Alert.alert(
        'Permission Error',
        'Failed to check microphone permission. Please enable microphone access in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  },

  /**
   * Check if microphone permission is granted
   */
  checkMicrophonePermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true; // iOS handles permissions automatically
    }

    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return hasPermission;
    } catch (err) {
      console.error('Error checking microphone permission:', err);
      return false;
    }
  },
  
  /**
   * Start speech recognition for native platforms (iOS and Android)
   */
  startListening: async (callbacks: SpeechRecognitionCallback, language = 'en-US'): Promise<void> => {
    // Check and request permissions first for Android
    if (Platform.OS === 'android') {
      const hasPermission = await speechRecognitionService.checkMicrophonePermission();
      if (!hasPermission) {
        const granted = await speechRecognitionService.requestMicrophonePermission();
        if (!granted) {
          const errorMsg = 'Microphone permission is required for voice input. Please enable it in your device settings.';
          callbacks.onSpeechError?.(errorMsg);
          return;
        }
      }
    }

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
        // Try to cancel if stop fails
        try {
          await Voice.cancel();
        } catch (cancelError) {
          console.error('Error cancelling voice recognition:', cancelError);
        }
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
  },

  /**
   * Cancel current speech recognition
   */
  cancel: async (): Promise<void> => {
    if (Platform.OS !== 'web') {
      try {
        await Voice.cancel();
      } catch (e) {
        console.error('Error cancelling voice recognition:', e);
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
      webRecognition.maxAlternatives = 1;
      
      // Set up event handlers
      webRecognition.onstart = () => {
        callbacks.onSpeechStart?.();
        resolve();
      };
      
      webRecognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Send results for both final and interim results
        if (finalTranscript) {
          callbacks.onSpeechResults?.(finalTranscript, true);
        } else if (interimTranscript) {
          callbacks.onSpeechResults?.(interimTranscript, false);
        }
      };
      
      webRecognition.onerror = (event: any) => {
        console.error('Web speech recognition error:', event.error);
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech was detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access was denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your internet connection.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service is not allowed. Please check your browser settings.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        callbacks.onSpeechError?.(errorMessage);
        reject(new Error(errorMessage));
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
    // Check if Voice module is properly initialized
    if (!Voice) {
      throw new Error('Voice module is not available');
    }
    
    // Clean up any existing instances first with multiple attempts
    try {
      console.log('Cleaning up previous Voice instance...');
      await Voice.stop();
      await Voice.cancel();
      await Voice.destroy();
      console.log('Previous Voice instance destroyed');
    } catch (e) {
      console.log('No previous Voice instance to destroy:', e);
    }

    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if Voice methods are available (Android issue fix)
    if (typeof Voice.start !== 'function') {
      throw new Error('Voice.start method is not available. Please restart the app and ensure microphone permissions are granted.');
    }
    
    // For Android, let's try to check if the service is available
    if (Platform.OS === 'android') {
      try {
        const isAvailable = await Voice.isAvailable();
        console.log('Voice service available on Android:', isAvailable);
        
        if (!isAvailable) {
          throw new Error('Speech recognition service is not available on this Android device');
        }
      } catch (availError) {
        console.warn('Could not check Voice availability:', availError);
        // Continue anyway as some devices might not support isAvailable check
      }
    }
    
    // Set up event listeners before starting (crucial for Android)
    Voice.onSpeechStart = (e) => {
      console.log('Speech recognition started:', e);
      callbacks.onSpeechStart?.();
    };
    
    Voice.onSpeechRecognized = (e) => {
      console.log('Speech recognized:', e);
    };
    
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      console.log('Speech results (final):', e);
      if (e.value && e.value.length > 0) {
        const bestResult = e.value[0];
        console.log('Final result:', bestResult);
        // Mark this as final result
        callbacks.onSpeechResults?.(bestResult, true);
      }
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      console.log('Partial results:', e);
      if (e.value && e.value.length > 0) {
        const partialResult = e.value[0];
        console.log('Partial result:', partialResult);
        // Mark this as partial result
        callbacks.onSpeechResults?.(partialResult, false);
      }
    };
    
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('Speech recognition error:', e);
      let errorMessage = 'Speech recognition error occurred';
      
      // Handle specific error codes for Android and iOS
      if (e.error) {
        const errorCode = e.error.code || e.error.message || '';
        const errorString = String(errorCode).toLowerCase();
        
        console.log('Error code/message:', errorCode);
        
        if (errorString.includes('permission') || errorString.includes('denied') || errorCode === '9') {
          errorMessage = 'Microphone permission denied. Please enable microphone access in your device settings and restart the app.';
        } else if (errorString.includes('no speech') || errorCode === '7') {
          errorMessage = 'No speech detected. Please try speaking more clearly.';
        } else if (errorString.includes('audio') || errorCode === '3') {
          errorMessage = 'Audio recording error. Please check your microphone and try again.';
        } else if (errorString.includes('network') || errorCode === '2' || errorCode === '6') {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (errorString.includes('busy') || errorCode === '8') {
          errorMessage = 'Speech recognition is busy. Please wait a moment and try again.';
        } else if (errorString.includes('server') || errorCode === '4' || errorCode === '5') {
          errorMessage = 'Server error. Please try again later.';
        } else if (errorString.includes('insufficient') || errorCode === '9') {
          errorMessage = 'Insufficient permissions. Please enable microphone access in settings.';
        } else if (errorString.includes('startspeech') || errorString.includes('null')) {
          errorMessage = 'Failed to start speech recognition: Speech service not properly initialized. Please restart the app and ensure microphone permissions are granted.';
        } else {
          errorMessage = `Speech recognition error: ${e.error.message || errorCode}`;
        }
      }
      
      callbacks.onSpeechError?.(errorMessage);
    };
    
    Voice.onSpeechEnd = (e) => {
      console.log('Speech recognition ended:', e);
      callbacks.onSpeechEnd?.();
    };

    // Platform-specific options with more robust Android settings
    const options: any = {};

    // Android-specific configuration
    if (Platform.OS === 'android') {
      options.EXTRA_LANGUAGE_MODEL = 'LANGUAGE_MODEL_FREE_FORM';
      options.EXTRA_MAX_RESULTS = 5;
      options.EXTRA_PARTIAL_RESULTS = true;
      options.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS = 1500;
      options.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS = 1500;
      options.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS = 1500;
      options.REQUEST_PERMISSIONS_AUTO = false; // We handle permissions manually
      options.EXTRA_PREFER_OFFLINE = false; // Use online recognition for better accuracy
      // Add additional Android-specific options
      options.EXTRA_CALLING_PACKAGE = 'com.pp.aura';
      options.EXTRA_PROMPT = 'Speak now';
    }

    console.log('Starting Voice.start with language:', language, 'options:', options);
    
    // Try to start with multiple attempts for Android
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Voice.start attempt ${attempts + 1}/${maxAttempts}`);
        
        // Use a timeout for the start operation to catch hanging issues
        await Promise.race([
          Voice.start(language, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Voice.start timeout - took too long to initialize')), 8000)
          )
        ]);
        
        console.log('Voice.start completed successfully');
        return; // Success, exit the function
        
      } catch (attemptError) {
        attempts++;
        console.error(`Voice.start attempt ${attempts} failed:`, attemptError);
        
        if (attempts >= maxAttempts) {
          throw attemptError; // Re-throw the last error
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clean up before retry
        try {
          await Voice.stop();
          await Voice.cancel();
        } catch (cleanupError) {
          console.warn('Cleanup before retry failed:', cleanupError);
        }
      }
    }
    
  } catch (e) {
    console.error('Error starting native speech recognition:', e);
    let errorMessage = 'Failed to start speech recognition';
    
    const errorString = String(e).toLowerCase();
    if (errorString.includes('permission')) {
      errorMessage = 'Microphone permission is required. Please enable microphone access in your device settings and restart the app.';
    } else if (errorString.includes('not available') || errorString.includes('not found')) {
      errorMessage = 'Speech recognition is not available on this device. Please ensure Google services are installed and up to date.';
    } else if (errorString.includes('already started') || errorString.includes('busy')) {
      errorMessage = 'Speech recognition is already running. Please wait and try again.';
    } else if (errorString.includes('cannot read property') && errorString.includes('startspeech')) {
      errorMessage = 'Failed to start speech recognition: Speech service not properly initialized. Please restart the app and ensure microphone permissions are granted.';
    } else if (errorString.includes('timeout')) {
      errorMessage = 'Speech recognition took too long to start. Please try again.';
    } else if (errorString.includes('voice module') || errorString.includes('voice.start')) {
      errorMessage = 'Speech recognition module is not properly installed. Please restart the app.';
    } else if (errorString.includes('service is not available')) {
      errorMessage = 'Speech recognition service is not available on this Android device. Please ensure Google app is installed and speech recognition is enabled in system settings.';
    } else {
      errorMessage = `Failed to start speech recognition: ${e}. Please restart the app and ensure microphone permissions are granted.`;
    }
    
    callbacks.onSpeechError?.(errorMessage);
    throw new Error(errorMessage);
  }
}
