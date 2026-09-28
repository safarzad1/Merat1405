"use client";

import { useMeratUser } from "@/lib/useMeratUser";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Breadcrumbkhabar from "@/component/Breadcrumb/Breadcrumb";
import { HomeIcon, Newspaper, Search, X, Camera, User } from "@/component/ResearchIcons";
import { GetParvandehFehrest, GetParvandehFehrestFiles, GetDavtalabPic } from "@/services/ApiServiceDavtalab";
import { useRouter, useSearchParams } from "next/navigation";
import FehrestDropDownAshkhasEntekhabat from "@/component/Entekhabat/FehrestDropDownAshkhasEntekhabat";

/* ================= TYPES ================= */
import { usePathname } from "next/navigation";

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

type FileViewItem = {
    safheh: string;
    url: string; // data:<mime>;base64,<...>
};

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
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
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
        <div className="flex flex-col w-full mb-1">
            {label && <label className="text-right mb-1 text-blue-700">{label}</label>}

            <div
                className={`flex items-center pr-3 border rounded-lg overflow-hidden w-full
        focus-within:ring-1 focus-within:border-indigo-500 focus-within:ring-indigo-500 transition-all duration-200 ease-in-out
        border-gray-300 bg-gray-50`}
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

/* ================= PAGE ================= */

export default function Page() {
    const user = useMeratUser();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const shomarehParvandeh = searchParams.get("shomarehParvandeh") ?? "";
    const noeBayegani = searchParams.get("noeBayegani") ?? "";

    const [activeParvandeh, setActiveParvandeh] = useState<string>(shomarehParvandeh);
    useEffect(() => {
        console.log(shomarehParvandeh);
        setActiveParvandeh(activeParvandeh);
    }, [activeParvandeh]);


    // Viewer فول اسکرین
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [dragStartX, setDragStartX] = useState<number | null>(null);
    const [dragStartY, setDragStartY] = useState<number | null>(null);
    const [dragDeltaX, setDragDeltaX] = useState(0);
    const [dragDeltaY, setDragDeltaY] = useState(0)


    const SWIPE_THRESHOLD = 80;


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

    // ✅ عکس داوطلب
    const [davtalabPicUrl, setDavtalabPicUrl] = useState<string>("/person.png");
    const [loadingDavtalabPic, setLoadingDavtalabPic] = useState(false);
    const picObjectUrlRef = useRef<string | null>(null);
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

                // 2) base64 خام
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

                // 4) url
                if (typeof res === "string" && (res.startsWith("http") || res.startsWith("/"))) {
                    setDavtalabPicUrl(res);
                    return;
                }

                setDavtalabPicUrl("/person.png");
            } catch {
                if (!cancelled) setDavtalabPicUrl("/person.png");
            } finally {
                if (!cancelled) setLoadingDavtalabPic(false);
            }
        };

        loadPic();

        return () => {
            cancelled = true;
        };
    }, [activeParvandeh]);


    // ✅ مودال خبر
    const [modalOpenKhabar, setModalOpenKhabar] = useState(false);
    const [selectedRow, setSelectedRow] = useState<RowItem | null>(null);

    // ✅ فایل‌ها + تصویر فعال
    const [files, setFiles] = useState<FileViewItem[]>([]);
    const [activeImageUrl, setActiveImageUrl] = useState<string>("");

    // ✅ لودینگ تصاویر
    const [loadingThumbs, setLoadingThumbs] = useState(false);
    const [loadingBig, setLoadingBig] = useState(false);

    // برای جلوگیری از ست کردن state از درخواست قبلی
    const filesReqId = useRef(0);

    const toStr = (v: any) => (v === null || v === undefined ? "" : String(v));

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

                const res: any = await GetParvandehFehrest(activeParvandeh, user.Mahal, noeBayegani);

                // if (res?.status === 401 || res?.state === 401) {
                //     router.push("/Login");
                //     return;
                // }
                // else if (res?.data[0].status === 403) {
                //     router.push("/Davtalab/CardDavtalab");
                //     return;
                // }

                const list: ApiRow[] = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : Array.isArray(res?.recordset)
                            ? res.recordset
                            : [];

                const mapped: RowItem[] = list.map((a, idx) => ({
                    id: Number(a.IDKhabar ?? idx + 1),

                    azSafhe: toStr(a.AzSafheh),
                    taSafhe: toStr(a.TaSafheh),
                    countSafehat: toStr(a.CountSafehat),

                    manba: toStr(a.Manabe_NameFarsi ?? a.Manabe),
                    doreEntekhabati: toStr(a.OnvanDore ?? a.CodeEntekhabat),

                    tarikhNameh: toStr(a.TarikhNameh),
                    shomareNameh: toStr(a.ShomarehNameh),
                    tarikhEnteshar: toStr(a.TarikhEnteshar),

                    nevisandeh: toStr(a.Nevisandeh),
                    shomareSafhe: toStr(a.ShomarehSafheh),

                    shahrestan: toStr(a.Shahrestan),

                    onvanMatn: toStr(a.OnvanMatlab),
                    kholaseMatn: toStr(a.Kholaseh),
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
    }, [shomarehParvandeh, noeBayegani, router]);

    /* ================= SEARCH ================= */

    const filtered = useMemo(() => {
        const q = search.trim();
        if (!q) return rows;
        return rows.filter((r) => `${r.onvanMatn} ${r.manba} ${r.tarikhEnteshar} ${r.shomareSafhe}`.includes(q));
    }, [rows, search]);

    /* ================= DRAG-TO-SCROLL (Desktop) ================= */

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const loadFilesForRow = async (r: RowItem) => {
        const reqId = ++filesReqId.current;

        try {
            fillFromRow(r);

            setLoadingThumbs(true);
            setFiles([]);
            setActiveImageUrl("");
            setLoadingBig(true);

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
                    return {
                        safheh: toStr(x?.Safheh),
                        url: `data:${mime};base64,${b64}`,
                    };
                })
                .filter(Boolean) as FileViewItem[];

            setFiles(mapped);
            setLoadingThumbs(false);

            if (mapped.length > 0) {
                setActiveImageUrl(mapped[0].url);
                // قطع لودینگ بزرگ در onLoad
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

    /* ================= UI ================= */

    return (
        <>
            {/* مودال نمایش خبر */}
            {modalOpenKhabar && selectedRow && (
                <div className="fixed inset-0 z-[30000] flex items-start justify-center mt-10">
                    <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenKhabar(false)} />
                    <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[800px] max-w-[95vw] relative">
                        <div className="bg-gray-200 -mx-6 p-3 border-0 border-b-2 border-purple-500 flex items-center justify-between">
                            <h2 className="text-lg font-bold">جزئیات خبر</h2>
                            <button
                                className="p-1 rounded hover:bg-gray-300 transition"
                                onClick={() => setModalOpenKhabar(false)}
                                title="بستن"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mt-3">
                            <ReadOnlyTextArea label="خلاصه مطلب" value={selectedRow.kholaseMatn || ""} rows={10} />
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                onClick={() => setModalOpenKhabar(false)}
                            >
                                بستن
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* breadcrumb */}
            <div className="bg-sky-200 mt-1 mx-1 rounded py-2 px-10">
                <Breadcrumbkhabar
                    items={[
                        { label: "داشبورد", href: "/Dashboard", icon: <HomeIcon className="w-4 h-4" /> },
                        { label: "فهرست اشخاص", href: "/Davtalab/CardDavtalab", icon: <User className="w-4 h-4" /> },
                        { label: "پرونده اشخاص", icon: <Newspaper className="w-4 h-4" /> },
                    ]}
                />
            </div>

            <div className="mx-1 mt-0">
                {/* ✅ اینجا ساختار جدید: راست (جدول) + نوار وسط (تصاویر کوچک) + چپ (تصویر بزرگ) */}
                <div className="mt-1 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                    {/* راست: جدول (یکم کوچکتر) */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 h-full">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                                <h2 className="text-base md:text-lg font-extrabold text-gray-800">فهرست 1</h2>
                                <div className="min-w-[260px] w-full md:w-[280px]">
                                    <FehrestDropDownAshkhasEntekhabat
                                        mahal={user.Mahal}
                                        label="" // لیبل نمیخوایم چون کنار سرچ هست
                                        placeholder="انتخاب پرونده..."
                                        defaultValue={activeParvandeh}
                                        onSelect={(info) => {
                                            const newVal = info?.ShomarehParvandeh ?? "";
                                            if (!newVal || newVal === activeParvandeh) return;

                                            // ✅ 1) تغییر پرونده فعال
                                            setActiveParvandeh(newVal);

                                            // ✅ 2) سینک URL (تا رفرش/Back درست کار کنه)
                                            const sp = new URLSearchParams(searchParams.toString());
                                            sp.set("shomarehParvandeh", newVal);
                                            router.replace(`${pathname}?${sp.toString()}`);

                                            // ✅ 3) ریست وضعیت‌های مربوط به پرونده قبلی
                                            setSearch("");
                                            setRows([]);
                                            setError("");
                                            setFiles([]);
                                            setActiveImageUrl("");
                                            // setPhotoUrl("");
                                        }}
                                    />
                                </div>


                                <div className="relative">
                                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pr-9 pl-3 py-2 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white outline-none
                      text-sm md:text-base w-[240px]
                      focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200 ease-in-out"
                                        placeholder="جستجو..."
                                    />
                                </div>
                            </div>

                            {error && <div className="mb-2 text-sm text-red-600 text-right">{error}</div>}

                            <div className="rounded-xl border border-gray-200 overflow-hidden">
                                <div
                                    ref={scrollRef}
                                    onMouseDown={onMouseDownDrag}
                                    onMouseMove={onMouseMoveDrag}
                                    onMouseUp={endDrag}
                                    onMouseLeave={endDrag}
                                    className={`max-h-[600px] overflow-y-auto overscroll-contain ${isDragging ? "cursor-grabbing select-none" : "cursor-default"
                                        }`}
                                >
                                    <table className="w-full text-sm md:text-base">
                                        <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
                                            <tr>
                                                <th className="py-2 px-3 text-right whitespace-nowrap">از صفحه</th>
                                                <th className="py-2 px-3 text-right">عنوان</th>
                                                <th className="py-2 px-3 text-right whitespace-nowrap">منبع</th>
                                                <th className="py-2 px-3 text-right whitespace-nowrap">عملیات</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={4} className="py-6 text-center text-gray-500">
                                                        در حال دریافت اطلاعات...
                                                    </td>
                                                </tr>
                                            ) : filtered.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-6 text-center text-gray-500">
                                                        موردی یافت نشد.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filtered.map((r, idx) => (
                                                    <tr key={`${r.id}-${idx}`} className="border-t border-gray-200 hover:bg-gray-50 transition">
                                                        <td className="py-2 px-3 whitespace-nowrap text-center">{r.azSafhe}</td>

                                                        <td className="py-2 px-3 text-gray-800">
                                                            <button
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                className="text-right w-full hover:text-indigo-700 hover:underline transition"
                                                                onClick={() => openKhabarModal(r)}
                                                                title="نمایش جزئیات"
                                                            >
                                                                {r.onvanMatn}
                                                            </button>
                                                        </td>

                                                        <td className="py-2 px-3 whitespace-nowrap">{r.manba}</td>

                                                        <td className="py-2 px-3 whitespace-nowrap">
                                                            <button
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                className="cursor-pointer px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm"
                                                                onClick={() => loadFilesForRow(r)}
                                                            >
                                                                انتخاب
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

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 h-full">

                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 flex items-center justify-center">
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
                                        onError={() => setDavtalabPicUrl("/person.png")}
                                    />
                                )}
                            </div>

                            {/* ✅ خط جداکننده */}
                            <hr className="my-2 border-gray-200" />

                            {/* ✅ thumbnails اسناد */}
                            <div className="flex-1 overflow-y-auto pr-1">
                                {loadingThumbs ? (
                                    <div className="flex items-center justify-center h-full text-xs text-gray-600 gap-2">
                                        <Spinner size={16} />
                                        لود تصاویر...
                                    </div>
                                ) : files.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {files.map((f, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setLoadingBig(true);
                                                    setActiveImageUrl(f.url);
                                                }}
                                                className={`border rounded-lg p-1 transition ${activeImageUrl === f.url
                                                    ? "border-indigo-500"
                                                    : "border-gray-300 hover:border-indigo-400"
                                                    }`}
                                                title={`صفحه ${f.safheh}`}
                                            >
                                                <ThumbImg src={f.url} alt={`page-${f.safheh}`} />
                                                <div className="text-[10px] text-center mt-1 text-gray-600">
                                                    ص {f.safheh}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-gray-500 text-center px-1">
                                        یک ردیف را انتخاب کن
                                    </div>
                                )}
                            </div>



                            {loadingThumbs ? (
                                <div className="flex items-center justify-center h-full text-xs text-gray-600 gap-2">
                                    <Spinner size={16} />
                                    لود تصاویر...
                                </div>
                            ) : files.length > 0 ? (
                                <div className="h-full max-h-[680px] overflow-y-auto pr-1">
                                    <div className="flex flex-col gap-2">
                                        {files.map((f, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setLoadingBig(true);
                                                    setActiveImageUrl(f.url);
                                                }}
                                                className={`border rounded-lg p-1 transition ${activeImageUrl === f.url ? "border-indigo-500" : "border-gray-300 hover:border-indigo-400"
                                                    }`}
                                                title={`صفحه ${f.safheh}`}
                                            >
                                                <ThumbImg src={f.url} alt={`page-${f.safheh}`} />
                                                <div className="text-[10px] text-center mt-1 text-gray-600">ص {f.safheh}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-gray-500 text-center px-1">
                                    یک ردیف را انتخاب کن
                                </div>
                            )}
                        </div>
                    </div>

                    {/* چپ: تصویر بزرگ */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-full flex flex-col">
                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white flex-1">
                                <div className="relative w-full h-full min-h-[640px] flex items-center justify-center ">
                                    {loadingBig && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <Spinner size={20} />
                                                در حال بارگذاری تصویر...
                                            </div>
                                        </div>
                                    )}

                                    {activeImageUrl ? (
                                        <img
                                            src={activeImageUrl}
                                            className="w-full h-full object-contain object-top cursor-zoom-in"
                                            alt="document"
                                            onLoad={() => setLoadingBig(false)}
                                            onError={() => setLoadingBig(false)}
                                            onClick={() => {
                                                const idx = files.findIndex(f => f.url === activeImageUrl);
                                                setViewerIndex(idx >= 0 ? idx : 0);
                                                setZoomLevel(1); // ریست زوم
                                                setDragDeltaX(0); // ریست جابجایی افقی
                                                setDragDeltaY(0); // ریست جابجایی عمودی
                                                setViewerOpen(true);
                                            }}
                                        />

                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                <Camera className="w-6 h-6 text-gray-500" />
                                            </div>
                                            <div className="mt-3 text-xs text-gray-500">تصویری انتخاب نشده</div>
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

            {viewerOpen && files.length > 0 && (
                <div className="fixed inset-0 z-[30010] bg-black/90 flex items-center justify-center overflow-hidden">
                    {/* backdrop */}
                    <div
                        className="absolute inset-0"
                        onClick={() => setViewerOpen(false)}
                    />

                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* دکمه قبلی */}
                        {viewerIndex > 0 && (
                            <button
                                onClick={() => {
                                    setViewerIndex(i => Math.max(0, i - 1));
                                    setZoomLevel(1); setDragDeltaX(0); setDragDeltaY(0); // ریست هنگام تغییر عکس
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

                                // منطق سوایپ فقط وقتی زوم ۱ باشد
                                if (zoomLevel === 1) {
                                    if (dragDeltaX <= -SWIPE_THRESHOLD && viewerIndex < files.length - 1) {
                                        setViewerIndex(i => i + 1);
                                        setZoomLevel(1); setDragDeltaX(0); setDragDeltaY(0);
                                    } else if (dragDeltaX >= SWIPE_THRESHOLD && viewerIndex > 0) {
                                        setViewerIndex(i => i - 1);
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
                                    setViewerIndex(i => i + 1);
                                    setZoomLevel(1); setDragDeltaX(0); setDragDeltaY(0); // ریست هنگام تغییر عکس
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
                            onClick={() => setViewerOpen(false)}
                            className="absolute top-4 right-4 text-white text-3xl hover:text-red-400 select-none z-20 bg-black/20 p-2 rounded-full"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

        </>
    );
}
