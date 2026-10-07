import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { usePrefsStore } from '@/store/prefs';

export type BiometricAvailability = 'available' | 'notEnrolled' | 'unavailable';

export async function biometricAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS === 'web') return 'unavailable';
  if (!(await LocalAuthentication.hasHardwareAsync())) return 'unavailable';
  return (await LocalAuthentication.isEnrolledAsync()) ? 'available' : 'notEnrolled';
}

/** Prompt Face ID / fingerprint, falling back to the device passcode. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use passcode',
  });
  return res.success;
}

/**
 * Gate a sensitive action (place / edit / delete / retry). Passes straight
 * through when biometric lock is off in Settings.
 */
export async function requireBiometric(reason: string): Promise<boolean> {
  if (!usePrefsStore.getState().biometricLock) return true;
  // If biometrics were removed from the device since enabling, fall back to
  // the passcode prompt rather than locking the user out.
  return authenticate(reason);
}
