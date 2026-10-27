import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { copyPickedUriToDestination } from '@/lib/fs-copy';

export async function pickAndSaveCover(manhwaId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to set a cover');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsEditing: true,
    aspect: [2, 3],
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  const ext = guessExtension(asset.uri, asset.mimeType);
  const dir = new Directory(Paths.document, 'manhwa', manhwaId);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  const dest = new File(dir, `cover.${ext}`);
  await copyPickedUriToDestination(asset.uri, dest);
  // Bust image cache when replacing cover
  return `${dest.uri}?t=${Date.now()}`;
}

function guessExtension(uri: string, mimeType?: string | null): string {
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('gif')) return 'gif';
  const match = uri.toLowerCase().match(/\.(jpe?g|png|webp|gif)(\?|$)/);
  return match?.[1]?.replace('jpeg', 'jpg') ?? 'jpg';
}
