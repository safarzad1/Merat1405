/**
 * Minimal self-contained DOM -> PNG export used by the Merat paper forms.
 * Unlike the prior implementation, this copies CSS computed styles (the
 * source report CSS lives outside the SVG), embeds available print fonts and
 * logos, and respects the original caller's scale/transform parameters.
 * It does not add build-time dependencies or change database values.
 */
export type DomToPngOptions = {
  width?: number;
  height?: number;
  bgcolor?: string;
  backgroundColor?: string;
  style?: Record<string, string | number>;
  quality?: number;
};

const REPORT_FONT_NAMES = /^(?:["']?)(?:bnaznin|b nazanin|lotus|b lotus|titr|b titr|shabnam|shabnamapp|b shabnam)(?:["']?)$/i;
let fontStylesCache: Promise<string> | null = null;

const toBase64 = (bytes: Uint8Array): string => {
  // Avoid large Function.apply argument lists for TTF files.
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(text);
};

const urlToDataUrl = async (src: string, baseUrl: string): Promise<string> => {
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  const absolute = new URL(src, baseUrl);
  // Do not exfiltrate authentication tokens / arbitrary third-party images.
  if (absolute.origin !== window.location.origin) throw new Error('cross-origin resource');
  const response = await fetch(absolute.href, { credentials: 'same-origin', cache: 'force-cache' });
  if (!response.ok) throw new Error(`asset HTTP ${response.status}`);
  const mime = response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
  const bytes = new Uint8Array(await response.arrayBuffer());
  return `data:${mime};base64,${toBase64(bytes)}`;
};

const collectFontFaces = (rules: CSSRuleList, base: string, found: Array<{ family: string; src: string; weight: string; style: string; base: string }>) => {
  for (const rule of Array.from(rules)) {
    if (rule.type === CSSRule.FONT_FACE_RULE) {
      const style = (rule as CSSFontFaceRule).style;
      const family = style.getPropertyValue('font-family').trim().replace(/^['"]|['"]$/g, '');
      if (REPORT_FONT_NAMES.test(family)) {
        found.push({ family, src: style.getPropertyValue('src'), weight: style.getPropertyValue('font-weight') || 'normal', style: style.getPropertyValue('font-style') || 'normal', base });
      }
    } else if ('cssRules' in rule) {
      try { collectFontFaces((rule as CSSGroupingRule).cssRules, base, found); } catch { /* unreadable imported rules */ }
    }
  }
};

const loadEmbeddedFonts = async (): Promise<string> => {
  const found: Array<{ family: string; src: string; weight: string; style: string; base: string }> = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try { collectFontFaces(sheet.cssRules, sheet.href || document.baseURI, found); }
    catch { /* cross-origin stylesheets cannot be inspected */ }
  }
  const results = await Promise.all(found.map(async (font) => {
    const match = /url\(\s*['"]?([^'"\)]+)['"]?\s*\)/.exec(font.src);
    if (!match) return '';
    try {
      const data = await urlToDataUrl(match[1], font.base);
      return `@font-face{font-family:"${font.family.replace(/"/g, '')}";src:url("${data}");font-weight:${font.weight};font-style:${font.style};}`;
    } catch (error) {
      console.warn('[Merat report] Font could not be embedded:', font.family, error);
      return '';
    }
  }));
  return results.filter(Boolean).join('\n');
};

const waitForContent = async (node: HTMLElement): Promise<void> => {
  if (document.fonts) {
    // font-display:swap is used by the app. Force these particular families to
    // be loaded before copying computed styles so PNG matches the live report.
    await Promise.all(['bnaznin', 'lotus', 'titr', 'ShabnamApp'].map((name) =>
      document.fonts.load(`20px "${name}"`).catch(() => [])
    ));
    await document.fonts.ready;
  }
  await Promise.all(Array.from(node.querySelectorAll('img')).map((img) =>
    img.decode().catch(() => undefined)
  ));
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};

const copyComputedCss = (original: Element, target: Element) => {
  const originalStyle = getComputedStyle(original);
  const targetStyle = (target as HTMLElement).style;
  if (!targetStyle) return;
  for (let j = 0; j < originalStyle.length; j++) {
    const property = originalStyle.item(j);
    if (property.startsWith('animation-') || property.startsWith('transition-') || property === 'caret-color') continue;
    targetStyle.setProperty(property, originalStyle.getPropertyValue(property), originalStyle.getPropertyPriority(property));
  }
  if (original instanceof HTMLInputElement && target instanceof HTMLInputElement) {
    target.value = original.value;
    target.checked = original.checked;
    target.setAttribute('value', original.value);
    if (original.checked) target.setAttribute('checked', 'checked');
    else target.removeAttribute('checked');
  }
  if (original instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) {
    target.value = original.value;
    target.textContent = original.value;
  }
  if (original instanceof HTMLSelectElement && target instanceof HTMLSelectElement) {
    target.value = original.value;
    Array.from(target.options).forEach((option) => {
      if (option.value === original.value) option.setAttribute('selected', 'selected');
      else option.removeAttribute('selected');
    });
  }
};

const embedImages = async (original: HTMLElement, clone: HTMLElement) => {
  const oldImages = Array.from(original.querySelectorAll('img'));
  const newImages = Array.from(clone.querySelectorAll('img'));
  await Promise.all(oldImages.map(async (oldImg, i) => {
    const newImg = newImages[i];
    if (!newImg) return;
    try {
      const source = oldImg.currentSrc || oldImg.getAttribute('src') || '';
      if (source) newImg.setAttribute('src', await urlToDataUrl(source, document.baseURI));
      newImg.removeAttribute('srcset');
    } catch (error) {
      // The original library inlines images before rasterization. Never leave
      // an external image in the SVG: that can taint the canvas again.
      const filename = (oldImg.getAttribute('src') || 'تصویر').split('/').pop() || 'تصویر';
      throw new Error(`تصویر «${filename}» برای تهیه پیوست قابل بارگذاری نیست؛ فایل باید از همین سامانه قابل دریافت باشد.`);
    }
  }));
};

export async function toPng(node: HTMLElement, options: DomToPngOptions = {}): Promise<string> {
  if (!node) throw new Error('No report element supplied');
  await waitForContent(node);
  const baseWidth = Math.ceil(node.scrollWidth || node.clientWidth);
  const baseHeight = Math.ceil(node.scrollHeight || node.clientHeight);
  const width = Math.ceil(options.width || baseWidth || 800);
  const height = Math.ceil(options.height || baseHeight || 600);
  if (width < 1 || height < 1 || width * height > 100_000_000) {
    throw new Error('Report image exceeds safe canvas dimensions');
  }

  const clone = node.cloneNode(true) as HTMLElement;
  const oldElements = [node, ...Array.from(node.querySelectorAll('*'))];
  const newElements = [clone, ...Array.from(clone.querySelectorAll('*'))];
  oldElements.forEach((oldElement, i) => copyComputedCss(oldElement, newElements[i]));
  for (const [property, value] of Object.entries(options.style || {})) {
    clone.style.setProperty(property.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), String(value), 'important');
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  await embedImages(node, clone);
  // Font faces referenced by the computed styles must be available INSIDE
  // the SVG image. External app CSS is not visible to an SVG foreignObject.
  const embedded = await (fontStylesCache ||= loadEmbeddedFonts());
  if (embedded) {
    const style = document.createElement('style');
    style.textContent = embedded;
    clone.insertBefore(style, clone.firstChild);
  }
  const html = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  // The legacy 'dom-to-image' exporter uses an encoded SVG data URL.
  // A blob: SVG containing foreignObject renders visually in Chromium, but
  // taints the destination canvas and makes toDataURL() throw SecurityError.
  // The SVG below has all its assets embedded before this point, so the data
  // URL is self-contained and origin-clean (also tested in Chromium).
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('تصویر چاپی فرم قابل تولید نیست. مسیر لوگو و فونت‌ها را بررسی کنید.'));
    image.src = svgUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.fillStyle = options.bgcolor || options.backgroundColor || '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export default { toPng };
