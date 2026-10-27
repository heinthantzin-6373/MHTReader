import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Chapter } from '@/types/library';

type Props = {
  chapter: Chapter;
  isLastRead?: boolean;
  onPress: () => void;
};

export function ChapterRow({ chapter, isLastRead, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: isLastRead ? theme.backgroundSelected : theme.backgroundElement,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <View style={styles.left}>
        <ThemedText style={styles.number}>Chapter {chapter.number}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>
          {chapter.fileName}
        </ThemedText>
      </View>
      {isLastRead ? (
        <Ionicons name="play-circle" size={22} color="#3c87f7" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 10,
    gap: Spacing.two,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  number: {
    fontWeight: '600',
  },
});
