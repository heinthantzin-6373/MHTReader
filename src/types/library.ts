export type Chapter = {
  id: string;
  manhwaId: string;
  number: number;
  fileName: string;
  mhtPath: string;
  pagesDir?: string;
  pageCount?: number;
  extractedAt?: number;
};

export type Manhwa = {
  id: string;
  title: string;
  coverPath?: string;
  createdAt: number;
  updatedAt: number;
  lastChapterId?: string;
  lastOffsetY?: number;
  chapters: Chapter[];
};

export type LibraryState = {
  manhwas: Manhwa[];
};

export const UNTITLED_MANHWA_TITLE = 'Untitled Manhwa';

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
