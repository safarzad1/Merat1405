/** Check file signatures as well as extensions before storing news attachments.
 * Files remain subject to the size and SQL permissions checks in the API.
 */
export function newsAttachmentSignatureValid(extension: string, file: Uint8Array): boolean {
  if (!file || file.length < 4) return false;
  const b = file;
  const prefix = (chars: string, offset = 0) =>
    b.length >= offset + chars.length && Array.from(chars).every((c, i) => b[offset + i] === c.charCodeAt(0));
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case ".png":
      return b.length >= 8 && b[0] === 0x89 && prefix("PNG", 1) &&
        b[4] === 13 && b[5] === 10 && b[6] === 26 && b[7] === 10;
    case ".mp3":
      return prefix("ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0);
    case ".webm":
      return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    case ".mp4":
    case ".m4v":
      return b.length >= 12 && prefix("ftyp", 4);
    case ".mov":
      // QuickTime supports both an ISO ftyp box and older atom-based containers.
      return b.length >= 12 && (prefix("ftyp", 4) || prefix("moov", 4) ||
        prefix("mdat", 4) || prefix("wide", 4) || prefix("free", 4));
    default:
      return false;
  }
}
