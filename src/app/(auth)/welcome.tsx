import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { PillButton } from '@/components/pill-button';
import { WEB_URL } from '@/config';
import { spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';

export default function WelcomeScreen() {
  const { colors } = useAppTheme();

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          {/* Placeholder mark until the brand logo asset is supplied. */}
          <View style={[styles.logo, { borderColor: colors.textOnGradient }]}>
            <AppText variant="display" weight="bold" tone="onGradient">
              Z
            </AppText>
          </View>
          <AppText variant="heading" weight="semibold" tone="onGradient" style={styles.brand}>
            ZAPTRADE
          </AppText>
        </View>

        <View style={styles.bottom}>
          <AppText variant="display" weight="bold" tone="onGradient" style={styles.center}>
            Welcome Back
          </AppText>
          <AppText variant="label" tone="onGradientMuted" style={[styles.center, styles.tagline]}>
            Your Manual Bot, in your pocket.
          </AppText>
          <PillButton title="Sign in" variant="outline" onPress={() => router.push('/sign-in')} />
          <PillButton
            title="Sign up"
            variant="solid"
            onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/signup`)}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    letterSpacing: 6,
  },
  bottom: {
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
  tagline: {
    marginBottom: spacing.lg,
  },
});
