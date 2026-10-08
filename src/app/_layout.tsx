import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { persistOptions, queryClient, queryPersister } from '@/api/query-client';
import { AppLock } from '@/components/app-lock';
import { configureNotifications } from '@/notifications/notifications';
import { usePushNotifications } from '@/notifications/use-push-notifications';
import { useAuthStore } from '@/store/auth';
import { usePrefsStore } from '@/store/prefs';
import { useAppTheme } from '@/theme/use-app-theme';

SplashScreen.preventAutoHideAsync();
configureNotifications();

/** Services that only run while signed in. */
function SignedInServices() {
  usePushNotifications();
  return <AppLock />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const prefsHydrated = usePrefsStore((s) => s.hydrated);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);
  const { scheme, colors } = useAppTheme();

  useEffect(() => {
    hydrate();
    hydratePrefs();
  }, [hydrate, hydratePrefs]);

  // Drop cached data from the previous user on sign-out.
  useEffect(() => {
    if (status !== 'signedOut') return;
    queryClient.clear();
    Promise.resolve(queryPersister.removeClient()).catch(() => {});
  }, [status]);

  const ready = (fontsLoaded || !!fontError) && status !== 'loading' && prefsHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const signedIn = status === 'signedIn';
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ThemeProvider
        value={{ ...navTheme, colors: { ...navTheme.colors, background: colors.background } }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="order/[id]/index" />
            <Stack.Screen name="order/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="order/[id]/edit" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
        {signedIn ? <SignedInServices /> : null}
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
