"use client";

import { GetJambandiMohagheghPeyvast } from "@/services/ApiService";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
    tahghighId: number;
}

type PeyvastObj = { FileName?: string;[key: string]: any };

// ✅ Portal helper
function Portal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(children, document.body);
}

const SWIPE_THRESHOLD = 60;

export default function ShowJambandiMohagheghPeyvast({ tahghighId }: Props) {
    const [fileNames, setFileNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    // zoom / pan / swipe states
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const [isSwiping, setIsSwiping] = useState(false);
    const [swipeX, setSwipeX] = useState(0);

    const swipeStartXRef = useRef<number | null>(null);
    const didSwipeRef = useRef(false);
    const startDragRef = useRef({ x: 0, y: 0 });

    const normalizeFileNames = (payload: any): string[] => {
        if (!payload) return [];
        if (typeof payload === "string") return [payload];

        if (Array.isArray(payload)) {
            return payload
                .map((x) => {
                    if (typeof x === "string") return x;
                    if (x && typeof x === "object" && "FileName" in x) return (x as PeyvastObj).FileName;
                    return null;
                })
                .filter(Boolean) as string[];
        }

        if (typeof payload === "object") {
            const nested = payload.data ?? payload.items ?? payload.result;
            if (nested) return normalizeFileNames(nested);
            if (payload.FileName) return [payload.FileName];
        }

        return [];
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!tahghighId) return;

            setLoading(true);
            try {
                const res: any = await GetJambandiMohagheghPeyvast(tahghighId);
                const payload = res?.data?.data ?? res?.data ?? res;
                const names = normalizeFileNames(payload);
                setFileNames(Array.from(new Set(names)));
            } catch (e) {
                console.error(e);
                setFileNames([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tahghighId]);

    const images = useMemo(
        () =>
            fileNames.map((name) => ({
                name,
                src: `/uploads/${name}`,
            })),
        [fileNames]
    );

    const resetView = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setSwipeX(0);
        setIsDragging(false);
        setIsSwiping(false);
        swipeStartXRef.current = null;
        didSwipeRef.current = false;
    };

    const openViewer = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
        resetView();
    };

    const closeViewer = () => {
        setViewerOpen(false);
        resetView();
    };

    const goNext = () => {
        if (!images.length) return;
        setViewerIndex((i) => (i + 1) % images.length);
        resetView();
    };

    const goPrev = () => {
        if (!images.length) return;
        setViewerIndex((i) => (i - 1 + images.length) % images.length);
        resetView();
    };

    // قفل اسکرول بدنه وقتی Viewer بازه
    useEffect(() => {
        if (!viewerOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [viewerOpen]);

    // کیبورد: ESC / ArrowLeft / ArrowRight
    useEffect(() => {
        if (!viewerOpen) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeViewer();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewerOpen, images.length]);

    if (loading) return <div>در حال بارگذاری...</div>;
    if (!images.length) return <div>پیوستی یافت نشد.</div>;

    const current = images[viewerIndex];

    return (
        <div className="mt-2">
            {/* thumbnails */}
            <div
                className={`flex gap-2 items-center ${images.length > 1 ? "overflow-x-auto" : ""}`}
                style={{ maxWidth: 260 }}
            >
                {images.map((img, idx) => (
                    <button
                        type="button"
                        key={img.name}
                        className="w-[100px] h-[120px] border rounded overflow-hidden bg-gray-100 shrink-0"
                        title={img.name}
                        onClick={() => openViewer(idx)}
                    >
                        <img
                            src={img.src}
                            alt={img.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                            draggable={false}
                        />
                    </button>
                ))}
            </div>

            {/* ✅ Viewer + Zoom/Pan/Swipe */}
            {viewerOpen && current && (
                <Portal>
                    <div
                        className="fixed inset-0 bg-black/80 flex items-center justify-center overflow-hidden"
                        style={{ zIndex: 999999 }}
                        onClick={() => {
                            // اگر درگ/سوایپ نکرده باشه، کلیک بیرون ببنده
                            if (!isDragging && !isSwiping && !didSwipeRef.current) closeViewer();
                            didSwipeRef.current = false;
                        }}
                    >
                        {/* Left */}
                        {images.length > 1 && (
                            <button
                                type="button"
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-3xl select-none"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goPrev();
                                }}
                            >
                                ‹
                            </button>
                        )}

                        {/* Right */}
                        {images.length > 1 && (
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-3xl select-none"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goNext();
                                }}
                            >
                                ›
                            </button>
                        )}

                        {/* Close */}
                        <button
                            type="button"
                            className="absolute top-4 right-4 z-50 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-2xl select-none"
                            onClick={(e) => {
                                e.stopPropagation();
                                closeViewer();
                            }}
                            title="بستن"
                        >
                            ✕
                        </button>

                        {/* Zoom Controls */}
                        <div className="absolute bottom-8 flex gap-4 z-50 bg-black/50 p-2 rounded-full backdrop-blur-sm">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setZoom((p) => Math.min(p + 0.5, 5));
                                }}
                                className="bg-white hover:bg-gray-200 text-black w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resetView();
                                }}
                                className="bg-white hover:bg-gray-200 text-black px-4 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setZoom((p) => Math.max(p - 0.5, 0.5));
                                }}
                                className="bg-white hover:bg-gray-200 text-black w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition"
                            >
                                -
                            </button>
                        </div>

                        {/* File name + counter */}
                        <div className="absolute top-4 left-0 right-0 text-center text-gray-200 text-sm z-50 pointer-events-none">
                            {current.name}{" "}
                            <span className="opacity-70">
                                ({viewerIndex + 1}/{images.length})
                            </span>
                        </div>

                        {/* Image */}
                        <img
                            src={current.src}
                            alt={current.name}
                            draggable={false}
                            className="select-none max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
                            style={{
                                transform: `scale(${zoom}) translate(${offset.x + (zoom <= 1.05 ? swipeX : 0)}px, ${offset.y}px)`,
                                transition: isDragging || isSwiping ? "none" : "transform 0.2s ease",
                                cursor: zoom > 1.05 ? (isDragging ? "grabbing" : "grab") : "default",
                                touchAction: zoom > 1.05 ? "none" : "pan-y",
                            }}
                            onWheel={(e) => {
                                e.preventDefault();
                                setZoom((prev) => Math.min(Math.max(0.5, prev + (e.deltaY < 0 ? 0.1 : -0.1)), 5));
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();

                                // اگر زوم نیست → سوایپ
                                if (zoom <= 1.05) {
                                    setIsSwiping(true);
                                    swipeStartXRef.current = e.clientX;
                                    setSwipeX(0);
                                    didSwipeRef.current = false;
                                    return;
                                }

                                // اگر زوم هست → پن
                                setIsDragging(true);
                                startDragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
                            }}
                            onPointerMove={(e) => {
                                if (isSwiping && swipeStartXRef.current !== null) {
                                    const dx = e.clientX - swipeStartXRef.current;
                                    setSwipeX(dx);
                                    if (Math.abs(dx) > 10) didSwipeRef.current = true;
                                    return;
                                }

                                if (isDragging && zoom > 1.05) {
                                    setOffset({
                                        x: e.clientX - startDragRef.current.x,
                                        y: e.clientY - startDragRef.current.y,
                                    });
                                }
                            }}
                            onPointerUp={(e) => {
                                e.stopPropagation();

                                if (isSwiping) {
                                    setIsSwiping(false);

                                    if (swipeX > SWIPE_THRESHOLD) goPrev();
                                    else if (swipeX < -SWIPE_THRESHOLD) goNext();

                                    setSwipeX(0);
                                    swipeStartXRef.current = null;
                                    return;
                                }

                                setIsDragging(false);
                            }}
                            onPointerCancel={(e) => {
                                e.stopPropagation();
                                setIsSwiping(false);
                                setSwipeX(0);
                                swipeStartXRef.current = null;
                                setIsDragging(false);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Counter bottom */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1 rounded-full z-50">
                            {viewerIndex + 1} / {images.length}
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
}
