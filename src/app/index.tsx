import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { ManhwaCard } from '@/components/manhwa-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLibrary } from '@/store/library-store';

export default function LibraryScreen() {
  const theme = useTheme();
  const { ready, manhwas, createManhwa } = useLibrary();

  const onCreate = () => {
    const manhwa = createManhwa();
    router.push({ pathname: '/manhwa/[id]', params: { id: manhwa.id } });
  };

  if (!ready) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                name="settings-outline"
                accessibilityLabel="Settings"
                onPress={() => router.push('/settings')}
              />
              <IconButton
                name="add-circle-outline"
                accessibilityLabel="Create new"
                color="#3c87f7"
                size={28}
                onPress={onCreate}
              />
            </View>
          ),
        }}
      />
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        {manhwas.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="library-outline" size={56} color={theme.textSecondary} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Your library is empty
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Create a manhwa card, then import a folder of .mht chapters.
            </ThemedText>
            <Pressable
              onPress={onCreate}
              style={[styles.primaryButton, { backgroundColor: '#3c87f7' }]}>
              <Ionicons name="add" size={22} color="#fff" />
              <ThemedText style={styles.primaryLabel}>New manhwa</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={manhwas}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.cardSlot}>
                <ManhwaCard
                  manhwa={item}
                  onPress={() =>
                    router.push({ pathname: '/manhwa/[id]', params: { id: item.id } })
                  }
                />
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  list: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  row: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  cardSlot: {
    flex: 1,
    maxWidth: '50%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  emptyTitle: { textAlign: 'center', fontSize: 24, lineHeight: 30 },
  emptyBody: { textAlign: 'center', marginBottom: Spacing.two },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 999,
  },
  primaryLabel: { fontWeight: '700', color: '#fff' },
});
