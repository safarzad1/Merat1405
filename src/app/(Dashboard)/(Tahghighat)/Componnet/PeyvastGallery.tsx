import { useEffect, useRef, useState } from "react";

export default function YourComponent({ gridBoxes, IsDoneKarbarg, DeletePeyvast, showConfirm }: any) {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(0);

    const len = gridBoxes?.length ?? 0;

    const openViewer = (idx: number) => {
        setActiveIndex(idx);
        setIsViewerOpen(true);
    };

    const closeViewer = () => setIsViewerOpen(false);

    const next = () => setActiveIndex((i) => (i + 1) % len);
    const prev = () => setActiveIndex((i) => (i - 1 + len) % len);

    // --- Drag / Swipe ---
    const startX = useRef<number | null>(null);
    const dragging = useRef(false);
    const [dragX, setDragX] = useState(0);

    const THRESHOLD = 60; // مقدار حساسیت سوایپ

    const onPointerDown = (e: React.PointerEvent) => {
        dragging.current = true;
        startX.current = e.clientX;
        setDragX(0);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragging.current || startX.current === null) return;
        const dx = e.clientX - startX.current;
        setDragX(dx);
    };

    const onPointerUp = () => {
        if (!dragging.current) return;
        dragging.current = false;

        if (dragX > THRESHOLD) prev();
        else if (dragX < -THRESHOLD) next();

        setDragX(0);
        startX.current = null;
    };

    // --- Keyboard controls (اختیاری ولی خیلی کاربردی) ---
    useEffect(() => {
        if (!isViewerOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeViewer();
            if (e.key === "ArrowRight") next();
            if (e.key === "ArrowLeft") prev();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isViewerOpen, len, dragX]);

    return (
        <div className="mt-6">
            <h3 className="font-bold mb-3">اسناد دریافت شده</h3>

            <div className="overflow-y-auto" style={{ maxHeight: "40vh" }}>
                <div className="grid grid-cols-5 gap-3">
                    {gridBoxes.map((box: any, index: number) => (
                        <div
                            key={index}
                            onClick={() => openViewer(index)}
                            className="cursor-pointer"
                        >
                            <div className="relative w-full h-38 bg-gray-200 rounded-md flex items-center justify-center border border-gray-300 hover:shadow-lg transition-all">
                                <img
                                    src={box.url}
                                    alt={box.label}
                                    className="w-full h-[80%] object-cover rounded-md"
                                />

                                {!IsDoneKarbarg && (
                                    <button
                                        className="absolute top-1 right-1 text-red-600 bg-white rounded-full p-1 hover:bg-red-100 transition"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            showConfirm(
                                                "آیا از حذف پیوست اطمینان دارید؟",
                                                () => DeletePeyvast(box.label),
                                                "هشدار!",
                                                "error"
                                            );
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Viewer Modal */}
            {isViewerOpen && len > 0 && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
                    onClick={closeViewer}
                >
                    <div
                        className="relative w-[95vw] max-w-5xl h-[85vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Prev / Next */}
                        <button
                            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center"
                            onClick={prev}
                            type="button"
                        >
                            ‹
                        </button>

                        <button
                            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center"
                            onClick={next}
                            type="button"
                        >
                            ›
                        </button>

                        {/* Close */}
                        <button
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center"
                            onClick={closeViewer}
                            type="button"
                        >
                            ✕
                        </button>

                        {/* Swipe Area */}
                        <div
                            className="w-full h-full flex items-center justify-center select-none touch-pan-y"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                        >
                            <img
                                src={gridBoxes[activeIndex]?.url}
                                alt={gridBoxes[activeIndex]?.label ?? "preview"}
                                className="max-w-full max-h-full rounded-lg shadow-lg"
                                style={{
                                    transform: `translateX(${dragX}px)`,
                                    transition: dragging.current ? "none" : "transform 150ms ease",
                                }}
                                draggable={false}
                            />
                        </div>

                        {/* Counter */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
                            {activeIndex + 1} / {len}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
