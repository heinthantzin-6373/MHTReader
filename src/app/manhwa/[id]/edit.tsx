import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickAndSaveCover } from '@/lib/cover';
import { useLibrary } from '@/store/library-store';

export default function EditManhwaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { getManhwa, updateManhwa } = useLibrary();
  const manhwa = getManhwa(id);

  const [title, setTitle] = useState(manhwa?.title ?? '');
  const [coverPath, setCoverPath] = useState(manhwa?.coverPath);
  const [saving, setSaving] = useState(false);

  if (!manhwa) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Manhwa not found</ThemedText>
      </ThemedView>
    );
  }

  const onPickCover = async () => {
    try {
      const path = await pickAndSaveCover(manhwa.id);
      if (path) setCoverPath(path);
    } catch (error) {
      Alert.alert('Cover', error instanceof Error ? error.message : 'Could not pick cover');
    }
  };

  const onSave = () => {
    const next = title.trim();
    if (!next) {
      Alert.alert('Title required', 'Please enter a manhwa name.');
      return;
    }
    setSaving(true);
    updateManhwa(manhwa.id, { title: next, coverPath });
    setSaving(false);
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit',
          headerRight: () => (
            <IconButton
              name="checkmark"
              accessibilityLabel="Save"
              color="#3c87f7"
              onPress={onSave}
              disabled={saving}
            />
          ),
        }}
      />
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <Pressable onPress={onPickCover} style={styles.coverWrap}>
          <View style={[styles.cover, { backgroundColor: theme.backgroundSelected }]}>
            {coverPath ? (
              <Image source={{ uri: coverPath }} style={styles.coverImage} contentFit="cover" />
            ) : (
              <View style={styles.coverEmpty}>
                <Ionicons name="image-outline" size={40} color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary" type="small">
                  Tap to set cover
                </ThemedText>
              </View>
            )}
          </View>
          <View style={[styles.coverBadge, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="camera" size={16} color={theme.text} />
          </View>
        </Pressable>

        <ThemedText type="small" themeColor="textSecondary">
          Title
        </ThemedText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Manhwa title"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        />

        {coverPath ? (
          <Pressable
            onPress={() => setCoverPath(undefined)}
            style={styles.clearCover}>
            <Ionicons name="trash-outline" size={18} color="#E5484D" />
            <ThemedText style={styles.clearLabel}>Remove cover</ThemedText>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  cover: {
    width: 200,
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  coverEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  coverBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  clearCover: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.two,
    alignSelf: 'flex-start',
  },
  clearLabel: { color: '#E5484D', fontWeight: '600' },
});
