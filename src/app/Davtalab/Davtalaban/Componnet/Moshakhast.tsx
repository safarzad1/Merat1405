import { useMeratUser } from "@/lib/useMeratUser";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GetDavtalabByParvandeh } from '@/services/ApiServiceDavtalab';

interface MoshakhastProps {
    shomarehparvandeh: number;
}

interface DavtalabData {
    FirstName?: string;
    LastName?: string;
    NameMostar?: string;
    NamePedar?: string;
    SalTavalod?: string;
    CodeMelli?: string;
    Din_NameFarsi?: string;
    Mazhab_NameFarsi?: string;
    Shoghl?: string;
    Tahsilat?: string;
    Sabeghe?: number;
}

const Moshakhast = ({ shomarehparvandeh }: MoshakhastProps) => {
    const user = useMeratUser();
    const router = useRouter();

    const [Davtalab, setDavtalab] = useState<DavtalabData | null>(null);

    const loadData = async () => {
        try {
            const result: any = await GetDavtalabByParvandeh(shomarehparvandeh);

            if (result?.data && result.data.length > 0) {
                setDavtalab(result.data[0]);
            }

            if (result?.status === 401) {
                router.push("/Login");
            }
        } catch (error) {
            console.error("خطا در دریافت اطلاعات:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, [shomarehparvandeh]); // ✅ وابستگی صحیح

    const renderDigits = (value: string | number | undefined, widthClass: string = "w-6") => {
        if (!value) return <span className="text-gray-400">-</span>;
        return String(value).split("").map((num, idx) => (
            <span
                key={`${value}-${idx}`} // ✅ استفاده از کلید یکتا
                className={`my-2 ${widthClass} h-8 flex items-center justify-center border border-black rounded-md`}
            >
                {num}
            </span>
        ));
    };

    return (
        <>
            <div className="flex flex-wrap bnaznin text-[20px] px-2 gap-y-2 items-center">
                <div className="flex items-center mx-2">
                    <span>نام :</span>
                    <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0 inline-flex items-center">
                        {Davtalab?.FirstName || "-"}
                    </span>
                </div>

                <div className="flex items-center mx-2">
                    <span>نام خانوادگی :</span>
                    <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0 inline-flex items-center">
                        {Davtalab?.LastName || "-"}
                    </span>
                </div>

                <div className="flex items-center mx-2">
                    <span>نام مشهور / مستعار :</span>
                    <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0 inline-flex items-center">
                        {Davtalab?.NameMostar || "-"}
                    </span>
                </div>

                <div className="flex items-center mx-2">
                    <span>نام پدر :</span>
                    <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0 inline-flex items-center">
                        {Davtalab?.NamePedar || "-"}
                    </span>
                </div>

                <div className="flex items-center mx-2">
                    <span> سال تولد :</span>
                    <div className="flex gap-0.5 text-[18px] mr-2" dir="ltr">
                        {renderDigits(Davtalab?.SalTavalod)}
                    </div>
                </div>

                <div className="flex items-center mx-1">
                    <span>دین - مذهب :</span>
                    <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                        {Davtalab?.Din_NameFarsi || "-"} / {Davtalab?.Mazhab_NameFarsi || "-"}
                    </span>
                </div>


            </div>

            <div className="flex flex-wrap bnaznin text-[20px] px-2 gap-y-2 mt-3">
                <div className="flex items-center mx-2">
                    <span>شماره ملی :</span>
                    <div className="flex gap-0.5 text-[20px] mr-1" dir="ltr">
                        {renderDigits(Davtalab?.CodeMelli, "w-5")}
                    </div>
                </div>
                <div className="flex items-center mx-1">
                    <span>تحصیلات :</span>
                    <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                        {Davtalab?.Tahsilat || "-"}
                    </span>
                </div>


                <div className="flex items-center mx-1">
                    <span>شغل :</span>
                    <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                        {Davtalab?.Shoghl || "-"}
                    </span>
                </div>

                <div className="flex items-center mx-1">
                    <span>سابقه داوطلبی :</span>
                    <span className="mx-2 bg-gray-200 rounded-2xl px-1.5 py-0 inline-flex items-center">
                        {Davtalab?.Sabeghe ?? "-"}
                    </span>
                </div>
            </div>
        </>
    );
};

export default Moshakhast;