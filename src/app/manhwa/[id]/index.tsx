import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChapterRow } from '@/components/chapter-row';
import { IconButton } from '@/components/icon-button';
import { ImportSourceDialog } from '@/components/import-source-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  importMhtFilesIntoManhwa,
  pickMhtSources,
  type ImportSourceKind,
} from '@/lib/import';
import { useLibrary } from '@/store/library-store';

export default function ManhwaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { getManhwa, updateManhwa, setChapters, deleteManhwa } = useLibrary();
  const manhwa = getManhwa(id);

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);

  const chapters = useMemo(
    () => (manhwa ? [...manhwa.chapters].sort((a, b) => a.number - b.number) : []),
    [manhwa]
  );

  const continueChapter = useMemo(() => {
    if (!manhwa || chapters.length === 0) return null;
    if (manhwa.lastChapterId) {
      return chapters.find((c) => c.id === manhwa.lastChapterId) ?? chapters[0];
    }
    return chapters[0];
  }, [manhwa, chapters]);

  const hasProgress = Boolean(
    manhwa?.lastChapterId && chapters.some((c) => c.id === manhwa.lastChapterId)
  );

  const openImportDialog = useCallback(() => {
    if (!manhwa || importing) return;
    setShowImportDialog(true);
  }, [manhwa, importing]);

  const runImport = useCallback(
    async (kind: ImportSourceKind) => {
      if (!manhwa) return;
      setShowImportDialog(false);

      try {
        const picked = await pickMhtSources(kind);
        if (picked.canceled) return;
        if (picked.files.length === 0) {
          Alert.alert('No .mht files', 'The selection did not contain any .mht / .mhtml chapters.');
          return;
        }

        setImporting(true);
        setProgress({ current: 0, total: picked.files.length, fileName: '' });

        const { chapters: nextChapters, suggestedTitle, imported, skipped } =
          await importMhtFilesIntoManhwa({
            manhwa,
            files: picked.files,
            fromFolder: picked.fromFolder,
            folderName: picked.folderName,
            onProgress: setProgress,
          });

        setChapters(manhwa.id, nextChapters);
        if (suggestedTitle) {
          updateManhwa(manhwa.id, { title: suggestedTitle });
        }

        if (imported === 0 && skipped > 0) {
          Alert.alert(
            'Already imported',
            `Skipped ${skipped} file${skipped === 1 ? '' : 's'} (already in this manhwa).`
          );
        } else if (skipped > 0) {
          Alert.alert(
            'Import complete',
            `Added ${imported} · skipped ${skipped} already imported.`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed';
        Alert.alert('Import failed', message);
      } finally {
        setImporting(false);
        setProgress(null);
      }
    },
    [manhwa, setChapters, updateManhwa]
  );

  const onDelete = () => {
    if (!manhwa) return;
    Alert.alert(
      'Delete manhwa?',
      `Remove “${manhwa.title}” and all copied chapter files from app storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteManhwa(manhwa.id);
              router.back();
            })();
          },
        },
      ]
    );
  };

  const openChapter = (chapterId: string) => {
    router.push({ pathname: '/reader/[chapterId]', params: { chapterId } });
  };

  if (!manhwa) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Manhwa not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                name="create-outline"
                accessibilityLabel="Edit"
                onPress={() =>
                  router.push({ pathname: '/manhwa/[id]/edit', params: { id: manhwa.id } })
                }
              />
              <IconButton
                name="folder-open-outline"
                accessibilityLabel="Add files"
                onPress={openImportDialog}
                disabled={importing}
              />
              <IconButton
                name="trash-outline"
                accessibilityLabel="Delete"
                color="#E5484D"
                onPress={onDelete}
              />
            </View>
          ),
        }}
      />

      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <FlatList
          data={chapters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          ListHeaderComponent={
            <View style={styles.hero}>
              <View style={[styles.cover, { backgroundColor: theme.backgroundSelected }]}>
                {manhwa.coverPath ? (
                  <Image
                    source={{ uri: manhwa.coverPath }}
                    style={styles.coverImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="book-outline" size={48} color={theme.textSecondary} />
                  </View>
                )}
              </View>

              <ThemedText style={styles.title} numberOfLines={3}>
                {manhwa.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {chapters.length === 0
                  ? 'No chapters imported'
                  : `${chapters.length} chapter${chapters.length === 1 ? '' : 's'}`}
              </ThemedText>

              {continueChapter ? (
                <Pressable
                  onPress={() => openChapter(continueChapter.id)}
                  style={[styles.readButton, { backgroundColor: '#3c87f7' }]}>
                  <Ionicons
                    name={hasProgress ? 'play' : 'book'}
                    size={18}
                    color="#fff"
                  />
                  <ThemedText style={styles.readLabel}>
                    {hasProgress
                      ? `Continue · Ch. ${continueChapter.number}`
                      : `Start reading · Ch. ${continueChapter.number}`}
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={openImportDialog}
                  style={[styles.readButton, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name="folder-open-outline" size={18} color={theme.text} />
                  <ThemedText style={styles.readLabelDark}>Import chapters</ThemedText>
                </Pressable>
              )}

              {chapters.length > 0 ? (
                <ThemedText style={styles.sectionTitle}>Chapters</ThemedText>
              ) : (
                <ThemedText themeColor="textSecondary" style={styles.emptyHint}>
                  Use the import icon to select a folder or multiple .mht files.
                </ThemedText>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ChapterRow
              chapter={item}
              isLastRead={manhwa.lastChapterId === item.id}
              onPress={() => openChapter(item.id)}
            />
          )}
        />
      </SafeAreaView>

      <ImportSourceDialog
        visible={showImportDialog}
        onCancel={() => setShowImportDialog(false)}
        onSelect={runImport}
      />

      <Modal visible={importing} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}>
            <View style={styles.progressIcon}>
              <ActivityIndicator size="large" color="#3c87f7" />
            </View>
            <ThemedText style={styles.modalTitle}>Importing chapters</ThemedText>
            {progress ? (
              <>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(
                          4,
                          Math.round((progress.current / Math.max(progress.total, 1)) * 100)
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.modalBody}>
                  {progress.current} of {progress.total}
                </ThemedText>
                {progress.fileName ? (
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    numberOfLines={2}
                    style={styles.modalFile}>
                    {progress.fileName}
                  </ThemedText>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  cover: {
    width: 200,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  readButton: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 999,
    minWidth: 220,
    justifyContent: 'center',
  },
  readLabel: { color: '#fff', fontWeight: '700' },
  readLabelDark: { fontWeight: '700' },
  sectionTitle: {
    alignSelf: 'stretch',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    fontWeight: '700',
    fontSize: 18,
  },
  emptyHint: {
    textAlign: 'center',
    marginTop: Spacing.three,
    lineHeight: 20,
    paddingHorizontal: Spacing.two,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  progressIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60,135,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(60,135,247,0.35)',
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(60,135,247,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(60,135,247,0.25)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3c87f7',
  },
  modalTitle: { fontWeight: '700', fontSize: 18 },
  modalBody: { textAlign: 'center', fontWeight: '700', fontSize: 15 },
  modalFile: { textAlign: 'center' },
});
