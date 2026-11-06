"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import styles from "./NewsZoomPanImage.module.css";

type ViewState = { scale: number; x: number; y: number };
type DragStart = { pointerId: number; clientX: number; clientY: number; x: number; y: number };

const MIN_SCALE = 1;
const MAX_SCALE = 6;

/** Isolated viewer: wheel zoom + mouse/touch drag, without scrolling the surrounding page. */
export default function NewsZoomPanImage({ src, alt }: { src: string; alt: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragStart | null>(null);
  const viewRef = useRef<ViewState>({ scale: 1, x: 0, y: 0 });
  const [view, setViewState] = useState<ViewState>(viewRef.current);
  const [isDragging, setIsDragging] = useState(false);

  const setView = useCallback((next: ViewState) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  const boundedOffset = useCallback((scale: number, x: number, y: number) => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image || scale <= MIN_SCALE) return { x: 0, y: 0 };
    // offsetWidth/Height are measured before CSS transforms, i.e. the fitted image dimensions.
    const horizontal = Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2);
    const vertical = Math.max(0, (image.offsetHeight * scale - stage.clientHeight) / 2);
    return {
      x: Math.max(-horizontal, Math.min(horizontal, x)),
      y: Math.max(-vertical, Math.min(vertical, y)),
    };
  }, []);

  const zoomTo = useCallback((nextScale: number, clientX?: number, clientY?: number) => {
    const stage = stageRef.current;
    const prev = viewRef.current;
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(nextScale * 100) / 100));
    if (scale === MIN_SCALE) {
      setView({ scale, x: 0, y: 0 });
      return;
    }
    let x = prev.x;
    let y = prev.y;
    if (stage && clientX !== undefined && clientY !== undefined) {
      const bounds = stage.getBoundingClientRect();
      const cursorX = clientX - bounds.left - bounds.width / 2;
      const cursorY = clientY - bounds.top - bounds.height / 2;
      const ratio = scale / prev.scale;
      // Preserve the image point under the cursor while changing the zoom level.
      x = cursorX - (cursorX - x) * ratio;
      y = cursorY - (cursorY - y) * ratio;
    }
    setView({ scale, ...boundedOffset(scale, x, y) });
  }, [boundedOffset, setView]);

  useEffect(() => {
    dragRef.current = null;
    setIsDragging(false);
    setView({ scale: 1, x: 0, y: 0 });
  }, [src, setView]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      // A non-passive native handler prevents the news modal/page from scrolling during zoom.
      event.preventDefault();
      zoomTo(viewRef.current.scale * (event.deltaY < 0 ? 1.2 : 1 / 1.2), event.clientX, event.clientY);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (viewRef.current.scale <= MIN_SCALE || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    const current = viewRef.current;
    dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: current.x, y: current.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    event.preventDefault();
    const scale = viewRef.current.scale;
    const next = boundedOffset(scale, start.x + event.clientX - start.clientX, start.y + event.clientY - start.clientY);
    setView({ scale, ...next });
  };

  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={styles.viewer}>
      <div
        ref={stageRef}
        className={`${styles.stage} ${view.scale > 1 ? styles.pannable : ""} ${isDragging ? styles.dragging : ""}`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onDoubleClick={(event) => zoomTo(viewRef.current.scale > 1 ? 1 : 2, event.clientX, event.clientY)}
        title="چرخ موس: بزرگ‌نمایی · نگه‌داشتن کلیک و کشیدن: جابه‌جایی · دو کلیک: بازنشانی"
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => {
            const current = viewRef.current;
            setView({ scale: current.scale, ...boundedOffset(current.scale, current.x, current.y) });
          }}
          style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
        />
      </div>
      <div className={styles.controls} dir="ltr" aria-label="کنترل بزرگ‌نمایی تصویر">
        <button type="button" onClick={() => zoomTo(viewRef.current.scale / 1.25)} disabled={view.scale <= MIN_SCALE} title="کوچک‌نمایی" aria-label="کوچک‌نمایی"><ZoomOut size={17} /></button>
        <span className={styles.percent}>{Math.round(view.scale * 100).toLocaleString("fa-IR")}٪</span>
        <button type="button" onClick={() => zoomTo(viewRef.current.scale * 1.25)} disabled={view.scale >= MAX_SCALE} title="بزرگ‌نمایی" aria-label="بزرگ‌نمایی"><ZoomIn size={17} /></button>
        <button type="button" onClick={() => zoomTo(1)} title="نمایش کامل تصویر" aria-label="بازنشانی بزرگ‌نمایی"><Maximize2 size={17} /></button>
      </div>
    </div>
  );
}
