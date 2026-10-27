import { decodeQuotedPrintable } from './quotedPrintable';

export type MhtMimePart = {
  contentType: string;
  transferEncoding: string;
  contentLocation?: string;
  contentId?: string;
  body: string;
};

export type ExtractedPage = {
  index: number;
  contentType: string;
  /** Raw base64 body (whitespace stripped). */
  base64: string;
  extension: string;
  sourceUrl: string;
};

function headerValue(headers: string, name: string): string | undefined {
  const re = new RegExp(`^${name}:\\s*(.+)$`, 'im');
  const match = headers.match(re);
  if (!match) return undefined;
  // Unfold continued header lines
  let value = match[1].trim();
  const rest = headers.slice(match.index! + match[0].length);
  const continued = rest.match(/^(?:\r?\n[ \t]+.+)+/);
  if (continued) {
    value += continued[0].replace(/\r?\n[ \t]+/g, ' ');
  }
  return value.replace(/\s+/g, ' ').trim();
}

function parseBoundary(raw: string): string | null {
  const match = raw.match(/boundary="?([^"\r\n;]+)"?/i);
  return match ? match[1].trim() : null;
}

export function splitMimeParts(raw: string): MhtMimePart[] {
  const boundary = parseBoundary(raw);
  if (!boundary) {
    throw new Error('MHT file is missing a MIME boundary');
  }

  const delimiter = `--${boundary}`;
  const chunks = raw.split(delimiter);
  const parts: MhtMimePart[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.replace(/^\r?\n/, '');
    if (!trimmed || trimmed.startsWith('--')) continue;

    const sep = trimmed.search(/\r?\n\r?\n/);
    if (sep < 0) continue;

    const headers = trimmed.slice(0, sep);
    let body = trimmed.slice(sep).replace(/^\r?\n\r?\n/, '');
    // Drop trailing newline before next boundary residue
    body = body.replace(/\r?\n--\s*$/, '').replace(/\r?\n$/, '');

    parts.push({
      contentType: headerValue(headers, 'Content-Type') ?? 'application/octet-stream',
      transferEncoding: (headerValue(headers, 'Content-Transfer-Encoding') ?? '').toLowerCase(),
      contentLocation: headerValue(headers, 'Content-Location'),
      contentId: headerValue(headers, 'Content-ID'),
      body,
    });
  }

  return parts;
}

function decodePartBody(part: MhtMimePart): string {
  if (part.transferEncoding.includes('quoted-printable')) {
    return decodeQuotedPrintable(part.body);
  }
  return part.body;
}

function srcFromImgTag(tag: string): string | null {
  const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  return srcMatch?.[1]?.trim() ?? null;
}

/** Collect ordered panel image URLs from chapter HTML. */
export function extractPanelImageUrls(html: string): string[] {
  const urls: string[] = [];
  const imgRe = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRe.exec(html)) !== null) {
    const tag = match[0];
    const isPanel =
      /wp-manga-chapter-img/i.test(tag) || /\bid\s*=\s*["']image-\d+["']/i.test(tag);
    if (!isPanel) continue;
    const src = srcFromImgTag(tag);
    if (src) urls.push(src);
  }

  if (urls.length === 0) {
    const fallback = /<img\b[^>]*\bsrc\s*=\s*["']([^"']*WP-manga\/data[^"']+)["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = fallback.exec(html)) !== null) {
      urls.push(m[1].trim());
    }
  }

  return urls;
}

function extensionForContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('png')) return 'png';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  return 'jpg';
}

function normalizeUrl(url: string): string {
  try {
    return decodeURI(url.trim());
  } catch {
    return url.trim();
  }
}

/**
 * Parse an MHT/MHTML string and return ordered chapter panel images as base64 payloads.
 */
export function extractPagesFromMht(raw: string): ExtractedPage[] {
  const parts = splitMimeParts(raw);
  const htmlPart = parts.find((p) => p.contentType.toLowerCase().startsWith('text/html'));
  if (!htmlPart) {
    throw new Error('MHT file has no HTML part');
  }

  const html = decodePartBody(htmlPart);
  const panelUrls = extractPanelImageUrls(html);
  if (panelUrls.length === 0) {
    throw new Error('No chapter images found in MHT HTML');
  }

  const imageParts = parts.filter((p) => p.contentType.toLowerCase().startsWith('image/'));
  const byLocation = new Map<string, MhtMimePart>();
  for (const part of imageParts) {
    if (part.contentLocation) {
      byLocation.set(normalizeUrl(part.contentLocation), part);
      byLocation.set(part.contentLocation.trim(), part);
    }
  }

  const pages: ExtractedPage[] = [];
  for (let i = 0; i < panelUrls.length; i++) {
    const url = panelUrls[i];
    const part =
      byLocation.get(normalizeUrl(url)) ??
      byLocation.get(url) ??
      imageParts.find(
        (p) =>
          p.contentLocation &&
          (normalizeUrl(p.contentLocation) === normalizeUrl(url) ||
            p.contentLocation.includes(url.split('/').pop() ?? '___'))
      );

    if (!part) continue;

    const base64 = part.body.replace(/\s+/g, '');
    if (!base64) continue;

    pages.push({
      index: i,
      contentType: part.contentType,
      base64,
      extension: extensionForContentType(part.contentType),
      sourceUrl: url,
    });
  }

  if (pages.length === 0) {
    throw new Error('Could not match chapter image URLs to embedded MHT parts');
  }

  return pages;
}
