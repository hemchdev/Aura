import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useColors } from '@/hooks/useColors';

export default function SignIn() {
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth > 768;
  const isLargeScreen = screenWidth > 1024;

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'error' | 'success' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const { sendOTP, verifyOTP, loading, user, initialized } = useAuthStore();
  const router = useRouter();
  const colors = useColors();

  // Dynamic modal icons and colors based on status
  const getModalIcon = (status: 'success' | 'error' | 'info') => {
    const iconSize = isTablet ? 52 : 48;
    switch (status) {
      case 'success':
        return <CheckCircle size={iconSize} color={colors.primary} />;
      case 'error':
        return <AlertCircle size={iconSize} color={colors.destructive} />;
      case 'info':
        return <Info size={iconSize} color={colors.primary} />;
      default:
        return <Info size={iconSize} color={colors.primary} />;
    }
  };

  const getModalColors = (status: 'success' | 'error' | 'info') => {
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

  // Redirect to main app if user becomes authenticated
  useEffect(() => {
    if (initialized && user) {
      router.replace('/(tabs)');
    }
  }, [user, initialized, router]);

  const showErrorModal = (title: string, message: string) => {
    setModalType('error');
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };

  // const showSuccessModal = (title: string, message: string) => {
  //   setModalType('success');
  //   setModalTitle(title);
  //   setModalMessage(message);
  //   setShowModal(true);
  // };

  const showInfoModal = (title: string, message: string) => {
    setModalType('info');
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };

  const handleSendOTP = async () => {
    if (!email) {
      showErrorModal('Missing Information', 'Please enter your email address to continue.');
      return;
    }

    try {
      await sendOTP(email, false); // shouldCreateUser = false for sign in
      setOtpSent(true);
      showInfoModal(
        'Verification Code Sent', 
        'We&apos;ve sent a 6-digit verification code to your email address. Please check your inbox and enter the code below to sign in.'
      );
      
      // Auto-close the success modal after 2 seconds
      setTimeout(() => {
        setShowModal(false);
      }, 2000);
    } catch (error: any) {
      // Check if the error indicates the user doesn't exist
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('signup') || 
          errorMessage.includes('not allowed') || 
          errorMessage.includes('user not found') ||
          errorMessage.includes('only confirmed users') ||
          errorMessage.includes('invalid email')) {
        // Show redirect modal for new users
        setShowRedirectModal(true);
      } else {
        showErrorModal('Failed to Send Code', error.message || 'Unable to send verification code. Please check your email address and try again.');
      }
    }
  };

  const handleRedirectToSignUp = () => {
    setShowRedirectModal(false);
    // Pass the email as a parameter to pre-fill in sign-up
    router.push({
      pathname: '/(auth)/sign-up',
      params: { email: email }
    });
  };

  const handleVerifyOTP = async () => {
    if (!email || !otp) {
      showErrorModal('Missing Information', 'Please fill in all fields to sign in.');
      return;
    }

    if (otp.length !== 6) {
      showErrorModal('Invalid Code', 'Please enter the complete 6-digit verification code from your email.');
      return;
    }

    try {
      await verifyOTP(email, otp); // No name needed for existing users
      // Success is handled by auth state change
    } catch (error: any) {
      showErrorModal('Sign In Failed', error.message || 'The verification code is incorrect or has expired. Please try again or request a new code.');
      // Reset OTP field on error
      setOtp('');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: 40,
    },
    input: {
      backgroundColor: colors.input,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: '600',
    },
    linkContainer: {
      marginTop: 24,
      alignItems: 'center',
    },
    linkText: {
      color: colors.mutedForeground,
      fontSize: 14,
    },
    link: {
      color: colors.primary,
      fontWeight: '600',
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
      alignItems: 'center',
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
      width: '100%',
      marginBottom: isTablet ? 24 : 20,
    },
    modalTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: '700',
      color: colors.cardForeground,
    },
    closeButton: {
      padding: isTablet ? 8 : 6,
      borderRadius: isTablet ? 10 : 8,
      backgroundColor: colors.muted,
    },
    modalIcon: {
      marginBottom: isTablet ? 20 : 16,
    },
    modalMessage: {
      fontSize: isTablet ? 18 : 16,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: isTablet ? 26 : 24,
      marginBottom: isTablet ? 28 : 24,
    },
    modalButton: {
      backgroundColor: colors.primary,
      borderRadius: isTablet ? 12 : 10,
      paddingVertical: isTablet ? 16 : 14,
      paddingHorizontal: isTablet ? 36 : 32,
      minWidth: isTablet ? 120 : 100,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    modalButtonText: {
      color: colors.primaryForeground,
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
    },
    redirectModalActions: {
      flexDirection: isTablet ? 'row' : 'column',
      justifyContent: isTablet ? 'space-between' : 'center',
      gap: isTablet ? 12 : 8,
      marginTop: isTablet ? 20 : 16,
      width: '100%',
    },
    cancelButton: {
      backgroundColor: colors.muted,
      flex: isTablet ? 1 : undefined,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      flex: isTablet ? 1 : undefined,
    },
    cancelButtonText: {
      color: colors.cardForeground,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Aura</Text>
          <Text style={styles.subtitle}>
            {otpSent 
              ? 'Enter the 6-digit verification code from your email' 
              : 'Your AI-powered personal assistant'
            }
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!otpSent}
          />

          {otpSent && (
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit verification code"
              placeholderTextColor={colors.mutedForeground}
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
            />
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={otpSent ? handleVerifyOTP : handleSendOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading 
                ? (otpSent ? 'Verifying...' : 'Sending Code...') 
                : (otpSent ? 'Verify Code' : 'Send Verification Code')
              }
            </Text>
          </TouchableOpacity>

          {otpSent && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: 'transparent', marginTop: 12 }]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.primary }]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          )}

          {otpSent && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: 'transparent', marginTop: 8 }]}
              onPress={() => {
                setOtpSent(false);
                setOtp('');
              }}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.mutedForeground }]}>
                Change Email
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Don&apos;t have an account?{' '}
              <Link href="/(auth)/sign-up" style={styles.link}>
                Sign Up
              </Link>
            </Text>
          </View>
        </View>

        {/* Custom Modal */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: getModalColors(modalType).titleColor }]}>
                  {modalTitle}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowModal(false)}
                >
                  <X size={isTablet ? 26 : 24} color={colors.cardForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalIcon}>
                {getModalIcon(modalType)}
              </View>

              <Text style={styles.modalMessage}>{modalMessage}</Text>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Redirect to Sign Up Modal */}
        <Modal
          visible={showRedirectModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRedirectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Account Not Found</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowRedirectModal(false)}
                >
                  <X size={isTablet ? 26 : 24} color={colors.cardForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalIcon}>
                <Info size={isTablet ? 52 : 48} color={colors.primary} />
              </View>

              <Text style={styles.modalMessage}>
                It looks like you don&apos;t have an account yet. Would you like to create one?
              </Text>

              <View style={styles.redirectModalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowRedirectModal(false)}
                >
                  <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.primaryButton]}
                  onPress={handleRedirectToSignUp}
                >
                  <Text style={[styles.modalButtonText, styles.primaryButtonText]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}