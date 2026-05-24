import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-warm icon assets for Android
        await Asset.loadAsync([
          require('../assets/images/favicon.png'),
          require('../assets/images/icon.png'),
          require('../assets/images/adaptive-icon.png'),
        ]);
      } catch (e) {
        console.warn('Asset loading error:', e);
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
