import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { login } from '@/api/endpoints';
import { AppText } from '@/components/app-text';
import { DecorCircles } from '@/components/decor-circles';
import { PillButton } from '@/components/pill-button';
import { UnderlineInput } from '@/components/underline-input';
import { IS_MOCK, WEB_URL } from '@/config';
import { useAuthStore } from '@/store/auth';
import { radius, spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((s) => s.signIn);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState(IS_MOCK ? 'demo@zaptrade.ai' : '');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && password.length > 0;

  const mutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: signIn, // the root layout's guard swaps to the tabs
  });

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong. Please try again.'
        : null;

  const submit = () => {
    setSubmitted(true);
    if (canSubmit && !mutation.isPending) mutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.xxl }]}>
        <AppText variant="display" weight="bold" tone="onGradient">
          Hello{'\n'}Sign in!
        </AppText>
      </LinearGradient>

      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <DecorCircles />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + spacing.xl }]}>
          <UnderlineInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            valid={emailValid}
            error={submitted && !emailValid ? 'Enter a valid email' : null}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <UnderlineInput
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureToggle
            error={submitted && !password ? 'Enter your password' : null}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <Pressable
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/forgot-password`)}
            style={styles.forgot}>
            <AppText variant="label" weight="medium">
              Forgot password?
            </AppText>
          </Pressable>

          {errorMessage ? (
            <AppText variant="label" tone="danger" accessibilityLiveRegion="polite">
              {errorMessage}
            </AppText>
          ) : null}

          <PillButton title="Sign in" onPress={submit} loading={mutation.isPending} />

          {IS_MOCK ? (
            <AppText variant="caption" tone="muted" style={styles.hint}>
              Mock mode · demo@zaptrade.ai / demo1234
            </AppText>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + radius.sheet,
  },
  sheet: {
    flex: 1,
    marginTop: -radius.sheet,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  form: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.xl,
  },
  forgot: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: -spacing.md,
  },
  hint: {
    textAlign: 'center',
  },
});
