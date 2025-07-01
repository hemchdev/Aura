import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Platform-specific utilities for authentication and storage management
 */
export class PlatformUtils {
  /**
   * Get the current platform
   */
  static getPlatform(): 'web' | 'ios' | 'android' | 'native' {
    if (Platform.OS === 'web') return 'web';
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'native';
  }

  /**
   * Clear all authentication-related storage across platforms
   */
  static async clearAuthStorage(): Promise<void> {
    const platform = this.getPlatform();

    try {
      switch (platform) {
        case 'web':
          await this.clearWebStorage();
          break;
        case 'ios':
        case 'android':
          await this.clearNativeStorage();
          break;
        default:
          // Fallback for other platforms
          await this.clearNativeStorage();
          break;
      }
    } catch (error) {
      console.warn('Failed to clear platform storage:', error);
      // Don't throw - we want sign out to proceed even if storage clearing fails
    }
  }

  /**
   * Clear web browser storage (localStorage, sessionStorage, and cookies)
   */
  private static async clearWebStorage(): Promise<void> {
    // Check if we're in a web environment
    if (typeof globalThis === 'undefined') return;
    
    const global = globalThis as any;

    try {
      // Clear localStorage items related to Supabase
      if (global.localStorage) {
        // Get all localStorage keys first
        const allKeys = Object.keys(global.localStorage);
        
        // Filter for auth-related keys using a comprehensive pattern
        const authKeys = allKeys.filter((key: string) => {
          const lowerKey = key.toLowerCase();
          return (
            // Supabase specific patterns
            lowerKey.includes('supabase') ||
            lowerKey.startsWith('sb-') ||
            lowerKey.includes('sb-auth-token') ||
            // Generic auth patterns
            lowerKey.includes('auth') ||
            lowerKey.includes('token') ||
            lowerKey.includes('session') ||
            lowerKey.includes('user') ||
            lowerKey.includes('login') ||
            // Specific common keys
            key === 'access_token' ||
            key === 'refresh_token' ||
            key === 'id_token'
          );
        });

        // Remove all auth-related keys
        authKeys.forEach((key: string) => {
          try {
            global.localStorage.removeItem(key);
          } catch (e) {
            // Ignore individual key removal errors
          }
        });
      }

      // Clear sessionStorage as well
      if (global.sessionStorage) {
        try {
          const sessionKeys = Object.keys(global.sessionStorage);
          const authSessionKeys = sessionKeys.filter((key: string) => {
            const lowerKey = key.toLowerCase();
            return (
              lowerKey.includes('supabase') || 
              lowerKey.startsWith('sb-') ||
              lowerKey.includes('auth') ||
              lowerKey.includes('token') ||
              lowerKey.includes('session') ||
              lowerKey.includes('user') ||
              lowerKey.includes('login')
            );
          });
          
          authSessionKeys.forEach((key: string) => {
            try {
              global.sessionStorage.removeItem(key);
            } catch (e) {
              // Ignore individual key removal errors
            }
          });
        } catch (e) {
          // sessionStorage might not be available
        }
      }

      // Clear any authentication cookies by setting them to expire
      if (global.document && global.document.cookie !== undefined && global.location) {
        const cookiesToClear = [
          'sb-access-token',
          'sb-refresh-token',
          'supabase-auth-token',
          'supabase.auth.token',
          'auth-token',
          'access_token',
          'refresh_token'
        ];

        cookiesToClear.forEach((cookieName: string) => {
          try {
            global.document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            global.document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${global.location.hostname};`;
            // Also try with leading dot for subdomain clearing
            global.document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${global.location.hostname};`;
          } catch (e) {
            // Ignore cookie clearing errors
          }
        });
      }

    } catch (error) {
      // Don't log errors in production
    }
  }

  /**
   * Clear React Native AsyncStorage
   */
  private static async clearNativeStorage(): Promise<void> {
    try {
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      
      // Filter for Supabase-related keys
      const supabaseKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('sb-') ||
        key.includes('@supabase') ||
        key.includes('auth')
      );

      // Remove Supabase-related keys
      if (supabaseKeys.length > 0) {
        await AsyncStorage.multiRemove(supabaseKeys);
      }

    } catch (error) {
      console.warn('Error clearing native storage:', error);
    }
  }

  /**
   * Force reload the app (web only)
   */
  static forceReload(): void {
    if (this.getPlatform() === 'web') {
      try {
        const global = globalThis as any;
        if (global.location && global.location.reload) {
          global.location.reload();
        }
      } catch (e) {
        // Ignore reload errors
      }
    }
  }

  /**
   * Check if we're running in a web browser
   */
  static isWeb(): boolean {
    return this.getPlatform() === 'web';
  }

  /**
   * Check if we're running on a mobile platform
   */
  static isMobile(): boolean {
    const platform = this.getPlatform();
    return platform === 'ios' || platform === 'android';
  }
}
