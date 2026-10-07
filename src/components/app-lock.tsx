import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { authenticate } from '@/hooks/biometrics';
import { usePrefsStore } from '@/store/prefs';
import { spacing } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';
import { PillButton } from './pill-button';

/** Re-lock after the app has been in the background this long. */
const RELOCK_AFTER_MS = 60_000;

/**
 * Full-screen lock over the signed-in app when biometric lock is on:
 * at cold start and when returning after a minute in the background.
 */
export function AppLock() {
  const { colors } = useAppTheme();
  const enabled = usePrefsStore((s) => s.biometricLock);
  const [locked, setLocked] = useState(enabled);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      if (await authenticate('Unlock ZapTrade')) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!usePrefsStore.getState().biometricLock) return;
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state === 'active' && backgroundedAt.current !== null) {
        if (Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  // Prompt automatically whenever the lock appears.
  useEffect(() => {
    if (locked && enabled) unlock();
  }, [locked, enabled, unlock]);

  if (!locked || !enabled) return null;

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}>
      <View style={styles.content}>
        <AppText variant="display" weight="bold" tone="onGradient">
          Locked
        </AppText>
        <AppText variant="label" tone="onGradientMuted" style={styles.center}>
          Unlock with Face ID, fingerprint or your device passcode.
        </AppText>
        <PillButton title="Unlock" variant="solid" onPress={unlock} style={styles.button} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xl,
  },
});
