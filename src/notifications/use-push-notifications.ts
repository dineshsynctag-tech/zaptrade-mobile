import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { registerDevice, unregisterDevice } from '@/api/endpoints';
import { queryKeys } from '@/api/query-client';
import { IS_MOCK } from '@/config';
import { usePrefsStore } from '@/store/prefs';
import { orderNotification } from '@/utils/notification-text';
import { getPushToken, requestPermission, showLocal, supported } from './notifications';

let registeredToken: string | null = null;

/** Remove this device's push token from the server (call before sign-out). */
export async function unregisterPush() {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await unregisterDevice(token).catch(() => {});
}

/**
 * Mount once while signed in:
 *  - asks for permission and registers the Expo push token (+ per-type toggles)
 *  - mock mode: turns simulated bot events into local notifications
 *  - opens the order when a notification is tapped (warm or cold start)
 */
export function usePushNotifications() {
  const qc = useQueryClient();
  const notify = usePrefsStore((s) => s.notify);
  const hydrated = usePrefsStore((s) => s.hydrated);

  // Register / refresh the device whenever the toggles change.
  useEffect(() => {
    if (!supported || !hydrated) return;
    let cancelled = false;
    (async () => {
      if (!(await requestPermission())) return;
      const token = await getPushToken();
      if (!token || cancelled) return;
      await registerDevice({ token, platform: Platform.OS as 'ios' | 'android', notify });
      registeredToken = token;
    })().catch(() => {
      // Push is best-effort: the app works without it, and we retry on next toggle change / launch.
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, notify]);

  // Mock backend: the simulator stands in for the server's push hook.
  useEffect(() => {
    if (!IS_MOCK) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { onBotEvent } = require('@/api/mock/simulator') as typeof import('@/api/mock/simulator');
    return onBotEvent((e) => {
      showLocal(orderNotification(e.type, e.order)).catch(() => {});
      qc.invalidateQueries({ queryKey: queryKeys.allOrders });
      qc.invalidateQueries({ queryKey: queryKeys.order(e.order.id) });
    });
  }, [qc]);

  // Tap → order detail. Handles taps that launched the app too.
  const last = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!last) return;
    const id = last.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const orderId = (last.notification.request.content.data as { orderId?: string } | undefined)?.orderId;
    if (orderId) router.push({ pathname: '/order/[id]', params: { id: orderId } });
  }, [last]);
}
