/**
 * Standalone jsPDF-compatible subset for a single A4 image report.
 * Generates and downloads a REAL PDF file (JPEG XObject in a PDF page),
 * instead of the previous workaround that merely opened print preview.
 */
type ImageItem = { source: string; width: number; height: number };

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

/**
 * TS 5.8+ models Uint8Array buffers as ArrayBufferLike (which may be a
 * SharedArrayBuffer). The DOM Blob constructor requires ArrayBuffer-backed
 * parts, so copy the exact number of bytes into a normal ArrayBuffer.
 */
const toBlobArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
};

const pngDimensions = (uri: string): { width: number; height: number } => {
  try {
    const encoded = uri.split(',')[1];
    if (!encoded) return { width: 1, height: 1 };
    const header = atob(encoded.slice(0, 40));
    const uint32 = (offset: number) =>
      ((header.charCodeAt(offset) << 24) | (header.charCodeAt(offset + 1) << 16) |
        (header.charCodeAt(offset + 2) << 8) | header.charCodeAt(offset + 3)) >>> 0;
    if (header.slice(1, 4) === 'PNG') return { width: uint32(16), height: uint32(20) };
  } catch { /* allow a safe ratio fallback */ }
  return { width: 1000, height: 1414 };
};

const jpegFromImage = async (dataUri: string): Promise<{ bytes: Uint8Array; width: number; height: number }> => {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Unable to load report image for PDF'));
    img.src = dataUri;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('PDF canvas unavailable');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const base64 = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return { bytes, width: canvas.width, height: canvas.height };
};

export default class JsPDF {
  private image: ImageItem | null = null;
  constructor(..._args: unknown[]) { /* jsPDF signature accepted for compatibility */ }
  getImageProperties(src: string) { return pngDimensions(src); }
  addImage(src: string, _format: string, _x: number, _y: number, width: number, height: number): void {
    this.image = { source: src, width, height };
  }
  async save(filename: string): Promise<void> {
    if (!this.image) throw new Error('No image added to PDF');
    const { bytes, width, height } = await jpegFromImage(this.image.source);
    // An A4 portrait page in PDF points. Scale to fit without cropping.
    const pageWidth = 595.276;
    const pageHeight = 841.89;
    const requestedRatio = this.image.width > 0 && this.image.height > 0
      ? this.image.width / this.image.height : width / height;
    const ratio = requestedRatio > 0 ? requestedRatio : width / height;
    const drawWidth = Math.min(pageWidth, pageHeight * ratio);
    const drawHeight = drawWidth / ratio;
    const offsetX = (pageWidth - drawWidth) / 2;
    const offsetY = (pageHeight - drawHeight) / 2;
    const content = `q\n${drawWidth.toFixed(3)} 0 0 ${drawHeight.toFixed(3)} ${offsetX.toFixed(3)} ${offsetY.toFixed(3)} cm\n/Im0 Do\nQ\n`;
    const contentBytes = encode(content);
    const header = encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const parts: BlobPart[] = [toBlobArrayBuffer(header)];
    const offsets = [0];
    let cursor = header.length;
    const append = (item: Uint8Array | string) => {
      const chunk = typeof item === 'string' ? encode(item) : item;
      parts.push(toBlobArrayBuffer(chunk));
      cursor += chunk.byteLength;
    };
    const obj = (id: number, text: string) => {
      offsets[id] = cursor;
      append(`${id} 0 obj\n${text}\nendobj\n`);
    };
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    offsets[4] = cursor;
    append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.byteLength} >>\nstream\n`);
    append(bytes);
    append('\nendstream\nendobj\n');
    offsets[5] = cursor;
    append(`5 0 obj\n<< /Length ${contentBytes.byteLength} >>\nstream\n`);
    append(contentBytes);
    append('endstream\nendobj\n');
    const xref = cursor;
    append('xref\n0 6\n0000000000 65535 f \n');
    for (let id = 1; id <= 5; id++) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
    append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    const url = URL.createObjectURL(new Blob(parts, { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
