"use client";

import { useMeratUser } from "@/lib/useMeratUser";

import React, { useEffect, useState } from "react";
import "../style.css";
import { GetReportAshkhasEntekhabat } from "@/services/ApiServiceDavtalab";
import { useRouter, useSearchParams } from "next/navigation";
type ReportRow = {
    CodeEntekhabat?: number | string;
    ShomarehParvandeh?: number | string;
    CodeMelli?: string | null;
    FirstName?: string | null;
    LastName?: string | null;
    NamePedar?: string | null;
    NameMostar?: string | null;
    TarikhTavalod?: string | null;
    TelHamrah?: string | null;
    TarikhEntekhabat?: string | null;
    NoeEntekhabat?: string | null;
    Ostan?: number | string | null;
    NameOstan?: string | null;
    OnvanDore?: string | null;
    NameHozeh?: string | null;
    CodeHozeh?: number | string | null;
    TarikhSabteName?: string | null;
    Natije?: number | string | null;
    Natije_NameFarsi?: string | null;
};

export default function Page() {
    const user = useMeratUser();
    const router = useRouter();
    const title = "گزارش لیستی داوطلبان";

    const mahal = user.Mahal;
    const codeEntekhabat = 31210;

    const [rows, setRows] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                const res = await GetReportAshkhasEntekhabat(mahal, codeEntekhabat, 10);

                let list: ReportRow[] = Array.isArray(res?.data) ? res.data : [];

                if (list.length === 0 && res && typeof res === "object" && "length" in res) {
                    list = Object.keys(res)
                        .filter((k) => /^\d+$/.test(k))
                        .sort((a, b) => Number(a) - Number(b))
                        .map((k) => (res as any)[k]);
                }

                setRows(list);
            } catch (e) {
                console.error("خطا در دریافت گزارش", e);
                setRows([]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [mahal, codeEntekhabat]);


    return (
        <div className="bg-white m-1 py-2 px-2 flex flex-col md:flex-row gap-4 rounded-b-xl">
            <div className="bg-white rounded-b-xl shadow w-full flex flex-col gap-2">

                <main className="p-4">
                    <div className="no-print mb-3">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                        >
                            چاپ
                        </button>
                    </div>

                    <section id="print-area">

                        <div className="print-page-header">
                            <h1 className="print-title titr text-center">{title}</h1>
                            <div className="print-subtitle titr text-center">
                                استان: {rows[0]?.NameOstan || "-"}
                            </div>
                        </div>

                        <table className="report-table mt-2">
                            <thead>
                                <tr className="titr text-[14px]">
                                    <th className="w-[50px]">ردیف</th>
                                    <th>نام</th>
                                    <th>نام خانوادگی</th>
                                    <th>نام پدر</th>
                                    <th>کد ملی</th>
                                    <th className="w-[90px]">تولد</th>
                                    <th className="w-[140px]">حوزه</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={index} className="bnaznin text-[15px]">
                                        <td>{index + 1}</td>
                                        <td>{row.FirstName}</td>
                                        <td>{row.LastName}</td>
                                        <td>{row.NamePedar}</td>
                                        <td>{row.CodeMelli}</td>
                                        <td>{row.TarikhTavalod}</td>
                                        <td>{row.NameHozeh || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                    </section>


                </main>

                {/* ❌ در چاپ نمایش داده نشود */}
                <footer className="no-print">فوتر سایت</footer>
            </div>
        </div>
    );
}
