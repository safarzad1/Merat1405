"use client";

import { useEffect, useState, useRef, use } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { useRouter } from "next/navigation";
import DescriptionWithModal from "./DescriptionWithModal";
import { ArrowBigLeft, Delete } from "@/component/ResearchIcons";
import { useConfirm } from "@/Utils/ConfirmModalContext";
import TextArea1 from '@/component/Objects/Textarea1'
import domtoimage from '@/lib/domToImageCompat';
import ShowJambandiMohagheghPeyvast from './ShowJambandiMohagheghPeyvast';
import { motion, AnimatePresence } from "@/lib/framerCompat";

import { GetErjaByID } from "@/services/ApiService";


import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/component/Alert/alert-dialog";

import {
    Delete_JambandiMohagheh_Peyvast,
    GetJambandiMohagheghPeyvast,
    JambandiMohagheghPeyvast,
    UpdateEghdamMohaghegh,
    DeleteErjaTahghighbyId,
    GetTahghigh_Mohagheghin
} from "@/services/ApiService";
import GetTahghighKarbarg from "./GetTahghighKarbarg";

type JambandiFile = {
    file: File;
    fileExtend: string;
    url: string;
    fileSize: string;
    FileName: string;
    isServer: boolean;
};

interface TahghighItem {
    TahghighId: number;
    Mahal: number;
    ShomarehParvandeh: string;
    CodeMohaghegh: number;
    FullNameMohaghegh: string;
    CountKarbarg: number;
    CountKarbargIsDone: number;
    ExpireDate: string;
    Description: string;
    JambandiEghdam: string;
    CreateDateTime: string;
    IsDone: boolean;
    ErjaLastState: number;
}

interface FehrestErjaParvandehProps {
    erjaId: number;
    refreshKey?: number;
    onChangeCountMohaghegh?: (countjambandi: number) => void;
    onChangeCountJambandi?: (countjambandi: number) => void;
}
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

const FehrestErjaParvandeh = ({ erjaId, refreshKey, onChangeCountJambandi, onChangeCountMohaghegh }: FehrestErjaParvandehProps) => {

    const divRef = useRef<HTMLDivElement | null>(null);
    const [errorjambandiMohaghegh, seterrorjambandiMohaghegh] = useState<string>("لطفا تکمیل کنید");
    const [JambandiMohaghegh, setJambandiMohaghegh] = useState<string>("");

    const [LastState, setLastState] = useState(0);
    const [ModalOpenCreateForm, setModalOpenCreateForm] = useState(false);
    const [Davtalab, setDavtalab] = useState<DavtalabData | null>(null);
    const [openErrorDialog, setOpenErrorDialog] = useState(false);
    const [jambandiFiles, setJambandiFiles] = useState<JambandiFile[]>([]);
    const [data, setData] = useState<TahghighItem[]>([]);
    const [errorTozihat, seterrorTozihat] = useState(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [tahghighid, setTahghighid] = useState(0);
    const [CountExtraPeyvast, setCountExtraPeyvast] = useState(0);
    const [showControls, setShowControls] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [modalJambandi, setModalJambandi] = useState(false);
    const [Jambandi, setJambandi] = useState("");
    const [isDoneJambandi, setisDoneJambandi] = useState(false);
    const [IDMohaghegh, setIDMohaghegh] = useState(0);
    const [nameMohaghegh, setnameMohaghegh] = useState("");
    const [token, setToken] = useState<string | null>(null);

    const [NameOstan, setNameOstan] = useState<string>("");
    const [NameHozeh, setNameHozeh] = useState<string>("");


    const user = useMeratUser();
    const { showConfirm } = useConfirm();
    const router = useRouter();

    const hasAttachment = jambandiFiles?.length > 0;
    const jambandiIsValid = (Jambandi ?? "").trim().length > 50;
    const canSubmit = isDoneJambandi === false && jambandiIsValid && hasAttachment;

    useEffect(() => {
        if (!divRef.current) return;
        const next = (JambandiMohaghegh ?? "").toString();
        if (divRef.current.innerText !== next) {
            divRef.current.innerText = next;
        }
    }, [JambandiMohaghegh]);


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

    const handleExportPNG = async () => {
        try {
            const f1 = await exportNodeToPNGFile("div_image_page1", "Karbarg_page1.png");
            if (!f1) return;

            const newFile: JambandiFile = {
                file: f1.file,
                url: f1.previewUrl,
                fileExtend: "png",
                fileSize: (f1.file.size / 1024 / 1024).toFixed(2),
                FileName: f1.file.name,
                isServer: false,
            };

            setJambandiFiles((prev) => {
                prev.forEach((p) => {
                    if (!p.isServer && p.url) URL.revokeObjectURL(p.url);
                });
                return [newFile];
            });

            await UpdateJambandiMohaghegh(
                tahghighid,
                JambandiMohaghegh,
                user.UserId,
                [newFile]
            );


        } catch (err) {
            console.error("❌ خطا:", err);
            alert("❌ خطا در تولید یا ارسال فایل");
        }
    };

    const LoadOneErja = async (ErjaId: number) => {
        const result = await GetErjaByID(ErjaId);
        if (result.data.length > 0) {
            console.log(result.data[0]);
            setLastState(result.data[0].ErjaLastStateErja);
            console.log(LastState);
            setDavtalab(result.data[0]);
            setNameOstan(result.data[0].NameOstan);
            setNameHozeh(result.data[0].NameHozeh);

            setModalOpenCreateForm(true);
        }
    }


    useEffect(() => {
        return () => {
            jambandiFiles.forEach(f => URL.revokeObjectURL(f.url));
        };
    }, [jambandiFiles]);

    useEffect(() => {
        if (!tahghighid || !token) return;

        const loadJambandiFiles = async () => {
            try {
                const result = await GetJambandiMohagheghPeyvast(tahghighid);
                const filesArray: JambandiFile[] = Array.isArray(result) ? result : (result.data ?? []);
                const mapped: JambandiFile[] = filesArray.map(f => ({
                    file: null as unknown as File,
                    fileExtend: f.FileName.split('.').pop() || '',
                    url: `/uploads/${f.FileName}`,
                    fileSize: '',
                    FileName: f.FileName,
                    isServer: true
                }));
                setJambandiFiles(mapped);
            } catch (err) {
                console.error("خطا در بارگذاری فایل‌های جمعبندی:", err);
            }
        };

        loadJambandiFiles();
    }, [tahghighid]);
    useEffect(() => {
        if (ModalOpenCreateForm) {
            LoadOneErja(erjaId);
        }
    }, [ModalOpenCreateForm]);



    const deleteFileHandler = async (tahghighid: number, FileName: string, Userid: number) => {
        if (!FileName) return;
        try {
            await Delete_JambandiMohagheh_Peyvast(tahghighid, FileName, Userid);
            setJambandiFiles(prev => prev.filter(f => f.FileName !== FileName));
        } catch (err) {
            console.error("Error deleting file:", err);
        }
    };



    const UpdateJambandiMohaghegh = async (
        tahghighid: number,
        JambandiEghdam: string,
        userid: number,
        validFiles: JambandiFile[]
    ) => {
        try {
            const filesToUpload = validFiles.filter(f => f.file);

            if (filesToUpload.length > 0) {
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append("files", file.file!));

                const res = await fetch("/Api/UploadFiles", {
                    method: "POST",
                    headers: { Authorization: "Bearer " + token },
                    body: formData,
                });

                const uploadResult: { status: number; files?: string[]; error?: string } = await res.json();

                if (uploadResult.status === 200 && uploadResult.files) {
                    for (let i = 0; i < uploadResult.files.length; i++) {
                        const savedFileName = uploadResult.files[i];
                        const originalFile = filesToUpload[i];
                        if (!originalFile) continue;

                        const sizeMB = (originalFile.file!.size / 1024 / 1024).toFixed(2);
                        const ext = "." + originalFile.file!.name.split(".").pop();

                        await JambandiMohagheghPeyvast(tahghighid, savedFileName, ext, sizeMB, userid);
                    }
                } else if (uploadResult.error) {
                    console.error("Upload failed:", uploadResult.error);
                }
            }

            const result = await UpdateEghdamMohaghegh(tahghighid, true, JambandiEghdam);
            if (result.status == 200) {

                await loadData();
                router.refresh();
                setModalOpenCreateForm(false);
            }

        } catch (err) {
            console.error("خطا در انجام فرآیند:", err);
        }
    };

    const loadData = async () => {
        try {

            const result = await GetTahghigh_Mohagheghin(erjaId);
            console.log(result);

            if (result.status === 200) {
                const next = Array.isArray(result.data)
                    ? result.data.map((x: any) => ({ ...x }))   // ✅ clone objects
                    : [];

                setData(next);                                // ✅ new reference همیشه
                const doneCount = next.filter((x: any) => x.IsDone).length;
                console.log("doneCount:", doneCount);

                onChangeCountJambandi?.(doneCount);
                onChangeCountMohaghegh?.(next.length);
            } else if (result.status === 401) {
                router.push("/Login");
            } else {
                setData([]);
            }
        } catch (err) {
            console.error(err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        loadData();
    }, [erjaId, refreshKey]);   // 👈 refreshKey اضافه شد


    if (loading) return <div>در حال بارگذاری...</div>;
    if (data.length === 0) return <div className="px-10 py-2">داده‌ای وجود ندارد.</div>;

    const DeleteErjaMohaghegh = async (ID: number) => {
        await DeleteErjaTahghighbyId(ID);
        loadData();
    };

    return (
        <div className="px-4">
            <ul>
                {data.map((item) => (
                    <li key={item.TahghighId}
                        className={`my-1 py-2 px-3 rounded-xl shadow-sm border transition-all duration-200 flex flex-col cursor-pointer
  ${selectedId === item.TahghighId
                                ? item.IsDone
                                    ? "bg-green-100"
                                    : item.ErjaLastState === 3
                                        ? "bg-yellow-100 border-yellow-400 shadow-md" // حالت انتخاب شده و استیت ۳ (زرد)
                                        : "bg-sky-100 border-purple-400 shadow-md"    // حالت انتخاب شده معمولی
                                : item.IsDone
                                    ? "bg-green-50 border-green-300 hover:bg-green-100"
                                    : item.ErjaLastState === 3
                                        ? "bg-yellow-50 border-yellow-200 hover:bg-yellow-100" // حالت عادی و استیت ۳ (زرد کمرنگ)
                                        : "bg-white border-gray-200 hover:bg-gray-100"
                            }`}
                    >
                        <div className="flex items-center justify-between w-full relative">


                            <div className="flex gap-5 whitespace-nowrap items-center">
                                {(item.CountKarbarg === 0 && !item.IsDone) && (
                                    <p onClick={(e) => {
                                        e.stopPropagation();
                                        showConfirm(
                                            "آیا از حذف ارجاع اطمینان دارید؟",
                                            () => DeleteErjaMohaghegh(item.TahghighId),
                                            "هشدار!",
                                            "error"
                                        );
                                    }} className="cursor-pointer">
                                        <Delete className="text-red-500" />
                                    </p>
                                )}
                                {(item.CountKarbarg > 0 || item.IsDone) && (
                                    <p className="cursor-pointer">
                                        <Delete className="text-gray-400" />
                                    </p>
                                )}

                                <p className="flex justify-end">
                                    <button onClick={() => {
                                        setTahghighid(item.TahghighId);
                                        setSelectedId(selectedId === item.TahghighId ? null : item.TahghighId);
                                        setnameMohaghegh(item.FullNameMohaghegh);
                                        setIDMohaghegh(item.CodeMohaghegh);
                                    }} type='button'
                                        className='gap-2 py-1 pl-3.5 pr-3 text-sm bg-sky-200 text-black rounded-full cursor-pointer font-semibold text-center shadow-xs transition-all duration-500 flex items-center hover:bg-sky-500'>
                                        <ArrowBigLeft className="w-4 h-4" />
                                        مشاهده
                                    </button>
                                </p>

                                <p>
                                    <span className="font-semibold text-blue-600 text-[15px]">محقق :</span>
                                    <span onClick={(e) => {
                                        e.stopPropagation();
                                        setTahghighid(item.TahghighId);
                                        setSelectedId(selectedId === item.TahghighId ? null : item.TahghighId);
                                        setnameMohaghegh(item.FullNameMohaghegh);
                                    }} className="font-semibold text-purple-700 text-[15px] mr-2 inline-block min-w-[120px] cursor-pointer">
                                        {item.FullNameMohaghegh}
                                    </span>
                                </p>

                                <p>
                                    <span className="text-blue-600 text-[16px]">تاریخ ارجاع :</span>
                                    <span className="text-gray-700 text-[16px] mr-2">{item.CreateDateTime.substring(0, 10)}</span>
                                </p>

                                <p>
                                    <span className="text-blue-600 text-[15px]">مهلت اقدام :</span>
                                    <span className="text-gray-700 text-[16px] mr-2">{item.ExpireDate.substring(0, 10)}</span>
                                </p>

                                <p>
                                    <span className="font-semibold inline-flex items-center bg-sky-200 text-black px-1 py-1 rounded-md text-[15px] shadow border border-green-400">
                                        کاربرگ :
                                        <span className="font-[18px] mx-2 bg-white text-purple-600 px-3 rounded-md flex items-center">
                                            {item.CountKarbarg} /
                                            <span className="bg-green-500 text-white w-6 h-6 flex items-center justify-center rounded-full ml-1">
                                                {item.CountKarbargIsDone}
                                            </span>
                                        </span>
                                    </span>
                                </p>
                            </div>

                            <div className="absolute top-12 left-20 -translate-y-1/2">
                                <ShowJambandiMohagheghPeyvast tahghighId={item.TahghighId} />
                            </div>
                        </div>

                        <div className="mr-10 mt-3">
                            <p>
                                <span className="text-blue-600 text-[16px]">توضیحات ارجاع :</span>
                                [
                                <DescriptionWithModal status="info" description={item.Description || ""} />
                                ]
                            </p>
                            {(item.IsDone == false &&
                                <p className="mt-3" onClick={() => {
                                    setModalJambandi(false);
                                    setTahghighid(item.TahghighId);
                                    setJambandi(item.JambandiEghdam);
                                    setJambandiMohaghegh(item.JambandiEghdam);
                                    setisDoneJambandi(item.IsDone);
                                    setModalOpenCreateForm(true);
                                }}>
                                    <span className="text-blue-600 text-[16px] bg-green-100 rounded-2xl border py-1 px-2 m-2">جمع بندی تحقیق :</span>
                                    [
                                    <span className="px-2">
                                        {item.JambandiEghdam
                                            ? item.JambandiEghdam.substring(0, Math.min(item.JambandiEghdam.length, 80))
                                            : ""}

                                    </span>
                                    ]
                                </p>
                            )}
                            {(item.IsDone == true &&
                                <p className="mt-3" onClick={() => {

                                }}>
                                    <span className="text-blue-600 text-[16px] bg-green-100 rounded-2xl border py-1 px-2 m-2">جمع بندی تحقیق :</span>
                                    [
                                    <span className="px-2">
                                        {item.JambandiEghdam
                                            ? item.JambandiEghdam.substring(0, Math.min(item.JambandiEghdam.length, 80))
                                            : ""}

                                    </span>
                                    ]
                                </p>
                            )}



                        </div>




                        {selectedId === item.TahghighId && tahghighid === item.TahghighId && (
                            <div className="mt-0 w-full">
                                <GetTahghighKarbarg
                                    isDone={item.IsDone}
                                    taghighid={item.TahghighId}
                                    mahal={item.Mahal}
                                    NameMohaghegh={item.FullNameMohaghegh}
                                    onChangeCount={(newCount) => {
                                        setData(prevData =>
                                            prevData.map(d =>
                                                d.TahghighId === item.TahghighId ? { ...d, CountKarbarg: newCount } : d
                                            )
                                        );
                                    }}
                                    onChangeCountPayan={(newCount) => {
                                        setData(prevData =>
                                            prevData.map(d =>
                                                d.TahghighId === item.TahghighId ? { ...d, CountKarbargIsDone: newCount } : d
                                            )
                                        );
                                    }}
                                />
                            </div>
                        )}


                        {modalJambandi && (
                            <div className="fixed inset-0 z-50 flex items-start justify-center mt-20">
                                <div
                                    className="absolute inset-0 bg-black opacity-40"
                                    onClick={() => setModalJambandi(false)}
                                ></div>

                                <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[600px] relative">
                                    <div className="w-full rounded-lg p-2 flex flex-col">
                                        <span>
                                            {errorjambandiMohaghegh}
                                        </span>

                                        <label className="mb-2 text-[14px] text-gray-400">
                                            جمع بندی تحقیقات صورت گرفته براساس مهمترین موارد درج شده در کاربرگ های تحقیق :
                                        </label>




                                        <TextArea1
                                            height="h-90"
                                            justify={true}
                                            readOnly={isDoneJambandi}
                                            label="جمع بندی تحقیق :"
                                            placeholder="توضیحات مورد نظر را وارد کنید"
                                            value={Jambandi || ""}
                                            onChange={(e: any) => setJambandi(e.target.value)}
                                            maxLength={3000}
                                            onlyNumber={false}
                                            error={errorTozihat}
                                            errorMessage={errorTozihat ? "این فیلد اجباری است" : ""}
                                        />

                                        <span className="text-red-400 text-sm">
                                            حداقل مطالب جمع بندی 50 کارکتر می باشد
                                        </span>
                                    </div>

                                    <div className="mt-4">
                                        <label className="font-bold text-sm mb-1 block">
                                            پیوست جمع بندی تحقیق
                                        </label>

                                        <div className="flex gap-2">
                                            {jambandiFiles.map((fileObj, index) => (
                                                <div
                                                    key={index}
                                                    className="w-16 h-16 bg-gray-200 rounded-md relative overflow-hidden border"
                                                >
                                                    <img
                                                        src={fileObj.url}
                                                        className="w-full h-full object-cover"
                                                        alt="preview"
                                                    />

                                                    {isDoneJambandi === false && (
                                                        <button
                                                            type="button"
                                                            className="absolute top-1 right-1 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"
                                                            onClick={() => {
                                                                const f = jambandiFiles[index];

                                                                // فایل محلی
                                                                if (!f.isServer) {
                                                                    const newFiles = [...jambandiFiles];
                                                                    newFiles.splice(index, 1);
                                                                    setJambandiFiles(newFiles);
                                                                    return;
                                                                }

                                                                // فایل سرور
                                                                showConfirm(
                                                                    "آیا از حذف فایل اطمینان دارید؟",
                                                                    async () => {
                                                                        await deleteFileHandler(
                                                                            tahghighid,
                                                                            f.FileName,
                                                                            user.UserId,
                                                                        );
                                                                    },
                                                                    "حذف فایل",
                                                                    "warning"
                                                                );
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {isDoneJambandi === false && (
                                                <label className="w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-md flex items-center justify-center cursor-pointer text-blue-600 text-2xl">
                                                    +
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (!e.target.files) return;

                                                            const files = Array.from(e.target.files);

                                                            const newFiles: JambandiFile[] = files.map((f) => ({
                                                                file: f,
                                                                url: URL.createObjectURL(f),
                                                                fileExtend: f.name.split(".").pop() || "",
                                                                fileSize: (f.size / 1024 / 1024).toFixed(2),
                                                                FileName: f.name,
                                                                isServer: false,
                                                            }));

                                                            setJambandiFiles((prev) => [...prev, ...newFiles]);

                                                            // ✅ برای اینکه اگر دوباره همون فایل رو انتخاب کرد، onChange دوباره اجرا بشه
                                                            e.currentTarget.value = "";
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        {/* ✅ پیام وقتی پیوست نداره (و هنوز ارسال نشده) */}
                                        {isDoneJambandi === false && !hasAttachment && (
                                            <span className="text-red-400 text-sm block mt-2">
                                                برای ارسال، حداقل یک فایل پیوست اضافه کنید.
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-center mt-2">
                                        {isDoneJambandi === true && (
                                            <span className="text-green-800 bg-blue-200 rounded-2xl justify-center px-4 py-1 cursor-pointer">
                                                جمعبندی این تحقیق قبلا ارسال شده است
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4">
                                        <button
                                            type="button"
                                            className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                            onClick={() => setModalJambandi(false)}
                                        >
                                            انصراف
                                        </button>


                                        {data[0].IsDone == false && isDoneJambandi === false ? (
                                            <button
                                                type="button"
                                                disabled={!canSubmit}
                                                className={`cursor-pointer shadow px-10 py-1 rounded-xl text-white ${canSubmit
                                                    ? "bg-green-700 hover:bg-green-800 cursor-pointer"
                                                    : "bg-gray-300 cursor-not-allowed"
                                                    }`}
                                                onClick={() => {
                                                    if (!canSubmit) return;
                                                    UpdateJambandiMohaghegh(
                                                        tahghighid,
                                                        Jambandi,
                                                        user.UserId,
                                                        jambandiFiles
                                                    );
                                                }}
                                            >
                                                جمع بندی تحقیق
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled
                                                className="bg-gray-200 text-gray-400 px-4 py-1 rounded-xl cursor-not-allowed"
                                            >
                                                جمع بندی تحقیق
                                            </button>
                                        )}
                                    </div>
                                </div>

                            </div>
                        )}


                        <AlertDialog open={openErrorDialog} onOpenChange={setOpenErrorDialog}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">
                                        خطا در ارسال پرونده
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        لطفاً متن «جمع‌بندی محقق» را به‌صورت صحیح و کامل وارد کنید.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter>
                                    <AlertDialogAction
                                        onClick={() => setOpenErrorDialog(false)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        متوجه شدم
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>


                        {ModalOpenCreateForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center">
                                <div
                                    className="absolute inset-0 bg-black opacity-40"
                                    onClick={() => setModalOpenCreateForm(false)}
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
                                                    if (JambandiMohaghegh && JambandiMohaghegh.trim() !== "") {
                                                        seterrorjambandiMohaghegh("");
                                                        setShowControls(false);
                                                        handleExportPNG();
                                                    } else {
                                                        seterrorjambandiMohaghegh("جمع بندی محقق صحیح نمی‌باشد");
                                                        setOpenErrorDialog(true); // ✅ نمایش پیغام
                                                    }
                                                }}
                                                className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                            >
                                                ارسال پرونده
                                            </button>

                                            <button
                                                onClick={() => setModalOpenCreateForm(false)}
                                                className="cursor-pointer  bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                                            >
                                                بستن
                                            </button>
                                        </div>


                                        <div id="div_image_page1"
                                            // ref={divRef}
                                            style={{
                                                width: "330mm",           // افزایش عرض از 210mm به 280mm
                                                minHeight: "466mm",       // ارتفاع متناسب با نسبت A4
                                                marginTop: "5px",        // کمی فاصله از دکمه‌ها
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
                                                        width: "30%",
                                                        display: "flex",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <img
                                                        src="/logo/karbargmohaghegh/mohr1.png"
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
                                                        width: "75%",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <img
                                                        src="/logo/karbargmohaghegh/JambandiMohaghegh.png"
                                                        alt="لوگو دوم"
                                                        style={{
                                                            width: "100%",         // عرض کامل بخش وسط
                                                            maxWidth: "400px",     // حداکثر عرض (قابل تغییر)
                                                            height: "130px",        // تناسب حفظ می‌شود
                                                            objectFit: "contain",
                                                            margin: 0,
                                                            padding: 0,
                                                            display: "block",
                                                        }}
                                                    />

                                                </div>

                                                <div
                                                    style={{
                                                        width: "45%",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "flex-start",
                                                        justifyContent: "center",
                                                        gap: "2px",
                                                        paddingRight: "5px",
                                                    }}
                                                >
                                                    <div className="flex items-center justify-end">
                                                        <span className="bnaznin text-[20px]">شماره سریال :</span>
                                                        <span className="mx-1 text-[16px]">....................</span>
                                                    </div>
                                                    <div className="flex items-center justify-end">
                                                        <span className="bnaznin text-[20px]">استان :</span>
                                                        <span className="mx-1 text-[16px]">{NameOstan} </span>
                                                    </div>
                                                    <div className="flex items-center justify-end">
                                                        <span className="bnaznin text-[20px]">حوزه انتخابیه:</span>
                                                        <span className="mx-1 text-[14px]">{NameHozeh}</span>
                                                    </div>
                                                </div>
                                            </div>

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

                                                <div className="flex flex-col justify-center h-full">

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
                                                            <span>سال تولد  :</span>
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
                                                            <span>دین - مذهب :</span>
                                                            <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                                                                {Davtalab?.DinMazhab_NameFarsi}
                                                            </span>
                                                        </div>


                                                        <div className="flex items-center mx-1">
                                                            <span>شغل  :</span>
                                                            <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                                                                {Davtalab?.Shoghl}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center mx-1">
                                                            <span>تحصیلات  :</span>
                                                            <span className="mx-1 bg-gray-200 rounded-2xl px-2 py-0 inline-flex items-center">
                                                                {Davtalab?.Tahsilat}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center mx-1">
                                                            <span>سابقه داوطلبی  :</span>
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
                                                    height: "130px",
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
                                                        مشخصات تحقیقات
                                                    </span>
                                                </div>

                                                <div className="flex flex-col justify-center h-full">

                                                    {/* ردیف اول */}
                                                    <div className="flex flex-wrap bnaznin text-[20px] px-2 gap-y-2 items-center">
                                                        <div className="flex items-center mx-2">
                                                            <span>تعداد کل منابع تحقیق شده :</span>
                                                            <div className="flex gap-0.5 text-[20px] mr-2" dir="ltr">
                                                                <span className="border mx-1 bg-gray-200 rounded-xl px-2 py-0 my-0 h-8 inline-flex items-center">
                                                                    {Davtalab?.CountKarbarg}
                                                                </span>

                                                            </div>
                                                        </div>

                                                        <div className="flex items-center mx-2">
                                                            <span>محل کار :</span>
                                                            <div className="flex gap-0.5 text-[20px] mr-2" dir="ltr">
                                                                <span className="border mx-1 bg-gray-200 rounded-xl px-2 py-0 my-0 h-8 inline-flex items-center">
                                                                    {Davtalab?.CountKarbarg_Type1}
                                                                </span>

                                                            </div>
                                                        </div>

                                                        <div className="flex items-center mx-2">
                                                            <span>محل تحصیل :</span>
                                                            <div className="flex gap-0.5 text-[20px] mr-2" dir="ltr">
                                                                <span className="border mx-1 bg-gray-200 rounded-xl px-2 py-0 my-0 h-8 inline-flex items-center">
                                                                    {Davtalab?.CountKarbarg_Type2}
                                                                </span>

                                                            </div>
                                                        </div>

                                                        <div className="flex items-center mx-2">
                                                            <span>محل زندگی :</span>
                                                            <div className="flex gap-0.5 text-[20px] mr-2" dir="ltr">
                                                                <span className="border mx-1 bg-gray-200 rounded-xl px-2 py-0 my-0 h-8 inline-flex items-center">
                                                                    {Davtalab?.CountKarbarg_Type3}
                                                                </span>

                                                            </div>
                                                        </div>

                                                        <div className="flex items-center mx-2">
                                                            <span>تعداد پیوست :</span>

                                                            <div className="flex items-center gap-1 mr-2" dir="ltr">
                                                                <AnimatePresence initial={false}>
                                                                    {showControls && (
                                                                        <motion.button
                                                                            key="minus"
                                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            onClick={() =>
                                                                                setCountExtraPeyvast((prev) => Math.max(prev - 1, 0))
                                                                            }
                                                                            className="w-8 h-8 flex items-center justify-center
                     rounded-xl border bg-red-100 hover:bg-red-200
                     text-lg font-bold select-none"
                                                                        >
                                                                            −
                                                                        </motion.button>
                                                                    )}
                                                                </AnimatePresence>

                                                                {/* عدد (کلیک برای نمایش/مخفی کردن کنترل‌ها) */}
                                                                <span
                                                                    onClick={() => setShowControls((p) => !p)}
                                                                    className="w-10 h-8 flex items-center justify-center
                 rounded-xl border bg-sky-100 text-[20px]
                 cursor-pointer select-none"
                                                                >
                                                                    {CountExtraPeyvast}
                                                                </span>

                                                                <AnimatePresence initial={false}>
                                                                    {showControls && (
                                                                        <motion.button
                                                                            key="plus"
                                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            onClick={() =>
                                                                                setCountExtraPeyvast((prev) => prev + 1)
                                                                            }
                                                                            className="w-8 h-8 flex items-center justify-center
                     rounded-xl border bg-green-100 hover:bg-green-200
                     text-lg font-bold select-none"
                                                                        >
                                                                            +
                                                                        </motion.button>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>

                                                            <div className="flex items-center mx-1">
                                                                <span>صفحه</span>
                                                            </div>
                                                        </div>




                                                    </div>

                                                    <div className="flex flex-wrap bnaznin text-[20px] px-2 gap-y-2 items-center">
                                                        <div className="flex items-center mx-2">
                                                            <span>تعداد کاربرگ ها و شماره سریال آنها :</span>
                                                            <span>تحقیق از داوطلب :</span>
                                                            <span className="border mx-1 bg-gray-200 rounded-xl px-1 py-0 my-0 h-8 inline-flex items-center">
                                                                0
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center mx-2">
                                                            <span>تحقیق کامل 3 برگی  :</span>
                                                            <div className="flex gap-0.5 text-[20px] mr-2" dir="ltr">
                                                                <span className="border mx-1 bg-gray-200 rounded-xl px-1 py-0 my-0 h-8 inline-flex items-center">
                                                                    {Davtalab?.TahghighType1}
                                                                </span>

                                                            </div>
                                                        </div>

                                                    </div>


                                                    <div className="flex flex-wrap bnaznin text-[20px] px-2 gap-y-2 items-center">
                                                        <div className="flex items-center mx-2">
                                                            <span>  گزارش تحقیق محدود :</span>
                                                            <span className="border mx-1 bg-gray-200 rounded-xl px-1 py-0 my-0 h-8 inline-flex items-center">
                                                                {Davtalab?.TahghighType2}
                                                            </span>
                                                            <span className="text-gray-400"> ....................................................................................  </span>
                                                            <span>  بازخوانی پرونده :</span>
                                                            <span className="border mx-1 bg-gray-200 rounded-xl px-1 py-0 my-0 h-8 inline-flex items-center">
                                                                {Davtalab?.TahghighType3}
                                                            </span>

                                                            <span className="text-gray-400"> ....................................................................................  </span>

                                                        </div>

                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    marginBottom: "2px",
                                                    paddingTop: "0px",
                                                    paddingRight: "10px",
                                                    paddingLeft: "10px",
                                                    border: "2px solid #000",
                                                    borderRadius: "5px",
                                                    boxSizing: "border-box",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "2px",   // فاصله کمتر شد
                                                }}
                                            >
                                                <div className="flex flex-col bnaznin text-[22px] leading-[1.3] mt-2">
                                                    <span className="titr text-[18px] mb-3" >جمع بندی تحقیقات صورت گرفته براساس مهمترین موارد درج شده در کاربرگ های تحقیق  :</span>
                                                </div>
                                                <div
                                                    contentEditable
                                                    dangerouslySetInnerHTML={{ __html: (JambandiMohaghegh ?? "").replaceAll("\n", "<br/>") }}
                                                    className="shabnam text-[18px] leading-loose"
                                                    style={{
                                                        flex: 1,
                                                        minHeight: "280mm",
                                                        border: "1px dashed #999",
                                                        borderRadius: "10px",
                                                        padding: "12px",
                                                        outline: "none",
                                                        color: "#0c4a6e",
                                                        whiteSpace: "pre-wrap",
                                                    }}
                                                    onBlur={(e: React.FocusEvent<HTMLSpanElement>) => {
                                                        const target = e.currentTarget;
                                                        setJambandiMohaghegh(target.innerText);
                                                        seterrorjambandiMohaghegh("");
                                                    }}

                                                />

                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: "40px",
                                                    fontSize: "22px",
                                                    fontFamily: "bnaznin",
                                                }}
                                            >
                                                <span>شناسه محقق   :{IDMohaghegh}</span>
                                                <span>تاریخ تکمیل : {user.DateNow}</span>
                                                <span className="ml-30">امضاء:</span>
                                            </div>


                                        </div>



                                    </div>

                                    {/* ✅ استایل چاپ (اختیاری ولی خیلی مفید) */}
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
                    </li>
                ))}
            </ul>
        </div >
    );
};

export default FehrestErjaParvandeh;
