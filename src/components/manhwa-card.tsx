import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Manhwa } from '@/types/library';

type Props = {
  manhwa: Manhwa;
  onPress: () => void;
};

export function ManhwaCard({ manhwa, onPress }: Props) {
  const theme = useTheme();
  const chapterCount = manhwa.chapters.length;
  const isDark = theme.background === '#000000';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        isDark ? styles.shadowDark : styles.shadowLight,
      ]}>
      <View style={[styles.cover, { backgroundColor: theme.backgroundSelected }]}>
        {manhwa.coverPath ? (
          <Image source={{ uri: manhwa.coverPath }} style={styles.coverImage} contentFit="cover" />
        ) : (
          <ThemedText themeColor="textSecondary" style={styles.coverPlaceholder}>
            {manhwa.title.slice(0, 1).toUpperCase()}
          </ThemedText>
        )}
        {chapterCount > 0 ? (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{chapterCount}</ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <ThemedText numberOfLines={2} style={styles.title}>
          {manhwa.title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>
          {chapterCount === 0 ? 'Empty' : `Chapter ${chapterCount}`}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two,
    overflow: 'hidden',
  },
  shadowLight: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  shadowDark: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  cover: {
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    fontSize: 40,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  meta: {
    paddingTop: Spacing.two,
    paddingHorizontal: 2,
    gap: 2,
  },
  title: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
});
