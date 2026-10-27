import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LibraryProvider, useLibrary } from '@/store/library-store';
import { SettingsProvider, useSettings } from '@/store/settings-store';

SplashScreen.preventAutoHideAsync();

function SplashGate({ children }: { children: React.ReactNode }) {
  const { ready: libraryReady } = useLibrary();
  const { ready: settingsReady } = useSettings();

  useEffect(() => {
    if (libraryReady && settingsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [libraryReady, settingsReady]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <LibraryProvider>
          <SplashGate>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen
                  name="index"
                  options={{ title: 'Library', headerLargeTitle: true }}
                />
                <Stack.Screen name="settings" options={{ title: 'Settings' }} />
                <Stack.Screen name="manhwa/[id]" options={{ headerShown: false }} />
                <Stack.Screen
                  name="reader/[chapterId]"
                  options={{
                    title: 'Reader',
                    headerShown: false,
                    animation: 'fade',
                    contentStyle: { backgroundColor: '#000' },
                  }}
                />
              </Stack>
            </ThemeProvider>
          </SplashGate>
        </LibraryProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
