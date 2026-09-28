import { useMeratUser } from "@/lib/useMeratUser";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GetSokonats } from '@/services/ApiServiceDavtalab'
import { Pencil } from "@/component/ResearchIcons";

interface MoshakhastProps {
    shomarehparvandeh: number;
}

interface SokonatData {
    ID?: number;
    AzSal?: string;
    TaSal?: string;
    Neshani?: string;
    CodePosti?: string;
    PhoneNumber?: string;
    Vazeyat?: number;
    Vazeyat_NameFarsi?: string;
}

const Moshakhast = ({ shomarehparvandeh }: MoshakhastProps) => {
    const user = useMeratUser();
    const router = useRouter();

    const [Sokonat, setSokonat] = useState<SokonatData[] | null>(null);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await GetSokonats(shomarehparvandeh, user.UserId);
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
                    <h2 className="text-lg font-bold titr">مشخصات محل سکونت</h2>
                </div>

                {loading ? (
                    <div className="text-center p-4">در حال بارگیری...</div>
                ) : (
                    <table className="border min-w-full text-sm text-right">
                        <thead className="text-gray-800 text-center">
                            <tr>
                                <th className="p-1 border-l border-gray-300 w-[3%]">#</th>
                                <th className="p-1 border-l border-gray-300">آدرس</th>
                                <th className="p-1 border-l border-gray-300 w-[5%]">تلفن</th>
                                <th className="p-1 border-l border-gray-300 w-[17%]">از سال - تا سال</th>
                                <th className="p-1 border-l border-gray-300 w-[7%]">وضعیت</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Sokonat != null ? (
                                Sokonat.map((item, index) => (
                                    <tr
                                        key={item.ID}
                                        className={`cursor-pointer hover:bg-sky-200 transition-all duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                                    >
                                        <td className="py-1 px-2  text-[16px] border-t border-gray-200 text-gray-700 font-medium text-center">{index + 1}</td>
                                        <td className="py-1 px-2  text-[16px] border-t border-gray-200 text-gray-600 text-right">{item.Neshani || "-"}</td>
                                        <td className="text-center py-1 px-2 border-t border-gray-200 text-gray-700 text-[16px]">
                                            {item.PhoneNumber}
                                        </td>
                                        <td className="text-center py-1 px-2 text-[16px] border-t border-gray-200 text-gray-700">{item.AzSal} {item.TaSal}</td>
                                        <td className={`text-center py-1 px-2 text-[16px] border-t border-gray-200 text-gray-700 ${item.Vazeyat === 1 ? 'text-green-700' : item.Vazeyat === 2 ? 'text-red-500' : ''
                                            }`}>
                                            {item.Vazeyat_NameFarsi}
                                        </td>
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