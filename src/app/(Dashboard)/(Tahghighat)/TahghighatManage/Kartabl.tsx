"use client";

import { useState, useEffect, use } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { useRouter } from "next/navigation";
import CustomTable from "@/component/DataTable/CustomTable1";
import { List, ListChecks, Plus, User2Icon, ViewIcon } from "@/component/ResearchIcons";
import { encryptText } from "@/lib/cryptoUtil";
import { GetTahghighat } from "@/services/ApiService";
import { getCookie } from "@/lib/cookies";

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

const Page = ({ codeentekhabat, mahalreciver, erjastate, idValue }: PageProps) => {
    const token = getCookie("token") ?? "";

    const router = useRouter();

    const [MahalId, setMahalId] = useState("");
    const [IsMarkazShahrestan, setIsMarkazShahrestan] = useState(false);

    const user = useMeratUser();

    const rehydrated = true;

    const actions = [
        {
            icon: <ViewIcon size={16} />,
            colorClass: "bg-green-800",
            title: "نمایش پرونده",
            onClick: (row: any) => {
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


            const result = await GetTahghighat(erjastate, codeentekhabat
                , user.Mahal, pageNumber, 10, 1, 1, search, idValue, user.UserId
            );

            if (result.status === 401) {
                router.push("/Login");
            }

            else if (result.status == 200) {
                setData(result.data || []);
                setTotalRecord(result.data.length > 0 ? result.data[0].TotalCount : 0);

            } else {
                setData([]);
            }
        } catch (err) {
            console.error(err);
            setData([]);
        }
    };


    useEffect(() => {

        if (!rehydrated) return;
        setMahalId(user.Mahal.toString() || "");
        const IsMarkaz = user.IsMarkazShahrestan;
        setIsMarkazShahrestan(Boolean(IsMarkaz));

        loadData(page, searchText);
    }, [user, rehydrated, page, searchText, indexsorat, descsort, codeentekhabat, mahalreciver, erjastate]);

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
        <div className="bg-gray-100 rounded-b-xl">
            <div className="p-4">
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
                        Number(row.ErjaLastState) === 2
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
            </div>
        </div>
    );
};

export default Page;
