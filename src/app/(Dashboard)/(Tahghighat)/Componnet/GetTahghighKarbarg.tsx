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
const jalaliYear = () => {
  const match = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric" })
    .format(new Date()).match(/\d{4}/);
  return match ? Number(match[0]) : 1405;
};
const attachmentUrl = (filename: string, karbargId: number) =>
  `/Api/Mohaghegh/GetKarbargPeyvastFile?karbargid=${encodeURIComponent(karbargId)}&filename=${encodeURIComponent(filename)}`;

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
  NoeParvandeh?: number | null;
  NaveBazkhani?: number | null;
  NameSazman?: string | null;
  NameShahr?: string | null;
  Peyvast?: number | null;
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
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editReady, setEditReady] = useState(true);
  const [savingKarbarg, setSavingKarbarg] = useState(false);
  const saveKarbargGuard = useRef(false);
  const confirmKarbargGuard = useRef(false);
  const editRequestSequence = useRef(0);
  const [reportExportError, setReportExportError] = useState("");
  const reportDescriptionRef = useRef("");

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

    const validFiles = uniqueFiles.filter((file) => file.size <= MAX_SIZE);
    const skippedFiles = uniqueFiles.filter((file) => file.size > MAX_SIZE);

    if (skippedFiles.length > 0) {
      setUploadError("فایل‌های بزرگ‌تر از ۳ مگابایت پذیرفته نشدند.");
    }

    if (validFiles.length === 0) {
      setUploadError("هیچ فایل معتبری برای آپلود وجود ندارد (همه بزرگ‌تر از ۳MB هستند).");
      return false;
    }

    if (!idKarbarg) {
      setUploadError("شناسه کاربرگ (idKarbarg) نامعتبر است.");
      return false;
    }

    // Preview only accepted files; generate object URLs only for new entries.
    setImages((prev) => {
      const existing = new Set(prev.map((img) => `${img.file.name}:${img.file.size}`));
      const additions = validFiles.filter((file) => !existing.has(`${file.name}:${file.size}`))
        .map((file) => ({ file, url: URL.createObjectURL(file), size: file.size }));
      return [...prev, ...additions];
    });

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

          const registered = await InsertKarbargTahghighPeyvast(idKarbarg, savedFileName, mmtype, sizeMB, user.UserId);
          if (registered?.status !== 200 || registered?.data?.some((row: any) =>
            row.IsSuccess === false || row.IsSuccess === 0 || row.IsSuccess === "0")) {
            throw new Error(registered?.error || "ثبت اطلاعات پیوست در دیتابیس ناموفق بود.");
          }
        }

        setUploadProgress(100);
        setUploadText("✅ آپلود با موفقیت انجام شد");
        await loadGridImages(idKarbarg);
        return true;
      } else {
        setUploadError(data.error || "خطا در بارگذاری فایل");
        setUploadText("");
        return false;
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err instanceof Error ? err.message : "خطا در بارگذاری فایل");
      setUploadText("");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const loadGridImages = async (karbargId: number) => {
    setDocumentsLoading(true);
    setDocumentsError("");
    try {
      const res = await GetKarbargPeyvast(karbargId);
      if (res?.status !== 200) throw new Error(res?.error || "دریافت اسناد ناموفق بود");
      const rows = Array.isArray(res.data) ? res.data : [];
      setGridBoxes(rows.filter((item: any) => item.FileName).map((item: any) => ({
        url: attachmentUrl(item.FileName, karbargId),
        label: String(item.FileName),
      })));
    } catch (err) {
      console.error("خطا در دریافت اسناد:", err);
      setDocumentsError("دریافت اسناد انجام نشد؛ اتصال یا مجوز مشاهده پرونده را بررسی کنید.");
      setGridBoxes([]);
    } finally {
      setDocumentsLoading(false);
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


// Always load the complete stored row when editing. The list SP does not
// include fields such as NameSazman/Peyvast; saving its partial row would
// silently overwrite those fields with empty values.
const openModalKarbarg = async (karbarg?: KarbargItem) => {
  const requestId = ++editRequestSequence.current;
  setModalOpenShowKarbarg(false);
  setModalOpenCreateForm(false);
  setModalOpenEmteyazOstan(false);
  setSaveError("");
  setErrorKarbarg(false);
  setErrorcodeManba(false);
  setErrorAzsal(false);
  setErrorTasal(false);
  setErrornahveasnai(false);
  setModalOpenKarbarg(true);
  setEditReady(!karbarg);

  if (!karbarg) {
    setLoadingEdit(false);
    setidKarbarg(0);
    setLastState(0);
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
    return;
  }

  setidKarbarg(Number(karbarg.KarbargId));
  setLoadingEdit(true);
  try {
    const response = await GetKarbargByID(karbarg.KarbargId);
    if (response?.status !== 200 || !Array.isArray(response?.data) || !response.data[0]) {
      throw new Error(response?.error || "دریافت اطلاعات کامل کاربرگ ناموفق بود.");
    }
    // Ignore an obsolete request if the user opened another worksheet.
    if (requestId !== editRequestSequence.current) return;
    const item = response.data[0];
    if (Number(item.KarbargId) !== Number(karbarg.KarbargId) ||
        Number(item.TahghighId) !== Number(taghighid)) {
      throw new Error("شناسه اطلاعات دریافت‌شده با پرونده انتخابی مطابقت ندارد.");
    }
    setLastState(karbarg.ErjaLastStateErja);
    setTahghightype(Number(item.TahghighType) || 0);
    setCodeManba(Number(item.CodeManba) || 0);
    setTypeMahalTahghigh(Number(item.TypeMahalTahghigh) || 0);
    setAzSal(item.AzSal == null ? "" : String(item.AzSal));
    setTaSal(item.TaSal == null ? "" : String(item.TaSal));
    setShoghl(String(item.Shghol ?? ""));
    setTahsilat(String(item.Tahsilat ?? ""));
    settozihat(String(item.Description ?? ""));
    setNahve_Ashnai(String(item.Nahve_Ashnai ?? ""));
    setnoeParvandeh(Number(item.NoeParvandeh) || 0);
    setnahvebazkhani(Number(item.NaveBazkhani) || 0);
    setnameSazman(String(item.NameSazman ?? ""));
    setnameShahr(String(item.NameShahr ?? ""));
    setpeyvast(item.Peyvast == null ? "" : String(item.Peyvast));
    setEditReady(true);
  } catch (error) {
    if (requestId === editRequestSequence.current) {
      setSaveError(error instanceof Error ? error.message : "بارگذاری اطلاعات کاربرگ ناموفق بود.");
    }
  } finally {
    if (requestId === editRequestSequence.current) setLoadingEdit(false);
  }
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
    setSaveError("");

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

    if (Number(azSalParam) < 1320 || Number(azSalParam) > jalaliYear()) {
      setErrorAzsal(true);
      return;
    }

    if (Number(taSalParam) < 1320 || Number(taSalParam) > jalaliYear()) {
      setErrorTasal(true);
      return;
    }

    if (Number(taSalParam) < Number(azSalParam)) {
      setErrorTasal(true);
      return;
    }

    setErrorKarbarg(false);
    setErrorcodeManba(false);

    if (loadingEdit || saveKarbargGuard.current) return;
    saveKarbargGuard.current = true;
    setSavingKarbarg(true);
    const codeManbaFinal = tahghightypeParam === 2 ? 999999 : CodeManbaParam;


try {
  const resultSave = await InsertKarbarg(
    karbargid, tahghightypeParam, typeMahalTahghighParam,
    azSalParam, taSalParam, codeManbaFinal, tahghighidParam,
    tozihatParam, nahve_AshnaiParam, useridParam,
    noeParvandehLocal, nameSazmanLocal, nameShahrLocal,
    naveBazkhaniLocal, peyvastLocal
  );
  // The patched SP always returns an explicit IsSuccess. An empty or
  // unrecognised result must not be considered a successful save.
  const success = resultSave?.status === 200 &&
    Array.isArray(resultSave.data) && resultSave.data.some((row: any) =>
      row.IsSuccess === true || row.IsSuccess === 1 || row.IsSuccess === "1"
    );
  if (!success) {
    setSaveError(resultSave?.error || "ذخیره کاربرگ در پایگاه داده تأیید نشد.");
    return;
  }
  setModalOpenKarbarg(false);
  const result = await Get_Tahghigh_Karbarg(tahghighidParam);
  if (result?.status === 200 && Array.isArray(result.data)) {
    setData(result.data);
    onChangeCount?.(result.data.length);
  }
} catch (error) {
  setSaveError("ارتباط با سرور برقرار نشد؛ وضعیت ثبت را قبل از تلاش مجدد بررسی کنید.");
  console.error("خطا در ذخیره کاربرگ", error);
} finally {
  saveKarbargGuard.current = false;
  setSavingKarbarg(false);
}
  };

  const loadGetKarbargByID = async (karbargid: number) => {
    const result = await GetKarbargByID(karbargid);
    if (result.data?.length > 0) {
      setidKarbarg(karbargid);
      setTahghightype(Number(result.data[0].TahghighType));
      setCodeManba(Number(result.data[0].CodeManba));
      setNameDavtalab(result.data[0].FullNameDavtalab);
      setNamePedarDavtalab(result.data[0].NamePedarDavtalab);
      setCodeMelliDavtalab(result.data[0].CodeMelliDavtalab);
      setTypeMahalTahghigh(Number(result.data[0].TypeMahalTahghigh) || 0);
      setcodeMohaghegh(result.data[0].CodeManba);
      setTarikhTahghigh(result.data[0].TarikhTahghigh);
      setCreateDateTime(result.data[0].CreateDateTime);
      setAzSal(result.data[0].AzSal);
      setTaSal(result.data[0].TaSal);
      settozihat(result.data[0].Description || "");
      reportDescriptionRef.current = result.data[0].Description || "";
      setNahve_Ashnai(result.data[0].Nahve_Ashnai || result.data[0].nahve_Ashnai || "");

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
      const resultDelete = await DeleteKarbargTahghigh(karbargid, userId);
      if (resultDelete?.status !== 200 || resultDelete.data?.some((row: any) =>
        row.IsSuccess === false || row.IsSuccess === 0 || row.IsSuccess === "0")) {
        throw new Error(resultDelete?.error || "حذف کاربرگ تأیید نشد.");
      }
      const result = await Get_Tahghigh_Karbarg(taghighid);
      if (result?.status !== 200 || !Array.isArray(result.data)) {
        throw new Error(result?.error || "بارگذاری مجدد کاربرگ‌ها انجام نشد.");
      }
      setData(result.data);
      onChangeCount?.(result.data.length);
      setActionError("");
    } catch (error) {
      console.error("Error deleting data:", error);
      setActionError(error instanceof Error ? error.message : "حذف کاربرگ ناموفق بود.");
    }
  };

  const handleConfirmKarbarg = async (karbargid: number, userid: number) => {
    if (confirmKarbargGuard.current) return;
    confirmKarbargGuard.current = true;
    setActionError("");
    try {
      const result = await UpdateDoneKarbarg(karbargid, 1, userid);
      const confirmed = result?.status === 200 &&
        Array.isArray(result.data) && result.data.some((row: any) =>
          row.IsSuccess === true || row.IsSuccess === 1 || row.IsSuccess === "1"
        );
      if (!confirmed) throw new Error(result?.error || "تأیید کاربرگ در سرور انجام نشد.");
      const refreshed = await Get_Tahghigh_Karbarg(taghighid);
      if (refreshed?.status !== 200 || !Array.isArray(refreshed.data)) {
        throw new Error("تأیید ثبت شد، اما دریافت فهرست جدید انجام نشد. صفحه را دوباره باز کنید.");
      }
      const newData: KarbargItem[] = refreshed.data;
      setData(newData);
      onChangeCount?.(newData.length);
      onChangeCountPayan?.(newData.filter((x) => x.IsDone === true).length);
      setModalOpenShowKarbarg(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تأیید کاربرگ ناموفق بود.");
    } finally {
      confirmKarbargGuard.current = false;
    }
  };

  const DeletePeyvast = async (fileName: string) => {
    try {
      const result = await DeletePeyvastTahghigh(fileName, user.UserId, idKarbarg);
      if (result?.status !== 200 || result.data?.some((row: any) =>
          row.IsSuccess === false || row.IsSuccess === 0 || row.IsSuccess === "0")) {
        throw new Error(result?.error || "حذف سند تأیید نشد.");
      }
      await loadGridImages(idKarbarg);
      setDocumentsError("");
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : "حذف سند ناموفق بود.");
    }
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
    setReportExportError("");
    try {
      const node = document.getElementById("div_image");
      // Preserve the last inline edit even if the editor has not lost focus.
      settozihat(reportDescriptionRef.current);
      if (!node) {
        console.error('❌ عنصر با id="div_image" پیدا نشد');
        return;
      }

      // Report fonts and embedded logos must be ready before image capture;
      // otherwise the uploaded worksheet may differ from the visible form.
      if (typeof document !== "undefined") {
        try { await document.fonts.ready; } catch { /* use browser fallback */ }
        await Promise.all(
          Array.from(node.querySelectorAll("img")).map((img) =>
            img.decode().catch(() => undefined)
          )
        );
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
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
        const uploaded = await uploadImages(idKarbarg, [file]);
        if (uploaded) setModalOpenCreateForm(false);
        else setReportExportError("تصویر ساخته شد اما ذخیره آن در سرور تأیید نشد؛ مجدداً تلاش کنید.");
      } else {
        setReportExportError("شناسه کاربرگ نامعتبر است؛ خروجی ثبت نشد.");
      }
    } catch (err) {
      console.error("❌ خطا در تولید تصویر:", err);
      setReportExportError("تولید خروجی تصویر با خطا مواجه شد.");
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
        {actionError && <p role="alert" className="m-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{actionError}</p>}
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
              <div className="merat-modal-header--legacy merat-modal-tone--neutral bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
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

              {loadingEdit && <p role="status" className="mt-2 text-sm text-sky-700">در حال دریافت اطلاعات کامل کاربرگ...</p>}
              {saveError && <p role="alert" className="mt-2 text-sm text-red-600">{saveError}</p>}
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
                  disabled={loadingEdit || savingKarbarg || !editReady}
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
                  {savingKarbarg ? "در حال ثبت..." : "تایید"}
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
              <div className="merat-modal-header--legacy merat-modal-tone--notice bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
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
                          onClick={() => openViewer(images.map((item) => ({ url: item.url, label: item.file.name })), index)}
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

                {documentsLoading && <p role="status" className="text-sm text-gray-500 mb-2">در حال دریافت اسناد...</p>}
                {documentsError && <p role="alert" className="text-sm text-red-600 mb-2">{documentsError}</p>}
                {!documentsLoading && !documentsError && gridBoxes.length === 0 && (
                  <p className="text-sm text-gray-500 mb-2">سندی برای این کاربرگ ثبت نشده است.</p>
                )}
                <div className="overflow-y-auto" style={{ maxHeight: "40vh" }}>
                  <div className="grid grid-cols-5 gap-3">
                    {gridBoxes.map((box, index) => (
                      <div key={index} onClick={() => {
                        if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(box.label)) openViewer(gridBoxes, index);
                        else window.open(box.url, "_blank", "noopener,noreferrer");
                      }} className="cursor-pointer">
                        <div className="relative w-full h-38 bg-gray-200 rounded-md flex items-center justify-center border border-gray-300 hover:shadow-lg transition-all">
                          {/\.(png|jpe?g|webp|gif|bmp)$/i.test(box.label) ? (
                            <img src={box.url} alt={box.label} className="w-full h-[80%] object-cover rounded-md"
                              onError={() => setDocumentsError("فایل ثبت شده پیدا نشد؛ وجود فایل در public/uploads سرور را بررسی کنید.")} />
                          ) : (
                            <span className="text-sm break-all px-2 text-center" title={box.label}>📄 {box.label}</span>
                          )}

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

                <div className="absolute top-4 left-4 z-50 flex items-center gap-2" dir="ltr">
                  <button type="button" aria-label="کوچک‌نمایی" className="text-white bg-black/60 rounded-lg px-3 py-2"
                    onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2))); }}>−</button>
                  <span className="text-white bg-black/60 rounded-lg px-2 py-2">{Math.round(zoom * 100)}٪</span>
                  <button type="button" aria-label="بزرگ‌نمایی" className="text-white bg-black/60 rounded-lg px-3 py-2"
                    onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2))); }}>+</button>
                  <button type="button" className="text-white bg-black/60 rounded-lg px-3 py-2"
                    onClick={(e) => { e.stopPropagation(); setZoom(1); setOffset({ x: 0, y: 0 }); }}>اندازه اصلی</button>
                </div>
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
                    maxHeight: "85vh",
                    height: "auto",
                    width: "auto",
                    maxWidth: "100vw",
                    objectFit: "contain",
                    transform: `translate(${offset.x + (zoom <= 1.05 ? swipeX : 0)}px, ${offset.y}px) scale(${zoom})`,
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
                  onDoubleClick={(e) => { e.stopPropagation(); setZoom((z) => z > 1 ? 1 : 2); setOffset({ x: 0, y: 0 }); }}
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

                {reportExportError && <p role="alert" className="mt-2 text-red-600">{reportExportError}</p>}
                <div
                  id="div_image" className="merat-legacy-print-form"
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
                    <div
                      key={idKarbarg}
                      contentEditable
                      suppressContentEditableWarning
                      dir="rtl"
                      role="textbox"
                      aria-label="شرح گزارش و دلایل عدم امکان تحقیق"
                      aria-multiline="true"
                      className="bnaznin text-[20px] leading-9 outline-none whitespace-pre-wrap min-h-[170px]"
                      style={{ overflowWrap: "anywhere" }}
                      onInput={(e) => { reportDescriptionRef.current = e.currentTarget.innerText; }}
                      onBlur={() => settozihat(reportDescriptionRef.current)}
                    >{tozihat}</div>
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
              <div className="merat-modal-header--legacy merat-modal-tone--neutral bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
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
