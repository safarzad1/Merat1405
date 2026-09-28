"use client";

import { useParams } from "next/navigation";
import { useMeratUser } from "@/lib/useMeratUser";
import { use, useEffect, useState } from "react";
import { decryptText } from "@/lib/cryptoUtil";

import Breadcrumbkhabar from '@/component/Breadcrumb/Breadcrumb'
import { Home, Newspaper, CardSimIcon, PlusCircle, User, Check, ArrowBigLeft, CheckCircle } from "@/component/ResearchIcons";
import { AlertTriangle } from "@/component/ResearchIcons";
import EjraBeMohaghegh from '../../Componnet/EjraBeMohaghegh'
import ErjaMohaghegh from '../../Componnet/ErjaMohaghegh'
import { useConfirm } from "@/Utils/ConfirmModalContext";
import PersianDateInput from '@/component/Objects/InputPersianDatePicker'
import { useRouter } from "next/navigation";
import { Update_ErjaParvandeh, ErjaBeMohaghegh, GetErjaByID } from '@/services/ApiService';
import DescriptionWithModal from '../../Componnet/DescriptionWithModal';
import { GetTahghighByID } from '@/services/ApiService'
import TextArea1 from '@/component/Objects/Textarea1'

export default function ParvandehPage() {
    const { showConfirm } = useConfirm();
    const [erjaId, setErjaId] = useState(0);
    const [erjaParentId, setErjaParentId] = useState(0);
    const [CodeMohaghegh, setCodeMohaghegh] = useState<number | null>(null);
    const [tarikh, settarikh] = useState<string | null>(null);

    const [tozihat, setTozihat] = useState("");
    const [errorTozihat, seterrorTozihat] = useState(false);
    const [ModalOpenErjaBeMohaghegh, setModalOpenErjaBeMohaghegh] = useState(false);
    const [ModalOpenErsalParvandeh, setModalOpenErsalParvandeh] = useState(false);
    const [isOpen2, setIsOpen2] = useState(false);
    const router = useRouter();
    const params = useParams();
    const [JambandiShahrestan, setJambandiShahrestan] = useState<string>("");
    const [onvanparvandeh, setonvanparvandeh] = useState<string>("");
    const [data, setData] = useState<any[]>([]);
    const [refreshKeyErjaMohaghegh, setrefreshKeyErjaMohaghegh] = useState(0);
    const [errorMohaghegh, setErrorMohaghegh] = useState<boolean>(false);
    const [errorTarikh, seterrorTarikh] = useState<boolean>(false);


    const SendParvandeh = async (erjaid: number, tozihat: string, Userid: number) => {

        if (!tozihat) {
            seterrorTozihat(true);
            return;
        }

        const result = await Update_ErjaParvandeh(erjaid, true, 2, tozihat, Userid);
        if (result.status == 200) {
            router.push("/TahghighatManage");
        }
    }

    const loadData = async (erjaid: number) => {
        try {
            const result = await GetTahghighByID(erjaid, 0, 0);
            if (result.status == 200) {
                console.log(result);
                setonvanparvandeh("پرونده " + result.data[0].FirstName + " " + result.data[0].LastName + " " + " حوزه  " + result.data[0].NameOstan + " - " + result.data[0].NameHozeh);
                setData(result.data || []);
                setErjaParentId(result.data[0].ErjaParentId);

            } else if (result.status === 401) {
                router.push("/Login");
            } else {
                setData([]);
            }
        } catch (err) {
            console.error(err);
            setData([]);
        }
    };


    const user = useMeratUser();

    useEffect(() => {


        setCodeMohaghegh(0);
        setErrorMohaghegh(true);
        seterrorTarikh(true);
        const keyData = params?.KeyData as string;
        if (keyData) {
            try {
                const erjaId = Number(decryptText(decodeURIComponent(keyData)));
                setErjaId(erjaId);
                loadData(erjaId);

            } catch (err) {
                console.error("❌ خطا در رمزگشایی شناسه:", err);
            }
        }
    }, [params]);

    const saveKarbarg = async (isInsert: number, userid: number) => {

        if (!CodeMohaghegh || CodeMohaghegh === 0) {
            setErrorMohaghegh(true);
            return;
        }

        if (!tarikh) {
            seterrorTarikh(true);
            return;
        }

        seterrorTarikh(false);
        setErrorMohaghegh(false);

        const result = await ErjaBeMohaghegh(erjaId, erjaParentId, CodeMohaghegh, tarikh, tozihat, userid, isInsert);

        if (result.data[0].InSuccess == true) {
            setModalOpenErjaBeMohaghegh(false);
            setrefreshKeyErjaMohaghegh(prev => prev + 1);
            setCodeMohaghegh(0);
            settarikh("");
        }

        else if (result.data[0].IsSuccess == false && result.data[0].Status == 201) {
            showConfirm(
                "آیا از ارجاع مجدد اطمینان دارید؟",
                () => saveKarbarg(1, user.UserId),
                "هشدار!",
                "warning"
            )
        }

    }


    return (
        <>
            <div className="bg-sky-200 rounded py-2 px-10">
                <Breadcrumbkhabar
                    items={[
                        { label: "داشبورد", href: "/Dashboard", icon: <Home className="w-4 h-4" /> },
                        { label: "مدیریت تحقیقات", href: "/TahghighatManage", icon: <Newspaper className="w-4 h-4" /> },
                        { label: onvanparvandeh, icon: <CardSimIcon className="w-4 h-4" /> },
                    ]}
                />
            </div>

            <div className="bg-white m-1 py-2 px-2 flex flex-col md:flex-row gap-4 rounded-b-xl">

                <div className="bg-white rounded-b-xl shadow w-full flex flex-col gap-2">


                    {data.length > 0 && (
                        <div className={`h-12 p-2 rounded-lg shadow w-full items-center gap-4"
              ${data[0].IsDone === true ? "bg-green-100" : "bg-gray-200"}
                           `}
                        >
                            <div className="flex gap-5 whitespace-nowrap items-center justify-between">

                                <div className="flex gap-5">
                                    <p>
                                        <span className="font-semibold text-blue-600 text-[13px]">ارسال کننده :</span>
                                        <span className="text-gray-700 text-[15px] mr-2">{data[0].MahalSender_NameFarsi}</span>
                                    </p>

                                    <div>
                                        <span className="font-semibold text-blue-600 text-[13px]">توضیحات :</span>
                                        <DescriptionWithModal status="info" description={data[0].Description} />
                                    </div>
                                    <p>
                                        <span className="font-semibold text-blue-600 text-[13px]">زمان ارجاع :</span>
                                        <span className="text-gray-700 text-[14px] mr-2">{data[0].CreateDateTime}</span>
                                    </p>
                                </div>

                                {/* سمت چپ: دکمه‌ها */}
                                {(data[0].IsDone == false && data[0].CountErjaMohaghegh == data[0].CountErjaMohagheghDone &&
                                    data[0].CountErjaMohaghegh > 0 && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setModalOpenErsalParvandeh(true) }
                                                }
                                                className="flex items-center gap-1 mx-3 p-2 px-6 rounded-2xl bg-green-700 text-white shadow hover:bg-green-800 transition-colors cursor-pointer">
                                                <Check className="w-4 h-4" />
                                                ارسال پرونده
                                            </button>

                                        </div>

                                    ))}

                            </div>
                        </div>
                    )}


                    {/* ارجاع به محققین */}

                    {data.length > 0 && (
                        <div className="mx-5 border rounded-xl shadow-sm bg-slate-100">
                            <div
                                className="flex items-center justify-between p-3 select-none hover:bg-gray-100 hover:rounded-xl transition-colors"

                            >
                                {/* سمت راست: عنوان و شمارنده‌ها */}
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="text-purple-600 w-5 h-5" />
                                    <h2
                                        onClick={() => setIsOpen2(!isOpen2)}
                                        className="cursor-pointer  Roya text-[18px] text-purple-800 font-semibold flex items-center gap-2">
                                        ارجاع به محقق
                                        <span className="bg-gray-400 text-white rounded-full w-7 h-7 flex items-center justify-center">
                                            {data[0].CountErjaMohaghegh || 0}
                                        </span>
                                        <span className="bg-green-700 text-white rounded-full w-7 h-7 flex items-center justify-center">
                                            {data[0].CountErjaMohagheghDone || 0}
                                        </span>
                                    </h2>
                                </div>

                                {/* سمت چپ: دکمه‌ها */}
                                {(data[0].IsDone == false && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setModalOpenErjaBeMohaghegh(true) }
                                            }
                                            className="flex items-center gap-1 p-1 px-4 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors text-sm cursor-pointer">
                                            <PlusCircle className="w-4 h-4" />
                                            ارجاع به محقق
                                        </button>

                                    </div>

                                ))}


                            </div>

                            {/* محتوای بازشونده */}
                            {data.length > 0 && (
                                <div className="border-t">
                                    <div className={isOpen2 ? "block" : "hidden"}>
                                        <ErjaMohaghegh
                                            erjaId={data[0].ErjaId}
                                            refreshKey={refreshKeyErjaMohaghegh}   // 👈 سیگنال رفرش
                                            onChangeCountMohaghegh={(countTotal) => {
                                                setData(prev => {
                                                    const nd = [...prev];
                                                    nd[0] = { ...nd[0], CountErjaMohaghegh: countTotal };
                                                    return nd;
                                                });
                                            }}
                                            onChangeCountJambandi={(countDone) => {
                                                setData(prev => {
                                                    const nd = [...prev];
                                                    nd[0] = { ...nd[0], CountErjaMohagheghDone: countDone };
                                                    return nd;
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                            )}



                        </div>
                    )}


                </div>

            </div>




            {/* مودال افزودن آیتم */}
            {data.length > 0 && ModalOpenErjaBeMohaghegh && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* پس‌زمینه نیمه شفاف */}
                    <div
                        className="absolute inset-0 bg-black opacity-40"
                        onClick={() => setModalOpenErjaBeMohaghegh(false)}
                    ></div>

                    {/* محتوای مودال */}
                    <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-96 relative">
                        <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                            <h2 className="text-lg font-bold">افزودن ارجاع جدید</h2>
                        </div>
                        <hr className="mb-3 text-blue-800" />

                        <EjraBeMohaghegh
                            codeEntekhabat={31201}
                            label="محقق"
                            mahal={data[0].MahalReciver}
                            noeHamkari={2}
                            vije={1}
                            onSelect={(info) => {
                                console.log("انتخاب شد:", info);
                                setCodeMohaghegh(info ? info.id : null);
                                setErrorMohaghegh(false);
                            }}
                            error={errorMohaghegh}
                            errorMessage={errorMohaghegh ? "لطفاً محقق را انتخاب کنید" : ""}
                        />

                        <div className="">
                            <PersianDateInput
                                label="مهلت انجام"
                                // value={tarikh ?? undefined}
                                allowPastDates={false}
                                onChange={(v: any) => {
                                    settarikh(v);
                                    seterrorTarikh(false);
                                }
                                }
                                error={errorTarikh}
                                errorMessage={errorTarikh ? "لطفاً تاریخ را انتخاب کنید" : ""} // ✅ پیام خطا
                            />
                        </div>


                        <textarea
                            className="text-[15px] w-full h-24 border border-gray-300 rounded p-2 mb-2 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                            placeholder="توضیحات ارجاع پرونده "
                            value={tozihat}
                            onChange={(e: any) => setTozihat(e.target.value)}
                        />

                        {/* دکمه‌ها */}
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                onClick={() => setModalOpenErjaBeMohaghegh(false)}
                            >
                                انصراف
                            </button>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer"
                                onClick={() => (saveKarbarg(0, user.UserId))}
                            >
                                تایید
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* مودال افزودن آیتم */}
            {data.length > 0 && ModalOpenErsalParvandeh && (
                <div className="fixed inset-0 z-50 flex items-start justify-center mt-20">
                    {/* پس‌زمینه نیمه شفاف */}
                    <div
                        className="absolute inset-0 bg-black opacity-40"
                        onClick={() => setModalOpenErsalParvandeh(false)}
                    ></div>

                    {/* محتوای مودال */}
                    <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[600px] relative">
                        <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                            <h2 className="text-lg font-bold">ارسال پرونده</h2>
                        </div>
                        <hr className="mb-3 text-blue-800" />
                        {/* <span className="text-purple-800"></span> */}

                        <TextArea1
                            height="h-90"
                            justify={true}
                            label="جمع بندی تحقیق :"
                            placeholder="توضیحات مورد نظر را وارد کنید"
                            value={tozihat}
                            onChange={(e: any) => setTozihat(e.target.value)}
                            maxLength={3000}
                            onlyNumber={false}   // فقط عدد
                            error={errorTozihat}
                            errorMessage={errorTozihat ? "این فیلد اجباری است" : ""}
                        />

                        {/* <textarea
                            className="text-[15px] mt-2 p-2 mb-0  w-full h-84 border border-gray-300 rounded resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                            placeholder="توضیحات ارجاع پرونده "
                            value={tozihat}
                            onChange={(e: any) => setTozihat(e.target.value)}
                        /> */}

                        {/* دکمه‌ها */}
                        <div className="flex justify-end gap-2 mt-3">
                            <button
                                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                onClick={() => setModalOpenErsalParvandeh(false)}
                            >
                                انصراف
                            </button>


                            <button
                                className="flex gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl cursor-pointer"
                                onClick={() => (SendParvandeh(erjaId, tozihat, user.UserId))}
                            >
                                تایید جمعبندی
                                <CheckCircle />

                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}
