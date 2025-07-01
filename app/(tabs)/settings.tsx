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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  User, 
  Palette, 
  Bell, 
  Mic, 
  LogOut, 
  ChevronRight,
  Sun,
  Moon,
  Smartphone,
  Edit3,
  Save,
  X
} from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';

export default function SettingsTab() {
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
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: editingProfile.name.trim(),
        email: editingProfile.email.trim(),
      });
      
      setShowEditProfile(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
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
      Alert.alert('Error', error.message || 'Failed to sign out');
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
    if (profile) {
      try {
        await updateProfile({
          settings: {
            ...profile.settings,
            notifications: enabled,
          },
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to update notification setting');
      }
    }
  };

  const handleVoiceToggle = async (enabled: boolean) => {
    if (profile) {
      try {
        await updateProfile({
          settings: {
            ...profile.settings,
            voice_enabled: enabled,
          },
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to update voice setting');
      }
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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.cardForeground,
    },
    closeButton: {
      padding: 4,
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
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 20,
    },
    modalButton: {
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginLeft: 12,
    },
    cancelButton: {
      backgroundColor: colors.muted,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    destructiveButton: {
      backgroundColor: colors.destructive,
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
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
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
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.background}
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
                <X size={24} color={colors.cardForeground} />
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
              <Save size={18} color={colors.primaryForeground} />
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
              <Text style={styles.modalTitle}>Sign Out</Text>
              <TouchableOpacity
                onPress={() => setShowSignOutModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Are you sure you want to sign out of your account?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.cardForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.destructiveButton]}
                onPress={handleConfirmSignOut}
              >
                <Text style={[styles.modalButtonText, { color: colors.destructiveForeground }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}