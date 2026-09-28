"use client";

import { useParams } from "next/navigation";
import { useMeratUser } from "@/lib/useMeratUser";
import { useEffect, useState, useRef } from "react";
import { decryptText } from "@/lib/cryptoUtil";
import Breadcrumbkhabar from '@/component/Breadcrumb/Breadcrumb'
import { Home, Newspaper, CardSimIcon, PlusCircle, Check, CheckCircle, Download, X } from "@/component/ResearchIcons";
import { AlertTriangle } from "@/component/ResearchIcons";
import DescriptionWithModal from '../../Componnet/DescriptionWithModal';
import ErjaHozeh from '../../Componnet/ErjaHozeh'
import ModalEjraBeMohaghegh from '../../Componnet/EjraBeMohaghegh'
import ErjaMohaghegh from '../../Componnet/ErjaMohaghegh'
import { useConfirm } from "@/Utils/ConfirmModalContext";
import InputUserDropdown from '@/component/Objects/DropDownCitys'
import PersianDateInput from '@/component/Objects/InputPersianDatePicker'
import { useRouter } from "next/navigation";
import { ErjaBeMohaghegh } from '@/services/ApiService';
import { GetTahghighByID } from '@/services/ApiService'
import domtoimage from '@/lib/domToImageCompat';
import { v4 as uuidv4 } from "uuid";
import { GetCityFare, Update_ErjaParvandeh, GetJambandiForHozeh,GetErjaByID } from "@/services/ApiService";
import { AddKarbargTahghighDavtalab, GetKarbargDavtalabByShomareh } from '@/services/ApiServiceShorayeTahghigh'
import RichTextEditor from '@/component/Tiptap'
import { GetFileNamePic } from '@/services/ApiServiceNameha'
import { showToast } from "@/component/CustomToast";

export default function ParvandehPage() {
    const { showConfirm } = useConfirm();
    const [erjaId, setErjaId] = useState(0);
    const [erjaParentId, setErjaParentId] = useState(0);
    const [CityMarkaz, setCityMarkaz] = useState<number | null>(null);
    const [CodeMohaghegh, setCodeMohaghegh] = useState<number | null>(null);
    const [tarikh, settarikh] = useState<string | null>(null);
    const [ModalOpenErsalParvandeh, setModalOpenErsalParvandeh] = useState(false);
    const [Mahal, SetMahal] = useState(0);
    const [UserId, SetUserId] = useState(0);
    const [tozihat, setTozihat] = useState("");
    const [ModalOpenErjaBeHozeh, setModalOpenErjaBeHozeh] = useState(false);
    const [ModalOpenErjaBeMohaghegh, setModalOpenErjaBeMohaghegh] = useState(false);
    const [ModalOpenStatus, setModalOpenStatus] = useState(false);
    const [isOpen1, setIsOpen1] = useState(false);
    const [isOpen2, setIsOpen2] = useState(false);

      const [NameOstan, setNameOstan] = useState<string>("");
  const [NameHozeh, setNameHozeh] = useState<string>("");

    const router = useRouter();
    const params = useParams();

      const [Davtalab, setDavtalab] = useState<DavtalabData | null>(null);


    const [JambandiForHozeh, setJambandiForHozeh] = useState<string>("");
    const [onvanparvandeh, setonvanparvandeh] = useState<string>("");
    const [data, setData] = useState<any[]>([]);
    const [refreshKeyErjaShahrestan, setrefreshKeyErjaShahrestan] = useState(0);
    const [refreshKeyErjaMohaghegh, setrefreshKeyErjaMohaghegh] = useState(0);
    const [countShahr, setCountShahr] = useState(0);
    const [errorMohaghegh, setErrorMohaghegh] = useState<boolean>(false);
    const [errorTarikh, seterrorTarikh] = useState<boolean>(false);
    const [FileName, setFileName] = useState("");
  const [ModalOpenKargroupMosahebe, setModalOpenKargroupMosahebe] = useState(false);

  const [SoalatParvandeh, setSoalatParvandeh] = useState<string>("");
  const [PasokhParvandeh, setPasokhParvandeh] = useState<string>("");
  const [Manabe1, setManabe1] = useState<string>("");
  const [Manabe2, setManabe2] = useState<string>("");
  const [Manabe3, setManabe3] = useState<string>("");
  const [Manabe4, setManabe4] = useState<string>("");
  const [Manabe5, setManabe5] = useState<string>("");
  const [Manabe6, setManabe6] = useState<string>("");
  const [TozihatMohaghegh, setTozihatMohaghegh] = useState<string>("");
  const [PeyvastDavtalab, setPeyvastDavtalab] = useState<string>("");


    const PeyvastBoxRef = useRef<HTMLDivElement | null>(null);
  const SoalatBoxRef = useRef<HTMLDivElement | null>(null);
  const PasokhBoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe1JadidBoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe2JadidBoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe3JadidBoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe4JadidBoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe5JadidBoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe6JadidBoxRef = useRef<HTMLDivElement | null>(null);
  const TozhatMohagheghBoxRef = useRef<HTMLDivElement | null>(null);
  const jambandiBoxRef = useRef<HTMLDivElement | null>(null);

  const LoadOneErja = async (ErjaId: number) => {

    const result = await GetErjaByID(ErjaId);

    if (result.data.length > 0) {
      setNameHozeh(result.data[0].NameHozeh)
      setNameOstan(result.data[0].NameOstan)
      setDavtalab(result.data[0]);
      //setModalOpenCreateForm(true);
    }

  }

    useEffect(() => {
    if (ModalOpenKargroupMosahebe) {
      LoadOneErja(erjaId ?? "");
    }
  }, [ModalOpenKargroupMosahebe]);


    const user = useMeratUser();


      interface DavtalabData {
    FirstName?: string;
    LastName?: string;
    NameMostar?: string;
    NamePedar?: string;
    SalTavalod?: string;
    CodeMelli?: string;
    DinMazhab_NameFarsi?: string;
    Shoghl?: string;
    Tahsilat?: string;
    Sabeghe?: string;
    CountKarbarg?: number;
    CountKarbarg_Type1?: number;
    CountKarbarg_Type2?: number;
    CountKarbarg_Type3?: number;
    CountPeyvast?: number;
    TahghighType1?: number;
    TahghighType2?: number;
    TahghighType3?: number;
  }


    const truncateText = (text: string, limit: number) => {
        if (!text) return "";
        return text.length > limit ? text.substring(0, limit) + "..." : text;
    };

    const downloadfilenameh = async () => {
        try {
            const result = await GetFileNamePic(FileName, 2);
            if (!result || !(result instanceof Blob)) {
                alert("خطا در دریافت فایل.");
                return;
            }
            const url = window.URL.createObjectURL(result);
            const link = document.createElement("a");
            link.href = url;
            link.download = FileName;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("خطا در دانلود فایل:", error);
            alert("خطا در دانلود فایل. لطفاً دوباره امتحان کنید.");
        }
    };

      const LoadOneKarbargMosahebe = async () => {

    setSoalatParvandeh("");
    setPasokhParvandeh("");
    setManabe1("");
    setManabe2("");
    setManabe3("");
    setManabe4("");
    setManabe5("");
    setManabe6("");
    setTozihatMohaghegh("");
    setPeyvastDavtalab("");

    const result = await GetKarbargDavtalabByShomareh(data[0].ShomarehParvandeh, 31210, user.UserId);
    if (result.data) {
      if (result.data && result.data.length > 0) {
        setSoalatParvandeh(result.data[0].Soalat);
        setPasokhParvandeh(result.data[0].Pasokh);
        setManabe1(result.data[0].Manabe1);
        setManabe2(result.data[0].Manabe2);
        setManabe3(result.data[0].Manabe3);
        setManabe4(result.data[0].Manabe4);
        setManabe5(result.data[0].Manabe5);
        setManabe6(result.data[0].Manabe6);
        setTozihatMohaghegh(result.data[0].TozihatMohaghegh);
        setPeyvastDavtalab(result.data[0].PeyvastDavtalab);
      }
    }
    setModalOpenKargroupMosahebe(true);
  }

    const openModalJambandi = async () => {
        const result = await GetJambandiForHozeh(erjaId);
        const items = Array.isArray(result) ? result : result?.data ?? [];

        const content: any = {
            type: "doc",
            content: [],
        };

        items.forEach((item: any, index: number) => {
            const userName = item.CreateUserName ?? "";
            const jambandi = item.JambandiEghdam ?? "";
            const NameMahal = item.NameMahal ?? "";

            const paragraph = {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: `${userName} (${NameMahal})`,
                        marks: [
                            {
                                type: "highlight",
                            },
                        ],
                    },
                    {
                        type: "text",
                        text: `:: ${jambandi}`,
                    },
                ],
            };

            content.content.push(paragraph);
        });

        setJambandiForHozeh(content);
        setModalOpenErsalParvandeh(true);
    };

    const GetSharestan = async (mahal: number) => {
        const result = await GetCityFare(mahal);
        if (result.status == 200) {
            setCountShahr(result.data.length);
        }
    }
  const SaveKarbargMosaheghe = async () => {

    const safeManabe1 = (Manabe1 === undefined || Manabe1 === null) ? "" : Manabe1;
    console.log(Manabe1);
    setManabe1(safeManabe1 || "");
    if (Manabe2 === "undefined" || Manabe1 === null)
      setManabe2("");
    if (Manabe3 === "undefined" || Manabe1 === null)
      setManabe3("");
    if (Manabe4 === "undefined" || Manabe1 === null)
      setManabe4("");
    if (Manabe5 === "undefined" || Manabe1 === null)
      setManabe5("");
    if (Manabe6 === "undefined" || Manabe1 === null)
      setManabe6("");


    if (!SoalatParvandeh.trim() && SoalatParvandeh.length < 10) {
      showToast.error("سوالی ثبت نشده است", "عزیز دل برادر");
    }
    else if (!PasokhParvandeh.trim() && PasokhParvandeh.length < 10) {
      showToast.error("پاسخی ثبت نشده است", "عزیز دل برادر");
    }
    else if (!TozihatMohaghegh.trim() && TozihatMohaghegh.length < 10) {
      showToast.error("توضیحات محقق ثبت نشده است", "عزیز دل برادر");
    }
    else {

      try {
        const f1 = await exportNodeToPNGFile("div_image_page3", "page1.png");
        if (!f1) return;
        const guidName = uuidv4() + ".png";

        await AddKarbargTahghighDavtalab(data[0].ShomarehParvandeh, 31210,
          1, guidName, SoalatParvandeh, PasokhParvandeh, Manabe1, Manabe2, Manabe3, Manabe4,
          Manabe5, Manabe6, TozihatMohaghegh, PeyvastDavtalab, CodeMohaghegh,
          "", user.UserId, f1.file
        );
        showToast.success("عملیات با موفقیت انجام شد.", "ثبت کاربرگ مصاحبه");

        setModalOpenKargroupMosahebe(false);



      }
      catch (err) {
        console.error("❌ خطا:", err);
        alert("❌ خطا در تولید یا ارسال فایل");
      }
    }

  }
  const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type || "image/png" });
  };

  const exportNodeToPNGFile = async (nodeId: string, fileName: string) => {
    const node = document.getElementById(nodeId);
    if (!node) {
      console.error(`❌ عنصر با id="${nodeId}" پیدا نشد`);
      return null;
    }

    const scale = 3;
    const width = node.scrollWidth;
    const height = node.scrollHeight;

    const dataUrl = await domtoimage.toPng(node, {
      width: width * scale,
      height: height * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: `${width}px`,
        height: `${height}px`,
      },
      bgcolor: "#ffffff",
    });

    const file = await dataUrlToFile(dataUrl, fileName);

    const previewUrl = URL.createObjectURL(file);

    return { file, previewUrl };
  };
    const SendParvandeh = async (erjaid: number, sharheghdam: string, Userid: number) => {
        const result = await Update_ErjaParvandeh(erjaid, true, 2, sharheghdam, Userid);
        if (result.status == 200) {
            router.push("/TahghighatManage");
        }
    }

    useEffect(() => {
        SetMahal(user.Mahal);
        SetUserId(user.UserId);
        setCodeMohaghegh(0);
        setErrorMohaghegh(true);
        seterrorTarikh(true);
        const keyData = params?.KeyData as string;
        if (keyData) {
            try {
                const erjaId = Number(decryptText(decodeURIComponent(keyData)));
                setErjaId(erjaId);
                loadData(erjaId);
                GetSharestan(user.Mahal);
            } catch (err) {
                console.error("❌ خطا در رمزگشایی شناسه:", err);
            }
        }
    }, [params, user]);

    const loadData = async (erjaid: number) => {
        try {
            const result = await GetTahghighByID(erjaid, 0, 0);
            console.log(result);
            if (result.status == 200) {
                setFileName(result.data[0].FileName);
                setonvanparvandeh("پرونده " + result.data[0].FirstName + " " + result.data[0].LastName + " " + " حوزه  " + result.data[0].NameOstan + " - " + result.data[0].NameHozeh);
                setData(result.data || []);
                setErjaParentId(result.data[0].ErjaParentId);
                setData(prev => {
                    const newData = [...prev];
                    newData[0].CountErjaMohaghegh = newData[0].CountErjaMohaghegh;
                    return newData;
                });
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

    const saveErjaMohaghegh = async (isInsert: number) => {
        seterrorTarikh(false);
        setErrorMohaghegh(false);

        if (!CodeMohaghegh || CodeMohaghegh === 0) {
            setErrorMohaghegh(true);
            return;
        }

        if (!tarikh) {
            seterrorTarikh(true);
            return;
        }

        const result = await ErjaBeMohaghegh(erjaId, erjaParentId, CodeMohaghegh, tarikh, tozihat, UserId, isInsert);

        if (result.data[0].InSuccess == true) {
            setModalOpenErjaBeMohaghegh(false);
            setrefreshKeyErjaMohaghegh(prev => prev + 1);
            setCodeMohaghegh(0);
            settarikh("");
            await loadData(erjaId);
        }
        else if (result.data[0].IsSuccess === false && result.data[0].Status === 201) {
            showConfirm(
                "آیا از ارجاع مجدد اطمینان دارید؟",
                () => saveErjaMohaghegh(1),
                "هشدار!",
                "warning"
            )
        }
    }

    const saveErjaHozeh = async (mahalSender: number,
        mahalReciver: number, isInsert: number
    ) => {
        try {
            const res = await fetch("/Api/Tahghigh/InsertErjaTahghigh", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    perjaid: erjaId,
                    mahalSender,
                    mahalReciver,
                    description: tozihat,
                    userId: UserId,
                    isInsert: isInsert,
                }),
            });

            const result = await res.json();

            if (res.ok) {
                if (result.data[0].IsSuccess === false) {
                    showConfirm(
                        "آیا از ارجاع مجدد اطمینان دارید؟",
                        () => saveErjaHozeh(user.Mahal, mahalReciver, 1),
                        "هشدار!",
                        "warning"
                    )
                }

                setModalOpenErjaBeHozeh(false);
                loadData(erjaId);
                setrefreshKeyErjaShahrestan(prev => prev + 1);
            } else {
                alert("⚠️ خطا در ذخیره اطلاعات");
            }
        } catch (err) {
            console.error(err);
            alert("❌ خطا در برقراری ارتباط با سرور");
        }
    };

    
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
                        <div className={`h-12 p-2 rounded-lg shadow w-full items-center gap-4 ${data[0].IsDone === true
                            ? "bg-green-100"
                            : data[0].ErjaLastState === 3
                                ? "bg-yellow-100"
                                : "bg-gray-200"
                            }`}>
                            <div className="flex gap-5 whitespace-nowrap items-center justify-between">

                                <div className="flex gap-5">
                                    <p
                                        onClick={() => {
                                            setFileName(data[0].FileName);
                                            downloadfilenameh();
                                        }
                                        }
                                        className="flex gap-2  bg-purple-800 py-1 rounded-2xl px-5 cursor-pointer">
                                        <span className="flex-1 text-white text-[13px] "> کاربرگ تحقیق                     </span>
                                        <span className="flex text-white"> <Download height={20} /></span>

                                    </p>
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

                                    <p>
                                        <span className="font-semibold text-blue-600 text-[13px]"> مشاهده وضیت :</span>
                                        <span
                                            onClick={() => setModalOpenStatus(true)}
                                            className="text-gray-700 text-[14px] mr-2 cursor-pointer hover:text-blue-600 underline decoration-dotted"
                                        >
                                            {truncateText(data[0].JambandiEghdam, 50)}
                                        </span>
                                    </p>
                                </div>

                                {(data[0].IsDone === false && (
                                    <div className="flex gap-2">
                                                              <button
                        onClick={() => {
                          LoadOneKarbargMosahebe();
                        }}
                        className="flex items-center gap-1 p-1 px-4 bg-emerald-600 text-white rounded shadow hover:bg-emerald-800 transition-colors text-sm cursor-pointer">
                        <PlusCircle className="w-4 h-4" />
                        تحقیق از داوطلب
                      </button>

                                        <button
                                            onClick={async () => {
                                                openModalJambandi();
                                            }
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

                    {data.length > 0 && countShahr > 0 && (
                        <div className="mx-5 border rounded-xl shadow-sm bg-slate-100">
                            <div className="flex items-center justify-between p-3 select-none hover:bg-gray-100 hover:rounded-xl transition-colors">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="text-purple-600 w-5 h-5" />
                                    <h2
                                        onClick={() => setIsOpen1(!isOpen1)}
                                        className="cursor-pointer Roya text-[18px] text-purple-800 font-semibold flex items-center gap-2"
                                    >
                                        ارجاع به شهرستان فرعی
                                        <span className="bg-gray-400 text-white rounded-full w-7 h-7 flex items-center justify-center">
                                            {data[0].CountErja || 0}
                                        </span>
                                        <span className="bg-green-700 text-white rounded-full w-7 h-7 flex items-center justify-center">
                                            {data[0].CountErjaDone || 0}
                                        </span>
                                    </h2>
                                </div>

                                {data[0].IsDone == false && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setModalOpenErjaBeHozeh(true)}
                                            className="flex items-center gap-1 p-2 px-4 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors text-sm cursor-pointer"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            ارجاع به شهرستان
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isOpen1 && (
                                <div className="border-t">
                                    <ErjaHozeh
                                        key={refreshKeyErjaShahrestan}
                                        erjaParentId={data[0].ErjaId}
                                        typeLevel="shahrestan"
                                        onChangeCountErjaHozeh={(count, doneCount) => {
                                            setData(prev => {
                                                const newData = structuredClone(prev);
                                                if (newData[0]) {
                                                    newData[0].CountErja = count;
                                                    newData[0].CountErjaDone = doneCount;
                                                }
                                                return newData;
                                            });
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {data.length > 0 && (
                        <div className="mx-5 border rounded-xl shadow-sm bg-slate-100">
                            <div
                                className="flex items-center justify-between p-3 select-none hover:bg-gray-100 hover:rounded-xl transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="text-purple-600 w-5 h-5" />
                                    <h2
                                        onClick={() => setIsOpen2(!isOpen2)}
                                        className="cursor-pointer  Roya text-[18px] text-purple-800 font-semibold flex items-center gap-2">
                                        ارجاع به محقق ویژه شهرستان
                                        <span className="bg-gray-400 text-white rounded-full w-7 h-7 flex items-center justify-center">
                                            {data[0].CountErjaMohaghegh || 0}
                                        </span>
                                        <span className="bg-green-700 text-white rounded-full w-7 h-7 flex items-center justify-center">
                                            {data[0].CountErjaMohagheghDone || 0}
                                        </span>
                                    </h2>
                                </div>

                                {data[0].IsDone === false && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setModalOpenErjaBeMohaghegh(true) }}
                                            className="flex items-center gap-1 p-2 px-4 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-colors text-sm cursor-pointer">
                                            <PlusCircle className="w-4 h-4" />
                                            ارجاع به محقق ویژه شهرستان
                                        </button>
                                    </div>
                                )}

                            </div>

                            {data.length > 0 && isOpen2 && (
                                <div className="border-t">
                                    <ErjaMohaghegh key={refreshKeyErjaMohaghegh}
                                        erjaId={data[0].ErjaId}
                                        onChangeCountJambandi={(countjambandi) => {
                                            const newData = [...data];
                                            newData[0] = {
                                                ...newData[0],
                                                CountErjaMohagheghDone: countjambandi
                                            };
                                            setData(newData);
                                        }}
                                        onChangeCountMohaghegh={(countmohaghegh) => {
                                            const newData = [...data];
                                            newData[0] = {
                                                ...newData[0],
                                                CountErjaMohaghegh: countmohaghegh
                                            };
                                            setData(newData);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                </div>

            </div >

            {
                data.length > 0 && ModalOpenErjaBeHozeh && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black opacity-40"
                            onClick={() => setModalOpenErjaBeHozeh(false)}
                        ></div>
                        <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-96 relative">
                            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                                <h2 className="text-lg font-bold">افزودن ارجاع جدید</h2>
                            </div>
                            <hr className="mb-3 text-blue-800" />
                            <InputUserDropdown
                                label="شهرستان حوزه فرعی"
                                pCityId={data[0].MahalReciver}
                                CityIdNo={data[0].MahalReciver}
                                IsMarkaz={0}
                                onSelect={(info) => {
                                    setCityMarkaz(info ? info.id : null);
                                }}
                                error={CityMarkaz === null}
                                errorMessage={CityMarkaz === null ? "لطفاً شهرستان را انتخاب کنید" : ""}
                            />
                            <textarea
                                className="text-[15px] w-full h-24 border border-gray-300 rounded p-2 mb-2 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                                placeholder="توضیحات ارجاع پرونده "
                                value={tozihat || ""}
                                onChange={(e: any) => setTozihat(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 mt-5">
                                <button
                                    className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                    onClick={() => setModalOpenErjaBeHozeh(false)}
                                >
                                    انصراف
                                </button>
                                <button
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer"
                                    onClick={() => (saveErjaHozeh(user.Mahal, CityMarkaz || 0, 0))}
                                >
                                    تایید
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                data.length > 0 && ModalOpenErjaBeMohaghegh && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black opacity-40"
                            onClick={() => setModalOpenErjaBeMohaghegh(false)}
                        ></div>
                        <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-96 relative">
                            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                                <h2 className="text-lg font-bold">افزودن ارجاع جدید</h2>
                            </div>
                            <hr className="mb-3 text-blue-800" />
                            <ModalEjraBeMohaghegh
                                codeEntekhabat={31210}
                                label="محقق"
                                mahal={data[0].MahalReciver}
                                noeHamkari={2}
                                vije={1}
                                onSelect={(info) => {
                                    setCodeMohaghegh(info ? info.id : null);
                                    setErrorMohaghegh(false);
                                }}
                                error={errorMohaghegh}
                                errorMessage={errorMohaghegh ? "لطفاً محقق را انتخاب کنید" : ""}
                            />
                            <div className="">
                                <PersianDateInput
                                    label="مهلت انجام"
                                    allowPastDates={false}
                                    onChange={(v: any) => {
                                        settarikh(v)
                                        seterrorTarikh(false);
                                    }}
                                    error={errorTarikh}
                                    errorMessage={errorTarikh ? "لطفاً تاریخ را انتخاب کنید" : ""}
                                />
                            </div>
                            <textarea
                                className="text-[15px] w-full h-24 border border-gray-300 rounded p-2 mb-2 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                                placeholder="توضیحات ارجاع پرونده "
                                value={tozihat}
                                onChange={(e: any) => setTozihat(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 mt-5">
                                <button
                                    className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                    onClick={() => setModalOpenErjaBeMohaghegh(false)}
                                >
                                    انصراف
                                </button>
                                <button
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer"
                                    onClick={() => (saveErjaMohaghegh(0))}
                                >
                                    تایید
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {data.length > 0 && ModalOpenErsalParvandeh && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black opacity-40"
                        onClick={() => setModalOpenErsalParvandeh(false)}
                    ></div>
                    <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[800px] relative max-h-[90vh] overflow-y-auto">
                        <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                            <h2 className="text-lg font-bold">ثبت جمع بندی </h2>
                        </div>
                        <hr className="mb-3 text-blue-800" />
                        <RichTextEditor height="h-130"
                            content={JambandiForHozeh}
                            onChange={(newContent) => setJambandiForHozeh(newContent)}
                            readOnly={false}
                            justify={true}
                        />
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                onClick={() => setModalOpenErsalParvandeh(false)}
                            >
                                انصراف
                            </button>
                            <button
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-2xl cursor-pointer"
                                onClick={() => (SendParvandeh(erjaId, JambandiForHozeh, user.UserId))}
                            >
                                <span className="flex gap-2">
                                    <Check size={15} className="mt-1" />
                                    تایید
                                </span>
                            </button>
                        </div>
                    </div>
                </div >
            )
            }



      {
        ModalOpenKargroupMosahebe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black opacity-40"
              onClick={() => setModalOpenKargroupMosahebe(false)}
            ></div>

            <div
              className="bg-white rounded-lg shadow-2xl z-50 relative overflow-auto flex items-start justify-center"
              style={{
                width: "100vw",
                height: "100vh",
                padding: "20px",
                boxSizing: "border-box",
              }}
            >
              <div className="w-full h-full flex flex-col items-center">

                <div className="w-[210mm] flex justify-center gap-3 mt-3">
                  <button
                    onClick={() => {
                      SaveKarbargMosaheghe();
                    }
                    }
                    className="cursor-pointer  bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    ارسال پرونده
                  </button>
                  <button
                    onClick={() => setModalOpenKargroupMosahebe(false)}
                    className="cursor-pointer  bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    بستن
                  </button>
                </div>


                <div
                  id="div_image_page3"
                  style={{
                    width: "330mm",
                    minHeight: "466mm",
                    marginTop: "5px",
                    padding: "5mm",
                    backgroundColor: "white",
                    color: "black",
                    fontSize: 20,
                    lineHeight: 1.9,
                    boxSizing: "border-box",
                    border: "3px solid #2563eb",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 0 25px rgba(0,0,0,0.25)",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "140px",
                      marginBottom: "8px",
                      display: "flex",
                      flexDirection: "row",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        width: "20%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <img
                        src="/logo/KarbargOstan/mohr.jpg"
                        alt="لوگو اول"
                        style={{
                          height: "110px",
                          width: "150px",
                          objectFit: "contain",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        width: "70%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src="/logo/KarbargMosahebe/Logo.png"
                        alt="لوگو دوم"
                        style={{
                          width: "100%",
                          maxWidth: "400px",
                          height: "130px",
                          objectFit: "contain",
                          margin: 0,
                          padding: 0,
                          display: "block",
                        }}
                      />
                    </div>

                    {/* ستون سوم: متن راست (۴۰٪) */}
                    <div
                      style={{
                        width: "30%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        gap: "5px",
                        paddingRight: "2px",
                        paddingLeft: "20px",
                      }}
                    >
                      <div className="flex items-center justify-start w-full">
                        <span className="bnaznin text-[20px]" >شماره سریال :</span>
                        <span className="mx-2 text-[16px]">....................</span>
                      </div>
                      <div className="flex items-center justify-start w-full">
                        <span className="bnaznin text-[20px]" >استان :</span>
                        <span className="mx-2 text-[16px]">{NameOstan}</span>
                      </div>
                      <div className="flex items-center justify-start w-full">
                        <span className="bnaznin text-[20px]">حوزه انتخابیه:</span>
                        <span className="mx-2 text-[13px]"> {NameHozeh}</span>
                      </div>
                    </div>
                  </div>

                  {/* --- بخش مشخصات داوطلب --- */}
                  <div
                    style={{
                      width: "100%",
                      height: "130px",
                      marginBottom: "8px",
                      display: "flex",
                      flexDirection: "row",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      boxSizing: "border-box",
                    }}
                  >
                    {/* ستون کناری (عنوان عمودی) */}
                    <div
                      style={{
                        width: "40px",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "#e5e5e5",
                        borderLeft: "2px solid #000",
                        boxSizing: "border-box",
                        borderTopLeftRadius: "8px",
                        borderBottomLeftRadius: "8px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          transform: "rotate(-90deg)",
                          transformOrigin: "center",
                          whiteSpace: "nowrap",
                          fontSize: "17px",
                          fontWeight: "bold",
                          fontFamily: "B Titr",
                        }}
                      >
                        مشخصات داوطلب
                      </span>
                    </div>

                    {/* ستون محتوا */}
                    <div className="flex flex-col justify-center h-full w-full">
                      {/* ردیف اول */}
                      <div className="flex flex-wrap bnaznin text-[20px] px-2 gap-y-2 items-center">
                        <div className="flex items-center mx-2">
                          <span>نام :</span>
                          <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0 inline-flex items-center">
                            {Davtalab?.FirstName}
                          </span>
                        </div>

                        <div className="flex items-center mx-2">
                          <span>نام خانوادگی :</span>
                          <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0 inline-flex items-center">
                            {Davtalab?.LastName}
                          </span>
                        </div>

                        <div className="flex items-center mx-2">
                          <span>نام مشهور / مستعار :</span>
                          <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0 inline-flex items-center">
                            {Davtalab?.NameMostar}
                          </span>
                        </div>

                        <div className="flex items-center mx-2">
                          <span>نام پدر :</span>
                          <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0 inline-flex items-center">
                            {Davtalab?.NamePedar}
                          </span>
                        </div>

                        <div className="flex items-center mx-2">
                          <span>سال تولد :</span>
                          <div className="flex gap-0.5 text-[18px] mr-2" dir="ltr">
                            {String(Davtalab?.SalTavalod).split("").map((num, idx) => (
                              <span
                                key={idx}
                                className="my-2 w-6 h-8 flex items-center justify-center border border-black rounded-md"
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center mx-1">
                          <span>دین - مذهب :</span>
                          <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                            {Davtalab?.DinMazhab_NameFarsi}
                          </span>
                        </div>
                      </div>

                      {/* ردیف دوم */}
                      <div className="flex flex-wrap bnaznin text-[20px] px-2 gap-y-2 mt-3">
                        <div className="flex items-center mx-2">
                          <span>شماره ملی :</span>
                          <div className="flex gap-0.5 text-[20px] mr-1" dir="ltr">
                            {String(Davtalab?.CodeMelli).split("").map((num, idx) => (
                              <span
                                key={idx}
                                className="my-2 w-5 h-8 flex items-center justify-center border border-black rounded-md"
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center mx-1">
                          <span>شغل :</span>
                          <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                            {Davtalab?.Shoghl}
                          </span>
                        </div>

                        <div className="flex items-center mx-1">
                          <span>تحصیلات :</span>
                          <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                            {Davtalab?.Tahsilat}
                          </span>
                        </div>

                        <div className="flex items-center mx-1">
                          <span>سابقه داوطلبی :</span>
                          <span className="mx-2 bg-gray-200 rounded-2xl px-1.5 py-0 inline-flex items-center">
                            {Davtalab?.Sabeghe}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      flex: 1,
                      boxSizing: "border-box",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      padding: "0px",
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      gridTemplateColumns: "1fr 2fr",
                      columnGap: "2px", // فاصله بین ستون‌ها
                      backgroundColor: "#000", // رنگ پس‌زمینه کانتینر (رنگ خط)
                      overflow: "hidden",
                    }}
                  >
                    {/* سطر اول */}
                    <div style={{ borderBottom: "1px solid #ccc", backgroundColor: "#fff" }}>
                      <p className="text-[17px] text-center">
                        سوالات و موارد مطرح شده توسط محقق :
                      </p>
                    </div>
                    <div style={{ borderBottom: "1px solid #ccc", backgroundColor: "#fff" }}>
                      <p className="text-[17px] text-center">
                        مشروح اظهارات داوطلب :
                      </p>
                    </div>
                    {/* سطر دوم */}
                    <div style={{ backgroundColor: "#fff" }}>

                      <div
                        ref={SoalatBoxRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="shabnam text-[16px] leading-loose"
                        style={{
                          flex: 1,
                          margin: "5px",
                          minHeight: "265mm",
                          border: "1px dashed #999",
                          borderRadius: "10px",
                          padding: "12px",
                          outline: "none",
                          color: "#0c4a6e",
                          whiteSpace: "pre-wrap",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: SoalatParvandeh,
                        }}
                        onBlur={(e) => {
                          const content = e.currentTarget.innerHTML;
                          setSoalatParvandeh(content);
                        }}
                      />
                    </div>
                    <div style={{ backgroundColor: "#fff" }}>
                      <div
                        ref={PasokhBoxRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="shabnam text-[16px] leading-loose"
                        style={{
                          flex: 1,
                          margin: "5px",
                          minHeight: "265mm",
                          border: "1px dashed #999",
                          borderRadius: "10px",
                          padding: "12px",
                          outline: "none",
                          color: "#0c4a6e",
                          whiteSpace: "pre-wrap",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: PasokhParvandeh,
                        }}
                        onBlur={(e) => {
                          const content = e.currentTarget.innerHTML;
                          setPasokhParvandeh(content);
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "auto", // ارتفاع بر اساس محتوا تنظیم شود
                      minHeight: "20mm", // حداقل ارتفاع
                      padding: "12px",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      boxSizing: "border-box",
                      marginTop: "4px",
                      display: "flex",
                      flexDirection: "column", // چیدمان عمودی (متن بالا، جدول پایین)
                      alignItems: "flex-start", // محتوا از چپ شروع شود
                      gap: "10px", // فاصله بین متن و جدول
                    }}
                  >
                    <div>
                      <p className="text-[22px] leading-9 m-0">
                        <span className="bnaznin">مشخصات منابع جدید به منظور تحقیق یا استعلام جهت بررسی های تکمیلی : (شامل نام رده ، اداره یا سازمان ، نام و نام خانوادگی و شماره تماس) </span>
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr", // دو ستون هم‌اندازه
                        width: "100%",
                        gap: "5px", // فاصله بین خانه‌ها
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center", // تراز عمودی وسط
                          width: "100%",
                          gap: "5px", // فاصله بین عدد و باکس
                        }}
                      >
                        <p style={{ margin: "0", minWidth: "20px" }}>1-</p>
                        <div
                          ref={Manabe1JadidBoxRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="shabnam text-[16px]"
                          style={{
                            flex: 1, // پر کردن باقی‌مانده فضا
                            margin: "0px",
                            border: "1px dashed #999",
                            borderRadius: "5px",
                            padding: "5px",
                            outline: "none",
                            color: "#0c4a6e",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: Manabe1,
                          }}
                          onBlur={(e) => {
                            const content = e.currentTarget.innerHTML;
                            setManabe1(content || "");
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center", // تراز عمودی وسط
                          width: "100%",
                          gap: "5px", // فاصله بین عدد و باکس
                        }}
                      >
                        <p style={{ margin: "0", minWidth: "20px" }}>2-</p>
                        <div
                          ref={Manabe2JadidBoxRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="shabnam text-[16px]"
                          style={{
                            flex: 1, // پر کردن باقی‌مانده فضا
                            margin: "0px",
                            border: "1px dashed #999",
                            borderRadius: "5px",
                            padding: "5px",
                            outline: "none",
                            color: "#0c4a6e",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: Manabe2,
                          }}
                          onBlur={(e) => {
                            const content = e.currentTarget.innerHTML;
                            if (content && content.trim() !== "" && content !== "<br>" && content !== "<p><br></p>") {
                              setManabe2(content);
                            }
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center", // تراز عمودی وسط
                          width: "100%",
                          gap: "5px", // فاصله بین عدد و باکس
                        }}
                      >
                        <p style={{ margin: "0", minWidth: "20px" }}>3-</p>
                        <div
                          ref={Manabe3JadidBoxRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="shabnam text-[16px]"
                          style={{
                            flex: 1, // پر کردن باقی‌مانده فضا
                            margin: "0px",
                            border: "1px dashed #999",
                            borderRadius: "5px",
                            padding: "5px",
                            outline: "none",
                            color: "#0c4a6e",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: Manabe3,
                          }}
                          onBlur={(e) => {
                            const content = e.currentTarget.innerHTML;
                            if (content && content.trim() !== "" && content !== "<br>" && content !== "<p><br></p>") {
                              setManabe3(content);
                            }
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center", // تراز عمودی وسط
                          width: "100%",
                          gap: "5px", // فاصله بین عدد و باکس
                        }}
                      >
                        <p style={{ margin: "0", minWidth: "20px" }}>4-</p>
                        <div
                          ref={Manabe4JadidBoxRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="shabnam text-[16px]"
                          style={{
                            flex: 1, // پر کردن باقی‌مانده فضا
                            margin: "0px",
                            border: "1px dashed #999",
                            borderRadius: "5px",
                            padding: "5px",
                            outline: "none",
                            color: "#0c4a6e",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: Manabe4,
                          }}
                          onBlur={(e) => {
                            const content = e.currentTarget.innerHTML;
                            if (content && content.trim() !== "" && content !== "<br>" && content !== "<p><br></p>") {
                              setManabe4(content);
                            }
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center", // تراز عمودی وسط
                          width: "100%",
                          gap: "5px", // فاصله بین عدد و باکس
                        }}
                      >
                        <p style={{ margin: "0", minWidth: "20px" }}>5-</p>
                        <div
                          ref={Manabe5JadidBoxRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="shabnam text-[16px]"
                          style={{
                            flex: 1, // پر کردن باقی‌مانده فضا
                            margin: "0px",
                            border: "1px dashed #999",
                            borderRadius: "5px",
                            padding: "5px",
                            outline: "none",
                            color: "#0c4a6e",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: Manabe5,
                          }}
                          onBlur={(e) => {
                            const content = e.currentTarget.innerHTML;
                            if (content && content.trim() !== "" && content !== "<br>" && content !== "<p><br></p>") {
                              setManabe5(content);
                            }
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center", // تراز عمودی وسط
                          width: "100%",
                          gap: "5px", // فاصله بین عدد و باکس
                        }}
                      >
                        <p style={{ margin: "0", minWidth: "20px" }}>6-</p>
                        <div
                          ref={Manabe6JadidBoxRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="shabnam text-[16px]"
                          style={{
                            flex: 1, // پر کردن باقی‌مانده فضا
                            margin: "0px",
                            border: "1px dashed #999",
                            borderRadius: "5px",
                            padding: "5px",
                            outline: "none",
                            color: "#0c4a6e",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: Manabe6,
                          }}
                          onBlur={(e) => {
                            const content = e.currentTarget.innerHTML;

                            if (!content || content.trim() === "" || content === "<br>" || content === "<p><br></p>") {
                              setManabe6("");
                            } else {
                              setManabe6(content);
                            }
                          }}
                        />
                      </div>


                    </div>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "auto", // ارتفاع بر اساس محتوا تنظیم شود
                      minHeight: "20mm", // حداقل ارتفاع
                      padding: "12px",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      boxSizing: "border-box",
                      marginTop: "4px",
                      display: "flex",
                      flexDirection: "column", // چیدمان عمودی (متن بالا، جدول پایین)
                      alignItems: "flex-start", // محتوا از چپ شروع شود
                      gap: "10px", // فاصله بین متن و جدول
                    }}
                  >
                    <div className="m-0 p-0" style={{ marginBottom: "0px", padding: "0px" }}>
                      <p className="text-[22px] m-0 p-0" style={{ lineHeight: "1.2" }}>
                        <span className="bnaznin">نظریه و توضیحات محقق : </span>
                      </p>
                    </div>
                    <div
                      ref={TozhatMohagheghBoxRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="shabnam text-[16px]"
                      style={{
                        flex: 1,
                        margin: "0px",
                        width: "100%",
                        minHeight: "20mm",
                        border: "1px dashed #999",
                        borderRadius: "5px",
                        padding: "5px",
                        outline: "none",
                        color: "#0c4a6e",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.5",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: TozihatMohaghegh,
                      }}
                      onBlur={(e) => {
                        const content = e.currentTarget.innerHTML;
                        setTozihatMohaghegh(content);
                      }}
                    />

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr 1fr 0.5fr", // دو ستون هم‌اندازه
                        width: "100%",
                        gap: "5px", // فاصله بین خانه‌ها
                      }}
                    >


                      <div
                        style={{
                          display: "flex",
                          alignItems: "center", // تراز عمودی وسط
                          width: "100%",
                          gap: "5px", // فاصله بین عدد و باکس
                        }}
                      >
                        <p className="text-[16px]" style={{ margin: "0", minWidth: "20px" }}>تعداد پیوست ها و مستندات ارائه شده توسط داوطلب</p>
                        <div
                          ref={PeyvastBoxRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="shabnam text-[16px]"
                          style={{
                            flex: 1, // پر کردن باقی‌مانده فضا
                            margin: "0px",
                            border: "1px dashed #999",
                            borderRadius: "5px",
                            padding: "5px",
                            outline: "none",
                            color: "#0c4a6e",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: PeyvastDavtalab,
                          }}
                          onBlur={(e) => {
                            const content = e.currentTarget.innerHTML;
                            setPeyvastDavtalab(content);
                          }}
                        />
                      </div>


                      <div className="bnaznin">شناسه محقق :</div>
                      <div className="bnaznin">تاریخ تکمیل :</div>
                      <div className="bnaznin">امضاء :</div>

                    </div>
                  </div>


                </div>




              </div>

              <style>{`
          @media print {
            #div_image > div {
              box-shadow: none !important;
              margin-top: 0 !important;
            }
          }
        `}
              </style>
            </div >
          </div >
        )
      }


            {data.length > 0 && ModalOpenStatus && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black opacity-40"
                        onClick={() => setModalOpenStatus(false)}
                    ></div>
                    <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[600px] relative max-h-[80vh] overflow-y-auto">
                        <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300 flex justify-between items-center">
                            <h2 className="text-lg font-bold">مشاهده وضعیت</h2>
                            <button
                                onClick={() => setModalOpenStatus(false)}
                                className="text-gray-500 hover:text-red-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <hr className="mb-3 text-blue-800" />
                        <div className="p-4 text-gray-800 text-[15px] leading-7 whitespace-pre-wrap">
                            {data[0].JambandiEghdam}
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                onClick={() => setModalOpenStatus(false)}
                            >
                                بستن
                            </button>
                        </div>
                    </div>
                </div >
            )}


            
        </>
    );
}