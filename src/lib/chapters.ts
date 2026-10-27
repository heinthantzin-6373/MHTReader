const CHAPTER_NUMBER_RE = /_Chapter_(\d+)/i;
const CHAPTER_PREFIX_RE = /_Chapter_\d+.*$/i;

/** Extract chapter number from filenames like `Series_Chapter_10_PrimeEternal.mht`. */
export function parseChapterNumber(fileName: string): number | null {
  const match = fileName.match(CHAPTER_NUMBER_RE);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

/** Derive a human title from a shared filename prefix before `_Chapter_`. */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.mht$/i, '');
  const withoutChapter = base.replace(CHAPTER_PREFIX_RE, '');
  const spaced = withoutChapter.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced || base;
}

/** Longest common title derived from a set of chapter filenames. */
export function titleFromFileNames(fileNames: string[]): string | null {
  if (fileNames.length === 0) return null;
  const titles = fileNames.map(titleFromFileName);
  if (titles.every((t) => t === titles[0])) return titles[0];
  // Prefer the most common prefix title
  const counts = new Map<string, number>();
  for (const t of titles) counts.set(t, (counts.get(t) ?? 0) + 1);
  let best = titles[0];
  let bestCount = 0;
  for (const [t, c] of counts) {
    if (c > bestCount) {
      best = t;
      bestCount = c;
    }
  }
  return best;
}

export function isMhtFileName(name: string): boolean {
  return /\.mht$/i.test(name) || /\.mhtml$/i.test(name);
}

export function sortChaptersByNumber<T extends { number: number }>(chapters: T[]): T[] {
  return [...chapters].sort((a, b) => a.number - b.number);
}
