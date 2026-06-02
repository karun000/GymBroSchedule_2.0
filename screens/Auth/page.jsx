import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth } from '../../FireBase/firebase';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import Theme from './Theme';
import AuthInput from './AuthInput';
import SocialButton from './SocialButton';
import { signInWithGoogle } from '../../FireBase/firebase';

const getFriendlyAuthError = (error) => {
  const code = error?.code ?? '';

  if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
    return 'Enable Email/Password sign-in in Firebase Console > Authentication > Sign-in method.';
  }
  if (code === 'auth/missing-google-web-client-id') {
    return 'Add the Google Web client ID in FireBase/firebase.js before using Google login.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Incorrect email or password.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please try again later.';
  }

  return error?.message ?? 'Unable to sign in right now.';
};

const SignInScreen = ({ navigation, onSwitchToSignUp }) => {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [remember, setRemember]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordRef = useRef(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password to continue.');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      Alert.alert('Sign in failed', getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Reset password', 'Enter your email address first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Reset email sent', 'Check your inbox for the password reset link.');
    } catch (error) {
      Alert.alert('Reset failed', getFriendlyAuthError(error));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      // No navigation needed — App.js onAuthStateChanged fires automatically
    } catch (error) {
      Alert.alert('Google sign in failed', getFriendlyAuthError(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <View style={styles.logoCircle}>
            <Icon name="dumbbell" size={32} color="#fff" />
          </View>
          <Text style={styles.brandName}>GymBro Schedule</Text>
          <Text style={styles.brandTagline}>Your personal fitness companion</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue your journey</Text>

          <AuthInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            iconName="email-outline"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <AuthInput
            inputRef={passwordRef}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            iconName="lock-outline"
            secureEntry
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
          />

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRemember((r) => !r)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, remember && styles.checkboxActive]}>
                {remember && <Icon name="check" size={11} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignIn}
            activeOpacity={loading ? 1 : 0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>SIGN IN</Text>
                <Icon name="arrow-right" size={18} color="#fff" style={styles.primaryBtnIcon} />
              </>
            )}
          </TouchableOpacity>

          {/* <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton
              iconName="google"
              label="Google"
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            />
          </View> */}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => {
              if (onSwitchToSignUp) {
                onSwitchToSignUp();
                return;
              }
              navigation?.navigate('SignUp');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.xl,
    justifyContent: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl + 4,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  brandName: {
    color: Theme.colors.text,
    fontSize: Theme.font.title,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  brandTagline: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.sm,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1.5,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xl,
  },
  cardTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.xxl,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.sm,
    marginBottom: Theme.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.inputBg,
  },
  checkboxActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  rememberText: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
  },
  forgotText: {
    color: Theme.colors.primary,
    fontSize: Theme.font.sm,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: Theme.spacing.xl,
  },
  primaryBtnDisabled: {
    opacity: 0.8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: Theme.font.base,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  primaryBtnIcon: {
    marginLeft: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.divider,
  },
  dividerText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.xs,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
  },
  footerLink: {
    color: Theme.colors.primary,
    fontSize: Theme.font.sm,
    fontWeight: '700',
  },
});

export default SignInScreen;