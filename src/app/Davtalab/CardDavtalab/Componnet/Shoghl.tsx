import { useMeratUser } from "@/lib/useMeratUser";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GetSabegheKari } from '@/services/ApiServiceDavtalab'
import { Pencil } from "@/component/ResearchIcons";

interface MoshakhastProps {
    shomarehparvandeh: number;
}

interface ShoghlData {
    ID?: number;
    NAM_SAZMAN?: string;
    SHOGHL?: string;
    AZ_SAL?:number,
    TA_SAL?:number,
    ADDR?: string;
    TEL?: string;    
}

const Moshakhast = ({ shomarehparvandeh }: MoshakhastProps) => {
    const user = useMeratUser();
    const router = useRouter();

    const [Sokonat, setSokonat] = useState<ShoghlData[] | null>(null);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await GetSabegheKari(shomarehparvandeh, user.UserId);
            setSokonat(result.data);
            if (result.status === 401) {
                router.push("/Login");
            }
        } catch (err) {
            console.error("❌ خطا در رمزگشایی شناسه:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [shomarehparvandeh]);

    return (
        <>
            <div className="flex flex-col justify-center w-full border-2 border-black bg-gray-200 mb-1 rounded-xl shadow-md">
                <div className="flex justify-between items-center p-2 border-b border-gray-300">
                    <h2 className="text-lg font-bold titr">مشخصات محل شغل</h2>
                </div>

                {loading ? (
                    <div className="text-center p-4">در حال بارگیری...</div>
                ) : (
                    <table className="border min-w-full text-sm text-right">
                        <thead className="text-gray-800 text-center">
                            <tr>
                                <th className="p-1 border-l border-gray-300 w-[3%]">#</th>
                                <th className="p-1 border-l border-gray-300 w-[15%]">نام سازمان</th>
                                <th className="p-1 border-l border-gray-300 w-[15%]">  شغل</th>
                                <th className="p-1 border-l border-gray-300 w-[5%]">  از سال</th>
                                <th className="p-1 border-l border-gray-300 w-[5%]">  تا سال</th>
                                <th className="p-1 border-l border-gray-300 w-[15%]"> آدرس </th>
                                <th className="p-1 border-l border-gray-300 w-[15%]">  تلفن</th>
                                
                                {/* <th className="p-1 border-l border-gray-300">آدرس</th> */}

                            </tr>
                        </thead>
                        <tbody>
                            {Sokonat != null ? (
                                Sokonat.map((item, index) => (
                                    <tr
                                        key={item.ID}
                                        className={`cursor-pointer hover:bg-sky-200 transition-all duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                                    >
                                        <td className="py-1 text-[16px]px-2 border-t border-gray-200 text-gray-700 font-medium text-center">{index + 1}</td>
                                        <td className="py-1 text-[16px] px-2 border-t border-gray-200 text-gray-600 text-right">{item.NAM_SAZMAN || "-"}</td>
                                        <td className="text-center text-[16px] py-1 px-2 border-t border-gray-200 text-gray-700">
                                            {item.SHOGHL}
                                        </td>
                                        <td className="text-center text-[16px] py-1 px-2 border-t border-gray-200 text-gray-700">{item.AZ_SAL} </td>
                                        <td className="text-center text-[16px] py-1 px-2 border-t border-gray-200 text-gray-700">{item.TA_SAL} </td>
                                        <td className="text-center text-[16px]py-1 px-2 border-t border-gray-200 text-gray-700">{item.ADDR} </td>
                                        <td className="text-center text-[16px] py-1 px-2 border-t border-gray-200 text-gray-700">{item.TEL} </td>

                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="text-center text-gray-500 p-6 border-t text-base">
                                        هیچ داده‌ای یافت نشد.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}

export default Moshakhast;