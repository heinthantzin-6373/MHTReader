import { Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings, type ReaderMode } from '@/store/settings-store';

const OPTIONS: { mode: ReaderMode; title: string; body: string }[] = [
  {
    mode: 'images',
    title: 'Images only',
    body: 'Vertical manhwa strip — extracted chapter panels only (smoother, less chrome).',
  },
  {
    mode: 'fullPage',
    title: 'Full page',
    body: 'Load the saved .mht webpage in a browser view (includes original page layout).',
  },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { readerMode, setReaderMode } = useSettings();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <ThemedText style={styles.section}>Reader mode</ThemedText>
        <View style={styles.list}>
          {OPTIONS.map((option) => {
            const selected = readerMode === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => setReaderMode(option.mode)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: selected ? '#3c87f7' : 'transparent',
                  },
                ]}>
                <View style={styles.cardTop}>
                  <ThemedText style={styles.cardTitle}>{option.title}</ThemedText>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? '#3c87f7' : theme.textSecondary,
                        backgroundColor: selected ? '#3c87f7' : 'transparent',
                      },
                    ]}
                  />
                </View>
                <ThemedText themeColor="textSecondary" type="small">
                  {option.body}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  section: { fontWeight: '700', fontSize: 18 },
  list: { gap: Spacing.two },
  card: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: { fontWeight: '700', fontSize: 16, flex: 1 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
});
