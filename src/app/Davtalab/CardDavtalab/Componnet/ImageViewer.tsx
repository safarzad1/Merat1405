"use client";

import React, { useState } from "react";
import { X } from "@/component/ResearchIcons";

// تعریف تایپ‌ها
export type FileViewItem = {
    safheh: string;
    url: string;
};

interface ImageViewerProps {
    isOpen: boolean;
    files: FileViewItem[];
    initialIndex: number;
    onClose: () => void;
}

const SWIPE_THRESHOLD = 80;

export default function ImageViewer({ isOpen, files, initialIndex, onClose }: ImageViewerProps) {
    const [viewerIndex, setViewerIndex] = useState(initialIndex);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [dragStartX, setDragStartX] = useState<number | null>(null);
    const [dragStartY, setDragStartY] = useState<number | null>(null);
    const [dragDeltaX, setDragDeltaX] = useState(0);
    const [dragDeltaY, setDragDeltaY] = useState(0);

    // همگام‌سازی ایندکس وقتی از خارج تغییر می‌کند
    React.useEffect(() => {
        setViewerIndex(initialIndex);
        setZoomLevel(1);
        setDragDeltaX(0);
        setDragDeltaY(0);
    }, [initialIndex, isOpen]);

    if (!isOpen || files.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[30010] bg-black/90 flex items-center justify-center overflow-hidden">
            {/* backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full h-full flex items-center justify-center">
                {/* دکمه قبلی */}
                {viewerIndex > 0 && (
                    <button
                        onClick={() => {
                            setViewerIndex((i) => Math.max(0, i - 1));
                            setZoomLevel(1); setDragDeltaX(0); setDragDeltaY(0);
                        }}
                        className="absolute left-4 md:left-10 text-white text-4xl hover:text-gray-300 select-none z-20 bg-black/20 p-2 rounded-full"
                    >
                        ‹
                    </button>
                )}

                {/* کانتینر تصویر + زوم + جابجایی */}
                <div
                    className="relative w-full h-full flex items-center justify-center select-none"
                    style={{ touchAction: "none" }}
                    onWheel={(e) => {
                        e.preventDefault();
                        setZoomLevel((prev) => {
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            const newZoom = Math.min(Math.max(0.5, prev + delta), 5);
                            return newZoom;
                        });
                    }}
                    onPointerDown={(e) => {
                        if ((e as any).button !== undefined && (e as any).button !== 0) return;
                        setDragStartX(e.clientX);
                        setDragStartY(e.clientY);
                        setDragDeltaX(0);
                        setDragDeltaY(0);
                        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                        if (dragStartX === null || dragStartY === null) return;
                        const deltaX = e.clientX - dragStartX;
                        const deltaY = e.clientY - dragStartY;
                        setDragDeltaX(deltaX);
                        setDragDeltaY(deltaY);
                    }}
                    onPointerUp={() => {
                        if (dragStartX === null || dragStartY === null) return;

                        if (zoomLevel === 1) {
                            if (dragDeltaX <= -SWIPE_THRESHOLD && viewerIndex < files.length - 1) {
                                setViewerIndex((i) => i + 1);
                                setZoomLevel(1); setDragDeltaX(0); setDragDeltaY(0);
                            } else if (dragDeltaX >= SWIPE_THRESHOLD && viewerIndex > 0) {
                                setViewerIndex((i) => i - 1);
                                setZoomLevel(1); setDragDeltaX(0); setDragDeltaY(0);
                            }
                        }

                        setDragStartX(null);
                        setDragStartY(null);
                        setDragDeltaX(0);
                        setDragDeltaY(0);
                    }}
                    onPointerCancel={() => {
                        setDragStartX(null);
                        setDragStartY(null);
                        setDragDeltaX(0);
                        setDragDeltaY(0);
                    }}
                >
                    <img
                        src={files[viewerIndex].url}
                        alt={`page-${files[viewerIndex].safheh}`}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl transition-transform duration-75 ease-out will-change-transform"
                        draggable={false}
                        style={{
                            transformOrigin: "center center",
                            transform: `translate(${dragDeltaX}px, ${dragDeltaY}px) scale(${zoomLevel})`,
                            cursor: zoomLevel > 1 ? "grab" : "default",
                        }}
                    />
                </div>

                {/* دکمه بعدی */}
                {viewerIndex < files.length - 1 && (
                    <button
                        onClick={() => {
                            setViewerIndex((i) => i + 1);
                            setZoomLevel(1); setDragDeltaX(0); setDragDeltaY(0);
                        }}
                        className="absolute right-4 md:right-10 text-white text-4xl hover:text-gray-300 select-none z-20 bg-black/20 p-2 rounded-full"
                    >
                        ›
                    </button>
                )}

                {/* دکمه‌های کنترل زوم */}
                <div className="absolute bottom-8 flex gap-4 z-20 bg-black/50 p-2 rounded-full backdrop-blur-sm">
                    <button
                        onClick={() => setZoomLevel((p) => Math.min(p + 0.5, 5))}
                        className="bg-white hover:bg-gray-200 text-black w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition"
                    >
                        +
                    </button>
                    <button
                        onClick={() => setZoomLevel(1)}
                        className="bg-white hover:bg-gray-200 text-black px-4 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => setZoomLevel((p) => Math.max(p - 0.5, 0.5))}
                        className="bg-white hover:bg-gray-200 text-black w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition"
                    >
                        -
                    </button>
                </div>

                {/* اطلاعات پایین */}
                <div className="absolute bottom-[-40px] text-gray-200 text-sm z-20">
                    صفحه {files[viewerIndex].safheh} ({viewerIndex + 1}/{files.length})
                </div>

                {/* دکمه بستن */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white text-3xl hover:text-red-400 select-none z-20 bg-black/20 p-2 rounded-full"
                >
                    <X size={32} />
                </button>
            </div>
        </div>
    );
}