"use client";

import { useEffect, useMemo, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { JambandiOstan as ApiJambandiOstan } from "@/services/ApiService";

interface Props {
    erjaid: number;

    // ✅ خروجی تب فعال (مثل قبل)
    onJambandiChange?: (html: string, activeItem: TahghighItem | null, activeIndex: number) => void;

    // ✅ خروجی همه محل‌ها یکجا (JambandiAll)
    onJambandiAllChange?: (htmlAll: string) => void;

    preferMahalReciver?: number | null; // اگر نمی‌خوای، می‌تونی اصلاً پاس ندی
}

type TahghighItem = {
    NameMahal?: string;
    MahalReciver?: number;
    JambandiEghdam?: string;
    [key: string]: any;
};

const escapeHtml = (s: string) =>
    s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

// ✅ تبدیل p به div بدون margin تا خروجی «یک خط یک خط» بشه
const compactHtml = (html: string) => {
    return html
        .replace(/<p([^>]*)>/gi, (_m, attrs) => {
            const a = attrs ?? "";
            // اگر style داشت، margin:0 رو به اولش اضافه می‌کنیم
            if (/style\s*=\s*"/i.test(a)) {
                return `<div${a.replace(/style\s*=\s*"/i, 'style="margin:0;')}>`;
            }
            // اگر style نداشت، اضافه می‌کنیم
            return `<div${a} style="margin:0;">`;
        })
        .replace(/<\/p>/gi, "</div>");
};

export default function ShowTahghigh({
    erjaid,
    onJambandiChange,
    onJambandiAllChange,
    preferMahalReciver = null,
}: Props) {
    const user = useMeratUser();

    const [items, setItems] = useState<TahghighItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const normalizeToArray = (payload: any): TahghighItem[] => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.result)) return payload.result;
        if (Array.isArray(payload.data)) return payload.data;
        if (typeof payload === "object") return [payload];
        return [];
    };

    const pickDefaultIndex = (arr: TahghighItem[]) => {
        if (!arr.length) return 0;

        if (preferMahalReciver != null) {
            const idx = arr.findIndex((x) => Number(x?.MahalReciver) === Number(preferMahalReciver));
            if (idx >= 0) return idx;
        }

        const idx2 = arr.findIndex((x) => (x?.NameMahal ?? "").includes(":") === false);
        if (idx2 >= 0) return idx2;

        return 0;
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!erjaid) return;

            setLoading(true);
            setError(null);

            try {
                const res: any = await ApiJambandiOstan(erjaid);
                const payload = res?.data?.data ?? res?.data ?? res;
                const arr = normalizeToArray(payload);

                setItems(arr);

                const defIdx = pickDefaultIndex(arr);
                setActiveIndex(defIdx);

                const active = arr[defIdx] ?? null;
                const html = active?.JambandiEghdam ? String(active.JambandiEghdam) : "";
                onJambandiChange?.(html, active, defIdx);
            } catch (e: any) {
                console.error(e);
                setError(e?.message ?? "خطا در دریافت اطلاعات");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [erjaid]);

    const activeItem = useMemo(() => items[activeIndex], [items, activeIndex]);

    // ✅ مثل قبل: هر بار تب عوض شد خروجی تب فعال بده
    useEffect(() => {
        if (!items.length) return;
        const active = items[activeIndex] ?? null;
        const html = active?.JambandiEghdam ? String(active.JambandiEghdam) : "";
        onJambandiChange?.(html, active, activeIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIndex]);

    // ✅ خروجی همه محل‌ها (JambandiAll) «یک خط یک خط»
    const jambandiAllHtml = useMemo(() => {
        if (!items?.length) return "";

        const parts: string[] = [];

        for (const it of items) {
            const raw = it?.JambandiEghdam;
            if (!raw || String(raw).trim() === "") continue;

            const s = String(raw);

            // اگر متن ساده بود (بدون HTML)، خودمون به div تبدیل می‌کنیم
            const looksLikeHtml = /<[^>]+>/.test(s);
            const asHtml = looksLikeHtml ? compactHtml(s) : `<div style="margin:0;">${escapeHtml(s)}</div>`;

            parts.push(asHtml);
        }

        // جداکننده خیلی کم (۲px) تا «فاصله زیاد» نشه
        return parts.join(`<div style="height:2px;"></div>`);
    }, [items]);

    // ✅ ارسال JambandiAll به والد
    useEffect(() => {
        onJambandiAllChange?.(jambandiAllHtml);
    }, [jambandiAllHtml, onJambandiAllChange]);

    if (loading) return <div>در حال بارگذاری...</div>;
    if (error) return <div style={{ color: "red" }}>خطا: {error}</div>;
    if (!items.length) return <div>دیتایی برای نمایش وجود ندارد.</div>;

    const jambandiHtml = activeItem?.JambandiEghdam ? String(activeItem.JambandiEghdam) : "";

    return (
        <div>
            {/* Tab Bar (همون قبلی) */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    borderBottom: "1px solid #ddd",
                    paddingBottom: 8,
                    marginBottom: 12,
                }}
            >



            </div>

            {/* <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                <h4 style={{ marginTop: 0 }}>
                    {activeItem?.NameMahal ? `جزئیات: ${activeItem.NameMahal}` : "جزئیات"}
                </h4>

                {!jambandiHtml ? (
                    <div>جمع‌بندی‌ای برای نمایش وجود ندارد.</div>
                ) : (
                    <div style={{ lineHeight: "1.6" }} dangerouslySetInnerHTML={{ __html: jambandiHtml }} />
                )}
            </div> */}
        </div>
    );
}
