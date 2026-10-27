import { File } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';

/**
 * Copy a picked / content URI into app storage.
 * New File.copy often fails with Missing READ permission on picker URIs;
 * legacy copyAsync (then byte fallback) is reliable for document/image picks.
 */
export async function copyPickedUriToDestination(sourceUri: string, dest: File) {
  const parent = dest.parentDirectory;
  if (!parent.exists) {
    parent.create({ intermediates: true, idempotent: true });
  }
  if (dest.exists) {
    dest.delete();
  }

  try {
    await LegacyFS.copyAsync({ from: sourceUri, to: dest.uri });
    return;
  } catch {
    // continue
  }

  try {
    const source = new File(sourceUri);
    await source.copy(dest);
    return;
  } catch {
    // continue
  }

  const response = await fetch(sourceUri);
  if (!response.ok) {
    throw new Error(`Could not read selected file (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  dest.create({ intermediates: true, overwrite: true });
  await dest.write(bytes);
}
