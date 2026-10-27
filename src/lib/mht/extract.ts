import { Directory, EncodingType, File, Paths } from 'expo-file-system';

import { extractPagesFromMht } from './parse';

export type ExtractProgress = {
  current: number;
  total: number;
};

/**
 * Lazy-extract chapter panel images from a copied MHT into `pagesDir`.
 * Skips work when page files already exist and `expectedCount` matches.
 */
export async function ensureChapterPages(options: {
  mhtPath: string;
  pagesDir: string;
  expectedCount?: number;
  onProgress?: (progress: ExtractProgress) => void;
}): Promise<{ pageUris: string[]; pageCount: number }> {
  const pagesDirectory = new Directory(options.pagesDir);

  if (pagesDirectory.exists && options.expectedCount && options.expectedCount > 0) {
    const existing = listPageFiles(pagesDirectory);
    if (existing.length === options.expectedCount) {
      return { pageUris: existing, pageCount: existing.length };
    }
  }

  if (pagesDirectory.exists) {
    pagesDirectory.delete();
  }
  pagesDirectory.create({ intermediates: true, idempotent: true });

  const mhtFile = new File(options.mhtPath);
  if (!mhtFile.exists) {
    throw new Error('Chapter MHT file is missing from app storage');
  }

  const raw = await mhtFile.text();
  const pages = extractPagesFromMht(raw);
  const pageUris: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const name = `${String(i + 1).padStart(4, '0')}.${page.extension}`;
    const out = new File(pagesDirectory, name);
    out.create({ intermediates: true, overwrite: true });
    await out.write(page.base64, { encoding: EncodingType.Base64 });
    pageUris.push(out.uri);
    options.onProgress?.({ current: i + 1, total: pages.length });
  }

  return { pageUris, pageCount: pageUris.length };
}

function listPageFiles(dir: Directory): string[] {
  const items = dir.list();
  return items
    .filter((item): item is File => item instanceof File)
    .map((f) => ({ name: f.name, uri: f.uri }))
    .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((f) => f.uri);
}

export function chapterPagesDir(manhwaId: string, chapterId: string): string {
  return new Directory(Paths.document, 'manhwa', manhwaId, 'pages', chapterId).uri;
}

export function chapterSourcePath(manhwaId: string, fileName: string): string {
  return new File(Paths.document, 'manhwa', manhwaId, 'source', fileName).uri;
}
