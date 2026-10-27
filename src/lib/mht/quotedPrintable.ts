/** Decode MIME quoted-printable text (Blink MHTML soft wraps + =XX bytes). */
export function decodeQuotedPrintable(input: string): string {
  // Soft line breaks: "=\r\n" or "=\n"
  const withoutSoftBreaks = input.replace(/=\r?\n/g, '');
  return withoutSoftBreaks.replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );
}
