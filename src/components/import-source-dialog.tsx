import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ImportSourceKind } from '@/lib/import';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onSelect: (kind: ImportSourceKind) => void;
};

export function ImportSourceDialog({ visible, onCancel, onSelect }: Props) {
  const theme = useTheme();
  const showFolder = Platform.OS !== 'web';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
          onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: theme.textSecondary }]} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="cloud-upload-outline" size={22} color="#3c87f7" />
            </View>
            <ThemedText style={styles.title}>Import chapters</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Add .mht chapters to this manhwa. Already imported files are skipped.
            </ThemedText>
          </View>

          <View style={styles.options}>
            {showFolder ? (
              <Pressable
                onPress={() => onSelect('folder')}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <View style={[styles.optionIcon, { backgroundColor: '#3c87f7' }]}>
                  <Ionicons name="folder-open" size={22} color="#fff" />
                </View>
                <View style={styles.optionText}>
                  <ThemedText style={styles.optionTitle}>Select folder</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Import every .mht file in a folder. Untitled cards use the folder name.
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => onSelect('files')}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={[styles.optionIcon, { backgroundColor: '#2ecc71' }]}>
                <Ionicons name="documents" size={22} color="#fff" />
              </View>
              <View style={styles.optionText}>
                <ThemedText style={styles.optionTitle}>Select files</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  Pick one or more .mht files. Manhwa title stays unchanged.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancel,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <ThemedText style={styles.cancelLabel}>Cancel</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.one,
    opacity: 0.45,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60,135,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(60,135,247,0.35)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  options: {
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  cancel: {
    marginTop: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cancelLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
});
