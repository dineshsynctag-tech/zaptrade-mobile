/**
 * expo-notifications setup: foreground presentation, the Android channel,
 * permission, Expo push token, and local notifications (mock mode / tests).
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { usePrefsStore } from '@/store/prefs';
import type { NotificationKind, OrderNotification } from '@/utils/notification-text';

export const ORDERS_CHANNEL = 'orders';
export const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function kindOf(data: unknown): NotificationKind | undefined {
  return (data as { kind?: NotificationKind } | undefined)?.kind;
}

function isEnabled(kind: NotificationKind | undefined): boolean {
  return !kind || usePrefsStore.getState().notify[kind] !== false;
}

let configured = false;

/** Call once at startup, before any notification can arrive. */
export function configureNotifications() {
  if (configured || !supported) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const show = isEnabled(kindOf(n.request.content.data));
      return { shouldPlaySound: show, shouldSetBadge: false, shouldShowBanner: show, shouldShowList: show };
    },
  });
}

/** Android 13+ needs the channel before the permission prompt. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL, {
    name: 'Order updates',
    description: 'Buy fills, sell fills, rejections and expired orders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C8102E',
  });
}

export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/**
 * Expo push token for this device, or null when remote push is unavailable:
 * no EAS projectId yet, Expo Go on Android (SDK 53+), simulators, or errors.
 */
export async function getPushToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/** Show a notification immediately on this device (mock mode, test button). */
export async function showLocal(n: OrderNotification) {
  if (!supported || !isEnabled(n.data.kind)) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: n.title, body: n.body, data: n.data },
    trigger: Platform.OS === 'android' ? { channelId: ORDERS_CHANNEL } : null,
  });
}
