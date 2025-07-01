import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useColors } from '@/hooks/useColors';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const { sendOTP, verifyOTP, loading, user, initialized } = useAuthStore();
  const router = useRouter();
  const colors = useColors();

  // Redirect to main app if user becomes authenticated
  useEffect(() => {
    if (initialized && user) {
      router.replace('/(tabs)');
    }
  }, [user, initialized, router]);

  const handleSendOTP = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Please enter your name and email address');
      return;
    }

    try {
      await sendOTP(email, true); // shouldCreateUser = true for sign up
      setOtpSent(true);
      Alert.alert(
        'Choose Your Sign-Up Method', 
        'We\'ve sent you an email with two options:\n\n1. Enter the 6-digit code below\n2. Or click the magic link in your email\n\nBoth will work to create your account!',
        [{ text: 'Got it!' }]
      );
    } catch (error: any) {
      Alert.alert('Failed to Send OTP', error.message);
    }
  };

  const handleVerifyOTP = async () => {
    if (!name || !email || !otp) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyOTP(email, otp, name);
      Alert.alert('Success', 'Account created successfully! Welcome to Aura!');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
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
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Join Aura</Text>
        <Text style={styles.subtitle}>
          {otpSent 
            ? 'Enter the 6-digit code from your email, or click the magic link sent to you' 
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
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              placeholderTextColor={colors.mutedForeground}
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
            />
            <Text style={[styles.linkText, { textAlign: 'center', marginBottom: 16 }]}>
              💡 You can also click the magic link in the email instead of entering the code
            </Text>
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={otpSent ? handleVerifyOTP : handleSendOTP}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading 
              ? (otpSent ? 'Verifying...' : 'Sending Email...') 
              : (otpSent ? 'Verify Code' : 'Send Login Email')
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
              Resend Email
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
    </KeyboardAvoidingView>
  );
}