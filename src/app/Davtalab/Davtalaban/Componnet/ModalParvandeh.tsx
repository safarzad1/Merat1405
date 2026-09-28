"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "@/component/ResearchIcons";
import { GetParvandehFehrest } from "@/services/ApiServiceDavtalab";

/* ===== Types (حداقل لازم) ===== */
type ApiRow = {
    AzSafheh?: any;
    TaSafheh?: any;
    CountSafehat?: any;
    Manabe?: any;
    Manabe_NameFarsi?: any;
    OnvanDore?: any;
    CodeEntekhabat?: any;
    TarikhEnteshar?: any;
    OnvanMatlab?: any;
    Kholaseh?: any;
    IDKhabar?: any;
};

export type FehrestRow = {
    id: number;
    azSafhe: string;
    onvanMatn: string;
    manba: string;
};

type Props = {
    shomarehParvandeh: number;
    noeBayegani: number;
    mahal: number;

    /** وقتی کاربر روی ردیف کلیک کرد، AzSafheh برگردانده می‌شود */
    onSelectAzSafheh?: (azSafheh: string, row: FehrestRow) => void;

    /** اختیاری: اگر می‌خواهی خودش ردیف اول را انتخاب کند */
    autoSelectFirst?: boolean;

    className?: string;
};

function Spinner({ size = 16 }: { size?: number }) {
    return (
        <span
            className="inline-block rounded-full border-2 border-gray-300 border-t-indigo-600 animate-spin"
            style={{ width: size, height: size }}
        />
    );
}

const toStr = (v: any) => (v === null || v === undefined ? "" : String(v));

export default function FehrestParvandehTable({
    shomarehParvandeh,
    noeBayegani,
    mahal,
    onSelectAzSafheh,
    autoSelectFirst = false,
    className = "",
}: Props) {
    const [rows, setRows] = useState<FehrestRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [search, setSearch] = useState("");
    const [activeId, setActiveId] = useState<number | null>(null);

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

                const res: any = await GetParvandehFehrest(shomarehParvandeh, mahal, noeBayegani);

                const list: ApiRow[] = Array.isArray(res)
                    ? res
                    : Array.isArray(res?.data)
                        ? res.data
                        : Array.isArray(res?.recordset)
                            ? res.recordset
                            : [];

                const mapped: FehrestRow[] = list.map((a, idx) => ({
                    id: Number((a as any).IDKhabar ?? idx + 1),
                    azSafhe: toStr((a as any).AzSafheh),
                    onvanMatn: toStr((a as any).OnvanMatlab),
                    manba: toStr((a as any).Manabe_NameFarsi ?? (a as any).Manabe),
                }));

                if (cancelled) return;

                setRows(mapped);

                if (autoSelectFirst && mapped.length > 0) {
                    setActiveId(mapped[0].id);
                    onSelectAzSafheh?.(mapped[0].azSafhe, mapped[0]);
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
    }, [shomarehParvandeh, noeBayegani, mahal, autoSelectFirst, onSelectAzSafheh]);

    const filtered = useMemo(() => {
        const q = search.trim();
        if (!q) return rows;
        return rows.filter((r) => `${r.onvanMatn} ${r.manba} ${r.azSafhe}`.includes(q));
    }, [rows, search]);

    const onRowClick = (r: FehrestRow) => {
        setActiveId(r.id);
        onSelectAzSafheh?.(r.azSafhe, r);
    };

    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-300 p-3 ${className}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                <h2 className="text-base md:text-lg font-extrabold text-gray-800">فهرست پرونده</h2>

                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pr-9 pl-3 py-2 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white outline-none text-sm md:text-base w-[240px]
              focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200 ease-in-out"
                        placeholder="جستجو..."
                    />
                </div>
            </div>

            {error && <div className="mb-2 text-sm text-red-600 text-right">{error}</div>}

            <div className="rounded-xl border border-gray-400 overflow-hidden">
                <div className="max-h-[700px] overflow-y-auto overscroll-contain">
                    <table className="min-w-full table-auto border-collapse">
                        <thead className="text-[16px]">
                            <tr className="text-gray-700" style={{ backgroundColor: "#cff4fc" }}>
                                <th className="border px-4 py-2 text-right">عنوان مطلب</th>
                                <th className="border px-4 py-2 text-right whitespace-nowrap">منبع</th>
                            </tr>
                        </thead>

                        <tbody className="text-[15px]">
                            {loading ? (
                                <tr>
                                    <td colSpan={2} className="border px-4 py-3 text-center text-gray-600">
                                        <span className="inline-flex items-center gap-2">
                                            <Spinner size={18} />
                                            در حال دریافت اطلاعات...
                                        </span>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="border px-4 py-3 text-center text-gray-500">
                                        موردی یافت نشد.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r) => {
                                    const isActive = r.id === activeId;
                                    return (
                                        <tr
                                            key={r.id}
                                            onClick={() => onRowClick(r)}
                                            className={[
                                                "transition cursor-pointer odd:bg-gray-50 even:bg-white hover:bg-sky-100 hover:text-sky-900",
                                                isActive ? "bg-indigo-50 text-indigo-900" : "",
                                            ].join(" ")}
                                            title={`AzSafheh: ${r.azSafhe}`}
                                        >
                                            <td className="border px-4 py-2 text-right">{r.onvanMatn}</td>
                                            <td className="border px-4 py-2 text-right whitespace-nowrap">{r.manba}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* برای دیباگ (اختیاری) */}
            {/* <pre className="text-xs mt-2">{JSON.stringify(filtered.slice(0, 3), null, 2)}</pre> */}
        </div>
    );
}