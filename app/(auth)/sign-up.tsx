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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { X, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useColors } from '@/hooks/useColors';

export default function SignUp() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(emailParam || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'error' | 'success' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const { sendOTP, verifyOTP, loading, user, initialized } = useAuthStore();
  const router = useRouter();
  const colors = useColors();

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

  const showSuccessModal = (title: string, message: string) => {
    setModalType('success');
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };

  const showInfoModal = (title: string, message: string) => {
    setModalType('info');
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };

  const handleSendOTP = async () => {
    if (!name || !email) {
      showErrorModal('Missing Information', 'Please enter your name and email address to continue.');
      return;
    }

    try {
      await sendOTP(email, true, name); // Pass name to sendOTP
      setOtpSent(true);
      showInfoModal(
        'Verification Code Sent', 
        'We\'ve sent a 6-digit verification code to your email address. Please check your inbox and enter the code below to create your account.'
      );
      
      // Auto-close the success modal after 2 seconds
      setTimeout(() => {
        setShowModal(false);
      }, 2000);
    } catch (error: any) {
      showErrorModal('Failed to Send Code', error.message || 'Unable to send verification code. Please check your email address and try again.');
    }
  };

  const handleVerifyOTP = async () => {
    if (!name || !email || !otp) {
      showErrorModal('Missing Information', 'Please fill in all fields to complete your registration.');
      return;
    }

    if (otp.length !== 6) {
      showErrorModal('Invalid Code', 'Please enter the complete 6-digit verification code from your email.');
      return;
    }

    try {
      await verifyOTP(email, otp, name);
      showSuccessModal('Welcome to Aura!', 'Your account has been created successfully. You can now start using Aura to manage your tasks and reminders.');
    } catch (error: any) {
      showErrorModal('Verification Failed', error.message || 'The verification code is incorrect or has expired. Please try again or request a new code.');
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
      alignItems: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.cardForeground,
    },
    closeButton: {
      padding: 4,
    },
    modalIcon: {
      marginBottom: 16,
    },
    modalMessage: {
      fontSize: 16,
      color: colors.cardForeground,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    modalButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 32,
      minWidth: 100,
      alignItems: 'center',
    },
    modalButtonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Join Aura</Text>
          <Text style={styles.subtitle}>
            {otpSent 
              ? 'Enter the 6-digit verification code from your email' 
              : 'Create your account and get started'
            }
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
          />

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
              Already have an account?{' '}
              <Link href="/(auth)" style={styles.link}>
                Sign In
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
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowModal(false)}
                >
                  <X size={24} color={colors.cardForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalIcon}>
                {modalType === 'error' && (
                  <AlertCircle size={48} color={colors.destructive} />
                )}
                {modalType === 'success' && (
                  <CheckCircle size={48} color={colors.primary} />
                )}
                {modalType === 'info' && (
                  <CheckCircle size={48} color={colors.primary} />
                )}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}