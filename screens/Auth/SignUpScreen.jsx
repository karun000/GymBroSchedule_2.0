import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import Theme from './Theme';
import AuthInput from './AuthInput';
import PasswordStrength from './PasswordStrength';
import SocialButton from './SocialButton';
import { auth, signInWithGoogle } from '../../FireBase/firebase';
import { saveUserProfile } from '../../FireBase/records';

const getFriendlyAuthError = (error) => {
  const code = error?.code ?? '';

  if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
    return 'Enable Email/Password sign-in in Firebase Console > Authentication > Sign-in method.';
  }

  if (code === 'auth/missing-google-web-client-id') {
    return 'Add the Google Web client ID in FireBase/firebase.js before using Google login.';
  }

  return error?.message ?? 'Unable to create your account right now.';
};

const SignUpScreen = ({ navigation, onSwitchToSignIn }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSignUp = async () => {
    if (!agreeTerms) {
      Alert.alert('Terms required', 'Please accept the terms to create an account.');
      return;
    }

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing details', 'Fill in all fields to continue.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, {
        displayName: fullName.trim(),
      });
      await saveUserProfile({
        displayName: fullName.trim(),
        email: email.trim(),
      });
    } catch (error) {
      const message = getFriendlyAuthError(error);
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
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
            <Text style={styles.brandTagline}>Start your fitness journey today</Text>
          </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSubtitle}>Join thousands of fitness enthusiasts</Text>

          <AuthInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            iconName="account-outline"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <AuthInput
            inputRef={emailRef}
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
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          <PasswordStrength password={password} />

          <AuthInput
            inputRef={confirmRef}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            iconName={
              passwordsMatch
                ? 'lock-check-outline'
                : passwordsMismatch
                ? 'lock-alert-outline'
                : 'lock-outline'
            }
            secureEntry
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />

          {passwordsMismatch && (
            <View style={styles.errorRow}>
              <Icon name="alert-circle-outline" size={13} color={Theme.colors.error} />
              <Text style={styles.errorText}>Passwords do not match</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeTerms((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
              {agreeTerms && <Icon name="check" size={11} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, (!agreeTerms || loading) && styles.primaryBtnDisabled]}
            onPress={handleSignUp}
            activeOpacity={agreeTerms && !loading ? 0.85 : 1}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>CREATE ACCOUNT</Text>
                <Icon name="arrow-right" size={18} color="#fff" style={styles.primaryBtnIcon} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton
              iconName="google"
              label="Google"
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            />
            <SocialButton iconName="apple" label="Apple" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => {
              if (onSwitchToSignIn) {
                onSwitchToSignIn();
                return;
              }

              navigation?.navigate('SignIn');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Sign In</Text>
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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -8,
    marginBottom: Theme.spacing.md,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: Theme.font.xs,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: Theme.spacing.xl,
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
  termsText: {
    flex: 1,
    color: Theme.colors.textSub,
    fontSize: Theme.font.xs,
    lineHeight: 18,
  },
  termsLink: {
    color: Theme.colors.primary,
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

export default SignUpScreen;