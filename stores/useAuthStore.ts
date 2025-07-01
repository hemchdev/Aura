import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { PlatformUtils } from '@/lib/platformUtils';
import { Platform } from 'react-native';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  sendOTP: (email: string, shouldCreateUser?: boolean) => Promise<void>;
  verifyOTP: (email: string, token: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  ensureProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();            if (error && error.code !== 'PGRST116') {
              // Silently handle profile fetch errors during init
            }

          const profileData = profile || null;
          set({ 
            user: session.user, 
            session, 
            profile: profileData,
            initialized: true 
          });
          
          // If no profile exists but user is authenticated, create profile
          if (!profileData) {
            try {
              await get().ensureProfile();
            } catch (error) {
              // Silently handle failed profile creation during init
            }
          }
        } catch (profileError) {
          // Silently handle profile errors during init
          set({ 
            user: session.user, 
            session, 
            profile: null,
            initialized: true 
          });
        }
      } else {
        set({ initialized: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error && error.code !== 'PGRST116') {
              // PGRST116 is "not found" which is okay for new users
              // Silently handle other profile fetch errors
            }

            const profileData = profile || null;
            set({ 
              user: session.user, 
              session, 
              profile: profileData 
            });
            
            // If no profile exists, create one
            if (!profileData) {
              try {
                await get().ensureProfile();
              } catch (error) {
                // Silently handle failed profile creation during auth state change
              }
            }
          } catch (profileError) {
            // Silently handle profile errors
            set({ 
              user: session.user, 
              session, 
              profile: null 
            });
          }
        } else {
          set({ 
            user: null, 
            session: null, 
            profile: null 
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ initialized: true });
    }
  },

  sendOTP: async (email: string, shouldCreateUser: boolean = true) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser,
          emailRedirectTo: 'aura://auth/confirm',
        },
      });
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send OTP');
    } finally {
      set({ loading: false });
    }
  },

  verifyOTP: async (email: string, token: string, name?: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      
      if (error) throw error;
      
      // Always ensure profile exists for the user
      if (data.user && data.session) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        let profileData = existingProfile;
        
        if (!existingProfile) {
          // Create profile with name if provided, otherwise use email
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              name: name || data.user.email!.split('@')[0], // Use name or fallback to email prefix
              settings: {
                theme: 'system',
                notifications: true,
                voice_enabled: true,
                language: 'en'
              }
            })
            .select()
            .single();
          
          if (profileError) {
            console.error('Profile creation error:', profileError);
            throw new Error('Failed to create user profile');
          }
          
          profileData = newProfile;
        }
        
        // Update local state immediately
        set({ 
          user: data.user, 
          session: data.session, 
          profile: profileData 
        });
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to verify OTP');
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      // Clear platform-specific storage first (localStorage, cookies, AsyncStorage)
      await PlatformUtils.clearAuthStorage();
      
      // Sign out from Supabase with scope 'global' to ensure all sessions are cleared
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      // Always clear local state regardless of Supabase response
      // This ensures the UI updates immediately
      set({ 
        user: null,
        session: null,
        profile: null
      });
      
      // Explicitly clear Supabase token from localStorage on web, as it can sometimes persist.
      if (Platform.OS === 'web') {
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
            const storageKey = `sb-${projectRef}-auth-token`;
            localStorage.removeItem(storageKey);
          }
        } catch (error) {
          console.error('Error clearing Supabase token from localStorage:', error);
        }
      }
      
      if (error) {
        // Log the error but don't throw it since we've already cleared local state
        // Silent handling for production
      }
      
      // For web browsers, optionally force a reload to ensure complete cleanup
      if (PlatformUtils.isWeb()) {
        // Small delay to allow state updates to complete
        setTimeout(() => {
          PlatformUtils.forceReload();
        }, 100);
      }
      
    } catch (error: any) {
      // Clear local state even if there's an error
      set({ 
        user: null,
        session: null,
        profile: null
      });
      
      // Even if there's an error, try to clear platform storage
      try {
        await PlatformUtils.clearAuthStorage();
      } catch (storageError) {
        // Silent handling for storage clearing errors
      }
      
      // Silent handling for production
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      set({ profile: data });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  },

  ensureProfile: async () => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.email!.split('@')[0], // Use email prefix as fallback name
            settings: {
              theme: 'system',
              notifications: true,
              voice_enabled: true,
              language: 'en'
            }
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }
        set({ profile: newProfile });
        return newProfile;
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Profile exists, update local state
        set({ profile: existingProfile });
        return existingProfile;
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to ensure profile exists');
    }
  },
}));