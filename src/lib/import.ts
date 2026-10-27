import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { isMhtFileName, parseChapterNumber } from '@/lib/chapters';
import { copyPickedUriToDestination } from '@/lib/fs-copy';
import { chapterSourcePath } from '@/lib/mht/extract';
import type { Chapter, Manhwa } from '@/types/library';
import { createId, UNTITLED_MANHWA_TITLE } from '@/types/library';

export type PickedMhtFile = {
  name: string;
  uri: string;
};

export type ImportPickResult = {
  canceled: boolean;
  /** True only when the user picked a directory (folder name may update title). */
  fromFolder: boolean;
  folderName?: string;
  files: PickedMhtFile[];
};

export type ImportProgress = {
  current: number;
  total: number;
  fileName: string;
};

export type ImportSourceKind = 'folder' | 'files';

async function pickDirectoryFiles(): Promise<ImportPickResult> {
  const directory = await Directory.pickDirectoryAsync();
  const folderName = directory.name || undefined;
  const files: PickedMhtFile[] = [];

  for (const item of directory.list()) {
    if (item instanceof File && isMhtFileName(item.name)) {
      files.push({ name: item.name, uri: item.uri });
    }
  }

  return { canceled: false, fromFolder: true, folderName, files };
}

async function pickDocumentFiles(): Promise<ImportPickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: ['*/*'],
  });

  if (result.canceled || !result.assets?.length) {
    return { canceled: true, fromFolder: false, files: [] };
  }

  const files = result.assets
    .filter((asset) => isMhtFileName(asset.name))
    .map((asset) => ({ name: asset.name, uri: asset.uri }));

  return { canceled: false, fromFolder: false, files };
}

function isCancelError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|dismiss|abort/i.test(message);
}

export async function pickMhtSources(kind: ImportSourceKind): Promise<ImportPickResult> {
  try {
    if (kind === 'folder') {
      return await pickDirectoryFiles();
    }
    return await pickDocumentFiles();
  } catch (error) {
    if (isCancelError(error)) {
      return { canceled: true, fromFolder: false, files: [] };
    }
    throw error;
  }
}

function ensureManhwaDirs(manhwaId: string) {
  const root = new Directory(Paths.document, 'manhwa', manhwaId);
  if (!root.exists) {
    root.create({ intermediates: true, idempotent: true });
  }
  const source = new Directory(root, 'source');
  if (!source.exists) {
    source.create({ intermediates: true, idempotent: true });
  }
}

export type ImportResult = {
  chapters: Chapter[];
  suggestedTitle?: string;
  imported: number;
  skipped: number;
};

function isAlreadyImported(
  fileName: string,
  number: number,
  byNumber: Map<number, Chapter>,
  byFileName: Set<string>
): boolean {
  if (byFileName.has(fileName.toLowerCase())) return true;
  if (byNumber.has(number)) return true;
  return false;
}

/**
 * Copy picked MHT files into app storage and return upserted chapters.
 * Already-imported chapters (same chapter number or filename) are skipped.
 * Title is suggested only for folder imports when the card is still untitled.
 */
export async function importMhtFilesIntoManhwa(options: {
  manhwa: Manhwa;
  files: PickedMhtFile[];
  fromFolder?: boolean;
  folderName?: string;
  onProgress?: (progress: ImportProgress) => void;
}): Promise<ImportResult> {
  const { manhwa, files, fromFolder, folderName, onProgress } = options;
  if (files.length === 0) {
    throw new Error('No .mht files found in the selection');
  }

  ensureManhwaDirs(manhwa.id);

  const byNumber = new Map<number, Chapter>();
  const byFileName = new Set<string>();
  for (const chapter of manhwa.chapters) {
    byNumber.set(chapter.number, { ...chapter });
    byFileName.add(chapter.fileName.toLowerCase());
  }

  let imported = 0;
  let skipped = 0;
  let index = 0;

  for (const file of files) {
    index += 1;
    onProgress?.({ current: index, total: files.length, fileName: file.name });

    const number = parseChapterNumber(file.name);
    if (number == null) {
      skipped += 1;
      continue;
    }

    if (isAlreadyImported(file.name, number, byNumber, byFileName)) {
      skipped += 1;
      continue;
    }

    const destPath = chapterSourcePath(manhwa.id, file.name);
    const dest = new File(destPath);
    await copyPickedUriToDestination(file.uri, dest);

    byNumber.set(number, {
      id: createId('ch'),
      manhwaId: manhwa.id,
      number,
      fileName: file.name,
      mhtPath: dest.uri,
    });
    byFileName.add(file.name.toLowerCase());
    imported += 1;
  }

  const chapters = [...byNumber.values()].sort((a, b) => a.number - b.number);

  // Only folder imports may rename an untitled card (never multi-file picks).
  let suggestedTitle: string | undefined;
  if (
    fromFolder &&
    folderName?.trim() &&
    manhwa.title === UNTITLED_MANHWA_TITLE
  ) {
    suggestedTitle = folderName.trim();
  }

  return { chapters, suggestedTitle, imported, skipped };
}
