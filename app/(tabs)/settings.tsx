import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  User, 
  Palette, 
  Bell, 
  Mic, 
  LogOut, 
  X, 
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  ChevronRight,
  Sun,
  Moon,
  Smartphone,
  Edit3
} from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { notificationService } from '@/lib/notificationService';
import { speechService } from '@/lib/speech';

export default function SettingsTab() {
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth > 768;
  const isLargeScreen = screenWidth > 1024;
  const colors = useColors();
  const { user, profile, signOut, updateProfile } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  
  // Profile editing state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    name: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Dynamic modal icons and colors based on status
  const getModalIcon = (status: 'success' | 'error' | 'warning' | 'info') => {
    const iconSize = isTablet ? 28 : 24;
    switch (status) {
      case 'success':
        return <CheckCircle size={iconSize} color={colors.primary} />;
      case 'error':
        return <XCircle size={iconSize} color={colors.destructive} />;
      case 'warning':
        return <AlertCircle size={iconSize} color="#f59e0b" />;
      case 'info':
        return <Info size={iconSize} color={colors.primary} />;
      default:
        return <Info size={iconSize} color={colors.primary} />;
    }
  };

  const getModalColors = (status: 'success' | 'error' | 'warning' | 'info') => {
    switch (status) {
      case 'success':
        return {
          iconColor: colors.primary,
          titleColor: colors.cardForeground,
          messageColor: colors.mutedForeground,
        };
      case 'error':
        return {
          iconColor: colors.destructive,
          titleColor: colors.destructive,
          messageColor: colors.mutedForeground,
        };
      case 'warning':
        return {
          iconColor: '#f59e0b',
          titleColor: '#f59e0b',
          messageColor: colors.mutedForeground,
        };
      case 'info':
        return {
          iconColor: colors.primary,
          titleColor: colors.cardForeground,
          messageColor: colors.mutedForeground,
        };
      default:
        return {
          iconColor: colors.primary,
          titleColor: colors.cardForeground,
          messageColor: colors.mutedForeground,
        };
    }
  };

  const openEditProfile = () => {
    if (profile) {
      setEditingProfile({
        name: profile.name || '',
        email: profile.email || '',
      });
      setShowEditProfile(true);
    }
  };

  const saveProfile = async () => {
    if (!editingProfile.name.trim()) {
      setModalMessage('Name is required');
      setShowErrorModal(true);
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: editingProfile.name.trim(),
        email: editingProfile.email.trim(),
      });
      
      setShowEditProfile(false);
      setModalMessage('Profile updated successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      setModalMessage(error.message || 'Failed to update profile');
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = async () => {
    try {
      await signOut();
      setShowSignOutModal(false);
      // Force navigation to auth screen after successful sign out
      router.replace('/(auth)');
    } catch (error: any) {
      setModalMessage(error.message || 'Failed to sign out');
      setShowErrorModal(true);
      setShowSignOutModal(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    
    // Update profile if available - don't block theme change if this fails
    if (profile) {
      updateProfile({
        settings: {
          ...profile.settings,
          theme: newTheme,
        },
      }).catch(error => {
        // Silently fail theme update to profile - don't block UI theme change
      });
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!profile) {
      setModalMessage('Profile not loaded. Please try again.');
      setShowErrorModal(true);
      return;
    }

    try {
      // Optimistically update the UI first
      const previousSettings = profile.settings;
      
      await updateProfile({
        settings: {
          ...profile.settings,
          notifications: enabled,
        },
      });

      // Initialize notification service if enabling notifications
      if (enabled) {
        await notificationService.initialize();
        await notificationService.setupNotificationCategories();
      }
      
    } catch (error: any) {
      console.error('Failed to update notification setting:', error);
      setModalMessage('Failed to update notification setting. Please try again.');
      setShowErrorModal(true);
      
      // Revert the optimistic update if needed
      try {
        await updateProfile({
          settings: {
            ...profile.settings,
            notifications: !enabled, // Revert
          },
        });
      } catch (revertError) {
        console.error('Failed to revert notification setting:', revertError);
      }
    }
  };

  const handleVoiceToggle = async (enabled: boolean) => {
    if (!profile) {
      setModalMessage('Profile not loaded. Please try again.');
      setShowErrorModal(true);
      return;
    }

    try {
      await updateProfile({
        settings: {
          ...profile.settings,
          voice_enabled: enabled,
        },
      });

      // Test speech synthesis if enabling voice
      if (enabled) {
        try {
          // Test with a short message
          await speechService.speak('Voice assistant enabled');
        } catch (speechError) {
          console.warn('Speech test failed:', speechError);
          // Don't revert the setting, just warn
        }
      }
      
    } catch (error: any) {
      console.error('Failed to update voice setting:', error);
      setModalMessage('Failed to update voice setting. Please try again.');
      setShowErrorModal(true);
    }
  };

  const getThemeIcon = (themeType: string) => {
    switch (themeType) {
      case 'light':
        return <Sun size={20} color={colors.mutedForeground} />;
      case 'dark':
        return <Moon size={20} color={colors.mutedForeground} />;
      default:
        return <Smartphone size={20} color={colors.mutedForeground} />;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.foreground,
    },
    scrollContainer: {
      flex: 1,
    },
    section: {
      marginTop: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    editButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingIcon: {
      marginRight: 16,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.cardForeground,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    settingAction: {
      marginLeft: 12,
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedThemeOption: {
      borderColor: colors.primary,
    },
    themeOptionContent: {
      flex: 1,
      marginLeft: 12,
    },
    themeOptionTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.cardForeground,
    },
    themeOptionDescription: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    profileInfo: {
      padding: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.cardForeground,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    signOutButton: {
      margin: 20,
      padding: 16,
      backgroundColor: colors.destructive,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    signOutText: {
      color: colors.destructiveForeground,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isTablet ? 32 : 20,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: isTablet ? 20 : 16,
      padding: isTablet ? 28 : 24,
      width: '100%',
      maxWidth: isTablet ? 500 : 400,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isTablet ? 24 : 20,
    },
    modalTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: '700',
      color: colors.cardForeground,
    },
    modalIcon: {
      alignItems: 'center',
      marginBottom: isTablet ? 20 : 16,
    },
    modalMessage: {
      fontSize: isTablet ? 18 : 16,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: isTablet ? 26 : 24,
      marginBottom: isTablet ? 28 : 24,
    },
    closeButton: {
      padding: isTablet ? 8 : 6,
      borderRadius: isTablet ? 10 : 8,
      backgroundColor: colors.muted,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.cardForeground,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.cardForeground,
      backgroundColor: colors.background,
    },
    disabledInput: {
      backgroundColor: colors.muted,
      color: colors.mutedForeground,
    },
    inputHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      marginTop: 8,
    },
    disabledButton: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    modalText: {
      fontSize: 16,
      color: colors.cardForeground,
      marginBottom: 24,
      lineHeight: 24,
    },
    modalActions: {
      flexDirection: isTablet ? 'row' : 'column',
      justifyContent: isTablet ? 'flex-end' : 'center',
      gap: isTablet ? 12 : 8,
      marginTop: isTablet ? 24 : 20,
    },
    modalButton: {
      borderRadius: isTablet ? 12 : 10,
      paddingVertical: isTablet ? 16 : 14,
      paddingHorizontal: isTablet ? 24 : 20,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: isTablet ? 120 : 100,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.muted,
    },
    destructiveButton: {
      backgroundColor: colors.destructive,
    },
    modalButtonText: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: colors.primaryForeground,
    },
    cancelButtonText: {
      color: colors.cardForeground,
    },
    destructiveButtonText: {
      color: colors.destructiveForeground,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={openEditProfile}
            >
              <Edit3 size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appearance</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.themeOption, theme === 'light' && styles.selectedThemeOption]}
            onPress={() => handleThemeChange('light')}
          >
            <Sun size={20} color={colors.mutedForeground} />
            <View style={styles.themeOptionContent}>
              <Text style={styles.themeOptionTitle}>Light</Text>
              <Text style={styles.themeOptionDescription}>Always use light theme</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.themeOption, theme === 'dark' && styles.selectedThemeOption]}
            onPress={() => handleThemeChange('dark')}
          >
            <Moon size={20} color={colors.mutedForeground} />
            <View style={styles.themeOptionContent}>
              <Text style={styles.themeOptionTitle}>Dark</Text>
              <Text style={styles.themeOptionDescription}>Always use dark theme</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.themeOption, theme === 'system' && styles.selectedThemeOption]}
            onPress={() => handleThemeChange('system')}
          >
            <Smartphone size={20} color={colors.mutedForeground} />
            <View style={styles.themeOptionContent}>
              <Text style={styles.themeOptionTitle}>System</Text>
              <Text style={styles.themeOptionDescription}>Follow system settings</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Bell size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive reminder and event notifications
              </Text>
            </View>
            <Switch
              value={profile?.settings?.notifications ?? true}
              onValueChange={handleNotificationToggle}
              trackColor={{ 
                false: colors.mutedForeground + '40', // 40 = 25% opacity
                true: colors.primary + '80' // 80 = 50% opacity for track
              }}
              thumbColor={
                profile?.settings?.notifications 
                  ? colors.primary 
                  : colors.background
              }
              ios_backgroundColor={colors.mutedForeground + '40'}
              style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Mic size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Voice Assistant</Text>
              <Text style={styles.settingDescription}>
                Enable voice commands and responses
              </Text>
            </View>
            <Switch
              value={profile?.settings?.voice_enabled ?? true}
              onValueChange={handleVoiceToggle}
              trackColor={{ 
                false: colors.mutedForeground + '40', // 40 = 25% opacity
                true: colors.primary + '80' // 80 = 50% opacity for track
              }}
              thumbColor={
                profile?.settings?.voice_enabled 
                  ? colors.primary 
                  : colors.background
              }
              ios_backgroundColor={colors.mutedForeground + '40'}
              style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={18} color={colors.destructiveForeground} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Edit Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setShowEditProfile(false)}
                style={styles.closeButton}
              >
                <X size={isTablet ? 26 : 24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                value={editingProfile.name}
                onChangeText={(text) => setEditingProfile(prev => ({ ...prev, name: text }))}
                placeholder="Enter your name"
                placeholderTextColor={colors.mutedForeground}
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={editingProfile.email}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                editable={false}
              />
              <Text style={styles.inputHint}>Email cannot be changed</Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.disabledButton]} 
              onPress={saveProfile}
              disabled={saving}
            >
              <Save size={isTablet ? 20 : 18} color={colors.primaryForeground} />
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: getModalColors('warning').titleColor }]}>
                Sign Out
              </Text>
              <TouchableOpacity
                onPress={() => setShowSignOutModal(false)}
                style={styles.closeButton}
              >
                <X size={isTablet ? 26 : 24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              {getModalIcon('warning')}
            </View>

            <Text style={styles.modalMessage}>
              Are you sure you want to sign out of your account?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.destructiveButton]}
                onPress={handleConfirmSignOut}
              >
                <Text style={[styles.modalButtonText, styles.destructiveButtonText]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: getModalColors('success').titleColor }]}>
                Success
              </Text>
              <TouchableOpacity
                onPress={() => setShowSuccessModal(false)}
                style={styles.closeButton}
              >
                <X size={isTablet ? 26 : 24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              {getModalIcon('success')}
            </View>

            <Text style={styles.modalMessage}>
              {modalMessage}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.primaryButtonText]}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: getModalColors('error').titleColor }]}>
                Error
              </Text>
              <TouchableOpacity
                onPress={() => setShowErrorModal(false)}
                style={styles.closeButton}
              >
                <X size={isTablet ? 26 : 24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              {getModalIcon('error')}
            </View>

            <Text style={styles.modalMessage}>
              {modalMessage}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.primaryButtonText]}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}