"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CustomTable from "@/component/DataTable/CustomTable1";
import { Plus } from "@/component/ResearchIcons";

const Page = () => {

    const actions = [
        {
            icon: <Plus size={16} />,
            colorClass: "bg-blue-500",
            title: "ارجاع جدید",
            onClick: (row: any) => alert(`مشاهده: ${row.name}`),
        }
        // ,
        // {
        //     icon: <Edit size={16} />,
        //     colorClass: "bg-yellow-500",
        //     title: "ویرایش",
        //     onClick: (row: any) => alert(`ویرایش: ${row.code}`),
        // },
        // {
        //     icon: <Trash2 size={16} />,
        //     colorClass: "bg-red-500",
        //     title: "حذف",
        //     onClick: (row: any) => alert(`حذف ${row.name}`),
        // },
    ];


    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [page, setPage] = useState<number>(1);
    const [indexsorat, setindexsorat] = useState<number>(1);
    const [descsort, setdescsort] = useState<number>(1);
    const [totalRecord, setTotalRecord] = useState<number>(0);
    const [searchText, setSearchText] = useState<string>("");
    const sizePage = 10;

    const loadData = async (pageNumber: number, search: string = "") => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/Login");
                return;
            }

            const res = await fetch("/Api/Tahghigh/GetListTahghighat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    page: pageNumber,
                    sizepage: sizePage,
                    search: search,
                    indexsort: indexsorat,
                    ascdesc: descsort,
                }),
            });

            const result = await res.json();

            if (res.ok) {
                setData(result.data || []);
                setTotalRecord(result.data.length > 0 ? result.data[0].TotalCount : 0);
            } else if (res.status === 401) {
                router.push("/Login");
            } else {
                setData([]);
            }
        } catch (err) {
            console.error(err);
            setData([]);
        }
    };

    useEffect(() => {
        loadData(page, searchText);

    }, [page ?? 1, searchText ?? "", indexsorat ?? 1, descsort ?? 1]);


    const handleSortChange = (field: string, direction: "asc" | "desc") => {
        const sortIndexMap: Record<string, number> = {
            IDAmval: 1,
            OnvanAghlam: 2,
            UserName: 3,
            UserNameOld: 4,
            CodeRahgiri: 5,
        };

        const columnIndex = sortIndexMap[field] ?? 1;
        const sortDirection = direction === "asc" ? 1 : 2; // 1=ASC , 2=DESC

        setindexsorat(columnIndex);
        setdescsort(sortDirection);
        setPage(1); // برگردد به صفحه اول
    };

    return (
        <div className="bg-gray-100 mt-1 mx-1 rounded-b-xl">

            <div className="p-4">
                <CustomTable
                    title="📋 فهرست تحقیقات"
                    columns={[
                        { title: "ردیف", field: "Rdf", width: "70px" },
                        { title: "شماره تحقیق", field: "IDTahghigh", width: "150px" },
                        { title: "شماره پرونده", field: "ShomarehParvandeh", width: "150px" },
                        { title: "نام", field: "FirstName" },
                        { title: "نام خانوادگی", field: "LastName" },
                        { title: "نام حوزه", field: "NameHozeh" },
                        { title: "نام استان", field: "NameOstan" },
                        { title: "تعداد ارجاع", field: "CountErja", width: "120px" },
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
                />
            </div>
        </div>
    );
};

export default Page;
