"use client";

import { useMeratUser } from "@/lib/useMeratUser";

import { useAlert } from "@/component/AlertContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import TextArea1 from "@/component/Objects/Textarea1";
import { GetParvandehFehrest, GetParvandehFehrestFiles } from "@/services/ApiServiceDavtalab";
import { useRouter } from "next/navigation";
import ImageViewer from "../Componnet/ImageViewer";
import {
    Maximize2,
    RotateCcw,
    Minus,
    Plus,
    Loader2,
    X,
    Trash2,
    ChevronDown,
    ChevronUp,
} from "@/component/ResearchIcons";
import GetDFNByPID from "@/component/DFN/GetDFNByPID";
import GetDFNByPIDMulti from "@/component/DFN/GetDFNByPIDMulti";
import {
    InsertAshkhasKholasehSalahiyat,
    GetAshkhasKholasehSalahiyat,
    GetAshkhasKholasehSalahiyatByTag,
    GetAshkhasSalahiyat,
    InsertAshkhasSalahiyat,
    InsertAshkhasSalahiyatMavad,
    GetAshkhasSalahiyatParvandeh,
    DeleteAshkhasSalahiyatTag,
} from "@/services/ApiServiceKholasehSalahiyat";
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "@/lib/reactJoyrideCompat";

interface PageLayoutProps {
    ShomarehParvandeh: number;
    CodeEntekhabat: number;
    noeBayegani: number;
    mahal: number;
}

type TagItem = { id: number; label: string };

type ApiRow = {
    AzSafheh?: any;
    Kholaseh?: any;

    // ✅ برای آکاردون فهرست
    OnvanMatlab?: any;
    Manabe_NameFarsi?: any;
};

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

/* ✅ خروجی API جدید */
type ApiSalahiyatParvandehRow = {
    ID?: any;
    Id?: any;
    id?: any;
    Natije_NameFarsi?: any;
    MavadGhanoniNames?: any;
    Tozihat?: any;
    OnvanPost?: any;
    RecordState?: any;
    CreateDateTime?: any;
};

type SalahiyatParvandehItem = {
    id: string;
    natijeNameFarsi: string;
    Tozihat: string;
    mavadGhanoniNames: string;
    onvanPost: string;
    recordState: number | null;
    createDateTime: string;
};

function toStr(v: any) {
    return v === null || v === undefined ? "" : String(v);
}

function toNum(v: any): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

/** ✅ استخراج IDSalahiyat از خروجی InsertAshkhasSalahiyat */
function extractIDSalahiyat(res: any): number | null {
    const pool: any[] = [];

    if (res) pool.push(res);
    if (res?.data) pool.push(res.data);

    if (Array.isArray(res)) pool.push(...res);
    if (Array.isArray(res?.data)) pool.push(...res.data);
    if (Array.isArray(res?.recordset)) pool.push(...res.recordset);
    if (Array.isArray(res?.data?.recordset)) pool.push(...res.data.recordset);

    for (const item of pool) {
        const id = toNum(
            item?.IDSalahiyat ??
            item?.IdSalahiyat ??
            item?.idSalahiyat ??
            item?.ID_Salahiyat ??
            item?.id_salahiyat
        );
        if (id && id > 0) return id;
    }

    return null;
}

/** ✅ نرمال‌سازی خروجی مولتی برای استفاده مطمئن */
function normalizeMultiItems(items: any[]): { NameFarsi: string; Value: number }[] {
    if (!Array.isArray(items)) return [];

    const mapped = items
        .map((x: any) => {
            const value = toNum(x?.Value ?? x?.value ?? x?.ID ?? x?.id);
            const name = toStr(x?.NameFarsi) || toStr(x?.label) || toStr(x?.title) || toStr(x?.Onvan) || "";

            if (!value || value <= 0) return null;

            return {
                NameFarsi: name || `بند ${value}`,
                Value: value,
            };
        })
        .filter(Boolean) as { NameFarsi: string; Value: number }[];

    // یکتا سازی
    const seen = new Set<number>();
    return mapped.filter((m) => {
        if (seen.has(m.Value)) return false;
        seen.add(m.Value);
        return true;
    });
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
    const { showAlert } = useAlert();
    const user = useMeratUser();

    /* ================= Tour ================= */
    const [tourRun, setTourRun] = useState(false);
    const [tourStepIndex, setTourStepIndex] = useState(0);

    /* ✅ حذف تگ */
    const [deletingTagId, setDeletingTagId] = useState<number | null>(null);

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

    const onTourCallback = (data: CallBackProps) => {
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

    /* ================= صلاحیت (قفل + نتیجه نهایی) ================= */
    const [salahiyat, setSalahiyat] = useState<any>(null);
    const [loadingSalahiyat, setLoadingSalahiyat] = useState(false);
    const [errorSalahiyat, setErrorSalahiyat] = useState("");

    const isLocked = Number(salahiyat?.RecordState) === 2;
    const natijeNameFarsi = toStr(salahiyat?.Natije_NameFarsi);

    const getNatijeBadgeClass = (name: string) => {
        const n = (name || "").trim();
        if (n.includes("تایید")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
        if (n.includes("رد")) return "bg-rose-100 text-rose-800 border-rose-200";
        if (n.includes("عدم احراز")) return "bg-amber-100 text-amber-800 border-amber-200";
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
    };

    const loadSalahiyat = async () => {
        if (!ShomarehParvandeh || CodeEntekhabat == null || !user?.UserId) {
            setSalahiyat(null);
            return;
        }

        try {
            setLoadingSalahiyat(true);
            setErrorSalahiyat("");

            const res: any = await GetAshkhasSalahiyat(
                ShomarehParvandeh,
                CodeEntekhabat,
                Number(user?.PostId) || null,
                user?.UserId
            );

            const arr: any[] = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : Array.isArray(res?.recordset)
                        ? res.recordset
                        : Array.isArray(res?.data?.recordset)
                            ? res.data.recordset
                            : res?.data
                                ? [res.data]
                                : res
                                    ? [res]
                                    : [];

            const item = arr.length ? (arr[arr.length - 1] ?? null) : null;
            setSalahiyat(item);
        } catch (e: any) {
            setErrorSalahiyat(e?.message || "خطا در دریافت اطلاعات صلاحیت");
            setSalahiyat(null);
        } finally {
            setLoadingSalahiyat(false);
        }
    };

    useEffect(() => {
        loadSalahiyat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ShomarehParvandeh, CodeEntekhabat, user?.UserId, user?.PostId]);

    /* ================= پنل تاریخچه/نتایج پرونده (API جدید) ================= */
    const [salahiyatParvandehRows, setSalahiyatParvandehRows] = useState<SalahiyatParvandehItem[]>([]);
    const [loadingSalahiyatParvandeh, setLoadingSalahiyatParvandeh] = useState(false);
    const [errorSalahiyatParvandeh, setErrorSalahiyatParvandeh] = useState("");

    const loadSalahiyatParvandeh = async () => {
        if (!ShomarehParvandeh || CodeEntekhabat == null || !user?.UserId) {
            setSalahiyatParvandehRows([]);
            return;
        }

        try {
            setLoadingSalahiyatParvandeh(true);
            setErrorSalahiyatParvandeh("");

            const res: any = await GetAshkhasSalahiyatParvandeh(ShomarehParvandeh, CodeEntekhabat, user?.UserId);

            const list: ApiSalahiyatParvandehRow[] = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : Array.isArray(res?.recordset)
                        ? res.recordset
                        : Array.isArray(res?.data?.recordset)
                            ? res.data.recordset
                            : res?.data
                                ? [res.data]
                                : res
                                    ? [res]
                                    : [];

            const mapped: SalahiyatParvandehItem[] = list.map((x, idx) => {
                const rawId = (x as any)?.ID ?? (x as any)?.Id ?? (x as any)?.id ?? idx + 1;
                return {
                    id: String(rawId),
                    natijeNameFarsi: toStr((x as any)?.Natije_NameFarsi),
                    mavadGhanoniNames: toStr((x as any)?.MavadGhanoniNames),
                    onvanPost: toStr((x as any)?.OnvanPost),
                    recordState: toNum((x as any)?.RecordState),
                    Tozihat: toStr((x as any)?.Tozihat),
                    createDateTime: toStr((x as any)?.CreateDateTime),
                };
            });

            setSalahiyatParvandehRows(mapped);
        } catch (e: any) {
            setErrorSalahiyatParvandeh(e?.message || "خطا در دریافت سوابق صلاحیت پرونده");
            setSalahiyatParvandehRows([]);
        } finally {
            setLoadingSalahiyatParvandeh(false);
        }
    };

    useEffect(() => {
        loadSalahiyatParvandeh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ShomarehParvandeh, CodeEntekhabat, user?.UserId]);

    /* ================= Final Modal ================= */
    const [finalModalOpen, setFinalModalOpen] = useState(false);
    const [finalNatije, setFinalNatije] = useState<number | 0>(0);
    const [finalTozihat, setFinalTozihat] = useState("");
    const [finalSubmitting, setFinalSubmitting] = useState(false);
    const [finalError, setFinalError] = useState("");
    const [finalMavadError, setFinalMavadError] = useState(false);
    const [ModalNemone, setModalNemone] = useState(false);


    const [finalMultiNazars, setFinalMultiNazars] = useState<{ NameFarsi: string; Value: number }[]>([]);

    const isRejectNatije = Number(finalNatije) === 2;

    const finalMavadValues = useMemo(
        () =>
            Array.from(
                new Set(
                    (finalMultiNazars ?? [])
                        .map((x) => toNum(x?.Value))
                        .filter((v): v is number => !!v && v > 0)
                )
            ),
        [finalMultiNazars]
    );

    const openFinalModal = () => {
        if (isLocked) return;
        setFinalError("");
        setFinalMavadError(false);
        setFinalNatije(0);
        setFinalTozihat("");
        setFinalMultiNazars([]);
        setFinalModalOpen(true);
    };

    useEffect(() => {
        if (Number(finalNatije) !== 2) {
            if (finalMultiNazars.length > 0) setFinalMultiNazars([]);
            if (finalMavadError) setFinalMavadError(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalNatije]);

    const handleFinalSubmit = async () => {
        if (isLocked) return;

        if (!finalNatije || Number(finalNatije) <= 0) {
            setFinalError("لطفاً نتیجه نهایی را انتخاب کنید.");
            return;
        }

        if (!finalTozihat.trim() || finalTozihat.trim().length < 5) {
            setFinalError("لطفاً توضیحات ثبت نهایی را وارد کنید (حداقل 5 کاراکتر).");
            return;
        }

        if (Number(finalNatije) === 2 && finalMavadValues.length === 0) {
            setFinalMavadError(true);
            setFinalError("در حالت ردصلاحیت، انتخاب حداقل یک بند الزامی است.");
            return;
        }

        try {
            setFinalSubmitting(true);
            setFinalError("");
            setFinalMavadError(false);

            const resInsert: any = await InsertAshkhasSalahiyat(
                ShomarehParvandeh,
                CodeEntekhabat,
                Number(finalNatije),
                finalTozihat.trim(),
                user?.PostId ?? null,
                1,
                user?.UserId
            );

            if (Number(finalNatije) === 2) {
                const salahiyatId = extractIDSalahiyat(resInsert);

                if (!salahiyatId) {
                    throw new Error("شناسه صلاحیت (IDSalahiyat) از خروجی ثبت نهایی دریافت نشد.");
                }

                for (const valueMavad of finalMavadValues) {
                    await InsertAshkhasSalahiyatMavad(salahiyatId, valueMavad, user?.UserId);
                }
            }

            setFinalModalOpen(false);
            setFinalNatije(0);
            setFinalTozihat("");
            setFinalMultiNazars([]);
            setFinalMavadError(false);

            await loadSalahiyat();
            await loadKholasehList();
            await loadSalahiyatParvandeh();
        } catch (e: any) {
            setFinalError(e?.message || "خطا در ثبت نهایی پرونده");
        } finally {
            setFinalSubmitting(false);
        }
    };

    /* ================= RIGHT: tags + textarea ================= */
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
            { id: 8, label: "سوابق تحصیلی و تالیفات" },
            { id: 9, label: "سلامت جسمی ، روان و اعصاب" },
            { id: 10, label: "سوابق شغلی مدیریت و اجرایی" },
            { id: 11, label: "عدم شرایط ثبت نام" },
            { id: 12, label: "سابقه اعتیاد به مواد مخدر یا روانگردان" },
            { id: 13, label: "شکایت داوطلب" },
            { id: 14, label: "مصاحبه با داوطلب" },
            { id: 15, label: "سایر" },
            { id: 16, label: "مشخصات و سوابق خانوادگی" },
            { id: 17, label: "وزارت اطلاعات" },
            { id: 18, label: "سازمان اطلاعات سپاه" },
            { id: 19, label: "سازمان اطلاعات فراجا" },
            { id: 20, label: "قوه قضائیه" },
            { id: 21, label: "گزارشات نهادها و سازمانها" },
            { id: 22, label: "فضای مجازی" },
            { id: 23, label: "برنامه های پیشنهادی داوطلب" },
            { id: 24, label: "تابعیت،اقامت و ترددهای خارجی" },
            { id: 25, label: "دفتر نظارت" },
        ],
        []
    );

    /* ================= لیست خلاصه‌ها ================= */
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
                        : Array.isArray(res?.data?.recordset)
                            ? res.data.recordset
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

    useEffect(() => {
        loadKholasehList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ShomarehParvandeh, CodeEntekhabat]);

    /* ================= ByTag (کلیک تگ بالا) ================= */
    const [loadingByTag, setLoadingByTag] = useState(false);
    const [errorByTag, setErrorByTag] = useState("");
    const byTagReqRef = useRef(0);

    const loadKholasehIntoBoxByTag = async (tagId: number) => {
        const reqId = ++byTagReqRef.current;

        setTozihat("");
        setErrortozihat(false);

        if (!ShomarehParvandeh || CodeEntekhabat == null) return;

        try {
            setLoadingByTag(true);
            setErrorByTag("");

            const res: any = await GetAshkhasKholasehSalahiyatByTag(ShomarehParvandeh, CodeEntekhabat, tagId);

            if (reqId !== byTagReqRef.current) return;

            const arr: any[] = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : Array.isArray(res?.recordset)
                        ? res.recordset
                        : Array.isArray(res?.data?.recordset)
                            ? res.data.recordset
                            : [];

            if (!arr.length) {
                setTozihat("");
                return;
            }

            const matches = arr.filter((x: any) => {
                const tid = toNum(x?.TagSalahiyat) ?? toNum(x?.tagSalahiyat) ?? toNum(x?.TagId) ?? null;
                return tid === tagId;
            });

            if (!matches.length) {
                setTozihat("");
                return;
            }

            const item = matches[matches.length - 1];

            const text = toStr(item?.KholasehMatlab) || toStr(item?.kholasehMatlab) || toStr(item?.Kholaseh) || "";

            setTozihat(text.trim() ? text : "");
            setErrortozihat(false);
        } catch (e: any) {
            setErrorByTag(e?.message || "خطا در دریافت خلاصه این تگ");
            setTozihat("");
        } finally {
            if (reqId === byTagReqRef.current) setLoadingByTag(false);
        }
    };

    useEffect(() => {
        if (!activeTag && ShomarehParvandeh && CodeEntekhabat != null) {
            const first = tags[0]?.id ?? 1;
            setActiveTag(first);
            loadKholasehIntoBoxByTag(first);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ShomarehParvandeh, CodeEntekhabat]);

    const onClickTag = async (tagId: number) => {
        setActiveTag(tagId);
        await loadKholasehIntoBoxByTag(tagId);
    };

    const onClickKholasehItem = (item: KholasehListItem) => {
        if (item.tagId != null) setActiveTag(item.tagId);
        setTozihat(item.text || "");
        setErrortozihat(false);
    };

    /* ✅ حذف خلاصه تگ */
    const handleDeleteTagSummary = async (item: KholasehListItem) => {
        if (isLocked) return;

        if (!ShomarehParvandeh || CodeEntekhabat == null) {
            alert("اطلاعات پرونده کامل نیست.");
            return;
        }

        const userId = toNum(user?.UserId);
        if (!userId) {
            alert("شناسه کاربر معتبر نیست.");
            return;
        }

        const tagId = toNum(item.tagId);
        if (!tagId) {
            alert("شناسه تگ معتبر نیست.");
            return;
        }

        showAlert({
            title: "حذف فایل",
            description: "آیا از حذف فایل مطمئن هستید؟",
            type: "warning",
            showCancel: true,
            confirmText: "حذف",
            cancelText: "انصراف",
            onConfirm: async () => {
                try {
                    setDeletingTagId(tagId);

                    await DeleteAshkhasSalahiyatTag(ShomarehParvandeh, CodeEntekhabat, tagId, userId);

                    // اگر تگ فعال حذف شد، متن ادیتور را پاک کن
                    if (activeTag === tagId) {
                        setTozihat("");
                        setErrortozihat(false);
                    }

                    // رفرش
                    await loadKholasehList();

                    // اگر هنوز همان تگ فعال است، دوباره متنش را از سرور بخوان (احتمالاً خالی می‌شود)
                    if (activeTag === tagId) {
                        await loadKholasehIntoBoxByTag(tagId);
                    }

                    await loadSalahiyat();
                    await loadSalahiyatParvandeh();
                } catch (e: any) {
                    alert(e?.message || "خطا در حذف خلاصه تگ");
                } finally {
                    setDeletingTagId(null);
                }
            },
        });
    };

    /* ================= ثبت خلاصه ================= */
    const handleSubmit = async () => {
        if (isLocked) return;

        if (!activeTag) {
            setErrortozihat(true);
            return;
        }

        const userId = toNum(user?.UserId);
        if (!userId) {
            setErrortozihat(true);
            alert("شناسه کاربر معتبر نیست.");
            return;
        }

        const ok = tozihat.trim().length >= 10;
        setErrortozihat(!ok);
        if (!ok) return;

        await InsertAshkhasKholasehSalahiyat(ShomarehParvandeh, CodeEntekhabat, activeTag, tozihat, userId);

        await loadKholasehList();
        await loadKholasehIntoBoxByTag(activeTag);
        await loadSalahiyat();
        await loadSalahiyatParvandeh();
    };

    /* ================= LEFT: pages/images ================= */
    const [pages, setPages] = useState<number[]>([]);
    const [activeAzSafheh, setActiveAzSafheh] = useState<number | null>(null);

    const [fehrestRows, setFehrestRows] = useState<ApiRow[]>([]);
    const [parvandehKholaseh, setParvandehKholaseh] = useState("");

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

    // ✅ آکاردون روی نمایش تصویر (overlay که کل viewer را می‌پوشاند)
    const [imgAccordionOpen, setImgAccordionOpen] = useState(false);
    const toggleImgAccordion = () => setImgAccordionOpen((p) => !p);
    const closeImgAccordion = () => setImgAccordionOpen(false);

    // ✅ لیست آیتم‌های آکاردون از GetParvandehFehrest
    const fehrestAccordionRows = useMemo(() => {
        const list = (fehrestRows ?? [])
            .map((r) => ({
                az: toNum((r as any)?.AzSafheh) ?? 0,
                onvan: toStr((r as any)?.OnvanMatlab),
                manba: toStr((r as any)?.Manabe_NameFarsi),
            }))
            .filter((x) => x.az > 0);

        list.sort((a, b) => a.az - b.az);
        return list;
    }, [fehrestRows]);

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

    // ===== load pages =====
    useEffect(() => {
        let cancelled = false;

        const loadPages = async () => {
            if (!ShomarehParvandeh || !noeBayegani) {
                setPages([]);
                setFehrestRows([]);
                setParvandehKholaseh("");
                setActiveAzSafheh(null);
                setFiles([]);
                setActiveDocIndex(0);
                setActiveImageUrl("");
                resetZoom();
                closeImgAccordion();
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
                            : Array.isArray(res?.data?.recordset)
                                ? res.data.recordset
                                : [];

                if (cancelled) return;

                setFehrestRows(list);

                const uniq = new Set<number>();
                for (const r of list) {
                    const p = toNum((r as any)?.AzSafheh);
                    if (p !== null) uniq.add(p);
                }

                const sorted = Array.from(uniq).sort((a, b) => a - b);

                setPages(sorted);

                setActiveAzSafheh((prev) => {
                    if (prev != null && sorted.includes(prev)) return prev;
                    return sorted.length ? sorted[0] : null;
                });

                setFiles([]);
                setActiveDocIndex(0);
                setActiveImageUrl("");
                resetZoom();
                closeImgAccordion();
            } catch {
                if (!cancelled) {
                    setPages([]);
                    setFehrestRows([]);
                    setParvandehKholaseh("");
                    setActiveAzSafheh(null);
                    setFiles([]);
                    setActiveDocIndex(0);
                    setActiveImageUrl("");
                    resetZoom();
                    closeImgAccordion();
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

    // ✅ خلاصه readonly وابسته به صفحه انتخابی
    useEffect(() => {
        if (activeAzSafheh == null) {
            setParvandehKholaseh("");
            return;
        }

        const row = fehrestRows.find((r) => toNum((r as any)?.AzSafheh) === activeAzSafheh);
        setParvandehKholaseh(toStr((row as any)?.Kholaseh));
    }, [activeAzSafheh, fehrestRows]);

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
                closeImgAccordion();

                const res: any = await GetParvandehFehrestFiles(ShomarehParvandeh, noeBayegani, String(activeAzSafheh));

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
                            : Array.isArray(res?.data?.recordset)
                                ? res.data.recordset
                                : [];

                const mapped: FileViewItem[] = list
                    .map((x, idx) => {
                        const b64 = x?.base64;
                        if (!b64) return null;

                        const safhehLabel = toStr((x as any)?.safheh ?? (x as any)?.Safheh);
                        const mime = toStr(x?.mime) || "image/jpeg";
                        const rawId = (x as any)?.id ?? (x as any)?.ID;

                        const id = rawId != null ? String(rawId) : `az-${activeAzSafheh}-s-${safhehLabel || "x"}-i-${idx}`;

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
                    closeImgAccordion();
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
        closeImgAccordion();
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
                <div dir="rtl" className="w-[30%] h-full bg-white flex flex-col shadow-lg z-10 m-0 p-0">
                    <div className="w-full bg-gray-100 border-b border-gray-300 p-2">
                        <div className="flex items-center gap-2 mb-2">
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
                                            onClick={() => {
                                                setActiveAzSafheh(p as number);
                                                closeImgAccordion();
                                            }}
                                            className={[
                                                "w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition",
                                                activeAzSafheh === p ? "bg-sky-800 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300",
                                            ].join(" ")}
                                            title={`${p}`}
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
                                            title={` ${f.azSafheh} | Safheh ${f.safheh}`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div data-tour="zoom-controls" className="mt-3 flex justify-end items-center gap-2">
                            {/* دکمه‌ها از روی سند برداشته شدند و بالای باکس تصویر قرار گرفتند. */}
                            <button
                                type="button"
                                onClick={toggleImgAccordion}
                                disabled={fehrestAccordionRows.length === 0}
                                className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-white hover:bg-slate-50 shadow-sm border border-gray-200 text-xs text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={imgAccordionOpen ? "بستن فهرست عناوین" : "نمایش فهرست عناوین"}
                            >
                                {imgAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                <span>{imgAccordionOpen ? "بستن عناوین" : "نمایش عناوین"}</span>
                            </button>

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
                                className={["absolute top-1/2 left-1/2 select-none", scale > 1 ? "cursor-grab" : "cursor-default"].join(
                                    " "
                                )}
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

                        {/* ✅ Overlay Accordion - hidden by default and only opens over the document */}
                        {imgAccordionOpen && (
                            <div className="absolute inset-0 z-[60] bg-white/98 backdrop-blur-[1px] p-2">
                                <div className="h-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                                    <div className="shrink-0 bg-sky-700 text-white text-xs px-3 py-2 flex items-center justify-between">
                                        <span>لیست عناوین</span>
                                        <span className="opacity-90">{ShomarehParvandeh ? `پرونده: ${ShomarehParvandeh}` : ""}</span>
                                    </div>

                                    <div className="p-2 bg-white flex-1 overflow-y-auto">
                                        {loadingPages ? (
                                            <div className="text-xs text-gray-600 py-2 flex items-center gap-2 justify-end">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                در حال دریافت فهرست...
                                            </div>
                                        ) : fehrestAccordionRows.length === 0 ? (
                                            <div className="text-xs text-gray-500 text-right py-2">موردی برای نمایش وجود ندارد.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {fehrestAccordionRows.map((r, i) => {
                                                    const isActive = (activeAzSafheh ?? 0) === r.az;

                                                    return (
                                                        <button
                                                            key={`${r.az}-${r.onvan}-${r.manba}-${i}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveAzSafheh(r.az);
                                                                closeImgAccordion();
                                                            }}
                                                            className={[
                                                                "w-full text-right rounded-lg border p-2 transition",
                                                                isActive
                                                                    ? "border-sky-600 bg-sky-50"
                                                                    : "border-gray-200 hover:bg-gray-50",
                                                            ].join(" ")}
                                                            title={`رفتن به صفحه ${r.az}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="text-xs font-bold text-gray-800">{r.az}</div>
                                                                {isActive && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-600 text-white">
                                                                        فعال
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="mt-1 text-[14px] text-green-700 leading-5 line-clamp-2">
                                                                <span className="text-purple-600 text-[15px]">عنوان:</span> {r.onvan || "—"}
                                                            </div>

                                                            <div className="mt-1 text-[15px] text-gray-700 leading-5 line-clamp-1">
                                                                <span className="text-gray-500 text-[15px]">منبع:</span> {r.manba || "—"}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeImgAccordion();
                                                openViewer();
                                            }}
                                            disabled={!activeImageUrl}
                                            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs disabled:opacity-60"
                                        >
                                            باز کردن تصویر در مودال
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                resetZoom();
                                                closeImgAccordion();
                                            }}
                                            disabled={!activeImageUrl}
                                            className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs disabled:opacity-60"
                                        >
                                            بستن لیست عناوین
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== RIGHT (70%) ===== */}
                <div dir="rtl" className="w-[70%] h-full flex flex-col m-0 p-0">
                    {/* Tags */}
                    <div className="w-full bg-blue-100 m-0 p-2">
                        <div className="flex items-start justify-between gap-2">
                            <div
                                data-tour="tags-section"
                                className="flex-1 flex flex-row items-center gap-1 flex-wrap max-h-[88px] overflow-y-auto pr-1"
                            >
                                {tags.map((t) => {
                                    const isActive = activeTag === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => onClickTag(t.id)}
                                            className={[
                                                "py-0.5 px-2.5 rounded-2xl text-[11px] leading-5 text-white transition cursor-pointer",
                                                isActive ? "bg-sky-800" : "bg-gray-500 hover:bg-gray-600",
                                            ].join(" ")}
                                            title={`کد تگ: ${t.id}`}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className=" mx-2 mt-2 bg-white border border-gray-200 rounded-lg p-3">

                        <div className="flex justify-between">
                            <div className=" text-xs font-semibold text-gray-700 mb-2 text-right">خلاصه پرونده</div>
                            <button
                                onClick={() =>
                                    setModalNemone(true)
                                }
                                className="p-2 h-8 text-white cursor-pointer bg-green-800 rounded-2xl text-[13px]">نمونه خلاصه صلاحیت</button>
                        </div>
                        <textarea
                            readOnly
                            value={parvandehKholaseh}
                            placeholder="خلاصه‌ای برای این پرونده ثبت نشده است"
                            className="w-full min-h-[68px] max-h-[96px] resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-6 text-gray-700 outline-none"
                        />



                    </div>

                    {errorSalahiyat && <div className="text-xs text-red-600 p-2 text-right">{errorSalahiyat}</div>}
                    {isLocked && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mx-2 mt-2 text-right">
                            این پرونده در وضعیت نهایی است و امکان ویرایش ندارد.
                        </div>
                    )}

                    {/* ================= Two-Column Summary Area ================= */}
                    <div className="flex-1 p-2 overflow-hidden min-h-[560px]">
                        <div className="h-full min-h-[540px] grid grid-cols-12 gap-2">
                            {/* ستون بزرگ‌تر: نوشتن خلاصه */}
                            <div
                                data-tour="textarea-section"
                                className="col-span-12 lg:col-span-7 bg-white rounded-xl shadow border border-gray-200 p-3 min-h-[540px] h-full flex flex-col relative"
                            >
                                {loadingByTag && (
                                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-xl">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            در حال دریافت خلاصه تگ...
                                        </div>
                                    </div>
                                )}

                                <div className="mb-2 flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                                    <div className="flex items-center gap-2 flex-wrap text-right">
                                        <div className="text-sm font-medium text-gray-800">خلاصه صلاحیتی داوطلب :</div>

                                        {loadingSalahiyat ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs border border-gray-200">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                در حال بررسی
                                            </span>
                                        ) : natijeNameFarsi ? (
                                            <span
                                                className={[
                                                    "inline-flex items-center px-3 py-1 rounded-full border text-sm font-extrabold shadow-sm",
                                                    getNatijeBadgeClass(natijeNameFarsi),
                                                ].join(" ")}
                                            >
                                                {natijeNameFarsi}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-xs">
                                                هنوز نظری ثبت نشده
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        data-tour="submit-btn"
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isLocked || loadingSalahiyat || deletingTagId !== null}
                                        className={[
                                            "px-4 py-1.5 text-sm rounded-lg transition whitespace-nowrap",
                                            isLocked ? "bg-gray-400 text-white cursor-not-allowed" : "bg-sky-700 text-white hover:bg-sky-800",
                                            loadingSalahiyat || deletingTagId !== null ? "opacity-70" : "",
                                        ].join(" ")}
                                        title={isLocked ? "این پرونده در وضعیت نهایی است و امکان ویرایش ندارد" : "ثبت"}
                                    >
                                        ثبت
                                    </button>
                                </div>

                                {errorByTag && <div className="text-xs text-red-600 mb-2 text-right">{errorByTag}</div>}

                                <div className="flex-1 min-h-[520px] h-full">
                                    <TextArea1
                                        key={`ta-${activeTag}`}
                                        fullHeight
                                        justify
                                        readOnly={isLocked}
                                        label=""
                                        placeholder={isLocked ? "این بخش قفل است (RecordState=2)" : "توضیحات مورد نظر را وارد کنید"}
                                        value={tozihat}
                                        onChange={(e: any) => {
                                            if (isLocked) return;
                                            setTozihat(e.target.value);
                                        }}
                                        maxLength={3000}
                                        onlyNumber={false}
                                        error={errortozihat}
                                        errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 کاراکتر" : ""}
                                    />
                                </div>
                            </div>

                            {/* ستون کوچک‌تر: لیست ثبت‌ها */}
                            <div
                                data-tour="kholaseh-list"
                                className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow border border-gray-200 p-3 min-h-0 flex flex-col"
                            >
                                <div className="flex items-center justify-between gap-2 mb-2 border-b border-gray-200 pb-2">
                                    <div className="text-gray-800 text-sm font-medium">فهرست خلاصه‌های ثبت‌شده</div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={loadKholasehList}
                                            disabled={loadingKholaseh || deletingTagId !== null}
                                            className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 bg-gray-50 hover:bg-white transition disabled:opacity-60"
                                        >
                                            بروزرسانی
                                        </button>

                                        <button
                                            type="button"
                                            onClick={openFinalModal}
                                            disabled={isLocked || loadingSalahiyat || deletingTagId !== null}
                                            className={[
                                                "text-xs px-2.5 py-1 rounded-lg transition whitespace-nowrap",
                                                isLocked ? "bg-gray-400 text-white cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700",
                                                loadingSalahiyat || deletingTagId !== null ? "opacity-70" : "",
                                            ].join(" ")}
                                            title={isLocked ? "این پرونده نهایی است و امکان ثبت نهایی ندارد" : "ثبت نهایی"}
                                        >
                                            ثبت نهایی
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3 text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                    {isLocked ? "پرونده نهایی شده است" : "پرونده قابل ویرایش است"}
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
                                        <ul className="grid grid-cols-1 gap-2">
                                            {kholasehList.map((it) => {
                                                const itemTagId = toNum(it.tagId);
                                                const isDeletingThisTag = deletingTagId !== null && deletingTagId === itemTagId;

                                                return (
                                                    <li key={it.id}>
                                                        <div
                                                            className="group w-full min-h-[112px] bg-white text-right border border-slate-200 rounded-xl p-3 hover:border-sky-300 hover:shadow-md transition flex flex-col gap-2 shadow-sm"
                                                            title={it.tagId != null ? `TagId: ${it.tagId}` : "TagId موجود نیست"}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                {!isLocked ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteTagSummary(it);
                                                                        }}
                                                                        disabled={isDeletingThisTag || deletingTagId !== null}
                                                                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] disabled:opacity-60"
                                                                        title="حذف خلاصه این تگ"
                                                                    >
                                                                        {isDeletingThisTag ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="w-3 h-3" />
                                                                        )}
                                                                        حذف
                                                                    </button>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-[10px] text-slate-500 border border-slate-200">قفل</span>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => onClickKholasehItem(it)}
                                                                    className="flex-1 text-right"
                                                                >
                                                                    <div className="inline-flex items-center rounded-full bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 text-[12px] font-medium max-w-full">
                                                                        <span className="truncate">{it.tagName || "—"}</span>
                                                                    </div>
                                                                </button>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => onClickKholasehItem(it)}
                                                                className="text-right flex-grow rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 hover:bg-slate-50"
                                                            >
                                                                <div className="text-slate-700 whitespace-pre-wrap leading-6 overflow-hidden text-[12.5px]">
                                                                    <div className="line-clamp-4">{it.text || "—"}</div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ✅ پنل جدید زیر تگ‌ها: سوابق/نتایج صلاحیت پرونده */}
                    <div className="mx-2 mt-2 bg-white border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-2 border-b border-gray-200 pb-2">
                            <div className="text-sm font-semibold text-gray-800">سوابق نظر پرونده</div>
                            <button
                                type="button"
                                onClick={loadSalahiyatParvandeh}
                                className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 bg-gray-50 hover:bg-white transition disabled:opacity-60"
                                disabled={loadingSalahiyatParvandeh || deletingTagId !== null}
                            >
                                {loadingSalahiyatParvandeh ? "در حال دریافت..." : "بروزرسانی"}
                            </button>
                        </div>

                        {errorSalahiyatParvandeh && (
                            <div className="text-xs text-red-600 mb-2 text-right">{errorSalahiyatParvandeh}</div>
                        )}

                        {loadingSalahiyatParvandeh ? (
                            <div className="text-xs text-gray-600 py-2 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                در حال دریافت سوابق پرونده...
                            </div>
                        ) : salahiyatParvandehRows.length === 0 ? (
                            <div className="text-xs text-gray-500 text-right">رکوردی برای نمایش وجود ندارد.</div>
                        ) : (
                            <div className="max-h-[180px] overflow-y-auto space-y-2">
                                {salahiyatParvandehRows.map((row, idx) => (
                                    <div key={`${row.id}-${idx}`} className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-right">
                                        <div className="grid grid-cols-12 gap-2 text-xs">
                                            <div className="col-span-12 md:col-span-3">
                                                <span className="text-gray-500">نتیجه: </span>
                                                <span className="font-semibold text-sky-800">{row.natijeNameFarsi || "—"}
                                                    ({row.onvanPost || "—"})
                                                </span>
                                            </div>



                                            <div className="col-span-12 md:col-span-7">
                                                <span className="text-gray-500">اظهار نظر: </span>
                                                <span className="font-medium text-gray-800">{row.Tozihat || "—"}</span>
                                            </div>


                                            <div className="col-span-12 md:col-span-2">
                                                <span className="text-gray-500">مواد قانونی: </span>
                                                <span className="font-medium text-rose-700">{row.mavadGhanoniNames || "—"}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>



                </div>
            </div>

            {/* ================= Final Modal ================= */}
            {finalModalOpen && (
                <div className="fixed inset-0 z-[30020] flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-green-600">
                            <div className="text-sm text-white font-semibold">ثبت نظر پرونده</div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (finalSubmitting) return;
                                    setFinalModalOpen(false);
                                }}
                                className="p-1 rounded hover:bg-white/20 transition text-white"
                                title="بستن"
                                disabled={finalSubmitting}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="text-sm text-gray-700 leading-6 text-right">لطفاً نتیجه پیشنهادی و توضیحات را وارد کنید.</div>

                            <GetDFNByPID
                                PID={308}
                                labelColor="text-purple-600"
                                label="نتیجه نهایی"
                                defaultValue={finalNatije || 0}
                                onSelect={(info: any) => {
                                    const val = Number(info?.Value ?? 0);
                                    setFinalNatije(Number.isFinite(val) ? val : 0);
                                    setFinalError("");
                                    setFinalMavadError(false);
                                }}
                                error={!finalNatije}
                                errorMessage={!finalNatije ? "لطفاً نتیجه نهایی را انتخاب کنید" : ""}
                            />

                            {isRejectNatije && (
                                <>
                                    <GetDFNByPIDMulti
                                        key={`final-mavad-${finalModalOpen ? "open" : "close"}-${finalNatije}`}
                                        PID={309}
                                        labelColor="text-purple-600"
                                        label="بندهای ردصلاحیت (چند انتخابی)"
                                        placeholder="یک یا چند بند را انتخاب کنید..."
                                        name="finalMultiNazars"
                                        onSelect={(items: any) => {
                                            const normalized = normalizeMultiItems(items ?? []);
                                            setFinalMultiNazars(normalized);
                                            setFinalError("");
                                            setFinalMavadError(normalized.length === 0);
                                        }}
                                        onChange={() => { }}
                                        error={finalMavadError}
                                        errorMessage={finalMavadError ? "انتخاب حداقل یک بند الزامی است" : ""}
                                    />

                                    <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 text-right">
                                        در حالت <b>ردصلاحیت</b> انتخاب حداقل یک بند الزامی است.
                                    </div>
                                </>
                            )}

                            {isRejectNatije && finalMultiNazars.length > 0 && (
                                <div className="text-right bg-sky-50 border border-sky-200 rounded-lg p-2">
                                    <div className="text-xs font-semibold text-sky-800 mb-1">موارد انتخاب‌شده:</div>
                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {finalMultiNazars.map((item) => (
                                            <span
                                                key={`${item.Value}-${item.NameFarsi}`}
                                                className="inline-flex items-center rounded-full border border-sky-300 bg-white px-2 py-0.5 text-[11px] text-sky-800"
                                            >
                                                {item.NameFarsi}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-right mt-3">
                                <label className="block text-red-400 mb-1">توضیحات</label>
                                <textarea
                                    value={finalTozihat}
                                    onChange={(e) => {
                                        setFinalTozihat(e.target.value);
                                        setFinalError("");
                                    }}
                                    disabled={finalSubmitting}
                                    placeholder="توضیحات ثبت نهایی را وارد کنید..."
                                    className="w-full min-h-[110px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-sky-500 resize-y"
                                />
                            </div>

                            {finalError && (
                                <div className="text-xs text-red-600 text-right bg-red-50 border border-red-200 rounded p-2">{finalError}</div>
                            )}

                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-right">
                                پس از ثبت نهایی، امکان ویرایش غیرفعال می‌شود.
                            </div>
                        </div>

                        <div className="px-4 pb-4 flex items-center justify-start gap-2">
                            <button
                                type="button"
                                onClick={() => setFinalModalOpen(false)}
                                disabled={finalSubmitting}
                                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
                            >
                                انصراف
                            </button>

                            <button
                                type="button"
                                onClick={handleFinalSubmit}
                                disabled={finalSubmitting || isLocked}
                                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60 flex items-center gap-2"
                            >
                                {finalSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                ثبت
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {ModalNemone && (
                <>
                    <div className="fixed inset-0 z-[30020] flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-green-600">
                                <div className="text-white">نمونه نشانه گذاری صفحات در خلاصه پرونده</div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalNemone(false);
                                    }}
                                    className="p-1 rounded hover:bg-white/20 transition text-white"
                                    title="بستن"
                                    disabled={finalSubmitting}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 space-y-2">
                                <div className="text-sm text-gray-700 leading-6 text-right">لطفاً جهت اشاره دادن به صفحات، مشابه دو نمونه زیر عمل کنید .</div>

                                <div className="text-[14px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2  text-right">
                                    بر اساس جواب استعلام قوه قضائیه، وی سابقه کیفری ندارد ص(210)
                                </div>

                                <div className="text-[14px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-right">
                                    بر اساس جواب استعلام قوه قضائیه، وی سابقه کیفری ندارد ص(210 و 215 و 218)
                                </div>

                                <div className="text-[14px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-right">
                                    بر اساس جواب استعلام قوه قضائیه، وی سابقه کیفری ندارد ص(210 تا 215)
                                </div>

                            </div>

                            <div className="px-4 pb-4 flex items-center justify-start gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalNemone(false)}
                                    disabled={finalSubmitting}
                                    className="px-6 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
                                >
                                    بستن
                                </button>


                            </div>
                        </div>
                    </div>
                </>
            )}

        </>
    );
}