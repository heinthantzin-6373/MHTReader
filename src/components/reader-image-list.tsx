import { Image } from 'expo-image';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image as RNImage,
  Platform,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  uris: string[];
  initialOffsetY?: number;
  onOffsetChange?: (offsetY: number) => void;
  ListFooterComponent?: ReactElement;
};

type Item = { uri: string; index: number };

const SCREEN_WIDTH = Dimensions.get('window').width;
const ESTIMATED_PAGE_HEIGHT = SCREEN_WIDTH * 1.4;
const TRACK_WIDTH = 2.5;
const THUMB_MIN = 36;
const PRELOAD_CONCURRENCY = 8;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Item>);

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onItemDone?: (done: number, total: number) => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let done = 0;

  async function run() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i], i);
      done += 1;
      onItemDone?.(done, items.length);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

const PageImage = memo(function PageImage({
  uri,
  height,
}: {
  uri: string;
  height: number;
}) {
  return (
    <View style={[styles.page, { height }]}>
      <Image
        source={{ uri }}
        style={{ width: SCREEN_WIDTH, height }}
        contentFit="contain"
        cachePolicy="memory-disk"
        recyclingKey={uri}
        priority="high"
        transition={0}
      />
    </View>
  );
});

export function ReaderImageList({
  uris,
  initialOffsetY = 0,
  onOffsetChange,
  ListFooterComponent,
}: Props) {
  const insets = useSafeAreaInsets();
  const [viewportH, setViewportH] = useState(0);
  const [heights, setHeights] = useState<number[] | null>(null);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: uris.length });

  const restored = useRef(false);
  const listRef = useRef<FlatList<Item>>(null);
  const onOffsetChangeRef = useRef(onOffsetChange);
  onOffsetChangeRef.current = onOffsetChange;

  const scrollY = useSharedValue(0);
  const contentH = useSharedValue(1);
  const viewportSV = useSharedValue(1);
  const trackHeightSV = useSharedValue(40);
  const lastReportAt = useSharedValue(0);

  const ready = heights !== null && heights.length === uris.length;

  useEffect(() => {
    let cancelled = false;
    restored.current = false;
    setHeights(null);
    setLoadProgress({ current: 0, total: uris.length });

    if (uris.length === 0) {
      setHeights([]);
      return;
    }

    (async () => {
      // Warm disk/memory cache while we measure layout sizes
      void Image.prefetch(uris, 'memory-disk');

      try {
        const measured = await mapPool(
          uris,
          PRELOAD_CONCURRENCY,
          async (uri) => {
            try {
              const { width, height } = await getImageSize(uri);
              if (!width || !height) return ESTIMATED_PAGE_HEIGHT;
              return (SCREEN_WIDTH / width) * height;
            } catch {
              return ESTIMATED_PAGE_HEIGHT;
            }
          },
          (current, total) => {
            if (!cancelled) setLoadProgress({ current, total });
          }
        );

        if (!cancelled) setHeights(measured);
      } catch {
        if (!cancelled) {
          setHeights(uris.map(() => ESTIMATED_PAGE_HEIGHT));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uris]);

  const data = useMemo(
    () => uris.map((uri, index) => ({ uri, index })),
    [uris]
  );

  const trackTop = 8;
  const trackBottom = Math.max(insets.bottom + 72, 80);

  const reportOffset = useCallback((y: number) => {
    onOffsetChangeRef.current?.(y);
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      scrollY.value = y;
      const now = Date.now();
      if (now - lastReportAt.value > 100) {
        lastReportAt.value = now;
        runOnJS(reportOffset)(y);
      }
    },
    onEndDrag: (e) => {
      runOnJS(reportOffset)(e.contentOffset.y);
    },
    onMomentumEnd: (e) => {
      runOnJS(reportOffset)(e.contentOffset.y);
    },
  });

  const thumbStyle = useAnimatedStyle(() => {
    const vh = viewportSV.value;
    const ch = contentH.value;
    const trackH = trackHeightSV.value;
    if (ch <= vh + 1) {
      return { opacity: 0, height: THUMB_MIN, transform: [{ translateY: 0 }] };
    }
    const thumbH = Math.max((vh / ch) * trackH, THUMB_MIN);
    const maxTravel = Math.max(trackH - thumbH, 0);
    const maxScroll = Math.max(ch - vh, 1);
    const y = Math.min(Math.max((scrollY.value / maxScroll) * maxTravel, 0), maxTravel);
    return {
      opacity: 1,
      height: thumbH,
      transform: [{ translateY: y }],
    };
  });

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Item>) => (
      <PageImage uri={item.uri} height={heights?.[item.index] ?? ESTIMATED_PAGE_HEIGHT} />
    ),
    [heights]
  );

  const keyExtractor = useCallback((item: Item) => item.uri, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<Item> | null | undefined, index: number) => {
      if (!heights) {
        return { length: ESTIMATED_PAGE_HEIGHT, offset: ESTIMATED_PAGE_HEIGHT * index, index };
      }
      let offset = 0;
      for (let i = 0; i < index; i++) offset += heights[i] ?? ESTIMATED_PAGE_HEIGHT;
      return {
        length: heights[index] ?? ESTIMATED_PAGE_HEIGHT,
        offset,
        index,
      };
    },
    [heights]
  );

  if (!ready) {
    const total = Math.max(loadProgress.total, 1);
    const pct = Math.round((loadProgress.current / total) * 100);
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingTitle}>Loading chapter…</Text>
        <Text style={styles.loadingSub}>
          {loadProgress.current} / {loadProgress.total} pages ({pct}%)
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        setViewportH(h);
        viewportSV.value = h;
        trackHeightSV.value = Math.max(h - trackTop - trackBottom, 40);
      }}>
      <AnimatedFlatList
        ref={listRef}
        style={styles.list}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={40}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={getItemLayout}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.content}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
        overScrollMode="always"
        onContentSizeChange={(_w, h) => {
          contentH.value = h;
          if (!restored.current && initialOffsetY > 0 && h > viewportH) {
            restored.current = true;
            const maxY = Math.max(h - viewportH, 0);
            listRef.current?.scrollToOffset({
              offset: Math.min(Math.max(initialOffsetY, 0), maxY),
              animated: false,
            });
          }
        }}
      />

      <View
        pointerEvents="none"
        style={[
          styles.track,
          { top: trackTop, height: Math.max(viewportH - trackTop - trackBottom, 40) },
        ]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  list: {
    flex: 1,
  },
  content: {
    backgroundColor: '#000',
  },
  page: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSub: {
    color: '#aaa',
    fontSize: 13,
  },
  track: {
    position: 'absolute',
    right: 2,
    width: TRACK_WIDTH,
    borderRadius: 999,
    backgroundColor: 'transparent',
    zIndex: 4,
  },
  thumb: {
    width: TRACK_WIDTH,
    borderRadius: 999,
    backgroundColor: 'rgba(120,120,120,0.55)',
  },
});
