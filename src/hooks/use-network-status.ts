import { useNetInfo } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Alert, Platform } from 'react-native';

/** True only when the device is known to be offline (unknown counts as online). */
export function useIsOffline(): boolean {
  const net = useNetInfo();
  if (Platform.OS === 'web') return typeof navigator !== 'undefined' && navigator.onLine === false;
  return net.isConnected === false;
}

/** Gate for order changes: alerts and returns false when offline. */
export function ensureOnline(): boolean {
  if (onlineManager.isOnline()) return true;
  Alert.alert('You’re offline', 'Reconnect to place, change or cancel orders.');
  return false;
}
