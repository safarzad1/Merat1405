"use client";

import { useState, useEffect } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { useRouter } from "next/navigation";
import CustomTable from "@/component/DataTable/CustomTable1";
import { List, ListChecks, Plus, User2Icon, ViewIcon } from "@/component/ResearchIcons";
import { encryptText } from "@/lib/cryptoUtil";
import { GetTahghighat } from "@/services/ApiService";
import { meratV2Request } from "@/app/lib/meratV2/client";
import { getCookie } from "@/lib/cookies";
import styles from "./Kartabl.module.css";

interface AmarItem {
    ID: number;
    PID: number;
    NameFarsi: string;
    Value: number;
    IsActive: boolean | null;
    Latin: string;
    CountParvandeh: number;
}

interface PageProps {
    codeentekhabat: number;
    mahalreciver: number;
    erjastate: number;
    idValue: number;
    amarData?: AmarItem[];
}

// Keep the user-facing status in Persian; StateCode is an internal workflow key.
const caseStatusLabels: Record<string, string> = {
    PENDING: "در انتظار شروع",
    IN_PROGRESS: "در حال تحقیق",
    DONE: "تکمیل‌شده",
    CANCELLED: "لغوشده",
    PROVINCE_INBOX: "پیشخوان استان",
    PROVINCE_WORKING: "در حال بررسی استان",
    PROVINCE_RETURNED: "برگشت به کارشناس استان",
    DIRECTOR_REVIEW: "در انتظار بررسی رئیس دفتر",
    SETAD_REVIEW: "در انتظار بررسی ستاد",
    PENDING_CHILD_RESULTS: "در انتظار پاسخ ارجاعات",
    CHILD_INBOX: "پیشخوان مقصد ارجاع",
    CHILD_WORKING: "در حال بررسی مقصد ارجاع",
    CHILD_REPLIED: "پاسخ ارسال‌شده",
    APPROVED: "تأیید نهایی",
};

function getPersianCaseStatus(row: any): string {
    const code = String(row?.StateCode ?? "").trim();
    if (!code) return "نامشخص";
    if (caseStatusLabels[code]) return caseStatusLabels[code];
    // Prefer the localized description, if an API response includes one.
    const serverLabel = String(row?.StateNameFarsi ?? row?.StateTitle ?? row?.StateName ?? "").trim();
    return /[\u0600-\u06FF]/.test(serverLabel) ? serverLabel : "وضعیت نامشخص";
}

const Page = ({ codeentekhabat, mahalreciver, erjastate, idValue }: PageProps) => {
    const token = getCookie("token") ?? "";

    const router = useRouter();

    const [MahalId, setMahalId] = useState("");
    const [IsMarkazShahrestan, setIsMarkazShahrestan] = useState(false);

    const user = useMeratUser();

    const rehydrated = true;

    const [selectedV2, setSelectedV2] = useState<any | null>(null);
    const [loadError, setLoadError] = useState("");

    const actions = [
        {
            icon: <ViewIcon size={16} />,
            colorClass: "bg-green-800",
            title: "نمایش پرونده",
            onClick: (row: any) => {
                // V2 referral identifiers must be routed directly to their own
                // authenticated case pages. The API enforces scope and write privileges.
                if ([60, 61].includes(Number(user.PostId))) {
                    router.push(`/v2/hoze?referralId=${encodeURIComponent(String(row.ErjaId))}`);
                    return;
                }
                if (Number(user.PostId) === 70) {
                    router.push(`/v2/shahrestan?referralId=${encodeURIComponent(String(row.ErjaId))}`);
                    return;
                }
                if ([51, 52, 53].includes(Number(user.PostId))) {
                    setSelectedV2(row);
                    return;
                }
                const encrypted = encryptText(String(row.ErjaId));
                const mahal = String(MahalId.trim());
                if (mahal.length == 1) {
                    router.push(`/ParvandehOstan/${encodeURIComponent(encrypted)}`);
                }
                if (mahal.length == 3) {
                    router.push(`/ParvandehOstan/${encodeURIComponent(encrypted)}`);
                }
                if (mahal?.length == 5 && IsMarkazShahrestan == true)
                    router.push(`/ParvandehHozeh/${encodeURIComponent(encrypted)}`);
                if (mahal?.length == 5 && IsMarkazShahrestan == false)
                    router.push(`/ParvandehShahrestan/${encodeURIComponent(encrypted)}`);
            },
        }
    ];

    const [data, setData] = useState<any[]>([]);
    const [page, setPage] = useState<number>(1);
    const [indexsorat, setindexsorat] = useState<number>(1);
    const [descsort, setdescsort] = useState<number>(1);
    const [totalRecord, setTotalRecord] = useState<number>(0);
    const [searchText, setSearchText] = useState<string>("");
    const sizePage = 10;

    const loadData = async (pageNumber: number, search: string = "") => {

        try {
            setLoadError("");
            if (Number(user.PostId) === 70) {
                const rows = await meratV2Request("/Api/TahghighV2/CountyInbox?page=1&pageSize=100");
                const normalized = rows.map((r, index) => ({
                    ...r,
                    Rdf: index + 1,
                    ErjaId: Number(r.CountyReferralId),
                    ShomarehParvandeh: r.ShomarehParvandeh ?? "—",
                    CodeMelli: r.CodeMelli ?? "—",
                    FirstName: r.FirstName ?? "—",
                    LastName: r.LastName ?? "—",
                    NamePedar: r.NamePedar ?? "—",
                    NameOstan: r.NameOstan ?? r.ProvinceName ?? "—",
                    NameHozeh: r.NameHozeh ?? "—",
                    CountErja: 0,
                    CountErjaMohaghegh: 0,
                    CountTahghigh_Karbarg: 0,
                    // Keep the workflow state explicit: Object spread from a generic
                    // V2Row does not add StateCode to TypeScript's inferred shape.
                    StateCode: String(r.StateCode ?? "").trim(),
                    CountyStatusLabel: getPersianCaseStatus(r),
                }));
                const visible = normalized.filter(r =>
                    (erjastate !== 2 || ["CHILD_INBOX", "CHILD_WORKING"].includes(String(r.StateCode))) &&
                    (erjastate !== 3 || r.StateCode === "CHILD_REPLIED") &&
                    (!search || Object.values(r).some(v => String(v ?? "").includes(search)))
                );
                setTotalRecord(visible.length);
                setData(visible.slice((pageNumber - 1) * sizePage, pageNumber * sizePage));
                return;
            }
            if ([60, 61].includes(Number(user.PostId)) && [1, 2, 3].includes(erjastate)) {
                // Use the V2 HOZE inbox for membership. The old legacy inbox
                // omits cases that still belong to this HOZE after a county reply.
                const v2 = await meratV2Request("/Api/TahghighV2/ChildInbox?page=1&pageSize=100");
                const legacyAll = await GetTahghighat(1, codeentekhabat,
                    user.Mahal, 1, 100, indexsorat, descsort, "", 1, user.UserId).catch(() => ({ data: [] }));
                const byId = new Map<number, Record<string, unknown>>((Array.isArray(legacyAll.data) ? legacyAll.data : [])
                    .map((r: Record<string, unknown>): [number, Record<string, unknown>] => [Number(r.ErjaId), r]));
                const visible = v2.map((r, index) => {
                    const id = Number(r.ReferralId);
                    const person = byId.get(id) || {};
                    return {
                        ...person, ...r, ErjaId: id, Rdf: index + 1,
                        ShomarehParvandeh: person.ShomarehParvandeh ?? r.ShomarehParvandeh,
                        FirstName: person.FirstName ?? r.FirstName ?? "—", LastName: person.LastName ?? r.LastName ?? "—",
                        NamePedar: person.NamePedar ?? r.NamePedar ?? "—", CodeMelli: person.CodeMelli ?? r.CodeMelli ?? "—",
                        NameOstan: person.NameOstan ?? r.NameOstan ?? "—", NameHozeh: person.NameHozeh ?? r.NameHozeh ?? "—",
                        StateCode: String(r.StateCode ?? "").trim(),
                    };
                }).filter(r => (erjastate === 1 || (erjastate === 2 ? ["CHILD_INBOX", "CHILD_WORKING"].includes(String(r.StateCode)) : r.StateCode === "CHILD_REPLIED"))
                   && (!search || Object.values(r).some(v => String(v ?? "").includes(search))));
                setTotalRecord(visible.length);
                setData(visible.slice((pageNumber - 1) * sizePage, pageNumber * sizePage));
                return;
            }
            const result = await GetTahghighat(erjastate, codeentekhabat
                , user.Mahal, pageNumber, sizePage, indexsorat, descsort, search, idValue, user.UserId
            );

            if (result.status === 401) {
                router.push("/Login");
                return;
            }
            if (result.status === 200 && Array.isArray(result.data)) {
                // Child referrals addressed to a different province are V2 records.
                // Keep the legacy provincial cases, but also list received and
                // returned V2 child cases in the province's inbox.
                if ([51,52].includes(Number(user.PostId)) && [1,2].includes(erjastate)) {
                    const childRows = await meratV2Request("/Api/TahghighV2/ChildInbox?page=1&pageSize=100").catch(() => []);
                    const extra = childRows.filter(r => String(r.ReceiverLevel) === "OSTAN")
                        .map((r,index) => ({
                            ...r, ErjaId: Number(r.ReferralId), Rdf: index+1,
                            ShomarehParvandeh: r.ShomarehParvandeh ?? "—",
                            FirstName: r.FirstName ?? "—", LastName: r.LastName ?? "—",
                            NamePedar: r.NamePedar ?? "—", CodeMelli: r.CodeMelli ?? "—",
                            NameOstan: r.NameOstan ?? "—", NameHozeh: r.NameHozeh ?? "—",
                            StateCode: String(r.StateCode ?? ""),
                            ReturnReason: r.ReturnReason ?? null,
                        }));
                    const ids = new Set(extra.map(r=>Number(r.ErjaId)));
                    const merged = [...extra, ...result.data.filter((r:any)=>!ids.has(Number(r.ErjaId)))];
                    setData(merged);
                    setTotalRecord(merged.length);
                } else {
                    setData(result.data);
                    setTotalRecord(result.data.length > 0 ? Number(result.data[0].TotalCount || 0) : 0);
                }
            } else {
                setData([]);
                setTotalRecord(0);
                setLoadError(result.error || "خطا در دریافت فهرست تحقیقات از سرور.");
            }
        } catch (err) {
            console.error(err);
            setData([]);
            setTotalRecord(0);
            setLoadError("ارتباط با سرور فهرست تحقیقات برقرار نشد.");
        }
    };


    useEffect(() => {

        if (!rehydrated) return;
        setMahalId(user.Mahal.toString() || "");
        const IsMarkaz = user.IsMarkazShahrestan;
        setIsMarkazShahrestan(Boolean(IsMarkaz));

        if (!user.UserId || !user.Mahal) return;
        void loadData(page, searchText);
    }, [user.UserId, user.Mahal, user.PostId, user.IsMarkazShahrestan,
        rehydrated, page, searchText, indexsorat, descsort,
        codeentekhabat, mahalreciver, erjastate, idValue]);

    useEffect(() => {
        setPage(1);
        setSelectedV2(null);
    }, [idValue]);

    const handleSortChange = (field: string, direction: "asc" | "desc") => {
        const sortIndexMap: Record<string, number> = {
            ShomarehParvandeh: 1,
            FirstName: 2,
            LastName: 3,
            NameHozeh: 4,
            NameOstan: 5,
        };

        const columnIndex = sortIndexMap[field] ?? 1;
        const sortDirection = direction === "asc" ? 1 : 2; // 1=ASC , 2=DESC

        setindexsorat(columnIndex);
        setdescsort(sortDirection);
        setPage(1);
    };


    return (
        <div className={`${styles.manageTable} bg-gray-100 rounded-b-xl`}>
            <div className="p-4">
                {loadError && (
                    <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                        {loadError}
                    </div>
                )}
                {data.some(r=>Boolean(r.ReturnReason)) &&
                  <div role="alert" dir="rtl" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                    <strong>پرونده‌های برگشتی برای اصلاح</strong>
                    {data.filter(r=>Boolean(r.ReturnReason)).map(r=><p key={String(r.ErjaId)} className="mt-2 whitespace-pre-wrap text-sm">
                      <b>ارجاع {String(r.ErjaId)}:</b> {String(r.ReturnReason)}
                    </p>)}
                  </div>}
                <CustomTable
                    title="📋 فهرست تحقیقات"
                    columns={[
                        { title: "ردیف", field: "Rdf", width: "60px" },
                        { title: "شماره ارجاع", field: "ErjaId", width: "100px" },
                        { title: "شماره پرونده", field: "ShomarehParvandeh", width: "150px" },
                        { title: "شماره ملی", field: "CodeMelli", width: "150px" },
                        { title: "نام", field: "FirstName" },
                        { title: "نام خانوادگی", field: "LastName" },
                        { title: "نام پدر", field: "NamePedar", width: "150px" },
                        { title: "نام استان", field: "NameOstan" },
                        { title: "نام حوزه", field: "NameHozeh", showTooltip: true, tooltipField: "NameHozeh" },
                        ...(Number(user.PostId) === 70 ? [{ title: "وضعیت", field: "CountyStatusLabel", width: "145px" }] : []),
                        { title: "ارجاع", field: "CountErja", width: "50px", showTooltip: true, tooltipField: "NameMahalReciver" },
                        { title: "محقق", field: "CountErjaMohaghegh", width: "50px" },
                        { title: "کاربرگ", field: "CountTahghigh_Karbarg", width: "50px" },
                    ]}
                    data={data}
                    totalRecord={totalRecord}
                    page={page}
                    recordsPerPage={sizePage}
                    search={searchText}
                    onPageChange={(newPage) => setPage(newPage)}
                    onSearch={(text) => {
                        setPage(1);
                        setSearchText(text);
                    }}
                    onSortChange={handleSortChange}
                    actions={actions}
                    rowClassName={(row, idx) =>
                        Boolean(row.ReturnReason) ? "bg-amber-50 hover:bg-amber-100" :
                        [51, 52, 53].includes(Number(user.PostId)) && Boolean(row.HasReceivedChildReply)
                            ? styles.receivedReplyRow :
                        [60, 61, 70].includes(Number(user.PostId)) && row.StateCode === "CHILD_REPLIED"
                            ? "bg-green-50 hover:bg-green-100"
                            : Number(row.ErjaLastState) === 2
                            ? "bg-green-100 hover:bg-green-300"
                            : Number(row.ErjaLastState) === 3
                                ? "bg-yellow-100 hover:bg-yellow-300"
                                : `${idx % 2 === 0 ? "bg-white" : "bg-gray-100"} hover:bg-gray-200`
                    }

                    headerActions={[
                        {
                            title: "گزارش تحقیقات",
                            icon: <List size={16} />,
                            className: "bg-indigo-700 hover:bg-indigo-600",
                            onClick: () => {
                                if (user.Mahal.toString().length == 1) {
                                    router.push("/Report");
                                }

                            },
                        },
                    ]}


                />
                {selectedV2 && (
                    <div className="research-modal-root" role="presentation">
                        <button type="button" className="research-modal-backdrop" aria-label="بستن مشخصات پرونده"
                            onClick={() => setSelectedV2(null)} />
                        <section className="research-modal-card" role="dialog" aria-modal="true"
                            aria-labelledby="research-v2-dialog-title" dir="rtl">
                            <header className="research-modal-header merat-modal-tone--confirm" id="research-v2-dialog-title">
                                مشخصات پرونده تحقیق
                            </header>
                            <div className="research-modal-body">
                                <p><strong>شماره ارجاع:</strong> {selectedV2.ErjaId}</p>
                                <p><strong>شماره پرونده:</strong> {selectedV2.ShomarehParvandeh}</p>
                                <p><strong>نام و نام خانوادگی:</strong> {[selectedV2.FirstName, selectedV2.LastName].filter(Boolean).join(" ") || "—"}</p>
                                <p><strong>نام پدر:</strong> {selectedV2.NamePedar || "—"}</p>
                                <p><strong>سال تولد:</strong> {String(selectedV2.SalTavalod ?? "").trim() || "—"}</p>
                                <p><strong>استان:</strong> {selectedV2.NameOstan || "—"}</p>
                                <p><strong>حوزه:</strong> {selectedV2.NameHozeh || "—"}</p>
                                <p><strong>وضعیت پرونده:</strong> <span className={styles.statusLabel}>{getPersianCaseStatus(selectedV2)}</span></p>
                                <div className="research-modal-actions">
                                    <button type="button" className="research-button secondary"
                                        onClick={() => setSelectedV2(null)}>بستن</button>
                                    {[51, 52].includes(Number(user.PostId)) && (
                                        <button type="button" className="research-button primary"
                                            onClick={() => router.push(`/ParvandehOstanV2/${encodeURIComponent(String(selectedV2.ErjaId))}`)}>
                                            ورود به جزئیات و اقدامات استان
                                        </button>
                                    )}
                                    {[60, 61].includes(Number(user.PostId)) && (
                                        <button type="button" className="research-button primary"
                                            onClick={() => router.push(`/v2/hoze?referralId=${encodeURIComponent(String(selectedV2.ErjaId))}`)}>
                                            ورود به جزئیات و اقدامات حوزه
                                        </button>
                                    )}
                                    {Number(user.PostId) === 70 && (
                                        <button type="button" className="research-button primary"
                                            onClick={() => router.push(`/v2/shahrestan?referralId=${encodeURIComponent(String(selectedV2.ErjaId))}`)}>
                                            ورود به جزئیات و اقدامات شهرستان
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Page;
