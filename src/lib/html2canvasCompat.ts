import domtoimage from './domToImageCompat';

/** Adapter preserving the scale/background options expected by report pages. */
export default async function html2canvas(node: HTMLElement, options: {
  scale?: number;
  useCORS?: boolean;
  backgroundColor?: string;
} = {}): Promise<HTMLCanvasElement> {
  const scale = Math.max(1, Math.min(4, Number(options.scale || 1)));
  const width = node.scrollWidth || node.clientWidth;
  const height = node.scrollHeight || node.clientHeight;
  const data = await domtoimage.toPng(node, {
    width: Math.ceil(width * scale),
    height: Math.ceil(height * scale),
    backgroundColor: options.backgroundColor || '#fff',
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${width}px`,
      height: `${height}px`,
    },
  });
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load report capture'));
    img.src = data;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.drawImage(img, 0, 0);
  return canvas;
}
