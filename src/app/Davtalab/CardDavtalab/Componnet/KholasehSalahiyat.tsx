"use client";

import { useMeratUser } from "@/lib/useMeratUser";

import React, { useEffect, useMemo, useRef, useState } from "react";
import TextArea1 from "@/component/Objects/Textarea1";
import { GetParvandehFehrest, GetParvandehFehrestFiles } from "@/services/ApiServiceDavtalab";
import { useRouter } from "next/navigation";
import ImageViewer from "../Componnet/ImageViewer";
import { Maximize2, RotateCcw, Minus, Plus, Loader2 } from "@/component/ResearchIcons";
import {
    InsertAshkhasKholasehSalahiyat,
    GetAshkhasKholasehSalahiyat,
    GetAshkhasKholasehSalahiyatByTag,
} from "@/services/ApiServiceKholasehSalahiyat";

import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "@/lib/reactJoyrideCompat";

interface PageLayoutProps {
    ShomarehParvandeh: number;
    CodeEntekhabat: number;
    noeBayegani: number;
    mahal: number;
}

type TagItem = { id: number; label: string };

// ✅ اینجا Kholaseh هم اضافه شد
type ApiRow = { AzSafheh?: any; Kholaseh?: any };

type ApiFileRow = {
    id?: any;
    ID?: any;
    Safheh?: any;
    base64?: string;
    mime?: string;
};

type FileViewItem = {
    id: string;
    azSafheh: number;
    safheh: string;
    url: string;
};

type ApiKholasehRow = {
    ID?: any;
    Id?: any;
    id?: any;
    TagSalahiyat?: any;
    TagSalahiyat_NameFarsi?: any;
    KholasehMatlab?: any;
};

type KholasehListItem = {
    id: string;
    tagId: number | null;
    tagName: string;
    text: string;
};

function toStr(v: any) {
    return v === null || v === undefined ? "" : String(v);
}
function toNum(v: any): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

function compactPages(pages: number[], active: number, siblingCount = 2): (number | string)[] {
    if (!pages.length) return [];
    const first = pages[0];
    const last = pages[pages.length - 1];

    let idx = pages.indexOf(active);
    if (idx < 0) {
        idx = 0;
        for (let i = 0; i < pages.length; i++) {
            if (pages[i] >= active) {
                idx = i;
                break;
            }
        }
    }

    const start = Math.max(0, idx - siblingCount);
    const end = Math.min(pages.length - 1, idx + siblingCount);

    const out: (number | string)[] = [first];
    if (start > 1) out.push("...");
    for (let i = start; i <= end; i++) {
        const p = pages[i];
        if (p !== first && p !== last) out.push(p);
    }
    if (end < pages.length - 2) out.push("...");
    if (last !== first) out.push(last);

    const seen = new Set<string>();
    return out.filter((x) => {
        const k = String(x);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

export default function PageLayout({
    ShomarehParvandeh,
    CodeEntekhabat,
    noeBayegani,
    mahal,
}: PageLayoutProps) {
    const router = useRouter();
    const user = useMeratUser();

    /* ================= TOUR ================= */
    const [tourRun, setTourRun] = useState(false);
    const [tourStepIndex, setTourStepIndex] = useState(0);

    const tourSteps: Step[] = useMemo(
        () => [
            {
                target: '[data-tour="pages-nav"]',
                content: "اینجا می‌توانید بین صفحات مختلف پرونده جابه‌جا شوید. هر عدد نشان‌دهنده شماره صفحه است.",
                placement: "bottom",
                disableBeacon: true,
            },
            {
                target: '[data-tour="documents-nav"]',
                content: "اسناد مربوط به صفحه انتخاب‌شده در اینجا نمایش داده می‌شوند.",
                placement: "bottom",
            },
            {
                target: '[data-tour="image-viewer"]',
                content: "این بخش تصویر بزرگ سند را نمایش می‌دهد. برای زوم و حرکت ماوس استفاده کنید.",
                placement: "left",
            },
            {
                target: '[data-tour="zoom-controls"]',
                content: "کنترل‌های زوم: می‌توانید بزرگنمایی را کم یا زیاد کنید.",
                placement: "left",
            },
            {
                target: '[data-tour="tags-section"]',
                content: "تگ‌های مختلف صلاحیتی را از اینجا انتخاب کنید.",
                placement: "bottom",
            },
            {
                target: '[data-tour="textarea-section"]',
                content: "خلاصه صلاحیتی داوطلب را در این بخش وارد نمایید.",
                placement: "top",
            },
            {
                target: '[data-tour="kholaseh-list"]',
                content: "اینجا خلاصه‌های قبلاً ثبت‌شده نمایش داده می‌شوند. با کلیک روی هر کدام، اطلاعات آن بارگذاری می‌شود.",
                placement: "top",
            },
            {
                target: '[data-tour="submit-btn"]',
                content: "با این دکمه خلاصه جدید را ثبت می‌کنید.",
                placement: "left",
            },
        ],
        []
    );

    // ===== right side =====
    const [tozihat, setTozihat] = useState("");
    const [errortozihat, setErrortozihat] = useState(false);
    const [activeTag, setActiveTag] = useState<number>(0);

    const tags: TagItem[] = useMemo(
        () => [
            { id: 1, label: "اعتقادی" },
            { id: 2, label: "مذهبی" },
            { id: 3, label: "سیاسی" },
            { id: 4, label: "اقتصادی" },
            { id: 5, label: "امنیتی" },
            { id: 6, label: "اخلاقی" },
            { id: 7, label: "سوابق قضائی" },
            { id: 8, label: "سوابق تحصیلی" },
            { id: 9, label: "سلامت جسمی ، روان و اعصاب" },
            { id: 10, label: "سوابق شغلی" },
            { id: 11, label: "عدم ثبت نام" },
            { id: 12, label: "سابقه اعتیاد به مواد مخدر یا روانگردان" },
            { id: 13, label: "سوء شهرت (خانوادگی ،اقتصادی،اخلاقی،رفتاری)" },
            { id: 14, label: "سایر" },
        ],
        []
    );

    // ===================== لیست پایین خلاصه‌ها =====================
    const [kholasehList, setKholasehList] = useState<KholasehListItem[]>([]);
    const [loadingKholaseh, setLoadingKholaseh] = useState(false);
    const [errorKholaseh, setErrorKholaseh] = useState("");

    const loadKholasehList = async () => {
        if (!ShomarehParvandeh || CodeEntekhabat == null) {
            setKholasehList([]);
            return;
        }
        try {
            setLoadingKholaseh(true);
            setErrorKholaseh("");

            const res: any = await GetAshkhasKholasehSalahiyat(ShomarehParvandeh, CodeEntekhabat);

            const list: ApiKholasehRow[] = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : Array.isArray(res?.recordset)
                        ? res.recordset
                        : [];

            const mapped: KholasehListItem[] = list
                .map((x, idx) => {
                    const tagId = toNum((x as any)?.TagSalahiyat);
                    const tagName = toStr((x as any)?.TagSalahiyat_NameFarsi);
                    const text = toStr((x as any)?.KholasehMatlab);

                    const rawId = (x as any)?.ID ?? (x as any)?.Id ?? (x as any)?.id ?? null;
                    const id = rawId != null ? String(rawId) : `kh-${tagId ?? "x"}-${idx}-${tagName}-${text.slice(0, 6)}`;

                    return { id, tagId, tagName, text };
                })
                .filter((x) => x.tagName || x.text);

            setKholasehList(mapped);
        } catch (e: any) {
            setErrorKholaseh(e?.message || "خطا در دریافت خلاصه‌های ثبت‌شده");
            setKholasehList([]);
        } finally {
            setLoadingKholaseh(false);
        }
    };

    // ===================== ByTag (فقط برای کلیک تگ بالا) =====================
    const [loadingByTag, setLoadingByTag] = useState(false);
    const [errorByTag, setErrorByTag] = useState("");

    const loadKholasehIntoBoxByTag = async (tagId: number) => {
        if (!ShomarehParvandeh || CodeEntekhabat == null) return;

        try {
            setLoadingByTag(true);
            setErrorByTag("");

            const res: any = await GetAshkhasKholasehSalahiyatByTag(
                ShomarehParvandeh,
                CodeEntekhabat,
                tagId
            );

            const arr =
                Array.isArray(res) ? res :
                    Array.isArray(res?.data) ? res.data :
                        Array.isArray(res?.recordset) ? res.recordset :
                            null;

            const item = arr ? (arr[arr.length - 1] ?? null) : (res?.data ?? res ?? null);

            const text =
                toStr((item as any)?.KholasehMatlab) ||
                toStr((item as any)?.kholasehMatlab) ||
                toStr((item as any)?.Kholaseh) ||
                "";

            setTozihat(text);
            setErrortozihat(false);
        } catch (e: any) {
            setErrorByTag(e?.message || "خطا در دریافت خلاصه این تگ");
        } finally {
            setLoadingByTag(false);
        }
    };

    useEffect(() => {
        loadKholasehList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ShomarehParvandeh, CodeEntekhabat]);

    // ===================== ثبت =====================
    const handleSubmit = async () => {
        const ok = tozihat.trim().length >= 10;
        setErrortozihat(!ok);
        if (!ok) return;

        await InsertAshkhasKholasehSalahiyat(
            ShomarehParvandeh,
            CodeEntekhabat,
            activeTag,
            tozihat,
            user.UserId
        );

        await loadKholasehList();
        await loadKholasehIntoBoxByTag(activeTag);
    };

    // ===================== LEFT: pages/images =====================
    const [pages, setPages] = useState<number[]>([]);
    const [activeAzSafheh, setActiveAzSafheh] = useState<number | null>(null);

    const [files, setFiles] = useState<FileViewItem[]>([]);
    const [activeDocIndex, setActiveDocIndex] = useState(0);
    const [activeImageUrl, setActiveImageUrl] = useState<string>("");

    const [loadingPages, setLoadingPages] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const reqIdRef = useRef(0);

    const [viewerOpen, setViewerOpen] = useState(false);
    const openViewer = () => {
        if (!files.length || !activeImageUrl) return;
        setViewerOpen(true);
    };

    // ===== ZOOM/PAN =====
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const dragRef = useRef({ isDown: false, lastX: 0, lastY: 0 });

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
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.12 : 0.12;
        zoomBy(delta);
    };

    const onMouseDownZoom = (e: React.MouseEvent) => {
        if (scale <= 1) return;
        dragRef.current.isDown = true;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
    };

    const onMouseMoveZoom = (e: React.MouseEvent) => {
        if (!dragRef.current.isDown) return;
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
    };

    const endZoomDrag = () => {
        dragRef.current.isDown = false;
    };

    // ✅ map خلاصه هر صفحه + متن باکس کوچک
    const [kholasehByAzSafheh, setKholasehByAzSafheh] = useState<Record<number, string>>({});
    const [pageKholasehText, setPageKholasehText] = useState("");

    // ===== load pages =====
    useEffect(() => {
        let cancelled = false;

        const loadPages = async () => {
            if (!ShomarehParvandeh || !noeBayegani) {
                setPages([]);
                setActiveAzSafheh(null);
                setFiles([]);
                setActiveDocIndex(0);
                setActiveImageUrl("");
                resetZoom();

                // ✅ باکس خلاصه صفحه هم پاک شود
                setKholasehByAzSafheh({});
                setPageKholasehText("");

                return;
            }

            try {
                setLoadingPages(true);

                const res: any = await GetParvandehFehrest(ShomarehParvandeh, mahal, noeBayegani);

                const list: ApiRow[] = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : Array.isArray(res?.recordset)
                            ? res.recordset
                            : [];

                // ✅ ساخت map خلاصه‌ها برای هر AzSafheh
                const khMap: Record<number, string> = {};
                for (const r of list as any[]) {
                    const az = toNum((r as any)?.AzSafheh);
                    const kh = toStr((r as any)?.Kholaseh).trim();
                    if (az !== null) {
                        if (khMap[az] == null || khMap[az] === "") {
                            khMap[az] = kh || "";
                        }
                    }
                }
                if (!cancelled) setKholasehByAzSafheh(khMap);

                const uniq = new Set<number>();
                for (const r of list) {
                    const p = toNum((r as any)?.AzSafheh);
                    if (p !== null) uniq.add(p);
                }

                const sorted = Array.from(uniq).sort((a, b) => a - b);
                if (cancelled) return;

                setPages(sorted);
                const nextActive = sorted.length ? sorted[0] : null;

                // اگر قبلاً صفحه فعال داشتیم نگه دار، وگرنه اولین
                setActiveAzSafheh((prev) => prev ?? nextActive);

                setFiles([]);
                setActiveDocIndex(0);
                setActiveImageUrl("");
                resetZoom();
            } catch {
                if (!cancelled) {
                    setPages([]);
                    setActiveAzSafheh(null);
                    setFiles([]);
                    setActiveDocIndex(0);
                    setActiveImageUrl("");
                    resetZoom();

                    setKholasehByAzSafheh({});
                    setPageKholasehText("");
                }
            } finally {
                if (!cancelled) setLoadingPages(false);
            }
        };

        loadPages();
        return () => {
            cancelled = true;
        };
    }, [ShomarehParvandeh, noeBayegani, mahal]);

    // ✅ با هر تغییر activeAzSafheh متن باکس کوچک آپدیت شود
    useEffect(() => {
        if (!activeAzSafheh) {
            setPageKholasehText("");
            return;
        }
        setPageKholasehText(kholasehByAzSafheh[activeAzSafheh] ?? "");
    }, [activeAzSafheh, kholasehByAzSafheh]);

    // ===== load docs =====
    useEffect(() => {
        if (!activeAzSafheh) return;

        let cancelled = false;
        const myReq = ++reqIdRef.current;

        const loadFiles = async () => {
            try {
                setLoadingFiles(true);
                setFiles([]);
                setActiveDocIndex(0);
                setActiveImageUrl("");
                resetZoom();

                const res: any = await GetParvandehFehrestFiles(
                    ShomarehParvandeh,
                    noeBayegani,
                    String(activeAzSafheh)
                );

                if (res?.status === 401 || res?.state === 401) {
                    router.push("/Login");
                    return;
                }

                if (cancelled) return;
                if (myReq !== reqIdRef.current) return;

                const list: ApiFileRow[] = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : Array.isArray(res?.recordset)
                            ? res.recordset
                            : [];

                const mapped: FileViewItem[] = list
                    .map((x, idx) => {
                        const b64 = x?.base64;
                        if (!b64) return null;

                        const safhehLabel = toStr((x as any)?.safheh ?? (x as any)?.Safheh);
                        const mime = toStr(x?.mime) || "image/jpeg";
                        const rawId = (x as any)?.id ?? (x as any)?.ID;

                        const id =
                            rawId != null ? String(rawId) : `az-${activeAzSafheh}-s-${safhehLabel || "x"}-i-${idx}`;

                        return {
                            id,
                            azSafheh: activeAzSafheh,
                            safheh: safhehLabel || String(idx + 1),
                            url: `data:${mime};base64,${b64}`,
                        };
                    })
                    .filter(Boolean) as FileViewItem[];

                mapped.sort((a, b) => (toNum(a.safheh) ?? 0) - (toNum(b.safheh) ?? 0));

                setFiles(mapped);
                setActiveDocIndex(0);
                setActiveImageUrl(mapped[0]?.url ?? "");
                resetZoom();
            } catch {
                if (!cancelled) {
                    setFiles([]);
                    setActiveDocIndex(0);
                    setActiveImageUrl("");
                    resetZoom();
                }
            } finally {
                if (!cancelled) setLoadingFiles(false);
            }
        };

        loadFiles();
        return () => {
            cancelled = true;
        };
    }, [activeAzSafheh, ShomarehParvandeh, noeBayegani, router]);

    const compact = useMemo(() => {
        const active = activeAzSafheh ?? (pages[0] ?? 1);
        return compactPages(pages, active, 2);
    }, [pages, activeAzSafheh]);

    const selectDoc = (i: number) => {
        const f = files[i];
        if (!f) return;
        setActiveDocIndex(i);
        setActiveImageUrl(f.url);
        resetZoom();
    };

    // ✅ کلیک روی تگ بالا: فقط ByTag (نه لیست)
    const onClickTag = async (tagId: number) => {
        setActiveTag(tagId);
        await loadKholasehIntoBoxByTag(tagId);
    };

    // ✅ کلیک روی آیتم پایین: فقط همان آیتم (بدون API)
    const onClickKholasehItem = (item: KholasehListItem) => {
        if (item.tagId != null) setActiveTag(item.tagId);
        setTozihat(item.text || "");
        setErrortozihat(false);
    };

    /* ================= JOYRIDE CALLBACK ================= */
    const onTourCallback = async (data: CallBackProps) => {
        const { status, type, action } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setTourRun(false);
            setTourStepIndex(0);
            return;
        }

        if (type === EVENTS.TARGET_NOT_FOUND) {
            setTourStepIndex((prev) => prev + 1);
            return;
        }

        if (type === EVENTS.STEP_AFTER) {
            if (action === "next") setTourStepIndex((prev) => prev + 1);
            if (action === "prev") setTourStepIndex((prev) => Math.max(0, prev - 1));
        }
    };

    const startTour = () => {
        if (loadingPages || pages.length === 0) return;
        setTourStepIndex(0);
        setTourRun(true);
    };

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

            <ImageViewer
                isOpen={viewerOpen}
                files={files as any}
                initialIndex={activeDocIndex}
                onClose={() => setViewerOpen(false)}
            />

            <div dir="rtl" className="w-full h-screen flex bg-gray-100 font-sans overflow-hidden shabnam">
                {/* ===== LEFT (30%) ===== */}
                <div className="w-[30%] h-full bg-white flex flex-col shadow-lg z-10 m-0 p-0">
                    <div className="w-full bg-gray-100 border-b border-gray-300 p-2">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-sm font-bold text-gray-800">ناوبری صفحات</h2>
                            <button
                                type="button"
                                onClick={startTour}
                                disabled={loadingPages || pages.length === 0}
                                className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="راهنمای استفاده"
                            >
                                راهنما
                            </button>
                        </div>

                        <div data-tour="pages-nav" className="flex flex-row gap-2 justify-center items-center flex-wrap">
                            {loadingPages ? (
                                <div className="text-xs text-gray-600 py-2 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    در حال دریافت صفحات...
                                </div>
                            ) : compact.length === 0 ? (
                                <div className="text-xs text-gray-600 py-2">صفحه‌ای یافت نشد</div>
                            ) : (
                                compact.map((p, i) =>
                                    p === "..." ? (
                                        <span key={`dots-${i}`} className="px-2 text-gray-500 select-none">
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            key={`az-${p}-${i}`}
                                            type="button"
                                            onClick={() => setActiveAzSafheh(p as number)}
                                            className={[
                                                "w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition",
                                                activeAzSafheh === p ? "bg-sky-800 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300",
                                            ].join(" ")}
                                            title={`AzSafheh ${p}`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )
                            )}
                        </div>

                        <div data-tour="documents-nav" className="mt-2 flex flex-wrap gap-1 justify-center items-center">
                            {loadingFiles ? (
                                <div className="text-xs text-gray-600 py-2 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    در حال دریافت اسناد...
                                </div>
                            ) : files.length === 0 ? (
                                <div className="text-[11px] text-gray-600 py-2">
                                    {activeAzSafheh ? "سندی برای این صفحه موجود نیست" : "یک صفحه انتخاب کنید"}
                                </div>
                            ) : (
                                files.map((f, i) => {
                                    const isActive = i === activeDocIndex;
                                    const label = `${f.azSafheh}-${f.safheh}`;
                                    return (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => selectDoc(i)}
                                            className={[
                                                "px-2 h-7 text-xs rounded border transition",
                                                isActive ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-gray-100 border-gray-300",
                                            ].join(" ")}
                                            title={`AzSafheh ${f.azSafheh} | Safheh ${f.safheh}`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div data-tour="zoom-controls" className="mt-3 flex justify-end items-center gap-2">
                            <button
                                type="button"
                                onClick={openViewer}
                                disabled={!activeImageUrl}
                                className="p-2 rounded-lg bg-white hover:bg-slate-50 shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="باز کردن در مودال (زوم کامل)"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={resetZoom}
                                disabled={!activeImageUrl}
                                className="p-2 rounded-lg bg-white hover:bg-slate-50 shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="بازگشت به اندازه اصلی"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div
                        data-tour="image-viewer"
                        className="flex-1 overflow-hidden relative bg-black"
                        onWheel={onWheelZoom}
                        onMouseMove={onMouseMoveZoom}
                        onMouseUp={endZoomDrag}
                        onMouseLeave={endZoomDrag}
                    >
                        {loadingFiles && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
                                <div className="text-sm text-gray-700 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    در حال بارگذاری تصاویر...
                                </div>
                            </div>
                        )}


                        <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 bg-white/90 rounded-lg shadow border border-gray-200 p-1">
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
                                alt="تصویر سند"
                                draggable={false}
                                onMouseDown={onMouseDownZoom}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                className={[
                                    "absolute top-1/2 left-1/2 select-none",
                                    scale > 1 ? "cursor-grab" : "cursor-default",
                                ].join(" ")}
                                style={{
                                    maxWidth: "calc(100% - 20px)",
                                    maxHeight: "calc(100% - 20px)",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                    transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                                    transition: dragRef.current.isDown ? "none" : "transform 0.12s ease-out",
                                    transformOrigin: "center center",
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">
                                {activeAzSafheh ? "تصویری برای این صفحه موجود نیست" : "یک صفحه انتخاب کنید"}
                            </div>
                        )}

                        {!!activeImageUrl && (
                            <div className="absolute bottom-2 left-2 z-30 text-[11px] text-white/80 bg-black/30 rounded px-2 py-1">
                                اسکرول = زوم • درگ = جابه‌جایی (وقتی زوم &gt; 100%)
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== RIGHT (70%) ===== */}
                <div className="w-[70%] h-full flex flex-col m-0 p-0">
                    {/* Tags + Submit */}
                    <div className="w-full bg-blue-100 flex items-center justify-between m-0 p-2">
                        <div data-tour="tags-section" className="flex flex-row items-center gap-2 flex-wrap">
                            {tags.map((t) => {
                                const isActive = activeTag === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => onClickTag(t.id)}
                                        className={[
                                            "py-1 px-4 rounded-2xl text-white transition cursor-pointer",
                                            isActive ? "bg-sky-800" : "bg-gray-500 hover:bg-gray-600",
                                        ].join(" ")}
                                        title={`کد تگ: ${t.id}`}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            data-tour="submit-btn"
                            type="button"
                            onClick={handleSubmit}
                            className="px-6 py-2 rounded-lg bg-sky-700 text-white hover:bg-sky-800 transition whitespace-nowrap"
                        >
                            ثبت
                        </button>
                    </div>

                    {/* TextArea + List */}
                    <div className="flex-1 p-2 flex flex-col overflow-hidden gap-2">
                        {/* TextArea */}
                        <div
                            data-tour="textarea-section"
                            className="bg-white rounded-xl shadow border border-gray-200 p-4 flex-[0_0_52%] min-h-0 flex flex-col overflow-hidden relative"
                        >
                            {loadingByTag && (
                                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        در حال دریافت خلاصه تگ...
                                    </div>
                                </div>
                            )}
                            {errorByTag && <div className="text-xs text-red-600 mb-2 text-right">{errorByTag}</div>}

                            {/* ✅ باکس کوچک جدا بالای لیبل خلاصه صلاحیتی */}
                            <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
                                <div className="text-[12px] font-bold text-sky-800 mb-1">
                                    خلاصه صفحه انتخاب‌شده
                                    {activeAzSafheh ? ` |  ${activeAzSafheh}` : ""}
                                </div>

                                {pageKholasehText?.trim() ? (
                                    <div className="text-[13px] text-gray-800 leading-6 whitespace-pre-wrap max-h-32 overflow-auto">
                                        {pageKholasehText}
                                    </div>
                                ) : (
                                    <div className="text-[12px] text-gray-500">برای این صفحه خلاصه‌ای وجود ندارد.</div>
                                )}
                            </div>

                            <TextArea1
                                fullHeight
                                justify
                                readOnly={false}
                                label="خلاصه صلاحیتی داوطلب : "
                                placeholder="توضیحات مورد نظر را وارد کنید"
                                value={tozihat}
                                onChange={(e: any) => setTozihat(e.target.value)}
                                maxLength={3000}
                                onlyNumber={false}
                                error={errortozihat}
                                errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 کاراکتر" : ""}
                            />
                        </div>

                        {/* لیست خلاصه‌های ثبت شده */}
                        <div data-tour="kholaseh-list" className="bg-white rounded-xl shadow border border-gray-200 p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-gray-800">فهرست خلاصه‌های ثبت‌شده</div>
                                <button
                                    type="button"
                                    onClick={loadKholasehList}
                                    className="text-xs px-3 py-1 rounded-lg border border-gray-300 bg-gray-50 hover:bg-white transition"
                                >
                                    بروزرسانی
                                </button>
                            </div>

                            {errorKholaseh && <div className="text-xs text-red-600 mb-2 text-right">{errorKholaseh}</div>}

                            <div className="flex-1 min-h-0 overflow-y-auto">
                                {loadingKholaseh ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 py-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        در حال دریافت لیست...
                                    </div>
                                ) : kholasehList.length === 0 ? (
                                    <div className="text-xs text-gray-500 text-right">موردی ثبت نشده است.</div>
                                ) : (
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {kholasehList.map((it) => (
                                            <li key={it.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => onClickKholasehItem(it)}
                                                    className="w-full h-full min-h-[120px] bg-gray-100 text-right border border-green-800 rounded-lg p-3 hover:bg-gray-50 transition cursor-pointer flex flex-col"
                                                    title={it.tagId != null ? `TagId: ${it.tagId}` : "TagId موجود نیست"}
                                                >
                                                    <div className="text-sky-800 font-medium text-sm mb-2 line-clamp-1">
                                                        {it.tagName || "—"}
                                                    </div>
                                                    <div className="text-gray-700 whitespace-pre-wrap leading-5 flex-grow overflow-hidden">
                                                        <div className="line-clamp-4">{it.text || "—"}</div>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}
