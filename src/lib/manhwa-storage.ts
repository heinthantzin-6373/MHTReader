import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';

import type { Manhwa } from '@/types/library';

/** Root folder for one manhwa's copied sources, pages, and cover. */
export function manhwaRootDir(manhwaId: string): Directory {
  return new Directory(Paths.document, 'manhwa', manhwaId);
}

/**
 * Delete all on-disk files for a manhwa (source .mht, extracted pages, cover).
 * Tries the new Directory API first, then legacy deleteAsync, then per-path cleanup.
 */
export async function deleteManhwaStorage(manhwa: Manhwa | { id: string; chapters?: Manhwa['chapters']; coverPath?: string }) {
  const root = manhwaRootDir(manhwa.id);

  // 1) Preferred: recursive directory delete
  try {
    if (root.exists) {
      root.delete();
    }
  } catch {
    // fall through
  }

  // 2) Legacy recursive delete (idempotent)
  try {
    await LegacyFS.deleteAsync(root.uri, { idempotent: true });
  } catch {
    // fall through
  }

  // 3) Best-effort cleanup of known chapter / cover paths if folder still hangs around
  const chapters = manhwa.chapters ?? [];
  for (const chapter of chapters) {
    await safeDeleteUri(chapter.mhtPath);
    if (chapter.pagesDir) {
      await safeDeleteUri(chapter.pagesDir);
    }
  }
  if (manhwa.coverPath) {
    await safeDeleteUri(stripCacheBust(manhwa.coverPath));
  }

  // Final attempt on root
  try {
    if (root.exists) {
      root.delete();
    }
  } catch {
    // ignore — library entry will still be removed
  }
}

function stripCacheBust(uri: string): string {
  const q = uri.indexOf('?');
  return q >= 0 ? uri.slice(0, q) : uri;
}

async function safeDeleteUri(uri: string) {
  const clean = stripCacheBust(uri);
  try {
    await LegacyFS.deleteAsync(clean, { idempotent: true });
    return;
  } catch {
    // continue
  }
  try {
    const asDir = new Directory(clean);
    if (asDir.exists) {
      asDir.delete();
      return;
    }
  } catch {
    // continue
  }
  try {
    const asFile = new File(clean);
    if (asFile.exists) {
      asFile.delete();
    }
  } catch {
    // ignore
  }
}
