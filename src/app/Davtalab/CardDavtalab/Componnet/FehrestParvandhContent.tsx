"use client";

// import ImageViewer, { FileViewItem } from "../Componnet/ImageViewer";


import React, { useMemo, useState, useEffect, useRef } from "react";
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "@/lib/reactJoyrideCompat";

import {
    Search,
    X,
    Camera,
    FolderOpen,
    Maximize2,
    RotateCcw,
    Minus,
    Plus,
} from "@/component/ResearchIcons";

import { GetParvandehFehrest, GetParvandehFehrestFiles, GetDavtalabPic } from "@/services/ApiServiceDavtalab";
import { useRouter } from "next/navigation";
import ImageViewer, { FileViewItem } from "../Componnet/ImageViewer";

/* ================= TYPES ================= */
type FormState = {
    azSafhe: string;
    taSafhe: string;
    manba: string;
    doreEntekhabati: string;
    tarikhNameh: string;
    shomareNameh: string;
    tarikhEnteshar: string;
    shomareSafhe: string;
    onvanMatn: string;
    kholaseMatn: string;
    nevisandeh?: string;
    shahrestan?: string;
    countSafehat?: string;
};

type RowItem = {
    id: number;
    azSafhe: string;
    taSafhe: string;
    countSafehat: string;
    manba: string;
    doreEntekhabati: string;
    tarikhNameh: string;
    shomareNameh: string;
    tarikhEnteshar: string;
    nevisandeh: string;
    shomareSafhe: string;
    shahrestan: string;
    onvanMatn: string;
    kholaseMatn: string;
};

type ApiRow = {
    AzSafheh?: any;
    TaSafheh?: any;
    CountSafehat?: any;
    Manabe?: any;
    Manabe_NameFarsi?: any;
    CodeEntekhabat?: any;
    OnvanDore?: any;
    TarikhNameh?: any;
    ShomarehNameh?: any;
    TarikhEnteshar?: any;
    Nevisandeh?: any;
    ShomarehSafheh?: any;
    Shahrestan?: any;
    OnvanMatlab?: any;
    Kholaseh?: any;
    IDKhabar?: any;
};

type ApiFileRow = {
    Safheh?: any;
    base64?: string;
    mime?: string;
};

interface FehrestParvandhContentProps {
    shomarehParvandeh: number;
    noeBayegani: number;
    mahal: number;
}

function Spinner({ size = 16 }: { size?: number }) {
    return (
        <span
            className="inline-block rounded-full border-2 border-gray-300 border-t-indigo-600 animate-spin"
            style={{ width: size, height: size }}
        />
    );
}

function ThumbImg({ src, alt }: { src: string; alt: string }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className="relative w-10 h-12">
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 m-0 rounded">
                    <Spinner size={12} />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`w-10 h-12 object-cover rounded ${loaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)}
            />
        </div>
    );
}

function ReadOnlyTextArea({
    label,
    value,
    placeholder,
    rows = 5,
}: {
    label?: string;
    value?: string;
    placeholder?: string;
    rows?: number;
}) {
    return (
        <div className="mt-0 flex flex-col w-full mb-1">
            {label && <label className="text-right mb-1 text-blue-700">{label}</label>}
            <div
                className={`flex items-center pr-3 border rounded-lg overflow-hidden w-full
        focus-within:ring-1 focus-within:border-indigo-500 focus-within:ring-indigo-500 transition-all duration-200 ease-in-out
        border-gray-300 bg-gray-50 mt-0`}
            >
                <textarea
                    value={value ?? ""}
                    readOnly
                    rows={rows}
                    placeholder={placeholder}
                    className="flex-1 w-full px-1 py-2 text-right outline-none bg-transparent placeholder-slate-400 cursor-default resize-none"
                />
            </div>
        </div>
    );
}

export default function FehrestParvandhContent({ shomarehParvandeh, noeBayegani, mahal }: FehrestParvandhContentProps) {
    const router = useRouter();

    /* ================= TOUR ================= */
    const [tourRun, setTourRun] = useState(false);
    const [tourStepIndex, setTourStepIndex] = useState(0);

    const tourSteps: Step[] = useMemo(
        () => [
            {
                target: '[data-tour="search"]',
                content: "اینجا می‌تونی بین موارد فهرست، جستجو کنی.",
                placement: "bottom",
                disableBeacon: true,
            },
            {
                target: '[data-tour="table"]',
                content: "این جدول فهرست پرونده است. هر ردیف یک مطلب/خبر است.",
                placement: "top",
            },
            {
                target: '[data-tour="open-files"]',
                content: "با این دکمه فایل‌ها و تصاویر مربوط به ردیف اول رو باز می‌کنی.",
                placement: "left",
            },
            {
                target: '[data-tour="thumbs"]',
                content: "اینجا تصاویر کوچک (صفحه‌ها) نمایش داده می‌شن. با کلیک صفحه عوض می‌شه.",
                placement: "left",
            },
            {
                target: '[data-tour="big-image"]',
                content: "این تصویر بزرگه. برای زوم/مشاهده کامل روش کلیک کن.",
                placement: "left",
            },
        ],
        []
    );

    /* ================= STATES ================= */
    const [activeParvandeh, setActiveParvandeh] = useState<number>(shomarehParvandeh);

    useEffect(() => {
        setActiveParvandeh(shomarehParvandeh);
    }, [shomarehParvandeh]);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [rows, setRows] = useState<RowItem[]>([]);
    const [form, setForm] = useState<FormState>({
        azSafhe: "",
        taSafhe: "",
        manba: "",
        doreEntekhabati: "",
        tarikhNameh: "",
        shomareNameh: "",
        tarikhEnteshar: "",
        shomareSafhe: "",
        onvanMatn: "",
        kholaseMatn: "",
        nevisandeh: "",
        shahrestan: "",
        countSafehat: "",
    });

    const [davtalabPicUrl, setDavtalabPicUrl] = useState<string>("/images/person.png");
    const [loadingDavtalabPic, setLoadingDavtalabPic] = useState(false);
    const picObjectUrlRef = useRef<string | null>(null);

    const [modalOpenKhabar, setModalOpenKhabar] = useState(false);
    const [selectedRow, setSelectedRow] = useState<RowItem | null>(null);

    const [files, setFiles] = useState<FileViewItem[]>([]);
    const [activeImageUrl, setActiveImageUrl] = useState<string>("");
    const [loadingThumbs, setLoadingThumbs] = useState(false);
    const [loadingBig, setLoadingBig] = useState(false);
    const filesReqId = useRef(0);

    const toStr = (v: any) => (v === null || v === undefined ? "" : String(v));

    /* ================= ZOOM IN BIG IMAGE BOX ================= */
    const [scale, setScale] = useState(1); // 1..4
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const dragZoomRef = useRef({ isDown: false, lastX: 0, lastY: 0 });

    const resetZoom = () => {
        setScale(1);
        setPos({ x: 0, y: 0 });
    };

    const zoomBy = (delta: number) => {
        setScale((prev) => {
            const next = Math.min(Math.max(prev + delta, 1), 4);
            return Number(next.toFixed(2));
        });
    };

    const onWheelZoom = (e: React.WheelEvent) => {
        // برای اینکه اسکرول کانتینر/صفحه فعال نشه:
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.12 : 0.12; // scroll up => zoom in
        zoomBy(delta);
    };

    const onMouseDownZoom = (e: React.MouseEvent) => {
        if (scale <= 1) return; // فقط وقتی زوم داریم پن کنیم
        dragZoomRef.current.isDown = true;
        dragZoomRef.current.lastX = e.clientX;
        dragZoomRef.current.lastY = e.clientY;
    };

    const onMouseMoveZoom = (e: React.MouseEvent) => {
        if (!dragZoomRef.current.isDown) return;
        const dx = e.clientX - dragZoomRef.current.lastX;
        const dy = e.clientY - dragZoomRef.current.lastY;
        setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
        dragZoomRef.current.lastX = e.clientX;
        dragZoomRef.current.lastY = e.clientY;
    };

    const endZoomDrag = () => {
        dragZoomRef.current.isDown = false;
    };

    const openViewerFromBig = () => {
        if (!files.length || !activeImageUrl) return;
        const idx = files.findIndex((f) => f.url === activeImageUrl);
        setViewerIndex(idx >= 0 ? idx : 0);
        setViewerOpen(true);
    };

    /* ================= helpers ================= */
    const fillFromRow = (r: RowItem) => {
        setForm({
            azSafhe: r.azSafhe,
            taSafhe: r.taSafhe,
            countSafehat: r.countSafehat,
            manba: r.manba,
            doreEntekhabati: r.doreEntekhabati,
            tarikhNameh: r.tarikhNameh,
            shomareNameh: r.shomareNameh,
            tarikhEnteshar: r.tarikhEnteshar,
            nevisandeh: r.nevisandeh,
            shahrestan: r.shahrestan,
            shomareSafhe: r.shomareSafhe,
            onvanMatn: r.onvanMatn,
            kholaseMatn: r.kholaseMatn,
        });
    };

    const openKhabarModal = (r: RowItem) => {
        setSelectedRow(r);
        setModalOpenKhabar(true);
    };

    /* ================= FETCH PIC ================= */
    useEffect(() => {
        let cancelled = false;
        const loadPic = async () => {
            if (!activeParvandeh) return;
            if (picObjectUrlRef.current) {
                URL.revokeObjectURL(picObjectUrlRef.current);
                picObjectUrlRef.current = null;
            }
            try {
                setLoadingDavtalabPic(true);
                const res: any = await GetDavtalabPic(activeParvandeh);
                if (cancelled) return;

                if (res instanceof Blob) {
                    const url = URL.createObjectURL(res);
                    picObjectUrlRef.current = url;
                    setDavtalabPicUrl(url);
                    return;
                }

                if (typeof res === "string" && res.length > 50) {
                    setDavtalabPicUrl(`data:image/jpeg;base64,${res}`);
                    return;
                }

                const payload = res?.data ?? res;
                const base64 = payload?.base64 ?? payload?.Base64;
                if (typeof base64 === "string" && base64.length > 50) {
                    const mime = payload?.mime ?? payload?.Mime ?? "image/jpeg";
                    setDavtalabPicUrl(`data:${mime};base64,${base64}`);
                    return;
                }

                if (typeof res === "string" && (res.startsWith("http") || res.startsWith("/"))) {
                    setDavtalabPicUrl(res);
                    return;
                }

                setDavtalabPicUrl("/images/person.png");
            } catch {
                if (!cancelled) setDavtalabPicUrl("/images/person.png");
            } finally {
                if (!cancelled) setLoadingDavtalabPic(false);
            }
        };

        loadPic();
        return () => {
            cancelled = true;
        };
    }, [activeParvandeh]);

    /* ================= FETCH LIST ================= */
    useEffect(() => {
        let cancelled = false;
        const fetchRows = async () => {
            if (!shomarehParvandeh || !noeBayegani) {
                setRows([]);
                setError("پارامترهای شماره پرونده یا نوع بایگانی ارسال نشده است.");
                return;
            }
            try {
                setLoading(true);
                setError("");

                const res: any = await GetParvandehFehrest(activeParvandeh, mahal, noeBayegani);

                const list: ApiRow[] = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : Array.isArray(res?.recordset)
                            ? res.recordset
                            : [];

                const mapped: RowItem[] = list.map((a, idx) => ({
                    id: Number((a as any).IDKhabar ?? idx + 1),
                    azSafhe: toStr((a as any).AzSafheh),
                    taSafhe: toStr((a as any).TaSafheh),
                    countSafehat: toStr((a as any).CountSafehat),
                    manba: toStr((a as any).Manabe_NameFarsi ?? (a as any).Manabe),
                    doreEntekhabati: toStr((a as any).OnvanDore ?? (a as any).CodeEntekhabat),
                    tarikhNameh: toStr((a as any).TarikhNameh),
                    shomareNameh: toStr((a as any).ShomarehNameh),
                    tarikhEnteshar: toStr((a as any).TarikhEnteshar),
                    nevisandeh: toStr((a as any).Nevisandeh),
                    shahrestan: toStr((a as any).Shahrestan),
                    shomareSafhe: toStr((a as any).ShomarehSafheh),
                    onvanMatn: toStr((a as any).OnvanMatlab),
                    kholaseMatn: toStr((a as any).Kholaseh),
                }));

                if (!cancelled) {
                    setRows(mapped);
                    if (mapped.length > 0) fillFromRow(mapped[0]);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "خطا در دریافت فهرست");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchRows();
        return () => {
            cancelled = true;
        };
    }, [shomarehParvandeh, noeBayegani, mahal, activeParvandeh]);

    /* ================= SEARCH ================= */
    const filtered = useMemo(() => {
        const q = search.trim();
        if (!q) return rows;
        return rows.filter((r) => `${r.onvanMatn} ${r.manba} ${r.tarikhEnteshar} ${r.shomareSafhe}`.includes(q));
    }, [rows, search]);

    /* ================= DRAG-TO-SCROLL ================= */
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef({ isDown: false, startY: 0, startScrollTop: 0 });

    const onMouseDownDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        const el = scrollRef.current;
        if (!el) return;
        dragRef.current.isDown = true;
        dragRef.current.startY = e.clientY;
        dragRef.current.startScrollTop = el.scrollTop;
        setIsDragging(true);
        e.preventDefault();
    };

    const onMouseMoveDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragRef.current.isDown) return;
        const el = scrollRef.current;
        if (!el) return;
        const dy = e.clientY - dragRef.current.startY;
        el.scrollTop = dragRef.current.startScrollTop - dy;
    };

    const endDrag = () => {
        dragRef.current.isDown = false;
        setIsDragging(false);
    };

    useEffect(() => {
        const up = () => endDrag();
        window.addEventListener("mouseup", up);
        return () => window.removeEventListener("mouseup", up);
    }, []);

    const loadFilesForRow = async (r: RowItem) => {
        const reqId = ++filesReqId.current;
        try {
            fillFromRow(r);
            setLoadingThumbs(true);
            setFiles([]);
            setActiveImageUrl("");
            setLoadingBig(true);
            resetZoom();

            const res: any = await GetParvandehFehrestFiles(shomarehParvandeh, noeBayegani, r.azSafhe);
            if (res?.status === 401 || res?.state === 401) {
                router.push("/Login");
                return;
            }
            if (reqId !== filesReqId.current) return;

            const list: ApiFileRow[] = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : Array.isArray(res?.recordset)
                        ? res.recordset
                        : [];

            const mapped: FileViewItem[] = list
                .map((x) => {
                    const b64 = x?.base64;
                    if (!b64) return null;
                    const mime = x?.mime || "image/jpeg";
                    return { safheh: toStr(x?.Safheh), url: `data:${mime};base64,${b64}` };
                })
                .filter(Boolean) as FileViewItem[];

            setFiles(mapped);
            setLoadingThumbs(false);

            if (mapped.length > 0) {
                setActiveImageUrl(mapped[0].url);
            } else {
                setLoadingBig(false);
            }
        } catch (err) {
            console.error(err);
            if (reqId === filesReqId.current) {
                setLoadingThumbs(false);
                setLoadingBig(false);
            }
        }
    };

    /* ================= JOYRIDE CALLBACK ================= */
    const onTourCallback = async (data: CallBackProps) => {
        const { status, index, type, action } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setTourRun(false);
            setTourStepIndex(0);
            return;
        }

        if (type === EVENTS.TARGET_NOT_FOUND) {
            setTourStepIndex((prev) => prev + 1);
            return;
        }

        if (type === EVENTS.STEP_BEFORE && index === 2) {
            const first = filtered[0];
            if (first) {
                await loadFilesForRow(first);
            }
        }

        if (type === EVENTS.STEP_AFTER) {
            if (action === "next") setTourStepIndex((prev) => prev + 1);
            if (action === "prev") setTourStepIndex((prev) => Math.max(0, prev - 1));
        }
    };

    const startTour = () => {
        if (loading || filtered.length === 0) return;
        setTourStepIndex(0);
        setTourRun(true);
    };

    /* ================= UI ================= */
    return (
        <>
            <Joyride
                steps={tourSteps}
                run={tourRun}
                stepIndex={tourStepIndex}
                continuous
                showProgress
                showSkipButton
                scrollToFirstStep
                disableScrolling={false}
                callback={onTourCallback}
                styles={{ options: { zIndex: 9999 } }}
                locale={{
                    back: "قبلی",
                    close: "بستن",
                    last: "اتمام",
                    next: "بعدی",
                    skip: "رد کردن",
                }}
            />

            {/* مودال نمایش خبر */}
            {modalOpenKhabar && selectedRow && (
                <div className="fixed inset-0 z-50 flex items-start justify-center mt-10">
                    <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenKhabar(false)} />
                    <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[900px] max-w-[95vw] relative">
                        <div className="bg-gray-200 -mx-6 p-3 border-0 border-b-2 border-purple-500 flex items-center justify-between">
                            <h2 className="text-lg font-bold">جزئیات مطلب</h2>
                            <button className="p-1 rounded hover:bg-gray-300 transition" onClick={() => setModalOpenKhabar(false)} title="بستن">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="mt-3">
                            <ReadOnlyTextArea label="" value={selectedRow.kholaseMatn || ""} rows={20} />
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer" onClick={() => setModalOpenKhabar(false)}>
                                بستن
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-1 mt-0">
                <div className="mt-1 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                    {/* table */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-300 p-3 h-full">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base md:text-lg font-extrabold text-gray-800">فهرست پرونده</h2>

                                    <button
                                        type="button"
                                        onClick={startTour}
                                        disabled={loading || filtered.length === 0}
                                        className="text-xs px-3 py-1 rounded-lg border border-gray-300 bg-gray-50 hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="راهنمای استفاده"
                                    >
                                        راهنما
                                    </button>
                                </div>

                                <div className="relative">
                                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        data-tour="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pr-9 pl-3 py-2 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white outline-none text-sm md:text-base w-[240px] focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200 ease-in-out"
                                        placeholder="جستجو..."
                                    />
                                </div>
                            </div>

                            {error && <div className="mb-2 text-sm text-red-600 text-right">{error}</div>}

                            <div data-tour="table" className="rounded-xl border border-gray-400 overflow-hidden">
                                <div
                                    ref={scrollRef}
                                    onMouseDown={onMouseDownDrag}
                                    onMouseMove={onMouseMoveDrag}
                                    onMouseUp={endDrag}
                                    onMouseLeave={endDrag}
                                    className={`max-h-[700px] overflow-y-auto overscroll-contain ${isDragging ? "cursor-grabbing select-none" : "cursor-default"}`}
                                >
                                    <table className="min-w-full table-auto border-collapse">
                                        <thead className="text-[16px]">
                                            <tr className="text-gray-700" style={{ backgroundColor: "#cff4fc" }}>
                                                <th className="border px-4 py-1 text-right whitespace-nowrap">از صفحه</th>
                                                <th className="border px-4 py-1 text-right">عنوان</th>
                                                <th className="border px-4 py-1 text-right whitespace-nowrap">منبع</th>
                                                <th className="border px-4 py-1 text-right whitespace-nowrap">عملیات</th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-[15px]">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={4} className="border px-4 py-2 text-center text-gray-500">
                                                        در حال دریافت اطلاعات...
                                                    </td>
                                                </tr>
                                            ) : filtered.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="border px-4 py-2 text-center text-gray-500">
                                                        موردی یافت نشد.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filtered.map((r, idx) => (
                                                    <tr key={`${r.id}-${idx}`} className="transition cursor-pointer odd:bg-gray-50 even:bg-white hover:bg-sky-100 hover:text-sky-900">
                                                        <td className="text-center border px-4 py-1 whitespace-nowrap">{r.azSafhe}</td>

                                                        <td className="text-center border px-4 py-1">
                                                            <button
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                className="w-full text-center cursor-pointer hover:underline"
                                                                onClick={() => openKhabarModal(r)}
                                                            >
                                                                {r.onvanMatn}
                                                            </button>
                                                        </td>

                                                        <td className="text-center border px-4 py-1 whitespace-nowrap">{r.manba}</td>

                                                        <td className="text-center border px-4 py-1 whitespace-nowrap">
                                                            <button
                                                                data-tour={idx === 0 ? "open-files" : undefined}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                className="cursor-pointer px-3 py-1 rounded bg-sky-500 text-white hover:bg-sky-700 transition text-sm"
                                                                onClick={() => loadFilesForRow(r)}
                                                            >
                                                                <FolderOpen size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="hidden">
                                <pre>{JSON.stringify(form, null, 2)}</pre>
                            </div>
                        </div>
                    </div>

                    {/* thumbs column */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 h-full">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 m-0 flex items-center justify-center">
                                {loadingDavtalabPic ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Spinner size={14} />
                                        در حال بارگذاری عکس...
                                    </div>
                                ) : (
                                    <img
                                        src={davtalabPicUrl}
                                        alt="عکس داوطلب"
                                        className="w-full h-[120px] object-contain rounded-lg"
                                        onError={() => setDavtalabPicUrl("/images/person.png")}
                                    />
                                )}
                            </div>

                            <hr className="my-2 border-gray-200" />

                            <div data-tour="thumbs" className="flex-1 overflow-y-auto pr-1">
                                {loadingThumbs ? (
                                    <div className="flex items-center justify-center h-full text-xs text-gray-600 gap-2">
                                        <Spinner size={16} />
                                        لود تصاویر...
                                    </div>
                                ) : files.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {files.map((f, idx) => {
                                            const isActive = activeImageUrl === f.url;

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (isActive) return;
                                                        setLoadingBig(true);
                                                        setActiveImageUrl(f.url);
                                                        resetZoom(); // ✅ با تغییر تصویر زوم ریست شود
                                                    }}
                                                    className={`cursor-pointer border rounded-lg p-1 transition ${isActive ? "border-indigo-500" : "border-gray-300 hover:border-indigo-400"
                                                        }`}
                                                    title={`صفحه ${f.safheh}`}
                                                >
                                                    <ThumbImg src={f.url} alt={`page-${f.safheh}`} />
                                                    <div className="text-[10px] text-center mt-1 text-gray-600">ص {f.safheh}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-gray-500 text-center px-1">یک ردیف را انتخاب کن</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* big image */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-full flex flex-col">
                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white flex-1">
                                {/* ✅ این بخش باکس زوم دار شد */}
                                <div
                                    data-tour="big-image"
                                    className="relative w-full h-full min-h-[640px] flex items-center justify-center bg-black"
                                    onWheel={onWheelZoom}
                                    onMouseMove={onMouseMoveZoom}
                                    onMouseUp={endZoomDrag}
                                    onMouseLeave={endZoomDrag}
                                >
                                    {loadingBig && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <Spinner size={20} />
                                                در حال بارگذاری تصویر...
                                            </div>
                                        </div>
                                    )}

                                    {/* دکمه‌های بالا راست: مودال + ریست */}
                                    <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={openViewerFromBig}
                                            disabled={!activeImageUrl}
                                            className="p-2 rounded-lg bg-white/90 hover:bg-white shadow border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="باز کردن در مودال (زوم کامل)"
                                        >
                                            <Maximize2 className="w-4 h-4" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={resetZoom}
                                            disabled={!activeImageUrl}
                                            className="p-2 rounded-lg bg-white/90 hover:bg-white shadow border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="بازگشت به حالت اصلی"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* کنترل‌های پایین راست */}
                                    <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 bg-white/90 rounded-lg shadow border border-gray-200 p-1">
                                        <button
                                            type="button"
                                            className="p-1 rounded hover:bg-gray-100"
                                            onClick={() => zoomBy(-0.2)}
                                            disabled={!activeImageUrl}
                                            title="Zoom Out"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>

                                        <div className="px-2 text-xs text-gray-700 min-w-[56px] text-center">{Math.round(scale * 100)}%</div>

                                        <button
                                            type="button"
                                            className="p-1 rounded hover:bg-gray-100"
                                            onClick={() => zoomBy(0.2)}
                                            disabled={!activeImageUrl}
                                            title="Zoom In"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>

                                        <button
                                            type="button"
                                            className="p-1 rounded hover:bg-gray-100"
                                            onClick={resetZoom}
                                            disabled={!activeImageUrl}
                                            title="Reset"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {activeImageUrl ? (
                                        <img
                                            src={activeImageUrl}
                                            draggable={false}
                                            alt="document"
                                            onLoad={() => setLoadingBig(false)}
                                            onError={() => setLoadingBig(false)}
                                            onMouseDown={onMouseDownZoom}
                                            className={[
                                                "absolute top-1/2 left-1/2 select-none",
                                                scale > 1 ? "cursor-grab" : "cursor-default",
                                            ].join(" ")}
                                            style={{
                                                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                                                transition: dragZoomRef.current.isDown ? "none" : "transform 0.12s ease-out",
                                                transformOrigin: "center center",
                                            }}
                                            // ✅ مهم: مودال با کلیک روی تصویر باز نشود
                                            onClick={(e) => {
                                                // اگر خواستی کلیک فقط برای فوکوس/هیچ کاری:
                                                e.preventDefault();
                                                e.stopPropagation();
                                                return;
                                            }}
                                        />
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                <Camera className="w-6 h-6 text-gray-500" />
                                            </div>
                                            <div className="mt-3 text-xs text-gray-200">تصویری انتخاب نشده</div>
                                        </div>
                                    )}

                                    {!!activeImageUrl && (
                                        <div className="absolute bottom-2 left-2 z-20 text-[11px] text-white/80 bg-black/30 rounded px-2 py-1">
                                            اسکرول = زوم • درگ = جابه‌جایی (وقتی زوم &gt; 100%)
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-2 text-[11px] text-gray-500 leading-6">
                                (نوار وسط برای تصاویر کوچک است؛ با کلیک، تصویر بزرگ نمایش داده می‌شود.)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ImageViewer isOpen={viewerOpen} files={files} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
        </>
    );
}
