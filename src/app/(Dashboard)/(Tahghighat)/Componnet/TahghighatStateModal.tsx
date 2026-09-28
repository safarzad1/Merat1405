"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "@/lib/framerCompat";
import { GetTahghighatState } from "@/services/ApiService";
import { X } from "@/component/ResearchIcons";

type TahghighatStateItem = {
    ErjaState_NameFarsi?: string | null;
    Description?: string | null;
    FullName?: string | null;
    CreateDateTime?: string | null; // "1404/10/15-22:38:17"
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    erjaid: number | null;
};

function extractArray(res: any): TahghighatStateItem[] {
    // حالت‌های رایج در پروژه‌ها
    const candidates = [
        res,
        res?.data,
        res?.data?.data,
        res?.result,
        res?.items,
    ];

    for (const c of candidates) {
        if (Array.isArray(c)) return c as TahghighatStateItem[];
    }

    return [];
}

function formatDate(value?: string | null) {
    if (!value) return "—";

    // اگر شمسی با "-" بود:
    if (value.includes("-") && !value.includes("T")) {
        return value.replace("-", " - ");
    }

    // اگر ISO بود:
    if (value.includes("T")) {
        return value.replace("T", " ").slice(0, 19);
    }

    // هر چیز دیگری
    return value;
}

export default function TahghighatStateModal({ isOpen, onClose, erjaid }: Props) {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<TahghighatStateItem[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        if (erjaid == null) return; // ✅ به جای !erjaid

        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError("");

                const res = await GetTahghighatState(erjaid);

                const arr = extractArray(res);

                if (cancelled) return;
                setRows(arr);
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message || "خطا در دریافت اطلاعات");
                setRows([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, erjaid]);

    const title = useMemo(() => `ErjaId: ${erjaid ?? "—"}`, [erjaid]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center px-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                    <motion.div
                        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-200"
                        initial={{ y: 24, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 24, opacity: 0, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex flex-col">
                                <span className="text-base font-semibold text-gray-800">
                                    وضعیت گردش کار تحقیق
                                </span>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {loading && (
                                <div className="text-sm text-gray-600">در حال دریافت اطلاعات...</div>
                            )}

                            {!loading && error && (
                                <div className="text-sm text-red-600">{error}</div>
                            )}

                            {!loading && !error && rows.length === 0 && (
                                <div className="text-sm text-gray-600">داده‌ای یافت نشد.</div>
                            )}

                            {!loading && !error && rows.length > 0 && (
                                <div className="max-h-[65vh] overflow-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-sm text-right border-collapse">
                                        <thead className="sticky top-0 z-10 bg-gray-100">
                                            <tr className="text-gray-700">
                                                <th className="px-4 py-3 font-semibold whitespace-nowrap w-40">
                                                    وضعیت
                                                </th>
                                                <th className="px-4 py-3 font-semibold">
                                                    توضیحات
                                                </th>
                                                <th className="px-4 py-3 font-semibold whitespace-nowrap w-40">
                                                    ثبت‌کننده
                                                </th>
                                                <th className="px-4 py-3 font-semibold whitespace-nowrap w-44">
                                                    تاریخ
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {rows.map((r, idx) => (
                                                <tr
                                                    key={`${r.CreateDateTime}-${idx}`}
                                                    className={`
            border-b last:border-b-0
            ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
            hover:bg-blue-50 transition
          `}
                                                >
                                                    {/* وضعیت */}
                                                    <td className="px-4 py-1 whitespace-nowrap">
                                                        <span
                                                            className={`
                inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                ${r.ErjaState_NameFarsi === "در حال انجام"
                                                                    ? "bg-blue-100 text-blue-700"
                                                                    : r.ErjaState_NameFarsi === "انجام شد"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-gray-200 text-gray-700"
                                                                }
              `}
                                                        >
                                                            {r.ErjaState_NameFarsi || "—"}
                                                        </span>
                                                    </td>

                                                    {/* توضیحات */}
                                                    <td className="px-4 py-1">
                                                        <div className="text-gray-700 leading-6 max-w-[520px]">
                                                            {r.Description || "—"}
                                                        </div>
                                                    </td>

                                                    {/* ثبت‌کننده */}
                                                    <td className="px-4 py-1 whitespace-nowrap text-gray-800">
                                                        {r.FullName || "—"}
                                                    </td>

                                                    {/* تاریخ */}
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                                                        {formatDate(r.CreateDateTime)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 p-4 border-t bg-white rounded-b-2xl">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                            >
                                بستن
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
