"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { createPortal } from "react-dom";

import {
  AsddPeyvastKarbargTahghigh,
  AddKarbargEmteaz,
  DeletePeyvastTahghigh,
  GetKarbargPeyvast,
  InsertKarbargTahghighPeyvast,
  Get_Tahghigh_Karbarg,
  DeleteKarbargTahghigh,
  InsertKarbarg,
} from "@/services/ApiService";
import { UpdateDoneKarbarg, GetKarbargByID } from "@/services/ApiService";

import { Check, Code2Icon, Delete, Pencil, PlusCircle } from "@/component/ResearchIcons";
import { useConfirm } from "@/Utils/ConfirmModalContext";

import GetDFNByPID from "@/component/DFN/GetDFNByPID";
import FormInput from "@/component/Objects/FormInput1";
import domtoimage from "@/lib/domToImageCompat";
import ModalEjraBeMohaghegh from "../Componnet/EjraBeMohaghegh";

const SWIPE_THRESHOLD = 60;

// ✅ Portal helper (برای رندر مودال‌ها روی body)
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

interface KarbargItem {
  KarbargId: number;
  TypeMahalTahghigh: number;
  AzSal: number;
  TaSal: number;
  Shghol: string;
  Tahsilat: string;
  CodeManba: number;
  NameManba: string;
  CountPeyvast: string;
  TahghighType: string | number;
  TahghighType_NameFarsi: string;
  SerialKarbarg: string;
  Description: string | null;
  Nahve_Ashnai: string | null;
  IsDone: boolean;
  IsDoneErja: boolean;
  ErjaLastStateErja: number;
  EmteyazKeyfi: number;
  EmteyazPrice: number;
}

interface GetTahghighKarbargProps {
  taghighid: number;
  mahal: number;
  NameMohaghegh: string;
  isDone: boolean;
  onChangeCount?: (count: number) => void;
  onChangeCountPayan?: (count: number) => void;
}

type ViewerItem = { url: string; label?: string };

export default function GetTahghighKarbarg({
  taghighid,
  mahal,
  NameMohaghegh,
  isDone,
  onChangeCount,
  onChangeCountPayan,
}: GetTahghighKarbargProps) {
  const user = useMeratUser();
  const { showConfirm } = useConfirm();

  const [data, setData] = useState<KarbargItem[]>([]);

  const [ModalOpenKarbarg, setModalOpenKarbarg] = useState(false);
  const [ModalOpenShowKarbarg, setModalOpenShowKarbarg] = useState(false);
  const [ModalOpenCreateForm, setModalOpenCreateForm] = useState(false);
  const [ModalOpenEmteyazOstan, setModalOpenEmteyazOstan] = useState(false);

  const [LastState, setLastState] = useState(0);
  const [idKarbarg, setidKarbarg] = useState(0);
  const [IsDoneKarbarg, setIsDoneKarbarg] = useState(false);

  const [azsal, setAzSal] = useState("");
  const [tasal, setTaSal] = useState("");
  const [address, setAddress] = useState("");
  const [shoghl, setShoghl] = useState("");
  const [tahsilat, setTahsilat] = useState("");
  const [typeMahalTahghigh, setTypeMahalTahghigh] = useState(0);

  const [tahghightype, setTahghightype] = useState(0);
  const [tozihat, settozihat] = useState("");
  const [nahve_Ashnai, setNahve_Ashnai] = useState("");

  const [noeParvandeh, setnoeParvandeh] = useState(0);
  const [nahvebazkhani, setnahvebazkhani] = useState(0);
  const [nameSazman, setnameSazman] = useState("");
  const [nameShahr, setnameShahr] = useState("");
  const [naveBazkhani, setnaveBazkhani] = useState("");
  const [peyvast, setpeyvast] = useState("");

  const [errorkarbarg, setErrorKarbarg] = useState(false);
  const [errorAzsal, setErrorAzsal] = useState(false);
  const [erroraTasal, setErrorTasal] = useState(false);
  const [errornahveasnai, setErrornahveasnai] = useState(false);
  const [CodeManba, setCodeManba] = useState(0);
  const [codeMohaghegh, setcodeMohaghegh] = useState(0);
  const [errorcodeManba, setErrorcodeManba] = useState(false);

  const [errornameSazman, setErrornameSazman] = useState(false);
  const [errornameShahr, setErrornameShahr] = useState(false);
  const [errorpeyvast, setErrorpeyvast] = useState(false);

  const [EmteyazKefi, setEmteyazKefi] = useState(0);
  const [EmteyazPrice, setEmteyazPrice] = useState(0);

  const [images, setImages] = useState<{ file: File; url: string; size: number }[]>([]);
  const [gridBoxes, setGridBoxes] = useState<{ url: string; label: string }[]>([]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<ViewerItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const swipeStartXRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });

  const divRef = useRef<HTMLDivElement>(null);
  const [NameDavtalab, setNameDavtalab] = useState<string | null>(null);
  const [NamePedarDavtalab, setNamePedarDavtalab] = useState<string | null>(null);
  const [CodeMelliDavtalab, setCodeMelliDavtalab] = useState<string | null>(null);
  const [TarikhTahghigh, setTarikhTahghigh] = useState<string | null>(null);
  const [CreateDateTime, setCreateDateTime] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadText, setUploadText] = useState<string>("");
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [uploadSentBytes, setUploadSentBytes] = useState(0);
  const [uploadError, setUploadError] = useState<string>("");

  function ProgressBar({ value }: { value: number }) {
    const v = Math.max(0, Math.min(100, value));
    return (
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className="h-3 bg-blue-600 transition-all duration-200" style={{ width: `${v}%` }} />
      </div>
    );
  }

  const uploadWithProgress = (url: string, formData: FormData) => {
    return new Promise<{ status: number; files?: string[]; error?: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.responseType = "text";

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        setUploadSentBytes(e.loaded);
        setUploadTotalBytes(e.total);
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
        setUploadText(`در حال آپلود... ${percent}%`);
      };

      xhr.onload = () => {
        try {
          const text = xhr.responseText || "";
          const json = text ? JSON.parse(text) : null;
          if (!json) return reject(new Error("Empty response from server"));
          resolve(json);
        } catch {
          reject(new Error("Invalid JSON from server"));
        }
      };

      xhr.onerror = () => reject(new Error("NetworkError during upload"));
      xhr.onabort = () => reject(new Error("Upload aborted"));
      xhr.send(formData);
    });
  };

  const uploadImages = async (idKarbarg: number, files: File[]) => {
    setUploadError("");
    setUploadText("");
    setUploadProgress(0);
    setUploadSentBytes(0);
    setUploadTotalBytes(0);

    const MAX_SIZE = 3 * 1024 * 1024;

    const uniqueFiles = files.filter(
      (file, index, self) =>
        index === self.findIndex((f) => f.name === file.name && f.size === file.size)
    );

    const localImages = uniqueFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      size: file.size,
    }));

    setImages((prev) => {
      const existingKeys = new Set(prev.map((img) => img.file.name + img.file.size));
      const newImages = localImages.filter((img) => !existingKeys.has(img.file.name + img.file.size));
      return [...prev, ...newImages];
    });

    const validFiles = uniqueFiles.filter((file) => file.size <= MAX_SIZE);
    const skippedFiles = uniqueFiles.filter((file) => file.size > MAX_SIZE);

    if (skippedFiles.length > 0) {
      console.warn("⛔ Some files skipped (too large):", skippedFiles.map((f) => f.name));
    }

    if (validFiles.length === 0) {
      setUploadError("هیچ فایل معتبری برای آپلود وجود ندارد (همه بزرگ‌تر از ۳MB هستند).");
      return;
    }

    if (!idKarbarg) {
      setUploadError("شناسه کاربرگ (idKarbarg) نامعتبر است.");
      return;
    }

    setUploading(true);
    setUploadText("شروع آپلود...");

    try {
      const formData = new FormData();
      validFiles.forEach((file) => formData.append("files", file));

      const data = await uploadWithProgress("/Api/UploadFiles", formData);

      if (data.status === 200 && data.files) {
        setUploadText("ثبت اطلاعات در دیتابیس...");

        for (let i = 0; i < data.files.length; i++) {
          const savedFileName = data.files[i];
          const originalFile = validFiles[i];
          if (!originalFile) continue;

          const sizeMB = (originalFile.size / 1024 / 1024).toFixed(2);
          const ext = "." + (originalFile.name.split(".").pop() ?? "");
          const mmtype = ext;

          await InsertKarbargTahghighPeyvast(idKarbarg, savedFileName, mmtype, sizeMB, user.UserId);
          // await AsddPeyvastKarbargTahghigh(idKarbarg, savedFileName, user.UserId, originalFile);
        }

        setUploadProgress(100);
        setUploadText("✅ آپلود با موفقیت انجام شد");
        await loadGridImages(idKarbarg);
      } else {
        setUploadError(data.error || "Upload failed: unknown error");
        setUploadText("");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err instanceof Error ? err.message : "Upload error");
      setUploadText("");
    } finally {
      setUploading(false);
    }
  };

  const loadGridImages = async (karbargId: number) => {
    try {
      const res = await GetKarbargPeyvast(karbargId);
      if (res.status === 200 && res.data?.length > 0) {
        const boxes = res.data.map((item: any) => ({
          url: `/uploads/${item.FileName}`,
          label: item.FileName,
        }));
        setGridBoxes(boxes);
      } else {
        setGridBoxes([]);
      }
    } catch (err) {
      console.error("خطا در دریافت Grid:", err);
      setGridBoxes([]);
    }
  };

  const openViewer = (items: ViewerItem[], index: number) => {
    setViewerItems(items);
    setViewerIndex(index);
    setViewerOpen(true);

    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSwipeX(0);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerItems([]);
    setViewerIndex(0);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSwipeX(0);
  };

  const goNextViewer = () => {
    if (!viewerItems.length) return;
    setViewerIndex((i) => (i + 1) % viewerItems.length);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSwipeX(0);
  };

  const goPrevViewer = () => {
    if (!viewerItems.length) return;
    setViewerIndex((i) => (i - 1 + viewerItems.length) % viewerItems.length);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSwipeX(0);
  };

  const openModalKarbarg = (karbarg?: KarbargItem) => {

    setModalOpenShowKarbarg(false);
    setModalOpenCreateForm(false);
    setModalOpenEmteyazOstan(false);
    setModalOpenEmteyazOstan(false);

    if (karbarg) {
      setLastState(karbarg.ErjaLastStateErja);
      setTahghightype(Number(karbarg.TahghighType));
      setCodeManba(karbarg.CodeManba);

      setTypeMahalTahghigh(Number(karbarg.TypeMahalTahghigh));
      setAzSal(String(karbarg.AzSal));
      setTaSal(String(karbarg.TaSal));
      setShoghl(String(karbarg.Shghol));
      setTahsilat(String(karbarg.Tahsilat));
      settozihat(karbarg.Description || "");
      setNahve_Ashnai(karbarg.Nahve_Ashnai || "");

      setErrorKarbarg(false);
      setErrorcodeManba(false);
    } else {
      setidKarbarg(0);
      setTypeMahalTahghigh(0);
      setTahghightype(0);

      setnoeParvandeh(0);
      setnahvebazkhani(0);
      setnameSazman("");
      setnameShahr("");
      setpeyvast("");

      setcodeMohaghegh(0);
      settozihat("");
      setAzSal("");
      setTaSal("");
      setNahve_Ashnai("");
      setAddress("");
      setShoghl("");
      setTahsilat("");
      setCodeManba(0);
    }

    setModalOpenKarbarg(true);
  };

  const saveKarbarg = async (
    karbargid: number,
    tahghightypeParam: number,
    typeMahalTahghighParam: number,
    azSalParam: string,
    taSalParam: string,
    CodeManbaParam: number,
    tahghighidParam: number,
    tozihatParam: string,
    nahve_AshnaiParam: string,
    useridParam: number,
    noeParvandehParam: number,
    nameSazmanParam: string,
    nameShahrParam: string,
    naveBazkhaniParam: number,
    peyvastParam: string
  ) => {
    setErrornahveasnai(false);

    let noeParvandehLocal = noeParvandehParam;
    let naveBazkhaniLocal = naveBazkhaniParam;
    let nameSazmanLocal = nameSazmanParam;
    let nameShahrLocal = nameShahrParam;
    let peyvastLocal = peyvastParam;

    if (tahghightypeParam !== 2) {
      noeParvandehLocal = 0;
      naveBazkhaniLocal = 0;
      nameSazmanLocal = "";
      nameShahrLocal = "";
      peyvastLocal = "";
    }

    setErrorcodeManba(false);
    setErrorAzsal(false);
    setErrorTasal(false);

    if (!CodeManbaParam && tahghightypeParam !== 2) {
      setErrorKarbarg(true);
      setErrorcodeManba(true);
      return;
    }

    if (!nahve_AshnaiParam) {
      setErrornahveasnai(true);
      return;
    }

    if (!azSalParam) {
      setErrorAzsal(true);
      return;
    }

    if (!taSalParam) {
      setErrorTasal(true);
      return;
    }

    if (Number(azSalParam) < 1320 || Number(azSalParam) > 1404) {
      setErrorAzsal(true);
      return;
    }

    if (Number(taSalParam) < 1320 || Number(taSalParam) > 1404) {
      setErrorTasal(true);
      return;
    }

    if (Number(taSalParam) < Number(azSalParam)) {
      setErrorTasal(true);
      return;
    }

    setErrorKarbarg(false);
    setErrorcodeManba(false);

    const codeManbaFinal = tahghightypeParam === 2 ? 999999 : CodeManbaParam;

    await InsertKarbarg(
      karbargid,
      tahghightypeParam,
      typeMahalTahghighParam,
      azSalParam,
      taSalParam,
      codeManbaFinal,
      tahghighidParam,
      tozihatParam,
      nahve_AshnaiParam,
      useridParam,
      noeParvandehLocal,
      nameSazmanLocal,
      nameShahrLocal,
      naveBazkhaniLocal,
      peyvastLocal
    );

    setModalOpenKarbarg(false);

    const result = await Get_Tahghigh_Karbarg(tahghighidParam);
    setData(result.data || []);
    onChangeCount?.((result.data || []).length);
  };

  const loadGetKarbargByID = async (karbargid: number) => {
    const result = await GetKarbargByID(karbargid);
    if (result.data?.length > 0) {
      setNameDavtalab(result.data[0].FullNameDavtalab);
      setNamePedarDavtalab(result.data[0].NamePedarDavtalab);
      setCodeMelliDavtalab(result.data[0].CodeMelliDavtalab);
      setTypeMahalTahghigh(result.data[0].TypeMahalTahghigh);
      setcodeMohaghegh(result.data[0].CodeManba);
      setTarikhTahghigh(result.data[0].TarikhTahghigh);
      setCreateDateTime(result.data[0].CreateDateTime);
      setAzSal(result.data[0].AzSal);
      setTaSal(result.data[0].TaSal);
      settozihat(result.data[0].Description);
      setNahve_Ashnai(result.data[0].nahve_Ashnai);

      setModalOpenKarbarg(false);
      setModalOpenShowKarbarg(false);
      setModalOpenEmteyazOstan(false);
      setModalOpenCreateForm(true);
    }
  };

  const loadData = async () => {
    try {
      const result = await Get_Tahghigh_Karbarg(taghighid);
      setData(result.data || []);
      onChangeCount?.((result.data || []).length);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const DeleteKarbarg = async (karbargid: number, userId: number) => {
    try {
      await DeleteKarbargTahghigh(karbargid, userId);
      const result = await Get_Tahghigh_Karbarg(taghighid);
      setData(result.data || []);
      onChangeCount?.((result.data || []).length);
    } catch (error) {
      console.error("Error deleting data:", error);
    }
  };

  const handleConfirmKarbarg = async (karbargid: number, userid: number) => {
    const restult = await UpdateDoneKarbarg(karbargid, 1, userid);
    if (restult.data?.[0]?.IsSuccess === true) {
      await loadData();
      setModalOpenShowKarbarg(false);

      const result = await Get_Tahghigh_Karbarg(taghighid);
      const newData: KarbargItem[] = result.data || [];
      setData(newData);

      if (onChangeCountPayan) {
        const countDone = newData.filter((x) => x.IsDone === true).length;
        onChangeCountPayan(countDone);
      }
    }
  };

  const DeletePeyvast = async (fileName: string) => {
    await DeletePeyvastTahghigh(fileName, user.UserId);
    await loadGridImages(idKarbarg);
  };

  const ChangeEmteyazForOstan = async () => {
    // ✅ تداخل مودال‌ها را جمع کن
    setModalOpenKarbarg(false);
    setModalOpenCreateForm(false);
    setModalOpenShowKarbarg(false);
    setModalOpenEmteyazOstan(true);
  };

  const SendEmteyazKarbarg = async (karbargid: number, emteyaz1: number, emteyaz2: number) => {

    console.log(karbargid, emteyaz1, emteyaz2, user.UserId);

    const result = await AddKarbargEmteaz(karbargid, emteyaz1, emteyaz2, user.UserId);
    if (result.status === 200) {
      await loadData();
      setModalOpenEmteyazOstan(false);
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleExportPNG = async () => {
    try {
      const node = document.getElementById("div_image");
      if (!node) {
        console.error('❌ عنصر با id="div_image" پیدا نشد');
        return;
      }

      const scale = 3;
      const width = (node as HTMLElement).scrollWidth;
      const height = (node as HTMLElement).scrollHeight;

      const dataUrl = await domtoimage.toPng(node, {
        width: width * scale,
        height: height * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${width}px`,
          height: `${height}px`,
        },
        quality: 1,
        bgcolor: "#ffffff",
      });

      const file = dataURLtoFile(dataUrl, "Karbarg.png");
      if (idKarbarg) {
        await uploadImages(idKarbarg, [file]);
        setModalOpenCreateForm(false);
      } else {
        console.error("❌ idKarbarg پیدا نشد");
      }
    } catch (err) {
      console.error("❌ خطا در تولید تصویر:", err);
    }
  };

  // ----------------- Effects -----------------
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taghighid]);

  useEffect(() => {
    if (ModalOpenShowKarbarg && idKarbarg) {
      setImages([]);
      loadGridImages(idKarbarg);
    } else {
      setGridBoxes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ModalOpenShowKarbarg, idKarbarg]);

  // ----------------- UI -----------------
  return (
    <div className="p-6">
      <div className="max-w-8xl mx-auto bg-sky-100 shadow-2xl rounded-2xl border border-gray-300">
        {/* Header */}
        <div className="px-6 py-2 border-b border-gray-300 flex justify-between items-center bg-sky-200 rounded-t-2xl">
          <h2 className="text-black-800">
            لیست کاربرگ‌های تحقیق [ <span className="text-emerald-800">{NameMohaghegh}</span> ]
          </h2>

          {LastState != 2 && (
            <div className="flex justify-end">
              <button
                onClick={() => openModalKarbarg()}
                type="button"
                className="gap-2 py-2 pl-3.5 pr-3 bg-sky-400 text-black rounded-full cursor-pointer font-semibold text-center shadow-xs transition-all duration-500 flex items-center hover:bg-sky-500 hover:text-white"
              >
                <PlusCircle className="w-4 h-4" />
                ایجاد کاربرگ
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto p-4">
          <table className="border border-blue-500 min-w-full text-sm text-right border-collapse">
            <thead className="text-gray-800 text-center">
              <tr>
                <th className="p-1 border-l border-gray-300 w-[3%]">#</th>
                <th className="p-1 border-l border-gray-300 w-[5%]">حذف</th>
                <th className="p-1 border-l border-gray-300 w-[5%]">اصلاح</th>
                <th className="p-1 border-l border-gray-300 w-[7%]">امتیاز کیفی</th>
                <th className="p-1 border-l border-gray-300 w-[7%]">امتیاز حق الزحمه</th>
                <th className="p-1 border-l border-gray-300 w-[17%]">نوع تحقیق</th>
                <th className="p-1 border-l border-gray-300">توضیحات</th>
                <th className="p-1 border-l border-gray-300 w-[5%]">پیوست</th>
                <th className="p-1 border-l border-gray-300 w-[15%]">نام منبع</th>
                <th className="p-1 border-l border-gray-300 w-[10%]">وضعیت</th>
                <th className="p-1 border-l border-gray-300 w-[10%]">پیوست ها</th>
              </tr>
            </thead>

            <tbody>
              {data.length > 0 ? (
                data.map((item, index) => (
                  <tr
                    onClick={() => {
                      setidKarbarg(item.KarbargId)
                    }

                    }
                    key={item.KarbargId}
                    className={`cursor-pointer hover:bg-sky-200 transition-all duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                  >
                    <td className="py-1 px-2 border-t border-gray-200 text-gray-700 font-medium text-center">
                      {index + 1}
                    </td>

                    <td className="py-1 px-2 border-t border-gray-200 text-center">
                      {!data[0].IsDoneErja ? (
                        <Delete
                          onClick={(e) => {
                            e.stopPropagation();
                            showConfirm(
                              "آیا از حذف کاربرگ اطمینان دارید؟",
                              () => DeleteKarbarg(item.KarbargId, user.UserId),
                              "هشدار!",
                              "error"
                            );
                          }}
                          className="text-red-500 cursor-pointer inline-block"
                        />
                      ) : (
                        <Delete
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 cursor-pointer inline-block"
                        />
                      )}
                    </td>

                    {!data[0].IsDoneErja ? (
                      <td className="text-center">
                        <Pencil
                          onClick={(e) => {
                            e.stopPropagation();
                            openModalKarbarg(item);
                          }}
                          className="text-blue-400 size-5 cursor-pointer inline-block"
                        />
                      </td>
                    ) : (
                      <td className="text-center">
                        <Pencil className="text-gray-400 size-5 cursor-pointer inline-block" />
                      </td>
                    )}

                    <td
                      className="text-center"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (item.IsDone) {

                          console.log(item.KarbargId);
                          setidKarbarg(item.KarbargId)
                          await ChangeEmteyazForOstan();
                        }
                      }}
                    >
                      {item.EmteyazKeyfi > 0 ? (
                        <span className="px-3 py-1 bg-green-100 text-red-600 rounded-full border border-green-300">
                          {item.EmteyazKeyfi}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full border border-red-300">
                          {item.EmteyazKeyfi}
                        </span>
                      )}
                    </td>

                    <td
                      className="text-center"
                      onClick={async (e) => {
                        e.stopPropagation();
                        console.log(item.KarbargId);
                        setidKarbarg(item.KarbargId);
                        if (item.IsDone) await ChangeEmteyazForOstan();
                      }}
                    >
                      {item.EmteyazPrice > 0 ? (
                        <span className="px-3 py-1 bg-green-100 text-red-600 rounded-full border border-green-300">
                          {item.EmteyazPrice}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full border border-red-300">
                          {item.EmteyazPrice}
                        </span>
                      )}
                    </td>

                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalOpenKarbarg(false);
                        setModalOpenCreateForm(false);
                        setModalOpenEmteyazOstan(false);
                        setIsDoneKarbarg(item.IsDone);
                        setidKarbarg(item.KarbargId);
                        setModalOpenShowKarbarg(true);
                      }}
                      className="py-1 px-2 border-t border-gray-200 text-gray-700 font-semibold text-center"
                    >
                      {item.TahghighType_NameFarsi}
                    </td>

                    <td className="py-1 px-2 border-t border-gray-200 text-gray-600 italic text-center">
                      {item.Description || "-"}
                    </td>

                    <td className="text-center py-1 px-2 border-t border-gray-200 text-gray-700">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-300">
                        {item.CountPeyvast}
                      </span>
                    </td>

                    <td className="text-center py-1 px-2 border-t border-gray-200 text-gray-700">
                      ({item.CodeManba})
                    </td>

                    <td className="py-1 px-2 border-t border-gray-200 text-center">
                      {item.IsDone ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-300">
                          انجام شده
                        </span>
                      ) : item.TahghighType == 4 ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setidKarbarg(item.KarbargId);
                            loadGetKarbargByID(item.KarbargId);
                          }}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded-full border border-red-300"
                        >
                          تولید فایل
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full border border-red-300">
                          در حال انجام
                        </span>
                      )}
                    </td>

                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDoneKarbarg(item.IsDone);
                        setidKarbarg(item.KarbargId);
                        setModalOpenKarbarg(false);
                        setModalOpenCreateForm(false);
                        setModalOpenEmteyazOstan(false);
                        setModalOpenShowKarbarg(true);
                      }}
                      className={`
                        py-1 px-2 border text-gray-700 text-center
                        ${item.IsDone ? "bg-green-100" : "bg-blue-100"}
                      `}
                    >
                      مشاهده
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="text-center text-gray-500 p-6 border-t text-base">
                    هیچ داده‌ای یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Portal>
        {ModalOpenKarbarg && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center mt-10">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpenKarbarg(false)} />

            <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-[10000] w-[600px] relative">
              <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                <h2 className="text-lg font-bold">{idKarbarg === 0 ? "افزودن کاربرگ جدید" : "ویرایش کاربرگ"}</h2>
              </div>

              <hr className="mb-3 text-blue-800" />

              <div className="grid grid-cols-2 gap-4 mt-2">
                <GetDFNByPID
                  PID={102}
                  label="نوع کاربرگ تحقیق"
                  defaultValue={tahghightype}
                  onSelect={(info) => setTahghightype(info ? info.Value : 0)}
                  error={tahghightype === 0}
                  errorMessage={tahghightype === 0 ? "لطفاً نوع کاربرگ را انتخاب کنید" : ""}
                />

                <GetDFNByPID
                  PID={111}
                  label="محل تحقیق"
                  defaultValue={typeMahalTahghigh}
                  onSelect={(info) => setTypeMahalTahghigh(info ? info.Value : 0)}
                  error={typeMahalTahghigh === 0}
                  errorMessage={typeMahalTahghigh === 0 ? "لطفاً محل تحقیق را انتخاب کنید" : ""}
                />
              </div>

              <hr className="mb-3 text-purple-500" />

              <div className="grid grid-cols-2 gap-4 mt-2">
                {Number(tahghightype) !== 2 && (
                  <ModalEjraBeMohaghegh
                    codeEntekhabat={31201}
                    label="کد منبع تحقیق"
                    mahal={mahal}
                    noeHamkari={4}
                    vije={2}
                    defaultValue={CodeManba}
                    onSelect={(info) => setCodeManba(info ? info.id : 0)}
                    error={errorcodeManba}
                    errorMessage={errorcodeManba ? "لطفاً منبع را انتخاب کنید" : ""}
                  />
                )}

                <FormInput
                  label="نحوه آشنایی"
                  placeholder="نحوه آشنایی"
                  icon={Code2Icon}
                  value={nahve_Ashnai}
                  onChange={(e) => setNahve_Ashnai(e.target.value)}
                  error={errornahveasnai}
                  errorMessage={errornahveasnai ? "این فیلد نمی‌تواند خالی باشد" : ""}
                  onlyNumber={false}
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <FormInput
                  label="مدت آشنایی - از سال"
                  placeholder="از سال"
                  icon={Code2Icon}
                  value={azsal}
                  onChange={(e) => setAzSal(e.target.value)}
                  error={errorAzsal}
                  errorMessage={errorAzsal ? "این فیلد نمی‌تواند خالی باشد / یا اشکال فرمت" : ""}
                  onlyNumber={true}
                  maxLength={4}
                />

                <FormInput
                  label="مدت آشنایی - تا سال"
                  placeholder="تا سال"
                  icon={Code2Icon}
                  value={tasal}
                  onChange={(e) => setTaSal(e.target.value)}
                  error={erroraTasal}
                  errorMessage={erroraTasal ? "این فیلد نمی‌تواند خالی باشد / یا اشکال فرمت" : ""}
                  onlyNumber={true}
                  maxLength={4}
                />
              </div>

              {Number(tahghightype) === 2 && (
                <>
                  <hr className="m-3 border-0 border-t-2 border-purple-500" />

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <GetDFNByPID
                      PID={113}
                      label="نوع پرونده"
                      defaultValue={noeParvandeh}
                      onSelect={(info) => setnoeParvandeh(info ? info.Value : 0)}
                      error={noeParvandeh === 0}
                      errorMessage={noeParvandeh === 0 ? "لطفاً نوع پرونده را انتخاب کنید" : ""}
                    />

                    <GetDFNByPID
                      PID={114}
                      label="نحوه بازخوانی"
                      defaultValue={nahvebazkhani}
                      onSelect={(info) => setnahvebazkhani(info ? info.Value : 0)}
                      error={nahvebazkhani === 0}
                      errorMessage={nahvebazkhani === 0 ? "لطفاً نحوه بازخوانی پرونده را انتخاب کنید" : ""}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <FormInput
                      label="نام سازمان"
                      placeholder="نام سازمان"
                      icon={Code2Icon}
                      value={nameSazman}
                      onChange={(e) => setnameSazman(e.target.value)}
                      error={errornameSazman}
                      errorMessage={errornameSazman ? "این فیلد نمی‌تواند خالی باشد" : ""}
                      onlyNumber={false}
                      maxLength={300}
                    />

                    <FormInput
                      label="نام شهر"
                      placeholder="نام شهر"
                      icon={Code2Icon}
                      value={nameShahr}
                      onChange={(e) => setnameShahr(e.target.value)}
                      error={errornameShahr}
                      errorMessage={errornameShahr ? "این فیلد نمی‌تواند خالی باشد" : ""}
                      onlyNumber={false}
                      maxLength={300}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <FormInput
                      label="تعداد پیوست"
                      placeholder="تعداد پیوست"
                      icon={Code2Icon}
                      value={peyvast}
                      onChange={(e) => setpeyvast(e.target.value)}
                      error={errorpeyvast}
                      errorMessage={errorpeyvast ? "این فیلد نمی‌تواند خالی باشد" : ""}
                      onlyNumber={true}
                      maxLength={4}
                    />
                  </div>
                </>
              )}

              <textarea
                className="text-[15px] w-full mt-1 h-24 border border-gray-300 rounded p-2 mb-1 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                placeholder="توضیحات"
                value={tozihat}
                onChange={(e) => settozihat(e.target.value)}
              />

              <div className="flex justify-end gap-2 mt-5">
                <button
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                  onClick={() => setModalOpenKarbarg(false)}
                >
                  انصراف
                </button>

                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer"
                  onClick={() =>
                    saveKarbarg(
                      idKarbarg,
                      tahghightype,
                      Number(typeMahalTahghigh),
                      azsal,
                      tasal,
                      CodeManba,
                      taghighid,
                      tozihat,
                      nahve_Ashnai,
                      user.UserId,
                      noeParvandeh,
                      nameSazman,
                      nameShahr,
                      nahvebazkhani,
                      peyvast
                    )
                  }
                >
                  تایید
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== MODAL: SHOW KARbARG (Attachments) ===================== */}
        {ModalOpenShowKarbarg && (
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpenShowKarbarg(false)} />

            <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-[10000] w-[60%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">
              <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                <h2 className="text-lg font-bold">پیوست های کاربرگ</h2>
              </div>

              <hr className="mb-3 text-blue-800" />

              {/* Upload progress */}
              {(uploading || uploadProgress > 0 || uploadError) && (
                <div className="mt-2 mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  {uploadText && <div className="text-sm text-gray-700 mb-2">{uploadText}</div>}

                  {(uploading || uploadProgress > 0) && <ProgressBar value={uploadProgress} />}

                  {(uploading || uploadProgress > 0) && (
                    <div className="text-xs text-gray-500 mt-2">
                      {uploadSentBytes.toLocaleString()} / {uploadTotalBytes.toLocaleString()} bytes
                    </div>
                  )}

                  {!uploading && uploadProgress >= 100 && !uploadError && (
                    <div className="text-sm text-green-700 mt-2">آپلود کامل شد ✅</div>
                  )}

                  {uploadError && <div className="text-sm text-red-600 mt-2">{uploadError}</div>}
                </div>
              )}

              <div className="mt-4">
                {!IsDoneKarbarg && <h3 className="font-bold mb-1">انتخاب اسناد و پیش‌نمایش</h3>}

                <div
                  className="overflow-x-auto py-2 cursor-grab active:cursor-grabbing"
                  style={{ scrollbarWidth: "thin", direction: "rtl" }}
                  onMouseDown={(e) => {
                    const slider = e.currentTarget;
                    slider.style.cursor = "grabbing";
                    const startX = e.pageX - slider.offsetLeft;
                    const scrollLeft = slider.scrollLeft;

                    const onMouseMove = (event: MouseEvent) => {
                      const x = event.pageX - slider.offsetLeft;
                      const walk = x - startX;
                      slider.scrollLeft = scrollLeft - walk;
                    };

                    const onMouseUp = () => {
                      slider.style.cursor = "grab";
                      window.removeEventListener("mousemove", onMouseMove);
                      window.removeEventListener("mouseup", onMouseUp);
                    };

                    window.addEventListener("mousemove", onMouseMove);
                    window.addEventListener("mouseup", onMouseUp);
                  }}
                >
                  <div className="flex gap-3 w-max select-none" style={{ flexDirection: "row-reverse" }}>
                    {images.map((img, index) => {
                      const sizeMB = img.file ? (img.size / 1024 / 1024).toFixed(2) : "0.00";
                      const isOk = img.file ? img.size / 1024 / 1024 <= 3 : true;

                      return (
                        <div
                          key={index}
                          className="flex-none w-28 h-38 bg-gray-300 rounded-md flex flex-col items-center justify-center text-gray-600 font-semibold cursor-pointer hover:bg-gray-400 transition-all relative"
                          onClick={() => openViewer(gridBoxes, index)}
                        >
                          <img src={img.url} alt={`img-${index + 1}`} className="w-full h-[80%] object-cover rounded-md" />
                          <span className={`mt-1 ${isOk ? "text-green-600" : "text-red-600"}`}>{sizeMB} MB</span>
                        </div>
                      );
                    })}

                    {!IsDoneKarbarg && (
                      <div className="flex-none w-28 h-38 bg-blue-200 rounded-md flex items-center justify-center text-blue-600 font-bold cursor-pointer hover:bg-blue-400 transition-all relative">
                        <label htmlFor="fileInput" className="absolute inset-0 flex items-center justify-center cursor-pointer">
                          <span className="text-4xl">+</span>
                        </label>
                        <input
                          id="fileInput"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              uploadImages(idKarbarg, files);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <hr className="my-4 border-gray-300" />

              <div className="mt-6">
                <h3 className="font-bold mb-3">اسناد دریافت شده</h3>

                <div className="overflow-y-auto" style={{ maxHeight: "40vh" }}>
                  <div className="grid grid-cols-5 gap-3">
                    {gridBoxes.map((box, index) => (
                      <div key={index} onClick={() => openViewer(gridBoxes, index)} className="cursor-pointer">
                        <div className="relative w-full h-38 bg-gray-200 rounded-md flex items-center justify-center border border-gray-300 hover:shadow-lg transition-all">
                          <img src={box.url} alt={box.label} className="w-full h-[80%] object-cover rounded-md" />

                          {!IsDoneKarbarg && (
                            <button
                              className="absolute top-1 right-1 text-red-600 bg-white rounded-full p-1 hover:bg-red-100 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                showConfirm(
                                  "آیا از حذف پیوست اطمینان دارید؟",
                                  () => DeletePeyvast(box.label),
                                  "هشدار!",
                                  "error"
                                );
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <button
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded"
                  onClick={() => setModalOpenShowKarbarg(false)}
                >
                  بستن
                </button>

                {!IsDoneKarbarg && gridBoxes.length > 0 && (
                  <button
                    className="flex font-medium bg-green-700 hover:bg-green-300 hover:text-black text-white px-4 py-1 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      showConfirm(
                        "آیا از تایید کاربرگ اطمینان دارید؟",
                        () => handleConfirmKarbarg(idKarbarg, user.UserId),
                        "هشدار!",
                        "success"
                      );
                    }}
                  >
                    <Check />
                    تایید کاربرگ
                  </button>
                )}
              </div>
            </div>

            {/* Viewer */}
            {viewerOpen && viewerItems.length > 0 && (
              <div
                className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80"
                onClick={() => {
                  if (!isDragging && !isSwiping) closeViewer();
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  setZoom((prev) => Math.min(Math.max(0.5, prev + (e.deltaY < 0 ? 0.1 : -0.1)), 5));
                }}
              >
                <button
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-3xl select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevViewer();
                  }}
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-3xl select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextViewer();
                  }}
                >
                  ›
                </button>

                <button
                  type="button"
                  className="absolute top-4 right-4 z-50 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-2xl select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeViewer();
                  }}
                >
                  ✕
                </button>

                <img
                  src={viewerItems[viewerIndex]?.url}
                  alt="preview"
                  draggable={false}
                  className="select-none"
                  style={{
                    height: "100vh",
                    width: "auto",
                    maxWidth: "100vw",
                    objectFit: "contain",
                    transform: `scale(${zoom}) translate(${offset.x + (zoom <= 1.05 ? swipeX : 0)}px, ${offset.y}px)`,
                    transition: isDragging || isSwiping ? "none" : "transform 0.2s ease",
                    cursor: zoom > 1.05 ? (isDragging ? "grabbing" : "grab") : "default",
                    borderRadius: 10,
                    touchAction: zoom > 1.05 ? "none" : "pan-y",
                  }}
                  onPointerDown={(e) => {
                    if (zoom <= 1.05) {
                      setIsSwiping(true);
                      swipeStartXRef.current = e.clientX;
                      setSwipeX(0);
                      didSwipeRef.current = false;
                      return;
                    }
                    setIsDragging(true);
                    setStartDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
                  }}
                  onPointerMove={(e) => {
                    if (isSwiping && swipeStartXRef.current !== null) {
                      const dx = e.clientX - swipeStartXRef.current;
                      setSwipeX(dx);
                      if (Math.abs(dx) > 10) didSwipeRef.current = true;
                      return;
                    }
                    if (isDragging && zoom > 1.05) {
                      setOffset({ x: e.clientX - startDrag.x, y: e.clientY - startDrag.y });
                    }
                  }}
                  onPointerUp={(e) => {
                    if (isSwiping) {
                      setIsSwiping(false);
                      if (swipeX > SWIPE_THRESHOLD) goPrevViewer();
                      else if (swipeX < -SWIPE_THRESHOLD) goNextViewer();
                      setSwipeX(0);
                      swipeStartXRef.current = null;
                      e.stopPropagation();
                      return;
                    }
                    setIsDragging(false);
                    e.stopPropagation();
                  }}
                  onPointerCancel={() => {
                    setIsSwiping(false);
                    setSwipeX(0);
                    swipeStartXRef.current = null;
                    setIsDragging(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1 rounded-full z-50">
                  {viewerIndex + 1} / {viewerItems.length}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== MODAL: CREATE FORM ===================== */}
        {ModalOpenCreateForm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpenCreateForm(false)} />

            <div
              className="bg-white rounded-lg shadow-2xl z-[10000] relative overflow-auto flex items-start justify-center"
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
                    onClick={handleExportPNG}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    تولید کاربرگ
                  </button>
                  <button
                    onClick={() => setModalOpenCreateForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    بستن
                  </button>
                </div>

                <div
                  id="div_image"
                  ref={divRef}
                  style={{
                    width: "280mm",
                    minHeight: "396mm",
                    marginTop: "10px",
                    padding: "12mm",
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
                  {/* سربرگ */}
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
                    <div style={{ width: "20%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <img
                        src="/logo/karbargmohaghegh/LogoEntekhabat.png"
                        alt="لوگو اول"
                        style={{ height: "110px", width: "130px", objectFit: "contain" }}
                      />
                    </div>

                    <div style={{ width: "55%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <img
                        src="/logo/karbargmohaghegh/AdamEmkanTahghigh.png"
                        alt="لوگو دوم"
                        style={{ height: "120px", objectFit: "contain", margin: 0, padding: 0, display: "block" }}
                      />
                    </div>

                    <div
                      style={{
                        width: "25%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        gap: "2px",
                        paddingRight: "5px",
                      }}
                    >
                      <div className="flex items-center justify-end">
                        <span className="bnaznin text-[20px]">استان :</span>
                        <span className="mx-1 text-[16px]">آذربایجان شرقی</span>
                      </div>
                      <div className="flex items-center justify-end">
                        <span className="bnaznin text-[20px]">حوزه انتخابیه:</span>
                        <span className="mx-1 text-[16px]">تبریز، آذرشهر و اسکو</span>
                      </div>
                      <span className="text-[14px] bnaznin text-right">آیتم محرمانه</span>
                    </div>
                  </div>

                  {/* مشخصات داوطلب */}
                  <div
                    style={{
                      width: "100%",
                      minHeight: "190px",
                      marginBottom: "8px",
                      padding: "12px",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div className="flex items-center bnaznin text-[20px]">
                      <span>نام و نام خانوادگی داوطلب :</span>
                      <span className="mx-2 bg-gray-200 rounded-2xl px-3 py-0">{NameDavtalab}</span>

                      <span className="mx-3">شماره ملی :</span>
                      <div className="flex gap-0.5 text-[22px]" dir="ltr">
                        {String(CodeMelliDavtalab || "")
                          .split("")
                          .map((num, idx) => (
                            <span key={idx} className="w-6 h-8 flex items-center justify-center border border-black rounded-md">
                              {num}
                            </span>
                          ))}
                      </div>

                      <span className="mr-8">نام پدر :</span>
                      <span className="mr-2 bg-gray-200 rounded-2xl px-3 py-0">{NamePedarDavtalab}</span>
                    </div>

                    <div className="flex items-center bnaznin text-[20px]">
                      <span>مشخصات محل تحقیق:</span>

                      {typeMahalTahghigh == 1 ? (
                        <span className="mx-5 rounded-2xl bg-gray-200 px-4">محل کار</span>
                      ) : (
                        <span className="mx-15">محل کار</span>
                      )}

                      {typeMahalTahghigh == 2 ? (
                        <span className="mx-5 rounded-2xl bg-gray-200 px-4">محل تحصیل</span>
                      ) : (
                        <span className="mx-15">محل تحصیل</span>
                      )}

                      {typeMahalTahghigh == 3 ? (
                        <span className="mx-5 rounded-2xl bg-gray-200 px-4">محل زندگی</span>
                      ) : (
                        <span className="mx-15">محل زندگی</span>
                      )}
                    </div>

                    <div className="bnaznin text-[20px]">آدرس دقیق محل تحقیق :</div>

                    <div className="flex items-center bnaznin text-[20px] flex-wrap">
                      <span>مشخصات منبع :</span>
                      <span className="mx-1">شناسه منبع</span>
                      <span className="rounded-2xl mx-1 bg-gray-200 px-4">{codeMohaghegh}</span>
                      <span className="mx-1">مدت آشنایی با داوطلب :</span>
                      <span className="rounded-2xl mx-1 bg-gray-200 px-4">
                        {azsal}-{tasal}
                      </span>
                    </div>
                  </div>

                  {/* شرح */}
                  <div
                    style={{
                      width: "100%",
                      flex: 1,
                      padding: "12px",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      boxSizing: "border-box",
                      marginTop: "4px",
                    }}
                  >
                    <h3 className="bnaznin" style={{ marginBottom: "10px", fontSize: "22px" }}>
                      شرح گزارش و دلایل عدم امکان تحقیق :
                    </h3>
                    <p className="text-[18px] leading-9">{tozihat}</p>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "20mm",
                      padding: "12px",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      boxSizing: "border-box",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <p className="text-[25px] leading-9 m-0">
                      <span className="bnaznin">شناسه محقق: </span>
                      <span className="bnaznin rounded-2xl bg-gray-100 px-3">{codeMohaghegh}</span>
                      <span className="bnaznin mr-5">تاریخ تکمیل کاربرگ: </span>
                      <span className="bnaznin rounded-2xl bg-gray-100 px-3">{CreateDateTime?.substring(0, 10)}</span>
                      <span className="bnaznin mr-5">امضاء : </span>
                    </p>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "40mm",
                      border: "2px solid #000",
                      borderRadius: "5px",
                      marginTop: "4px",
                      padding: "12px",
                      paddingTop: "0",
                      boxSizing: "border-box",
                    }}
                  >
                    <p className="text-[28px] m-0" style={{ lineHeight: "3.4rem", marginTop: 0 }}>
                      <span className="bnaznin">اینجانب : </span>
                      <span className="bnaznin rounded-2xl bg-gray-100 px-3"> </span>
                      <span className="bnaznin mr-5">مسئول دفتر حوزه انتخابیه: </span>
                      <span className="bnaznin rounded-2xl bg-gray-100 px-3">{user.FullName}</span>
                      <span className="bnaznin mr-5">گزارش محقق و دلایل عدم امکان تحقیق را تایید می نمایم : </span>
                      <span className="bnaznin mr-40">تاریخ : {user.DateNow}</span>
                      <span className="bnaznin mr-40">امضاء : </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== MODAL: EMTEYAZ ===================== */}
        {data.length > 0 && ModalOpenEmteyazOstan && user.Mahal.toString().length == 3 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenEmteyazOstan(false)} />

            <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-[10000] w-[800px] h-[500px] relative max-h-[90vh] overflow-y-auto">
              <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                <h2 className="text-lg font-bold">ثبت امتیاز</h2>
              </div>
              <hr className="mb-3 text-blue-800" />

              <div className="grid grid-cols-12 gap-3 mt-3 mx-10">
                <div className="col-span-5">
                  <GetDFNByPID
                    PID={406}
                    label="امتیاز کیفی"
                    labelColor="text-blue-600"
                    required={true}
                    name="EmteyazKeyfi"
                    defaultValue={0}
                    onSelect={(info) => setEmteyazKefi(info ? info.Value : 0)}
                    errorMessage={"لطفاً امتیاز را انتخاب کنید"}
                  />
                </div>

                <div className="col-span-5">
                  <GetDFNByPID
                    PID={406}
                    label="امتیاز حق الزحمه"
                    labelColor="text-blue-600"
                    required={true}
                    defaultValue={0}
                    name="EmteyazPrice"
                    onSelect={(info) => setEmteyazPrice(info ? info.Value : 0)}
                    errorMessage={"لطفاً امتیاز را انتخاب کنید"}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                  onClick={() => setModalOpenEmteyazOstan(false)}
                >
                  انصراف
                </button>

                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-2xl cursor-pointer"
                  onClick={async () => await SendEmteyazKarbarg(idKarbarg, EmteyazKefi, EmteyazPrice)}
                >
                  <span className="flex gap-2">
                    <Check size={15} className="mt-1" />
                    تایید
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Portal>
    </div>
  );
}
