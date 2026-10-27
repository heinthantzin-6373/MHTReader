import Ionicons from '@expo/vector-icons/Ionicons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { IconButton } from '@/components/icon-button';
import { ReaderImageList } from '@/components/reader-image-list';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { chapterPagesDir, ensureChapterPages } from '@/lib/mht/extract';
import { useLibrary } from '@/store/library-store';
import { useSettings } from '@/store/settings-store';

const KEEP_AWAKE_TAG = 'mht-reader';

export default function ReaderScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const insets = useSafeAreaInsets();
  const { readerMode } = useSettings();
  const { getChapter, updateChapter, saveReadingProgress } = useLibrary();
  const found = getChapter(chapterId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageUris, setPageUris] = useState<string[]>([]);
  const offsetRef = useRef(0);
  const progressTargetRef = useRef<{ manhwaId: string; chapterId: string } | null>(null);

  const siblings = useMemo(() => {
    if (!found) return [];
    return [...found.manhwa.chapters].sort((a, b) => a.number - b.number);
  }, [found]);

  const currentIndex = siblings.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  useEffect(() => {
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const current = getChapter(chapterId);

    (async () => {
      if (!current) {
        setError('Chapter not found');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPageUris([]);

      try {
        if (readerMode === 'fullPage') {
          // Full page uses the local .mht URI directly in WebView
          if (cancelled) return;
          setPageUris([]);
        } else {
          const pagesDir = chapterPagesDir(current.manhwa.id, current.chapter.id);
          const result = await ensureChapterPages({
            mhtPath: current.chapter.mhtPath,
            pagesDir,
            expectedCount: current.chapter.pageCount,
          });

          if (cancelled) return;

          setPageUris(result.pageUris);
          updateChapter(current.manhwa.id, current.chapter.id, {
            pagesDir,
            pageCount: result.pageCount,
            extractedAt: Date.now(),
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to open chapter');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, readerMode]);

  useEffect(() => {
    if (found) {
      progressTargetRef.current = {
        manhwaId: found.manhwa.id,
        chapterId: found.chapter.id,
      };
    }
  }, [found]);

  useEffect(() => {
    return () => {
      const target = progressTargetRef.current;
      if (target && offsetRef.current >= 0) {
        saveReadingProgress(target.manhwaId, target.chapterId, offsetRef.current);
      }
    };
  }, [saveReadingProgress]);

  const onOffsetChange = useCallback((y: number) => {
    offsetRef.current = y;
  }, []);

  const goChapter = (id: string) => {
    if (found) {
      saveReadingProgress(found.manhwa.id, found.chapter.id, offsetRef.current);
    }
    router.replace({ pathname: '/reader/[chapterId]', params: { chapterId: id } });
  };

  if (!found) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.light}>Chapter not found</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.link}>Go back</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
        <ThemedText style={styles.light}>
          {readerMode === 'fullPage' ? 'Loading page…' : 'Extracting pages…'}
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.light}>{error}</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.link}>Go back</ThemedText>
        </Pressable>
      </View>
    );
  }

  const initialOffset =
    found.manhwa.lastChapterId === found.chapter.id ? found.manhwa.lastOffsetY ?? 0 : 0;

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton
          name="close"
          accessibilityLabel="Close"
          color="#fff"
          onPress={() => router.back()}
        />
        <ThemedText style={styles.barTitle} numberOfLines={1}>
          Ch. {found.chapter.number}
        </ThemedText>
        <View style={{ width: 32 }} />
      </View>

      {readerMode === 'fullPage' ? (
        <WebView
          style={styles.webview}
          originWhitelist={['*']}
          allowFileAccess
          allowingReadAccessToURL={found.chapter.mhtPath}
          source={{ uri: found.chapter.mhtPath }}
          startInLoadingState
          scalesPageToFit
          setSupportMultipleWindows={false}
          setBuiltInZoomControls
          displayZoomControls={false}
          renderLoading={() => (
            <View style={styles.webLoading}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        />
      ) : (
        <ReaderImageList
          uris={pageUris}
          initialOffsetY={initialOffset}
          onOffsetChange={onOffsetChange}
        />
      )}

      <View style={[styles.navBar, { bottom: insets.bottom + 16 }]}>
        <Pressable
          disabled={!prevChapter}
          onPress={() => prevChapter && goChapter(prevChapter.id)}
          style={[styles.navButton, !prevChapter && styles.navButtonDisabled]}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={!prevChapter ? '#9a9a9a' : '#fff'}
          />
        </Pressable>
        <Pressable
          disabled={!nextChapter}
          onPress={() => nextChapter && goChapter(nextChapter.id)}
          style={[styles.navButton, !nextChapter && styles.navButtonDisabled]}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={!nextChapter ? '#9a9a9a' : '#fff'}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  light: { color: '#fff', textAlign: 'center' },
  link: { color: '#3c87f7', marginTop: Spacing.two },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    backgroundColor: '#111',
  },
  barTitle: { color: '#fff', fontWeight: '700', flex: 1, textAlign: 'center' },
  webview: { flex: 1, backgroundColor: '#000' },
  webLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  navBar: {
    position: 'absolute',
    right: 12,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3c87f7',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  navButtonDisabled: {
    backgroundColor: '#5c5c5c',
    elevation: 0,
    shadowOpacity: 0,
  },
});
