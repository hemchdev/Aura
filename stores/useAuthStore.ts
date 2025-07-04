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
  sendOTP: (email: string, shouldCreateUser?: boolean, name?: string) => Promise<void>;
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

  sendOTP: async (email: string, shouldCreateUser: boolean = true, name?: string) => {
    set({ loading: true });
    try {
      const options: any = {
        shouldCreateUser,
        emailRedirectTo: 'aura://auth/confirm',
      };
      
      // If name is provided and we're creating a user, include it in metadata
      if (shouldCreateUser && name && name.trim()) {
        options.data = {
          name: name.trim(),
          full_name: name.trim()
        };
      }
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options,
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
        // First, update local state with user and session
        set({ 
          user: data.user, 
          session: data.session
        });

        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        let profileData = existingProfile;
        
        if (!existingProfile) {
          // Create profile with name if provided, otherwise use email prefix
          const profileName = name && name.trim() ? name.trim() : data.user.email!.split('@')[0];
          
          console.log('Creating new profile with name:', profileName);
          
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              name: profileName,
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
          
          console.log('Profile created successfully:', newProfile);
          profileData = newProfile;
        } else if (name && name.trim() && existingProfile.name !== name.trim()) {
          // If profile exists but name is different, update it
          console.log('Updating existing profile name from:', existingProfile.name, 'to:', name.trim());
          
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ name: name.trim() })
            .eq('id', data.user.id)
            .select()
            .single();
          
          if (updateError) {
            console.error('Profile update error:', updateError);
          } else {
            console.log('Profile updated successfully:', updatedProfile);
            profileData = updatedProfile;
          }
        }
        
        // Update local state with profile
        set({ profile: profileData });
        
        console.log('Final profile state:', profileData);
      }
    } catch (error: any) {
      console.error('verifyOTP error:', error);
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
        // Try to extract a proper name from user metadata first
        const fallbackName = user.user_metadata?.name || 
                            user.user_metadata?.full_name || 
                            user.email!.split('@')[0];
        
        console.log('Creating profile with fallback name:', fallbackName);
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            name: fallbackName,
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
          console.error('Profile creation error in ensureProfile:', createError);
          throw createError;
        }
        
        console.log('Profile created in ensureProfile:', newProfile);
        set({ profile: newProfile });
        return newProfile;
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Profile exists, update local state
        console.log('Profile found in ensureProfile:', existingProfile);
        set({ profile: existingProfile });
        return existingProfile;
      }
    } catch (error: any) {
      console.error('ensureProfile error:', error);
      throw new Error(error.message || 'Failed to ensure profile exists');
    }
  },
}));