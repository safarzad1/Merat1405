"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { useParams, useRouter } from "next/navigation";

import { decryptText } from "@/lib/cryptoUtil";
import Breadcrumbkhabar from "@/component/Breadcrumb/Breadcrumb";
import DescriptionWithModal from "../../Componnet/DescriptionWithModal";
import TahghighatStateModal from "@/app/(Dashboard)/(Tahghighat)/Componnet/TahghighatStateModal";
import {
  Home,
  Newspaper,
  CardSimIcon,
  PlusCircle,
  Check,
  Send,
  User,
  Download,
  AlertTriangle,
} from "@/component/ResearchIcons";

import { useConfirm } from "@/Utils/ConfirmModalContext";
import { useAlert } from "@/component/AlertContext";
import { showToast } from "@/component/CustomToast";

import PersianDateInput from "@/component/Objects/InputPersianDatePicker";
import InputUserDropdown from "@/component/Objects/DropDownCitys";
import TextArea1 from "@/component/Objects/Textarea1";

import ErjaHozeh from "../../Componnet/ErjaHozeh";
import ErjaOstan from "../../Componnet/ErjaOstan";
import EjraBeMohaghegh from "../../Componnet/EjraBeMohaghegh";
import ErjaMohaghegh from "../../Componnet/ErjaMohaghegh";

import ShowTahghigh from "../ShowPeyvastTahghighat";

import domtoimage from "@/lib/domToImageCompat";
import { motion, AnimatePresence } from "@/lib/framerCompat";
import { v4 as uuidv4 } from "uuid";


import { GetFileNamePic, InsertFile } from "@/services/ApiServiceNameha";
import { GetCheckEmteyaz, GetTahghighByID, ErjaBeMohaghegh as ErjaBeMohagheghApi, JambandiOstan1 } from "@/services/ApiService";
import {
  GetJambandiNahiiOstan,
  InsertJambandiOstan,
  GetJambandiOstanPeyvast,
  GetErjaByID,
  Update_ErjaParvandeh,
  GetParvandehShorayeTahghighByID,
  DeleteParvandehShorayeTahghighByID,
  Update_ErjaParvandehState,
} from "@/services/ApiService";
import { InsertTahghigh } from "@/services/ApiServiceShorayeTahghigh";
import { AddKarbargTahghighDavtalab, GetKarbargDavtalabByShomareh } from "@/services/ApiServiceShorayeTahghigh";
import { AlertDialog } from "@/component/Alert/alert-dialog";


const stripHtmlToText = (html?: string) => {
  if (!html) return "";

  // اگر روی سرور بودیم
  if (typeof window === "undefined") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // روی کلاینت: دقیق‌تر
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // line-break ها
  tmp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  tmp.querySelectorAll("p, div, li").forEach((el) => el.append("\n"));

  const text = (tmp.textContent || "")
    .replace(/\u00A0/g, " ")      // nbsp
    .replace(/\n{3,}/g, "\n\n")  // زیاد شدن line break
    .trim();

  return text;
};

// -------------------- Helpers (Fix contentEditable revert) --------------------
function EditableDiv({
  value,
  onCommit,
  divRef,
  className,
  style,
}: {
  value: string;
  onCommit: (html: string) => void;
  divRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  style?: React.CSSProperties;
}) {
  const draftRef = useRef<string>(value || "");

  useEffect(() => {
    draftRef.current = value || "";
    if (divRef.current && divRef.current.innerHTML !== (value || "")) {
      divRef.current.innerHTML = value || "";
    }
  }, [value, divRef]);

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={style}
      onInput={(e) => {
        draftRef.current = e.currentTarget.innerHTML;
      }}
      onBlur={() => onCommit(draftRef.current)}
    />
  );
}

function EditableSpan({
  value,
  onCommit,
  spanRef,
  className,
}: {
  value: string;
  onCommit: (text: string) => void;
  spanRef: React.RefObject<HTMLSpanElement | null>;
  className?: string;
}) {
  const draftRef = useRef<string>(value || "");

  useEffect(() => {
    draftRef.current = value || "";
    if (spanRef.current && spanRef.current.innerText !== (value || "")) {
      spanRef.current.innerText = value || "";
    }
  }, [value, spanRef]);

  return (
    <span
      ref={spanRef}
      contentEditable
      suppressContentEditableWarning
      className={className}
      onInput={(e) => {
        draftRef.current = e.currentTarget.innerText;
      }}
      onBlur={() => onCommit(draftRef.current)}
    />
  );
}

// -------------------- Types --------------------
type JambandiFile = {
  file: File | null;
  fileExtend: string;
  url: string;
  fileSize: string;
  FileName: string;
  FileNameGUID: string;
  isServer: boolean;
};

type ShorayeTahghighItem = {
  FullNamePerson?: string;
  RecordState?: number;
  CreateDateTime?: string;
};

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

// -------------------- Utils --------------------
const isImageExt = (ext?: string) => {
  const e = (ext || "").toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(e);
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const recordStateLabel = (s?: number) => {
  switch (s) {
    case 1:
      return "بدون اقدام";
    case 2:
      return "پایان کار شورای تحقیق";
    case 3:
      return "برگشت";
    default:
      return "نامشخص";
  }
};

const formatDT = (dt?: string) => {
  if (!dt) return "—";
  const t = dt.replace("T", " ");
  return t.length >= 16 ? t.substring(0, 16) : t;
};

// -------------------- Jambandi Panel (Drop-in) --------------------
type JambandiResponse = {
  ID?: string | number;
  ErjaId?: string | number;
  Jambandi?: string;
  Page1?: string;
  Page2?: string;
  PasokhSoal1?: string;
  CreateDateTime?: string;
  CreateUserId?: string;
  LastEditDateTime?: string | null;
  LastEditUserId?: string | null;
};

type ViewerItem = { url: string; label: string };
const SWIPE_THRESHOLD = 60;

function JambandiPanel({
  open,
  erjaId,
  onClose,
  userId,
  // این دو تابع را از فایل خودت پاس می‌دهیم (همان Importهای موجود)
  JambandiOstan1,
  GetFileNamePic,
}: {
  open: boolean;
  erjaId: number | null;
  onClose: () => void;
  userId: number;
  JambandiOstan1: (id: number) => Promise<any>;
  GetFileNamePic: (fileName: string, userId: number) => Promise<any>;
}) {
  const [jambandi, setJambandi] = React.useState<JambandiResponse | null>(null);
  const [jambandiLoading, setJambandiLoading] = React.useState(false);
  const [jambandiError, setJambandiError] = React.useState("");

  // Resolve FileName -> Blob URL
  const [resolvedFiles, setResolvedFiles] = React.useState<Record<string, string>>({});
  const [resolvingFiles, setResolvingFiles] = React.useState<Record<string, boolean>>({});
  const [resolveErrors, setResolveErrors] = React.useState<Record<string, string>>({});
  const objectUrlsRef = React.useRef<string[]>([]);

  const cleanupObjectUrls = React.useCallback(() => {
    try {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    } catch { }
    objectUrlsRef.current = [];
  }, []);

  React.useEffect(() => {
    return () => cleanupObjectUrls();
  }, [cleanupObjectUrls]);

  React.useEffect(() => {
    if (!open) {
      cleanupObjectUrls();
      setResolvedFiles({});
      setResolvingFiles({});
      setResolveErrors({});
      setJambandi(null);
      setJambandiError("");
      setJambandiLoading(false);
    }
  }, [open, cleanupObjectUrls]);

  const isAbsoluteLike = (s?: string) => {
    if (!s) return false;
    return s.startsWith("http") || s.startsWith("data:") || s.startsWith("blob:");
  };

  const fallbackPublicUploads = (name: string) => `/uploads/${name}`;

  const guessMime = (fileName: string) => {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (ext === "png") return "image/png";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "webp") return "image/webp";
    if (ext === "gif") return "image/gif";
    if (ext === "bmp") return "image/bmp";
    if (ext === "pdf") return "application/pdf";
    return "application/octet-stream";
  };

  const toBlob = (data: any, fileName: string): Blob => {
    if (data instanceof Blob) return data;
    if (data instanceof ArrayBuffer) {
      return new Blob([data], { type: guessMime(fileName) });
    }
    if (data?.buffer instanceof ArrayBuffer) {
      return new Blob([data], { type: guessMime(fileName) });
    }
    throw new Error("خروجی فایل معتبر نیست (Blob/ArrayBuffer دریافت نشد)");
  };

  const ensureResolved = React.useCallback(
    async (fileName?: string) => {
      if (!fileName) return;
      if (resolvedFiles[fileName]) return;
      if (resolvingFiles[fileName]) return;

      if (isAbsoluteLike(fileName)) {
        setResolvedFiles((prev) => ({ ...prev, [fileName]: fileName }));
        return;
      }

      setResolvingFiles((prev) => ({ ...prev, [fileName]: true }));
      setResolveErrors((prev) => ({ ...prev, [fileName]: "" }));

      try {
        const res: any = await GetFileNamePic(fileName, userId);
        const raw = res?.data ?? res;
        const blob = toBlob(raw, fileName);
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.push(url);
        setResolvedFiles((prev) => ({ ...prev, [fileName]: url }));
      } catch (e: any) {
        setResolveErrors((prev) => ({
          ...prev,
          [fileName]: e?.message || "خطا در دریافت فایل",
        }));
        setResolvedFiles((prev) => ({ ...prev, [fileName]: fallbackPublicUploads(fileName) }));
      } finally {
        setResolvingFiles((prev) => ({ ...prev, [fileName]: false }));
      }
    },
    [GetFileNamePic, resolvedFiles, resolvingFiles, userId]
  );

  const loadJambandi = React.useCallback(
    async (id: number) => {
      setJambandiError("");
      setJambandiLoading(true);
      try {
        const res: any = await JambandiOstan1(Number(id));
        const parsed = res?.data?.data ?? res?.data ?? res;
        const obj = Array.isArray(parsed)
          ? (parsed.find((x: any) => String(x?.ErjaId) === String(id)) ?? parsed[0])
          : parsed;
        setJambandi(obj || null);
      } catch (e: any) {
        console.error(e);
        setJambandiError(e?.message || "خطا در دریافت جم‌بندی");
        setJambandi(null);
      } finally {
        setJambandiLoading(false);
      }
    },
    [JambandiOstan1]
  );

  React.useEffect(() => {
    if (open && erjaId) {
      // reset before load
      cleanupObjectUrls();
      setResolvedFiles({});
      setResolvingFiles({});
      setResolveErrors({});
      setJambandi(null);
      setJambandiError("");
      setJambandiLoading(false);

      loadJambandi(erjaId);
    }
  }, [open, erjaId, cleanupObjectUrls, loadJambandi]);

  React.useEffect(() => {
    if (jambandi?.Page1) ensureResolved(jambandi.Page1);
    if (jambandi?.Page2) ensureResolved(jambandi.Page2);
  }, [jambandi?.Page1, jambandi?.Page2, ensureResolved]);

  // Viewer (Zoom / Pan / Swipe)
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerItems, setViewerItems] = React.useState<ViewerItem[]>([]);
  const [viewerIndex, setViewerIndex] = React.useState(0);

  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [startDrag, setStartDrag] = React.useState({ x: 0, y: 0 });

  const swipeStartXRef = React.useRef<number | null>(null);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const [swipeX, setSwipeX] = React.useState(0);

  const resetViewerTransform = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSwipeX(0);
    setIsDragging(false);
    setIsSwiping(false);
    swipeStartXRef.current = null;
  };

  const openViewer = (items: ViewerItem[], index: number) => {
    setViewerItems(items);
    setViewerIndex(index);
    setViewerOpen(true);
    resetViewerTransform();
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerItems([]);
    setViewerIndex(0);
    resetViewerTransform();
  };

  const goNextViewer = () => {
    if (!viewerItems.length) return;
    setViewerIndex((i) => (i + 1) % viewerItems.length);
    resetViewerTransform();
  };

  const goPrevViewer = () => {
    if (!viewerItems.length) return;
    setViewerIndex((i) => (i - 1 + viewerItems.length) % viewerItems.length);
    resetViewerTransform();
  };

  const pageItems: ViewerItem[] = React.useMemo(() => {
    const p1Name = jambandi?.Page1;
    const p2Name = jambandi?.Page2;
    const p1Url = p1Name ? (resolvedFiles[p1Name] || fallbackPublicUploads(p1Name)) : "";
    const p2Url = p2Name ? (resolvedFiles[p2Name] || fallbackPublicUploads(p2Name)) : "";
    const p1 = p1Name ? { url: p1Url, label: "Page1" } : null;
    const p2 = p2Name ? { url: p2Url, label: "Page2" } : null;
    return [p1, p2].filter(Boolean) as ViewerItem[];
  }, [jambandi?.Page1, jambandi?.Page2, resolvedFiles]);

  const ThumbCard = ({ label, fileName }: { label: "Page1" | "Page2"; fileName?: string }) => {
    if (!fileName) {
      return (
        <div className="border rounded-lg p-3 bg-gray-50 text-gray-600">
          <div className="font-semibold mb-2">{label}</div>
          <div className="text-sm">فایلی ثبت نشده</div>
        </div>
      );
    }

    const url = resolvedFiles[fileName] || fallbackPublicUploads(fileName);
    const isLoading = !!resolvingFiles[fileName];
    const err = resolveErrors[fileName];

    return (
      <div className="w-full text-right border rounded-lg p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">{label}</div>
          <div className="flex items-center gap-2">
            {isLoading && <span className="text-xs text-gray-600">در حال دریافت فایل...</span>}
            {!!err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        </div>

        <div className="w-full border rounded-md overflow-hidden bg-gray-100">
          <img
            src={url}
            alt={label}
            className="w-full h-[240px] object-contain cursor-zoom-in"
            onClick={() => {
              const items = pageItems;
              const idx = items.findIndex((x) => x.label === label);
              if (idx >= 0) openViewer(items, idx);
            }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              const fallback = fallbackPublicUploads(fileName);
              if (img.src !== fallback) img.src = fallback;
            }}
          />
        </div>

        <div className="mt-2 text-xs text-gray-500 break-all">{url}</div>
      </div>
    );
  };

  if (!open) return null;

  const stripHtml = (html?: string) => {
    if (!html) return "";
    if (typeof window === "undefined") {
      return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
  };

  return (
    <>
      {/* پنل جم‌بندی */}
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[92%] max-w-[1200px] bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="font-bold text-gray-800">پنل نمایش جم‌بندی</div>
            <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" onClick={onClose}>
              بستن
            </button>
          </div>

          <div className="p-4 max-h-[75vh] overflow-auto">
            {jambandiLoading && <div className="p-3 text-sm text-gray-600">در حال دریافت اطلاعات...</div>}
            {!!jambandiError && <div className="p-3 text-sm text-red-600">{jambandiError}</div>}

            {!jambandiLoading && !jambandiError && (
              <div className="space-y-4">
                <div className="border rounded-lg p-3 bg-white">
                  <div className="font-semibold mb-2">توضیحات جمع بندی</div>

                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {stripHtml(jambandi?.Jambandi)?.trim() ? stripHtml(jambandi?.Jambandi) : "—"}
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ThumbCard label="Page1" fileName={jambandi?.Page1} />
                  <ThumbCard label="Page2" fileName={jambandi?.Page2} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Viewer زوم/پن/سوایپ */}
      {viewerOpen && viewerItems.length > 0 && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80"
          onClick={() => {
            if (!isDragging && !isSwiping) closeViewer();
          }}
          onWheel={(e) => {
            e.preventDefault();
            setZoom((prev) => Math.min(Math.max(0.5, prev + (e.deltaY < 0 ? 0.1 : -0.1)), 6));
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
            alt={viewerItems[viewerIndex]?.label}
            draggable={false}
            className="select-none"
            style={{
              height: "92vh",
              width: "auto",
              maxWidth: "96vw",
              objectFit: "contain",
              transform: `scale(${zoom}) translate(${offset.x + (zoom <= 1.05 ? swipeX : 0)}px, ${offset.y}px)`,
              transition: isDragging || isSwiping ? "none" : "transform 0.15s ease",
              cursor: zoom > 1.05 ? (isDragging ? "grabbing" : "grab") : "default",
              borderRadius: 10,
              touchAction: zoom > 1.05 ? "none" : "pan-y",
            }}
            onPointerDown={(e) => {
              if (zoom <= 1.05) {
                setIsSwiping(true);
                swipeStartXRef.current = e.clientX;
                setSwipeX(0);
                return;
              }
              setIsDragging(true);
              setStartDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            }}
            onPointerMove={(e) => {
              if (isSwiping && swipeStartXRef.current !== null) {
                const dx = e.clientX - swipeStartXRef.current;
                setSwipeX(dx);
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
            {viewerItems[viewerIndex]?.label} — {viewerIndex + 1} / {viewerItems.length}
          </div>

          <div className="absolute bottom-4 right-4 text-white text-xs bg-black/60 px-3 py-2 rounded-lg z-50 space-y-1">
            <div>🖱️ Wheel: زوم</div>
            <div>🖐️ Drag: حرکت</div>
            <div>↔️ Swipe: جابجایی</div>
          </div>
        </div>
      )}
    </>
  );
}

// -------------------- Main --------------------
export default function ParvandehPage() {

  const [jambandiPanelOpen, setJambandiPanelOpen] = useState(false);
  const [jambandiPanelErjaId, setJambandiPanelErjaId] = useState<number | null>(null);

  const openJambandiPanel = (id: number) => {
    setJambandiPanelErjaId(id);
    setJambandiPanelOpen(true);
  };

  const [ModalOpenStatus, setModalOpenStatus] = useState(false);

  const router = useRouter();
  const params = useParams();
  const { showConfirm } = useConfirm();
  const { showAlert } = useAlert();
  const user = useMeratUser();

  // ✅ refs for Pasokh 1..8 (span)
  const pasokhRefs = useMemo(
    () => Array.from({ length: 8 }, () => React.createRef<HTMLSpanElement>()),
    []
  );

  // ✅ contentEditable div refs (avoid dangerouslySetInnerHTML)
  const SoalatBoxRef = useRef<HTMLDivElement | null>(null);
  const PasokhBoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe1BoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe2BoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe3BoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe4BoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe5BoxRef = useRef<HTMLDivElement | null>(null);
  const Manabe6BoxRef = useRef<HTMLDivElement | null>(null);
  const TozihatMohagheghBoxRef = useRef<HTMLDivElement | null>(null);
  const PeyvastBoxRef = useRef<HTMLDivElement | null>(null);
  const jambandiBoxRef = useRef<HTMLDivElement | null>(null);

  // ✅ FIX: prevent Jambandi reverting on any click/rerender
  const jambandiDraftRef = useRef<string>("");
  const [jambandiDirty, setJambandiDirty] = useState(false);

  // -------------------- State --------------------
  const [hasApiJambandi, setHasApiJambandi] = useState(false);

  const [NameOstan, setNameOstan] = useState<string>("");
  const [NameHozeh, setNameHozeh] = useState<string>("");
  const [FileName, setFileName] = useState("");

  const [erjaId, setErjaId] = useState(0);
  const [UserId, setUserId] = useState(0);

  const [data, setData] = useState<any[]>([]);
  const [Davtalab, setDavtalab] = useState<DavtalabData | null>(null);

  const [jambandiFiles, setJambandiFiles] = useState<JambandiFile[]>([]);

  // Pasokh 1..8
  const [pasokh, setPasokh] = useState<string[]>(Array(8).fill(""));
  const [errorPasokh, setErrorPasokh] = useState<string[]>(Array(8).fill(""));

  // selected 1..7
  const [selected, setSelected] = useState<number[]>(Array(7).fill(-1));

  const [StateDoneTahghigh, setStateDoneTahghigh] = useState(false);
  const [StateTahghigh, setStateTahghigh] = useState(0);

  const [CountExtraPeyvast, setCountExtraPeyvast] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Jambandi (store as HTML string)
  const [JambandiOstan, setJambandiOstan] = useState<string>("");
  const [errorjambandiOsatn, seterrorjambandiOsatn] = useState<string>("");

  // Shora
  const [shoraItems, setShoraItems] = useState<ShorayeTahghighItem[]>([]);
  const [shoraLoading, setShoraLoading] = useState(false);
  const [shoraError, setShoraError] = useState("");

  // modals / controls
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImg, setPreviewImg] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const [ModalOpenAdamNeyazBeTahghigh, setModalOpenAdamNeyazBeTahghigh] = useState(false);
  const [ModalOpenAdamEmkanTahghigh, setModalOpenAdamEmkanTahghigh] = useState(false);
  const [ModalOpenErjabeOstanBedonTahghigh, setModalOpenErjabeOstanBedonTahghigh] = useState(false);
  const [ModalNazarParvandeh, setModalNazarParvandeh] = useState(false);

  const [ModalOpenErjaBeHozeh, setModalOpenErjaBeHozeh] = useState(false);
  const [ModalOpenErjaBeOstan, setModalOpenErjaBeOstan] = useState(false);
  const [ModalOpenErjaBeMohaghegh, setModalOpenErjaBeMohaghegh] = useState(false);
  const [ModalOpenErjaBeShorayeTahghigh, setModalOpenErjaBeShorayeTahghigh] = useState(false);

  const [ModalOpenCreateForm, setModalOpenCreateForm] = useState(false);
  const [ModalOpenKargroupMosahebe, setModalOpenKargroupMosahebe] = useState(false);

  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [isOpen3, setIsOpen3] = useState(false);

  const [tozihat, setTozihat] = useState("");
  const [errortozihat, setErrortozihat] = useState(false);

  const [CityMarkaz, setCityMarkaz] = useState<number | null>(null);
  const [CodeMohaghegh, setCodeMohaghegh] = useState<number | null>(null);
  const [tarikh, settarikh] = useState<string | null>(null);
  const [errorMohaghegh, setErrorMohaghegh] = useState(false);
  const [errorTarikh, seterrorTarikh] = useState(false);

  const [onvanparvandeh, setonvanparvandeh] = useState("");

  // Mosahebe contentEditable html strings
  const [SoalatParvandeh, setSoalatParvandeh] = useState("");
  const [PasokhParvandeh, setPasokhParvandeh] = useState("");
  const [Manabe1, setManabe1] = useState("");
  const [Manabe2, setManabe2] = useState("");
  const [Manabe3, setManabe3] = useState("");
  const [Manabe4, setManabe4] = useState("");
  const [Manabe5, setManabe5] = useState("");
  const [Manabe6, setManabe6] = useState("");
  const [TozihatMohaghegh, setTozihatMohaghegh] = useState("");
  const [PeyvastDavtalab, setPeyvastDavtalab] = useState("");

  // zoom & pan preview
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef({ startX: 0, startY: 0, startOx: 0, startOy: 0, panning: false });

  // -------------------- Constants --------------------
  const radioItems = useMemo(
    () => [
      // Q1
      ["معتقد و ملتزم", "غیرعامل و در تقابل", "کاهل و دارای رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
      // Q2
      ["عامل و ملتزم", "غیرعامل و در تقابل", "کاهل و دارای رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
      // Q3
      ["مدافع و همسو با نظام", "مخالف و در تقابل", "رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
      // Q4
      ["عامل و ملتزم", "غیرعامل و در تقابل", "کاهل و دارای رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
      // Q5
      ["معتقد و ملتزم", "غیر عامل و در تقابل", "رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
      // Q6
      ["عامل و ملتزم به مسائل شرعی و قانونی", "غیر عامل و در تقابل با مسائل شرعی و قانونی", "رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
      // Q7
      ["عامل و ملتزم", "غیرعامل و در تقابل", "رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
    ],
    []
  );

  const questions = useMemo(
    () => [
      "1. اعتقاد و التزام عملی داوطلب به مسائل دینی ، اعتقادی و عبادی :",
      "2. وضعیت داوطلب در حوزه مسائل اخلاقی، رفتاری و شخصیتی :",
      "3. التزام عملی داوطلب به نظام مقدس جمهوری اسلامی ایران و مواضع و عملکرد وی در حوزه مسائل سیاسی و امنیتی :",
      "4.  ابراز وفاداری و مواضع و عملکرد داوطلب نسبت به اصل ولایت مطلقه فقیه و میزان پایبندی وی به دستورات ، سیاست ها و منویات مقام معظم رهبری:",
      "5. ابراز وفاداری و میزان  پایبندی داوطلب به قوانین و مقررات کشور (قانون اساسی و قوانین عادی) :",
      "6. وضعیت داوطلب در حوزه مسائل اقتصادی و مالی :",
      "7. وضعیت خانواده بستگان درجه یک / سببی و نسبی ، دوستان و معاشرین داوطلب ... :",
      "8.  ویژگی ها، موفقیت ها یا خدمات برجسته داوطلب که در مقایسه با افراد مشابه واجد ارزش بوده و به صورت مستقیم یا غیرمستقیم می تواند منجر به خدمت به جامعه گردد:",
    ],
    []
  );

  // -------------------- Effects --------------------
  useEffect(() => {
    setUserId(user.UserId || 0);
  }, [user?.UserId]);

  // decode erjaId
  useEffect(() => {
    const keyData = params?.KeyData as string;
    if (!keyData) return;
    try {
      const decoded = Number(decryptText(decodeURIComponent(keyData)));
      setErjaId(decoded);
      loadData(decoded);
    } catch (err) {
      console.error("❌ خطا در رمزگشایی شناسه:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // load jambandi files (preview list)
  useEffect(() => {
    const loadJambandiFiles = async () => {
      try {
        const result = await GetJambandiOstanPeyvast(erjaId);
        const filesArray: any[] = Array.isArray(result) ? result : (result.data ?? []);
        const mapped: JambandiFile[] = filesArray.map((f: any) => ({
          file: null,
          fileExtend: (f.FileName || "").split(".").pop() || "",
          url: `/uploads/${f.FileName}`,
          fileSize: "",
          FileName: f.FileName,
          FileNameGUID: uuidv4() + ".png",
          isServer: true,
        }));
        setJambandiFiles(mapped);
      } catch (err) {
        console.error("خطا در بارگذاری فایل‌های جمعبندی:", err);
      }
    };
    if (erjaId) loadJambandiFiles();
  }, [erjaId]);

  // ✅ FIX: only sync jambandi DOM when NOT dirty (prevents revert on any click)
  useEffect(() => {
    if (!jambandiBoxRef.current) return;
    if (jambandiDirty) return;

    const html = JambandiOstan || "";
    jambandiDraftRef.current = html;

    if (jambandiBoxRef.current.innerHTML !== html) {
      jambandiBoxRef.current.innerHTML = html;
    }
  }, [JambandiOstan, jambandiDirty]);

  // LoadOneErja when modals open
  useEffect(() => {
    if (ModalOpenCreateForm || ModalOpenKargroupMosahebe) {
      LoadOneErja(erjaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ModalOpenCreateForm, ModalOpenKargroupMosahebe]);

  // ✅ when opening create form, allow ShowTahghigh to fill once (not dirty)
  useEffect(() => {
    if (!ModalOpenCreateForm) return;
    setJambandiDirty(false);
    jambandiDraftRef.current = JambandiOstan || "";
  }, [ModalOpenCreateForm]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------- Handlers --------------------
  const resetZoomPan = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!viewerRef.current) return;

    const rect = viewerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nextZoom = clamp(zoom * factor, 1, 6);

    if (nextZoom === 1) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    setOffset({
      x: offset.x + px * (1 / nextZoom - 1 / zoom),
      y: offset.y + py * (1 / nextZoom - 1 / zoom),
    });
    setZoom(nextZoom);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOx: offset.x,
      startOy: offset.y,
      panning: true,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current.panning) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setOffset({
      x: panRef.current.startOx + dx / zoom,
      y: panRef.current.startOy + dy / zoom,
    });
  };

  const handlePointerUp = () => {
    panRef.current.panning = false;
  };

  // -------------------- API Actions --------------------
  const loadData = async (id: number) => {
    console.log("id=" + id);
    try {
      setShoraLoading(true);
      setShoraError("");

      const [result, shoraRes] = await Promise.all([
        GetTahghighByID(id, 0, 0),
        GetParvandehShorayeTahghighByID(id),
      ]);
      // Shora rows
      try {
        const rows: ShorayeTahghighItem[] =
          Array.isArray((shoraRes as any)?.data)
            ? (shoraRes as any).data
            : Array.isArray(shoraRes as any)
              ? (shoraRes as any)
              : [];
        setShoraItems(rows || []);
      } catch {
        setShoraItems([]);
      } finally {
        setShoraLoading(false);
      }

      if (result.status === 200) {
        setFileName(result.data?.[0]?.FileName || "");
        setonvanparvandeh(
          `پرونده ${result.data[0].FirstName} ${result.data[0].LastName} حوزه ${result.data[0].NameOstan} - ${result.data[0].NameHozeh}`
        );
        setData(result.data || []);
      } else if (result.status === 401) {
        router.push("/Login");
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
      setShoraItems([]);
      setShoraLoading(false);
      setShoraError("خطا در دریافت اطلاعات شورای تحقیق");
    }
  };

  const LoadOneErja = async (ErjaId: number) => {
    if (!ErjaId) return;

    const result = await GetErjaByID(ErjaId);
    const resultjambandi = await GetJambandiNahiiOstan(ErjaId);

    if (resultjambandi?.status === 200 && resultjambandi?.data?.length > 0) {
      const row = resultjambandi.data[0];

      setSelected((prev) => {
        const next = [...prev];
        next[0] = row.ValueSoal1 ?? -1;
        next[1] = row.ValueSoal2 ?? -1;
        next[2] = row.ValueSoal3 ?? -1;
        next[3] = row.ValueSoal4 ?? -1;
        next[4] = row.ValueSoal5 ?? -1;
        next[5] = row.ValueSoal6 ?? -1;
        next[6] = row.ValueSoal7 ?? -1;
        return next;
      });

      const stripHtmlAndClampBlankLines = (html?: string) => {
        if (!html) return "";

        let text = "";

        if (typeof window === "undefined") {
          // SSR-safe (fallback)
          text = html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<\/div>/gi, "\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");
        } else {
          // Client: more accurate stripping
          const tmp = document.createElement("div");
          tmp.innerHTML = html;

          // Convert HTML breaks to text breaks
          tmp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
          tmp.querySelectorAll("p, div, li").forEach((el) => el.append("\n"));

          text = tmp.textContent || "";
        }

        // Normalize spaces + compress consecutive blank lines
        return text
          .replace(/\u00A0/g, " ")          // nbsp
          .replace(/\r/g, "")               // Windows CR
          .replace(/[ \t]+\n/g, "\n")       // trim trailing spaces
          .replace(/\n{3,}/g, "\n\n")       // many blank lines => one blank line
          .trim();
      };

      const jambandiFromApi = (row?.Jambandi ?? "").toString();
      if (jambandiFromApi.trim().length > 0) {
        setHasApiJambandi(true);

        // ✅ strip html + compress blank lines
        const plain = stripHtmlAndClampBlankLines(jambandiFromApi);

        // ✅ reset dirty and draft when loading from API
        setJambandiDirty(false);
        jambandiDraftRef.current = plain;

        // ✅ state also keeps plain text
        setJambandiOstan(plain);

        requestAnimationFrame(() => {
          if (jambandiBoxRef.current) {
            // ✅ IMPORTANT: do NOT set innerHTML
            jambandiBoxRef.current.textContent = plain;
          }
        });
      } else {
        setHasApiJambandi(false);
        setJambandiDirty(false);
        jambandiDraftRef.current = "";
      }

      const p: string[] = [
        row.PasokhSoal1 ?? "",
        row.PasokhSoal2 ?? "",
        row.PasokhSoal3 ?? "",
        row.PasokhSoal4 ?? "",
        row.PasokhSoal5 ?? "",
        row.PasokhSoal6 ?? "",
        row.PasokhSoal7 ?? "",
        row.PasokhSoal8 ?? "",
      ];
      setPasokh(p);
    }

    if (result?.data?.length > 0) {
      setNameHozeh(result.data[0].NameHozeh);
      setNameOstan(result.data[0].NameOstan);
      setDavtalab(result.data[0]);
    }
  };

  const ResultTo = async (id: number, stateerja: number, sharheghdam: string) => {
    const result = await Update_ErjaParvandeh(id, true, stateerja, sharheghdam, user.UserId);
    if ((result as any)?.state === 401) router.push("/Login");
    else {
      setModalOpenAdamNeyazBeTahghigh(false);
      setModalOpenAdamEmkanTahghigh(false);
      setModalOpenErjabeOstanBedonTahghigh(false);
      router.refresh();
    }
  };

  const ResultParvandeh = async (id: number, stateparvandeh: number, text: string) => {
    const result = await Update_ErjaParvandehState(id, stateparvandeh, text, user.UserId);
    if ((result as any)?.state === 401) router.push("/Login");
    else {
      setModalNazarParvandeh(false);
      router.push("/TahghighatManage");
    }
  };

  const saveErjaHozeh = async (mahalSender: number, mahalReciver: number, isInsert: number) => {
    try {
      const res = await fetch("/Api/Tahghigh/InsertErjaTahghigh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perjaid: erjaId,
          mahalSender,
          mahalReciver,
          description: tozihat,
          userId: UserId,
          isInsert,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        if (result?.data?.[0]?.IsSuccess === false) {
          showConfirm(
            "آیا از ارجاع مجدد اطمینان دارید؟",
            () => saveErjaHozeh(user.Mahal, mahalReciver, 1),
            "هشدار!",
            "warning"
          );
        }
        setModalOpenErjaBeHozeh(false);
        setModalOpenErjaBeOstan(false);
        loadData(erjaId);
      } else {
        alert("⚠️ خطا در ذخیره اطلاعات");
      }
    } catch (err) {
      console.error(err);
      alert("❌ خطا در برقراری ارتباط با سرور");
    }
  };

  const saveErjaMohaghegh = async (isInsert: number) => {
    if (!CodeMohaghegh || CodeMohaghegh === 0) {
      setErrorMohaghegh(true);
      return;
    }
    if (!tarikh) {
      seterrorTarikh(true);
      return;
    }
    setErrorMohaghegh(false);
    seterrorTarikh(false);

    const result = await ErjaBeMohagheghApi(erjaId, erjaId, CodeMohaghegh, tarikh, tozihat, UserId, isInsert);
    if ((result as any)?.data?.[0]?.InSuccess === true) {
      setModalOpenErjaBeMohaghegh(false);
      setCodeMohaghegh(null);
      settarikh(null);
      loadData(erjaId);
    } else if ((result as any)?.data?.[0]?.IsSuccess === false && (result as any)?.data?.[0]?.Status === 201) {
      showConfirm("آیا از ارجاع مجدد اطمینان دارید؟", () => saveErjaMohaghegh(1), "هشدار!", "warning");
    }
  };

  const ReferToTeam = async () => setModalOpenErjaBeShorayeTahghigh(true);

  const saveErjaBeShorayeTahghigh = async (
    erjaid: number,
    description: string,
    expireDate: string,
    userid: number,
    createUserId: number
  ) => {
    await InsertTahghigh(erjaid, description, expireDate, userid, createUserId);
    await Update_ErjaParvandeh(erjaid, 0, 4, "ارسال به شورای تحقیق", user.UserId);
    setModalOpenErjaBeShorayeTahghigh(false);
    router.push("/TahghighatManage");
  };

  const deleteShoraItem = async () => {
    try {
      showConfirm(
        "آیا از حذف ارجاع شورای تحقیق (بدون اقدام) مطمئن هستید؟",
        async () => {
          const res = await DeleteParvandehShorayeTahghighByID(erjaId, user.UserId);
          if ((res as any)?.status === 200 || (res as any)?.data?.status === 200) {
            showToast.success("حذف با موفقیت انجام شد", "شورای تحقیق");
          } else {
            showToast.success("حذف انجام شد", "شورای تحقیق");
          }
          await loadData(erjaId);
          router.refresh();
        },
        "هشدار!",
        "warning"
      );
    } catch (e) {
      console.error(e);
      showToast.error("خطا در حذف اطلاعات شورای تحقیق", "خطا");
    }
  };

  const downloadfilenameh = async () => {
    if (!FileName || FileName.trim() === "") {
      showAlert({ type: "error", title: "خطا", description: "برای این داوطلب کاربرگی تولید نشده است" });
      return;
    }
    try {
      const result = await GetFileNamePic(FileName, 2);
      if (!result || !(result instanceof Blob)) {
        showAlert({ type: "error", title: "عملیات ناموفق", description: "فایل کاربرگ جهت دانلود وجود ندارد" });
        return;
      }
      const url = window.URL.createObjectURL(result);
      const link = document.createElement("a");
      link.href = url;
      link.download = FileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("خطا در دانلود فایل:", error);
      showAlert({ type: "error", title: "خطا", description: "خطا در ارتباط با سرور" });
    }
  };

  // -------------------- domtoimage export --------------------
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

    const scale = 2;
    const width = (node as any).scrollWidth;
    const height = (node as any).scrollHeight;

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

  // -------------------- Save Karbarg Tajmi (fixed Pasokh via EditableSpan) --------------------
  const SaveKarbargTajmiOstan = async () => {
    // validations
    for (let i = 0; i < 7; i++) {
      if (selected[i] === -1) {
        showToast.error(`پاسخ گزینه شماره ${i + 1} را انتخاب نمایید`, "عزیز دل برادر");
        return;
      }
      if (!pasokh[i] || pasokh[i].trim().length === 0) {
        showToast.error(`پاسخ سوال شماره ${i + 1} را وارد نمایید`, "عزیز دل برادر");
        return;
      }
    }
    if (!pasokh[7] || pasokh[7].trim().length === 0) {
      showToast.error("پاسخ سوال شماره 8 را وارد نمایید", "عزیز دل برادر");
      return;
    }

    try {
      const f1 = await exportNodeToPNGFile("div_image_page1", "page1.png");
      if (!f1) return;
      const f2 = await exportNodeToPNGFile("div_image_page2", "page2.png");
      if (!f2) return;

      const file1: JambandiFile = {
        file: f1.file,
        url: f1.previewUrl,
        fileExtend: "png",
        fileSize: (f1.file.size / 1024 / 1024).toFixed(2),
        FileName: f1.file.name,
        FileNameGUID: uuidv4() + ".png",
        isServer: false,
      };

      const file2: JambandiFile = {
        file: f2.file,
        url: f2.previewUrl,
        fileExtend: "png",
        fileSize: (f2.file.size / 1024 / 1024).toFixed(2),
        FileName: f2.file.name,
        FileNameGUID: uuidv4() + ".png",
        isServer: false,
      };

      const newFiles = [file1, file2];

      setJambandiFiles((prev) => {
        prev.forEach((p) => {
          if (!p.isServer && p.url) URL.revokeObjectURL(p.url);
        });
        return newFiles;
      });

      await InsertJambandiOstan(
        erjaId,
        pasokh[0],
        pasokh[1],
        pasokh[2],
        pasokh[3],
        pasokh[4],
        pasokh[5],
        pasokh[6],
        pasokh[7],
        selected[0],
        selected[1],
        selected[2],
        selected[3],
        selected[4],
        selected[5],
        selected[6],
        JambandiOstan,
        newFiles[0].FileNameGUID,
        newFiles[1].FileNameGUID,
        user.UserId
      );

      await InsertFile(newFiles[0].FileNameGUID, user.UserId, f1.file);
      await InsertFile(newFiles[1].FileNameGUID, user.UserId, f2.file);

      const resultDone = await Update_ErjaParvandeh(erjaId, StateDoneTahghigh, StateTahghigh, JambandiOstan, user.UserId);
      if ((resultDone as any)?.status === 200) {
        setModalOpenCreateForm(false);
        router.push("/TahghighatManage");
      }
    } catch (err) {
      console.error("❌ خطا:", err);
      alert("❌ خطا در تولید یا ارسال فایل");
    }
  };

  // -------------------- Save Karbarg Mosahebe (fixed all contentEditable) --------------------
  const SaveKarbargMosaheghe = async () => {
    // normalize
    setManabe1(Manabe1 ?? "");
    setManabe2(Manabe2 ?? "");
    setManabe3(Manabe3 ?? "");
    setManabe4(Manabe4 ?? "");
    setManabe5(Manabe5 ?? "");
    setManabe6(Manabe6 ?? "");

    if (!SoalatParvandeh.trim() || SoalatParvandeh.length < 10) {
      showToast.error("سوالی ثبت نشده است", "عزیز دل برادر");
      return;
    }
    if (!PasokhParvandeh.trim() || PasokhParvandeh.length < 10) {
      showToast.error("پاسخی ثبت نشده است", "عزیز دل برادر");
      return;
    }
    if (!TozihatMohaghegh.trim() || TozihatMohaghegh.length < 10) {
      showToast.error("توضیحات محقق ثبت نشده است", "عزیز دل برادر");
      return;
    }

    try {
      const f1 = await exportNodeToPNGFile("div_image_page3", "page1.png");
      if (!f1) return;
      const guidName = uuidv4() + ".png";

      await AddKarbargTahghighDavtalab(
        data?.[0]?.ShomarehParvandeh,
        31210,
        1,
        guidName,
        SoalatParvandeh,
        PasokhParvandeh,
        Manabe1,
        Manabe2,
        Manabe3,
        Manabe4,
        Manabe5,
        Manabe6,
        TozihatMohaghegh,
        PeyvastDavtalab,
        CodeMohaghegh,
        "",
        user.UserId,
        f1.file
      );

      showToast.success("عملیات با موفقیت انجام شد.", "ثبت کاربرگ مصاحبه");
      setModalOpenKargroupMosahebe(false);
    } catch (err) {
      console.error("❌ خطا:", err);
      alert("❌ خطا در تولید یا ارسال فایل");
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

    const result = await GetKarbargDavtalabByShomareh(data?.[0]?.ShomarehParvandeh, 31210, user.UserId);
    if (result?.data?.length > 0) {
      const r = result.data[0];
      setSoalatParvandeh(r.Soalat || "");
      setPasokhParvandeh(r.Pasokh || "");
      setManabe1(r.Manabe1 || "");
      setManabe2(r.Manabe2 || "");
      setManabe3(r.Manabe3 || "");
      setManabe4(r.Manabe4 || "");
      setManabe5(r.Manabe5 || "");
      setManabe6(r.Manabe6 || "");
      setTozihatMohaghegh(r.TozihatMohaghegh || "");
      setPeyvastDavtalab(r.PeyvastDavtalab || "");
    }
    setModalOpenKargroupMosahebe(true);
  };
  const stripHtmlAndClampBlankLines = (html?: string) => {
    if (!html) return "";

    let text = "";

    if (typeof window === "undefined") {
      // SSR-safe (fallback)
      text = html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    } else {
      // Client: more accurate stripping
      const tmp = document.createElement("div");
      tmp.innerHTML = html;

      // Convert HTML breaks to text breaks
      tmp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      tmp.querySelectorAll("p, div, li").forEach((el) => el.append("\n"));

      text = tmp.textContent || "";
    }

    // Normalize spaces + compress consecutive blank lines
    return text
      .replace(/\u00A0/g, " ")          // nbsp
      .replace(/\r/g, "")               // Windows CR
      .replace(/[ \t]+\n/g, "\n")       // trim trailing spaces
      .replace(/\n{3,}/g, "\n\n")       // many blank lines => one blank line
      .trim();
  };
  // -------------------- Render --------------------
  return (
    <>
      {/* Header */}
      <div className="bg-sky-200 rounded py-2 px-10 research-detail-breadcrumb-wrap">
        <Breadcrumbkhabar
          items={[
            { label: "داشبورد", href: "/Dashboard", icon: <Home className="w-4 h-4" /> },
            { label: "فهرست اشخاص", href: "/Davtalab/CardDavtalab", icon: <User className="w-4 h-4" /> },
            { label: "مدیریت تحقیقات", href: "/TahghighatManage", icon: <Newspaper className="w-4 h-4" /> },
            { label: onvanparvandeh, icon: <CardSimIcon className="w-4 h-4" /> },
          ]}
        />
      </div>

      <div className="bg-white m-1 py-2 px-2 flex flex-col md:flex-row gap-4 rounded-b-xl research-detail-shell">
        <div className="bg-white rounded-b-xl shadow w-full flex flex-col gap-2 research-detail-surface">
          {/* Top info row */}
          {data.length > 0 && (
            <div
              className={`h-12 p-2 rounded-lg shadow w-full items-center gap-4 research-case-toolbar ${data[0].IsDone === true ? "bg-green-100" : "bg-gray-200"
                }`}
            >
              <div className="mx-10 flex gap-5 whitespace-nowrap items-center justify-between research-case-toolbar-inner">


                {(user.PostId <= 5) && (
                  <div className="flex gap-2 order-last">


                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openJambandiPanel((data?.[0]?.ErjaId ?? erjaId) as number);
                      }}
                      className="px-4 py-1 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700 transition cursor-pointer"
                    >
                      جمع بندی
                    </button>


                    <button
                      onClick={() => {
                        setStateDoneTahghigh(true);
                        setStateTahghigh(12);
                        setModalOpenCreateForm(true);
                      }}
                      className="flex items-center gap-1 p-2 px-4 bg-green-800 text-white rounded-2xl shadow hover:bg-green-700 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />

                      تایید پرونده

                    </button>

                    <button
                      onClick={() => {
                        setStateDoneTahghigh(false);
                        setStateTahghigh(13);
                        setModalNazarParvandeh(true);
                      }}
                      className="flex items-center gap-1 p-2 px-4 bg-yellow-500 text-black rounded-2xl shadow hover:bg-yellow-600 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      بازگشت پرونده
                    </button>

                    {/* <p className="px-5 rounded-2xl bg-amber-200 border-gray-400 h-8 flex items-center text-sm">
                      {data[0].CreateDateTime9}  مهلت اعلام نظر                     </p> */}

                  </div>
                )}




                {(user.PostId == 54) && (
                  <div className="flex gap-2 order-last">
                    <button
                      onClick={() => {
                        setStateDoneTahghigh(false);
                        setStateTahghigh(6);
                        setModalOpenCreateForm(true);
                      }}
                      className="flex items-center gap-1 p-2 px-4 bg-green-800 text-white rounded-2xl shadow hover:bg-green-700 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      جمع بندی پرونده
                    </button>
                  </div>
                )}

                {(user.PostId == 50) && (
                  <div className="flex gap-2 order-last">
                    <button
                      onClick={() => {
                        setStateDoneTahghigh(true);
                        setStateTahghigh(10);
                        setModalOpenCreateForm(true);
                      }}
                      className="flex items-center gap-1 p-2 px-4 bg-green-800 text-white rounded-2xl shadow hover:bg-green-700 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />

                      جمع بندی پرونده

                    </button>

                    <button
                      onClick={() => {
                        setStateDoneTahghigh(false);
                        setStateTahghigh(9);
                        setModalNazarParvandeh(true);
                      }}
                      className="flex items-center gap-1 p-2 px-4 bg-yellow-500 text-black rounded-2xl shadow hover:bg-yellow-600 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      بازگشت پرونده
                    </button>

                    <p className="px-5 rounded-2xl bg-amber-200 border-gray-400 h-8 flex items-center text-sm">
                      {data[0].CreateDateTime9}  مهلت اعلام نظر                     </p>

                  </div>
                )}

                {(user.PostId == 51 || user.PostId == 52 || user.PostId == 53) && (
                  <div className="flex gap-2 order-last">
                    {data[0].IsDone == false && (
                      <>


                        <button
                          onClick={() => {
                            LoadOneKarbargMosahebe();
                          }}
                          className="flex items-center gap-1 p-1 px-4 bg-emerald-600 text-white rounded shadow hover:bg-emerald-800 transition-colors text-sm cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          تحقیق از داوطلب
                        </button>
                      </>
                    )}

                    {/* <button
                      onClick={() => {

                        showAlert({
                          title: "حذف فایل",
                          description: "آیا از حذف فایل مطمئن هستید؟",
                          type: "warning",
                          showCancel: true,
                          confirmText: "حذف",
                          cancelText: "انصراف",
                          onConfirm: async () => {
                            // await deleteFileHandler(tahghighid, fileName, user.UserId);
                          },
                        });

                        showAlert({
                          title: "خطا در ارسال پرونده",
                          description: "لطفا امتیازهای کاربرگ های تحقیق را بررسی کنید",
                          type: "error",
                          showCancel: false,
                          confirmText: "متوجه شدم",
                        });

                      }}
                      className="flex items-center gap-1 p-1 px-4 bg-purple-600 text-white rounded shadow hover:bg-purple-700 transition-colors text-sm cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      تست
                    </button> */}

                    <button
                      onClick={() => setModalOpenStatus(true)}
                      className="flex items-center gap-1 p-1 px-4 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors text-sm cursor-pointer research-referral-action"
                    >
                      وضعیت

                    </button>

                    {data[0].IsDone === false && (
                      <button
                        onClick={() => {
                          setTozihat("");
                          setModalOpenAdamNeyazBeTahghigh(true);
                        }}
                        className="flex items-center gap-1 p-1 px-4 bg-purple-600 text-white rounded shadow hover:bg-purple-700 transition-colors text-sm cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        عدم نیاز به تحقیق
                      </button>
                    )}

                    {data[0].RecordState_ShorayeTahghigh == 0 &&
                      data[0].IsDone === false &&
                      data[0].CountKolErja === 0 &&
                      data[0].MahalSender != 1 && (
                        <button
                          onClick={() => {
                            setModalOpenAdamEmkanTahghigh(true);
                          }}
                          className="flex items-center gap-1 p-1 px-4 bg-purple-600 text-white rounded shadow hover:bg-purple-700 transition-colors text-sm cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          بازگشت به استان درخواست کننده (بدون تحقیق)
                        </button>
                      )}

                    {data[0].RecordState_ShorayeTahghigh == 8 && (
                      <button className="flex items-center gap-1 p-2 px-4 bg-blue-800 text-white rounded-2xl shadow hover:bg-blue-700 transition-colors cursor-pointer">
                        <Check className="w-4 h-4" />
                        منتظر اعلام نظر شورای تحقیق
                      </button>
                    )}

                    {(data[0].ErjaLastState == 1 || data[0].ErjaLastState == 6 || data[0].ErjaLastState == 9) && (
                      <button
                        onClick={async () => {
                          const restult = await GetCheckEmteyaz(data[0].ShomarehParvandeh)

                          if (restult.data[0].CountZiro == 0) {
                            setStateDoneTahghigh(false);
                            setStateTahghigh(8);
                            setModalOpenCreateForm(true);
                          }
                          else {
                            showAlert({
                              title: "خطا در ارسال پرونده",
                              description: "لطفا امتیازهای کاربرگ های تحقیق را بررسی کنید",
                              type: "error",
                              showCancel: false,
                              confirmText: "متوجه شدم",
                            });
                          }
                        }}
                        className="flex items-center gap-1 p-2 px-4 bg-green-800 text-white rounded-2xl shadow hover:bg-green-700 transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        ارسال به رئیس دفتر [{data[0].CountKolErja} / {data[0].CountKolErjaDone}]
                      </button>
                    )}

                    {data[0].IsDone == false &&
                      data[0].CountKolErja > 0 &&
                      data[0].RecordState_ShorayeTahghigh == 0 &&
                      data[0].CountKolErja === data[0].CountKolErjaDone ? (
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const restult = await GetCheckEmteyaz(data[0].ShomarehParvandeh)

                            if (restult.data[0].CountZiro == 0) {
                              setStateDoneTahghigh(false);
                              setStateTahghigh(8);
                              setModalOpenCreateForm(true);
                            }
                            else {
                              showAlert({
                                title: "خطا در ارسال پرونده",
                                description: "لطفا امتیازهای کاربرگ های تحقیق را بررسی کنید",
                                type: "error",
                                showCancel: false,
                                confirmText: "متوجه شدم",
                              });
                            }
                          }}
                          className="flex items-center gap-1 p-2 px-4 bg-green-800 text-white rounded-2xl shadow hover:bg-green-700 transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          ارسال به رئیس دفتر [{data[0].CountKolErja} / {data[0].CountKolErjaDone}]
                        </button>
                        <button
                          onClick={ReferToTeam}
                          className="flex items-center gap-1 p-2 px-4 bg-green-800 text-white rounded-2xl shadow hover:bg-green-700 transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          ارجاع به شورای تحقیق
                        </button>
                      </div>
                    ) : (
                      <button className="flex items-center gap-1 p-1 px-4 bg-gray-200 text-gray-500 rounded shadow transition-colors">
                        <PlusCircle className="w-4 h-4" />
                        تایید تحقیقات [{data[0].CountKolErja} / {data[0].CountKolErjaDone}]
                      </button>
                    )}
                  </div>
                )}



                {/* Info */}
                <div className="flex gap-5 research-case-info">
                  <p
                    onClick={() => {
                      setFileName(data[0].FileName);
                      downloadfilenameh();
                    }}
                    className="flex gap-2 bg-purple-800 py-1 rounded-2xl px-5 cursor-pointer"
                  >
                    <span className="flex-1 text-white text-[13px]">کاربرگ تحقیق</span>
                    <span className="flex text-white">
                      <Download height={20} />
                    </span>
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
                    <span className="font-semibold text-blue-600 text-[13px]">تاریخ ارجاع :</span>
                    <span className="text-gray-700 text-[14px] mr-2">{data[0].CreateDateTime?.substring(0, 10)}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Panels */}
          {data.length > 0 && (
            <div className="mx-5 border rounded-xl shadow-sm bg-slate-100 research-referral-card">
              <div className="flex items-center justify-between p-3 select-none hover:bg-gray-100 hover:rounded-xl transition-colors research-referral-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-purple-600 w-5 h-5" />
                  <h2
                    onClick={() => setIsOpen1(!isOpen1)}
                    className="cursor-pointer Roya text-[18px] text-purple-800 font-semibold flex items-center gap-2 research-referral-title"
                  >
                    ارجاع به حوزه انتخابیه
                    <span className="bg-gray-400 text-white rounded-full w-7 h-7 flex items-center justify-center research-count-total">
                      {data[0].CountErjaShahrestan || 0}
                    </span>
                    <span className="bg-green-700 text-white rounded-full w-7 h-7 flex items-center justify-center research-count-done">
                      {data[0].CountErjaShahrestanDone || 0}
                    </span>
                  </h2>
                </div>

                {data[0].RecordState_ShorayeTahghigh == 0 && data[0].IsDone === false && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setModalOpenErjaBeHozeh(true);
                        setTozihat("");
                      }}
                      className="flex items-center gap-1 p-1 px-4 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors text-sm cursor-pointer research-referral-action"
                    >
                      <PlusCircle className="w-4 h-4" />
                      ارجاع به حوزه انتخابیه
                    </button>
                  </div>
                )}
              </div>

              {isOpen1 && (
                <div className="border-t">
                  <ErjaHozeh
                    erjaParentId={data[0].ErjaId}
                    typeLevel="ostan"
                    onChangeCountErjaHozeh={(count, doneCount) => {
                      setData((prev) => {
                        const newData = structuredClone(prev);
                        if (newData[0]) {
                          newData[0].CountErjaShahrestan = count;
                          newData[0].CountErjaShahrestanDone = doneCount;
                        }
                        return newData;
                      });
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {data.length > 0 && data[0].MahalSender == 1 && (
            <div className="mx-5 border rounded-xl shadow-sm bg-slate-100 research-referral-card">
              <div className="flex items-center justify-between p-3 select-none hover:bg-gray-100 hover:rounded-xl transition-colors research-referral-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-purple-600 w-5 h-5" />
                  <h2
                    onClick={() => setIsOpen3(!isOpen3)}
                    className="cursor-pointer Roya text-[18px] text-purple-800 font-semibold flex items-center gap-2 research-referral-title"
                  >
                    ارجاع به استان دیگر
                    <span className="bg-gray-400 text-white rounded-full w-7 h-7 flex items-center justify-center research-count-total">
                      {data[0].CountErjaOstan || 0}
                    </span>
                    <span className="bg-green-700 text-white rounded-full w-7 h-7 flex items-center justify-center research-count-done">
                      {data[0].CountErjaOstanDone || 0}
                    </span>
                  </h2>
                </div>

                {data[0].RecordState_ShorayeTahghigh == 0 && data[0].IsDone == false && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setModalOpenErjaBeOstan(true);
                        setTozihat("");
                      }}
                      className="flex items-center gap-1 p-1 px-4 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors text-sm cursor-pointer research-referral-action"
                    >
                      <PlusCircle className="w-4 h-4" />
                      ارجاع به استان دیگر
                    </button>
                  </div>
                )}
              </div>

              {isOpen3 && (
                <div className="border-t">
                  <ErjaOstan erjaParentId={data[0].ErjaId} />
                </div>
              )}
            </div>
          )}

          {data.length > 0 && (
            <div className="mx-5 border rounded-xl shadow-sm bg-slate-100 research-referral-card">
              <div className="flex items-center justify-between p-3 select-none hover:bg-gray-100 hover:rounded-xl transition-colors research-referral-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-purple-600 w-5 h-5" />
                  <h2
                    onClick={() => setIsOpen2(!isOpen2)}
                    className="cursor-pointer Roya text-[18px] text-purple-800 font-semibold flex items-center gap-2 research-referral-title"
                  >
                    ارجاع به محقق ویژه استان
                    <span className="bg-gray-400 text-white rounded-full w-7 h-7 flex items-center justify-center research-count-total">
                      {data[0].CountErjaMohaghegh || 0}
                    </span>
                    <span className="bg-green-700 text-white rounded-full w-7 h-7 flex items-center justify-center research-count-done">
                      {data[0].CountErjaMohagheghDone || 0}
                    </span>
                  </h2>
                </div>

                {data[0].RecordState_ShorayeTahghigh == 0 && data[0].IsDone == false && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setModalOpenErjaBeMohaghegh(true);
                        setTozihat("");
                      }}
                      className="flex items-center gap-1 p-1 px-4 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors text-sm cursor-pointer research-referral-action"
                    >
                      <PlusCircle className="w-4 h-4" />
                      ارجاع به محقق ویژه استان
                    </button>
                  </div>
                )}
              </div>

              {isOpen2 && (
                <div className="border-t">
                  <ErjaMohaghegh
                    erjaId={data[0].ErjaId}
                    onChangeCountJambandi={(countjambandi) => {
                      const newData = [...data];
                      newData[0] = { ...newData[0], CountErjaMohagheghDone: countjambandi };
                      setData(newData);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          <div className="research-attachments-card">
            <div className="bnaznin text-[22px] mb-2 research-section-title">پیوست‌ها</div>

            <div className="flex flex-wrap gap-2">
              {jambandiFiles?.length ? (
                jambandiFiles.map((f, idx) => (
                  <div key={`${f.FileName}-${idx}`} className="flex flex-col items-center">
                    {isImageExt(f.fileExtend) ? (
                      <img
                        src={f.url}
                        alt={f.FileName}
                        crossOrigin="anonymous"
                        onClick={() => {
                          setPreviewImg(f.url);
                          setPreviewTitle(f.FileName);
                          setZoom(1);
                          setOffset({ x: 0, y: 0 });
                          setPreviewOpen(true);
                        }}
                        style={{
                          width: "100px",
                          height: "130px",
                          objectFit: "cover",
                          border: "1px solid #999",
                          borderRadius: "8px",
                          cursor: "zoom-in",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100px",
                          height: "130px",
                          border: "1px solid #999",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          color: "#555",
                          background: "#f3f4f6",
                        }}
                      >
                        فایل غیرتصویری
                      </div>
                    )}

                    <div dir="ltr" className="text-[11px] text-gray-600 mt-1 w-[100px] truncate text-center" title={f.FileName}>
                      {f.FileName}
                    </div>
                  </div>
                ))
              ) : (
                <div className="shabnam text-[16px] text-gray-500">پیوستی ثبت نشده است.</div>
              )}
            </div>
          </div>

          {/* Shora table */}
          {user.PostId != 54 && (
            <div className="mt-3 research-council-card">
              <div className="bnaznin bg-sky-300 p-2 text-[25px] rounded-2xl research-section-title research-council-title">ارجاع به شورای تحقیق</div>

              {shoraLoading ? (
                <div className="shabnam text-[15px] text-gray-500">در حال دریافت اطلاعات...</div>
              ) : shoraError ? (
                <div className="shabnam text-[15px] text-red-600">{shoraError}</div>
              ) : shoraItems && shoraItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-200 shabnam">
                        <th className="text-[16px] text-right p-2 border">نام و نام خانوادگی</th>
                        <th className="text-[16px] text-right p-2 border">وضعیت</th>
                        <th className="text-[16px] text-right p-2 border">زمان</th>
                        <th className="text-[16px] text-center p-2 border">عملیات</th>
                      </tr>
                    </thead>

                    <tbody>
                      {shoraItems.map((r, i) => (
                        <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-sky-50 transition-colors`}>
                          <td className="shabnam text-[16px] p-2 border text-purple-800">{r.FullNamePerson || "—"}</td>

                          <td className="shabnam text-[16px] p-2 border">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-[16px] border ${r.RecordState === 2
                                ? "bg-green-50 border-green-300 text-green-700"
                                : r.RecordState === 3
                                  ? "bg-amber-50 border-amber-300 text-amber-700"
                                  : r.RecordState === 1
                                    ? "bg-gray-50 border-gray-300 text-gray-700"
                                    : "bg-red-50 border-red-300 text-red-700"
                                }`}
                            >
                              {recordStateLabel(r.RecordState)}
                            </span>
                          </td>

                          <td className="shabnam text-[14px] p-2 border" dir="ltr">
                            {formatDT(r.CreateDateTime)}
                          </td>

                          <td className="p-2 border text-center">
                            {r.RecordState === 1 ? (
                              <button
                                onClick={deleteShoraItem}
                                className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer text-[13px]"
                              >
                                حذف
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[12px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="shabnam text-[15px] text-gray-500">اطلاعاتی برای شورای تحقیق ثبت نشده است.</div>
              )}
            </div>
          )}

          {/* Preview modal */}
          {previewOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/70" onClick={() => setPreviewOpen(false)} />

              <div className="relative z-10 w-[96vw] h-[92vh] bg-white rounded-xl shadow-2xl p-3 flex flex-col">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="text-[13px] text-gray-700 truncate max-w-[70vw]" dir="ltr" title={previewTitle}>
                    {previewTitle} — {Math.round(zoom * 100)}%
                  </div>

                  <div className="flex gap-2 items-center">
                    <button onClick={() => setZoom((z) => clamp(z * 1.2, 1, 6))} className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer">
                      +
                    </button>
                    <button
                      onClick={() =>
                        setZoom((z) => {
                          const nz = clamp(z / 1.2, 1, 6);
                          if (nz === 1) setOffset({ x: 0, y: 0 });
                          return nz;
                        })
                      }
                      className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer"
                    >
                      −
                    </button>
                    <button onClick={resetZoomPan} className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer">
                      Reset
                    </button>
                    <button
                      onClick={() => setPreviewOpen(false)}
                      className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center cursor-pointer"
                      aria-label="close"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div
                  ref={viewerRef}
                  onWheel={handleWheelZoom}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="flex-1 rounded-lg bg-gray-50 overflow-hidden"
                  style={{ touchAction: "none", overscrollBehavior: "contain", cursor: zoom > 1 ? "grab" : "default" }}
                >
                  <img
                    src={previewImg}
                    alt={previewTitle}
                    crossOrigin="anonymous"
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
                      transformOrigin: "0 0",
                      userSelect: "none",
                    }}
                    onDoubleClick={resetZoomPan}
                  />
                </div>

                <div className="mt-2 text-[12px] text-gray-500">اسکرول ماوس = زوم | Drag = جابه‌جایی | Double-Click = Reset</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* -------------------- Modals -------------------- */}

      {/* ارجاع به حوزه */}
      {data.length > 0 && ModalOpenErjaBeHozeh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => {
              setModalOpenErjaBeHozeh(false);
              setTozihat("");
            }}
          />
          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-96 relative">
            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">افزودن ارجاع جدید</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <InputUserDropdown
              label="شهرستان حوزه اصلی"
              pCityId={data[0].MahalReciver}
              CityIdNo={0}
              IsMarkaz={1}
              onSelect={(info) => setCityMarkaz(info ? info.id : null)}
              error={CityMarkaz === null}
              errorMessage={CityMarkaz === null ? "لطفاً شهرستان را انتخاب کنید" : ""}
            />

            <textarea
              className="text-[15px] w-full h-24 border border-gray-300 rounded p-2 mb-2 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
              placeholder="توضیحات ارجاع پرونده"
              value={tozihat}
              onChange={(e) => setTozihat(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-5">
              <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer" onClick={() => setModalOpenErjaBeHozeh(false)}>
                انصراف
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer" onClick={() => saveErjaHozeh(user.Mahal, CityMarkaz || 0, 0)}>
                تایید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ارجاع به استان */}
      {data.length > 0 && ModalOpenErjaBeOstan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenErjaBeOstan(false)} />
          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-96 relative">
            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">افزودن ارجاع جدید</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <InputUserDropdown
              label="استان"
              CityIdNo={data[0].MahalReciver}
              IsMarkaz={0}
              pCityId={1}
              onSelect={(info) => setCityMarkaz(info ? info.id : null)}
              error={CityMarkaz === null}
              errorMessage={CityMarkaz === null ? "لطفاً استان را انتخاب کنید" : ""}
            />

            <textarea
              className="text-[15px] w-full h-24 border border-gray-300 rounded p-2 mb-2 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
              placeholder="توضیحات ارجاع پرونده"
              value={tozihat}
              onChange={(e) => setTozihat(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-5">
              <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer" onClick={() => setModalOpenErjaBeOstan(false)}>
                انصراف
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer" onClick={() => saveErjaHozeh(user.Mahal, CityMarkaz || 0, 0)}>
                تایید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ارجاع به محقق */}
      {data.length > 0 && ModalOpenErjaBeMohaghegh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenErjaBeMohaghegh(false)} />
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
                  settarikh(v);
                  seterrorTarikh(false);
                }}
                error={errorTarikh}
                errorMessage={errorTarikh ? "لطفاً تاریخ را انتخاب کنید" : ""}
              />
            </div>

            <textarea
              className="text-[15px] w-full h-24 border border-gray-300 rounded p-2 mb-2 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
              placeholder="توضیحات ارجاع پرونده"
              value={tozihat}
              onChange={(e) => setTozihat(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-5">
              <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer" onClick={() => setModalOpenErjaBeMohaghegh(false)}>
                انصراف
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer" onClick={() => saveErjaMohaghegh(0)}>
                تایید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ارجاع به شورای تحقیق */}
      {data.length > 0 && ModalOpenErjaBeShorayeTahghigh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenErjaBeShorayeTahghigh(false)} />
          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-96 relative">
            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">انتخاب شورای تحقیق</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <EjraBeMohaghegh
              codeEntekhabat={31201}
              label="کاربر شورای تحقیق استان"
              mahal={data[0].MahalReciver}
              noeHamkari={2}
              vije={8}
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
                  settarikh(v);
                  seterrorTarikh(false);
                }}
                error={errorTarikh}
                errorMessage={errorTarikh ? "لطفاً تاریخ را انتخاب کنید" : ""}
              />
            </div>

            <textarea
              className="text-[15px] mt-2 w-full h-24 border border-gray-300 rounded p-2 mb-2 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
              placeholder="توضیحات ارجاع پرونده"
              value={tozihat}
              onChange={(e) => setTozihat(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-5">
              <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer" onClick={() => setModalOpenErjaBeShorayeTahghigh(false)}>
                انصراف
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer"
                onClick={() => saveErjaBeShorayeTahghigh(erjaId, tozihat, tarikh!, CodeMohaghegh!, user.UserId)}
              >
                تایید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* عدم نیاز/عدم امکان/بدون تحقیق/برگشت پرونده */}
      {ModalOpenAdamNeyazBeTahghigh && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenAdamNeyazBeTahghigh(false)} />
          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[30%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">
            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">عدم امکان تحقیق استان دیگر</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <TextArea1
              height="h-90"
              justify={true}
              readOnly={false}
              label="توضیحات عدم امکان تحقیق :"
              placeholder="توضیحات مورد نظر را وارد کنید"
              value={tozihat || ""}
              onChange={(e: any) => setTozihat(e.target.value)}
              maxLength={3000}
              onlyNumber={false}
              error={errortozihat}
              errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 رقم" : ""}
            />

            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 cursor-pointer rounded" onClick={() => setModalOpenAdamNeyazBeTahghigh(false)}>
                بستن
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (tozihat.length > 10) {
                    setErrortozihat(false);
                    await ResultTo(erjaId, 15, tozihat);
                  } else {
                    setErrortozihat(true);
                  }
                }}
                className="cursor-pointer px-4 py-1 rounded-xl bg-green-700 text-white hover:bg-green-800"
              >
                ارسال
              </button>
            </div>
          </div>
        </div>
      )}

      {ModalOpenAdamEmkanTahghigh && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenAdamEmkanTahghigh(false)} />
          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[30%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">
            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">عدم امکان تحقیق</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <TextArea1
              height="h-90"
              justify={true}
              readOnly={false}
              label="توضیحات عدم امکان تحقیق :"
              placeholder="توضیحات مورد نظر را وارد کنید"
              value={tozihat || ""}
              onChange={(e: any) => setTozihat(e.target.value)}
              maxLength={3000}
              onlyNumber={false}
              error={errortozihat}
              errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 رقم" : ""}
            />

            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 cursor-pointer rounded" onClick={() => setModalOpenAdamEmkanTahghigh(false)}>
                بستن
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (tozihat.length > 10) {
                    setErrortozihat(false);
                    await ResultTo(erjaId, 20, tozihat);
                  } else {
                    setErrortozihat(true);
                  }
                }}
                className="cursor-pointer px-4 py-1 rounded-xl bg-green-700 text-white hover:bg-green-800"
              >
                ارسال
              </button>
            </div>
          </div>
        </div>
      )}

      {ModalOpenErjabeOstanBedonTahghigh && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenErjabeOstanBedonTahghigh(false)} />
          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[30%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">
            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">عدم نیاز به تحقیق</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <TextArea1
              height="h-90"
              justify={true}
              readOnly={false}
              label="توضیحات عدم نیاز به تحقیق :"
              placeholder="توضیحات مورد نظر را وارد کنید"
              value={tozihat || ""}
              onChange={(e: any) => setTozihat(e.target.value)}
              maxLength={3000}
              onlyNumber={false}
              error={errortozihat}
              errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 رقم" : ""}
            />

            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 cursor-pointer rounded" onClick={() => setModalOpenErjabeOstanBedonTahghigh(false)}>
                بستن
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (tozihat.length > 10) {
                    setErrortozihat(false);
                    await ResultTo(erjaId, 8, tozihat);
                  } else {
                    setErrortozihat(true);
                  }
                }}
                className="cursor-pointer px-4 py-1 rounded-xl bg-green-700 text-white hover:bg-green-800"
              >
                ارسال
              </button>
            </div>
          </div>
        </div>
      )}

      {ModalNazarParvandeh && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalNazarParvandeh(false)} />
          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[30%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">
            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">برگشت پرونده</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <TextArea1
              height="h-90"
              justify={true}
              readOnly={false}
              label="توضیحات دلایل برگشت :"
              placeholder="توضیحات مورد نظر را وارد کنید"
              value={tozihat || ""}
              onChange={(e: any) => setTozihat(e.target.value)}
              maxLength={3000}
              onlyNumber={false}
              error={errortozihat}
              errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 رقم" : ""}
            />

            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-300 hover:bg-gray-400 px-4 py-1 cursor-pointer rounded" onClick={() => setModalNazarParvandeh(false)}>
                بستن
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (tozihat.length > 10) {
                    setErrortozihat(false);
                    await ResultParvandeh(erjaId, StateTahghigh, tozihat);
                  } else {
                    setErrortozihat(true);
                  }
                }}
                className="cursor-pointer px-4 py-1 rounded-xl bg-green-700 text-white hover:bg-green-800"
              >
                ارسال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Create Form Modal (Tajmi) -------------------- */}
      {ModalOpenCreateForm && data.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenCreateForm(false)} />

          <div
            className="bg-white rounded-lg shadow-2xl z-50 relative overflow-auto flex items-start justify-center"
            style={{ width: "100vw", height: "100vh", padding: "20px", boxSizing: "border-box" }}
          >
            <div className="w-full h-full flex flex-col items-center">
              <div className="w-[210mm] flex justify-center gap-3 mt-3">
                <button onClick={SaveKarbargTajmiOstan} className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                  {StateTahghigh == 15 && "ثبت جمع بندی و ارسال به ستاد"}
                  {StateTahghigh == 8 && "ثبت جمع بندی و ارسال به رئیس دفتر"}
                  {StateTahghigh == 6 && "ثبت جمع بندی"}
                  {StateTahghigh == 10 && "تایید جمع بندی"}
                  {StateTahghigh == 12 && "تایید پرونده"}
                </button>
                <button onClick={() => setModalOpenCreateForm(false)} className="cursor-pointer bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                  بستن
                </button>
              </div>

              <div>
                <ShowTahghigh
                  erjaid={erjaId}
                  onJambandiAllChange={(htmlAll) => {
                    // ✅ do NOT overwrite user edits
                    if (jambandiDirty) return;

                    if (!hasApiJambandi) {
                      const plain = stripHtmlAndClampBlankLines(htmlAll);

                      setJambandiOstan(plain);
                      jambandiDraftRef.current = plain;
                      seterrorjambandiOsatn("");

                      requestAnimationFrame(() => {
                        if (jambandiBoxRef.current) {
                          jambandiBoxRef.current.textContent = plain; // ✅ no HTML
                        }
                      });
                    }
                  }}
                />
              </div>

              {/* Page 1 */}
              <div
                id="div_image_page1"
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
                  <div style={{ width: "30%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <img src="/logo/KarbargOstan/mohr.jpg" alt="لوگو اول" style={{ height: "110px", width: "150px", objectFit: "contain" }} />
                  </div>

                  <div style={{ width: "75%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <img
                      src="/logo/KarbargOstan/toplogo.png"
                      alt="لوگو دوم"
                      style={{ width: "100%", maxWidth: "400px", height: "130px", objectFit: "contain", margin: 0, padding: 0, display: "block" }}
                    />
                  </div>

                  <div style={{ width: "45%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: "2px", paddingRight: "5px" }}>
                    <div className="flex items-center justify-end">
                      <span className="bnaznin text-[20px]">شماره سریال :</span>
                      <span className="mx-1 text-[16px]">....................</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="bnaznin text-[20px]">استان :</span>
                      <span className="mx-1 text-[16px]">{NameOstan}</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="bnaznin text-[20px]">حوزه انتخابیه:</span>
                      <span className="mx-1 text-[13px]">{NameHozeh}</span>
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
                    gap: "2px",
                  }}
                >
                  {questions.map((q, qi) => {
                    const isRadio = qi < 7;
                    return (
                      <div key={qi} className="mb-2">
                        <div className="flex flex-col bnaznin text-[22px] leading-[1.3] mt-2">
                          <span>{q}</span>
                        </div>

                        {isRadio && (
                          <div className="flex items-center bnaznin text-[23px] leading-[1.2] flex-wrap">
                            {radioItems[qi].map((text, idx) => (
                              <div key={idx} className="flex items-center mr-8">
                                <span className="mx-1">{text}</span>
                                <span
                                  onClick={() =>
                                    setSelected((prev) => {
                                      const next = [...prev];
                                      next[qi] = idx;
                                      return next;
                                    })
                                  }
                                  className={`w-5 h-5 inline-block rounded-full border border-black cursor-pointer ${selected[qi] === idx ? "bg-gray-600" : "bg-white"
                                    }`}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col bnaznin text-[20px] leading-[1.2]">
                          <span>توضیح با ذکر مصادیق :</span>
                        </div>

                        <div className="flex text-sky-900 flex-col shabnam text-[18px] leading-loose mb-3">
                          <span className="text-red-600 text-[16px] text-center">{errorPasokh[qi]}</span>

                          <EditableSpan
                            value={pasokh[qi]}
                            spanRef={pasokhRefs[qi]}
                            className="editable-placeholder border border-transparent focus:border-blue-500 outline-none px-1"
                            onCommit={(text) => {
                              setPasokh((prev) => {
                                const next = [...prev];
                                next[qi] = text;
                                return next;
                              });
                              setErrorPasokh((prev) => {
                                const next = [...prev];
                                next[qi] = "";
                                return next;
                              });
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Page 2 (Jambandi) */}
              <div
                id="div_image_page2"
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
                    minHeight: "430mm",
                    border: "2px solid #000",
                    borderRadius: "5px",
                    padding: "12px",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <p className="text-[22px] m-0 bnaznin" style={{ lineHeight: "3.4rem", marginTop: 0 }}>
                    جمع بندی تحقیقات صورت گرفته براساس مهم ترین موارد درج شده در کاربرگ های تحقیق :
                  </p>
                  <p className="text-red-500 text-[16px]">{errorjambandiOsatn}</p>

                  {/* ✅ FIX: keep draft + dirty, commit HTML, no revert on click */}
                  <div
                    ref={jambandiBoxRef}
                    contentEditable
                    suppressContentEditableWarning
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
                    onInput={(e) => {
                      // ✅ keep plain text; prevents html tags from persisting
                      jambandiDraftRef.current = e.currentTarget.textContent || "";
                      if (!jambandiDirty) setJambandiDirty(true);
                    }}
                    onBlur={() => {
                      // ✅ compress blank lines when committing user text too
                      setJambandiOstan(stripHtmlAndClampBlankLines(jambandiDraftRef.current || ""));
                    }}

                  />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "40px", fontSize: "22px", fontFamily: "bnaznin" }}>
                    <span>نام و نام خانوادگی کارشناس واحد اسناد و بررسی دفتر استان :</span>
                    <span>تاریخ:</span>
                    <span className="ml-30">امضاء:</span>
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
              `}</style>
            </div>
          </div>
        </div>
      )}

      {ModalOpenKargroupMosahebe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpenKargroupMosahebe(false)} />

          <div
            className="bg-white rounded-lg shadow-2xl z-50 relative overflow-auto flex items-start justify-center"
            style={{ width: "100vw", height: "100vh", padding: "20px", boxSizing: "border-box" }}
          >
            <div className="w-full h-full flex flex-col items-center">
              <div className="w-[210mm] flex justify-center gap-3 mt-3">
                <button onClick={SaveKarbargMosaheghe} className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                  ارسال پرونده
                </button>
                <button onClick={() => setModalOpenKargroupMosahebe(false)} className="cursor-pointer bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
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
                      width: "30%",
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
                      width: "75%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src="/logo/KarbargOstan/toplogo.png"
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
                      <span className="mx-1 text-[16px]">{NameOstan}</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="bnaznin text-[20px]">حوزه انتخابیه:</span>
                      <span className="mx-1 text-[13px]"> {NameHozeh}</span>
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
                        <span>شماره ملی :</span>
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
                    flex: 1,
                    boxSizing: "border-box",
                    border: "2px solid #000",
                    borderRadius: "5px",
                    padding: "0px",
                    display: "grid",
                    gridTemplateRows: "auto 1fr",
                    gridTemplateColumns: "1fr 2fr",
                    columnGap: "2px",
                    backgroundColor: "#000",
                    overflow: "hidden",
                  }}
                >




                  <div style={{ borderBottom: "1px solid #ccc", backgroundColor: "#fff" }}>
                    <p className="text-[17px] text-center">سوالات و موارد مطرح شده توسط محقق :</p>
                  </div>
                  <div style={{ borderBottom: "1px solid #ccc", backgroundColor: "#fff" }}>
                    <p className="text-[17px] text-center">مشروح اظهارات داوطلب :</p>
                  </div>

                  <div style={{ backgroundColor: "#fff" }}>
                    <EditableDiv
                      value={SoalatParvandeh}
                      onCommit={setSoalatParvandeh}
                      divRef={SoalatBoxRef}
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
                    />
                  </div>

                  <div style={{ backgroundColor: "#fff" }}>
                    <EditableDiv
                      value={PasokhParvandeh}
                      onCommit={setPasokhParvandeh}
                      divRef={PasokhBoxRef}
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
                    />
                  </div>
                </div>

                {/* منابع جدید 1..6 */}
                <div className="mt-2" style={{ width: "100%", border: "2px solid #000", borderRadius: "5px", padding: "12px" }}>
                  <p className="text-[22px] leading-9 m-0">
                    <span className="bnaznin">
                      مشخصات منابع جدید به منظور تحقیق یا استعلام جهت بررسی های تکمیلی :
                    </span>
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", gap: "5px", marginTop: "8px" }}>
                    {[
                      { n: 1, v: Manabe1, set: setManabe1, ref: Manabe1BoxRef },
                      { n: 2, v: Manabe2, set: setManabe2, ref: Manabe2BoxRef },
                      { n: 3, v: Manabe3, set: setManabe3, ref: Manabe3BoxRef },
                      { n: 4, v: Manabe4, set: setManabe4, ref: Manabe4BoxRef },
                      { n: 5, v: Manabe5, set: setManabe5, ref: Manabe5BoxRef },
                      { n: 6, v: Manabe6, set: setManabe6, ref: Manabe6BoxRef },
                    ].map((x) => (
                      <div key={x.n} style={{ display: "flex", alignItems: "center", width: "100%", gap: "5px" }}>
                        <p style={{ margin: 0, minWidth: "20px" }}>{x.n}-</p>
                        <EditableDiv
                          value={x.v}
                          onCommit={(html) => x.set(html || "")}
                          divRef={x.ref}
                          className="shabnam text-[16px]"
                          style={{
                            flex: 1,
                            border: "1px dashed #999",
                            borderRadius: "5px",
                            padding: "5px",
                            outline: "none",
                            color: "#0c4a6e",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.5",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* نظریه محقق + پیوست */}
                <div className="mt-2" style={{ width: "100%", border: "2px solid #000", borderRadius: "5px", padding: "12px" }}>
                  <p className="text-[22px] m-0" style={{ lineHeight: "1.2" }}>
                    <span className="bnaznin">نظریه و توضیحات محقق :</span>
                  </p>

                  <EditableDiv
                    value={TozihatMohaghegh}
                    onCommit={setTozihatMohaghegh}
                    divRef={TozihatMohagheghBoxRef}
                    className="shabnam text-[16px]"
                    style={{
                      width: "100%",
                      minHeight: "20mm",
                      border: "1px dashed #999",
                      borderRadius: "5px",
                      padding: "5px",
                      outline: "none",
                      color: "#0c4a6e",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.5",
                      marginTop: "8px",
                    }}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 0.5fr", width: "100%", gap: "5px", marginTop: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "5px" }}>
                      <p className="text-[16px]" style={{ margin: 0, minWidth: "20px" }}>
                        تعداد پیوست ها و مستندات ارائه شده توسط داوطلب
                      </p>
                      <EditableDiv
                        value={PeyvastDavtalab}
                        onCommit={setPeyvastDavtalab}
                        divRef={PeyvastBoxRef}
                        className="shabnam text-[16px]"
                        style={{
                          flex: 1,
                          border: "1px dashed #999",
                          borderRadius: "5px",
                          padding: "5px",
                          outline: "none",
                          color: "#0c4a6e",
                          whiteSpace: "pre-wrap",
                          lineHeight: "1.5",
                        }}
                      />
                    </div>

                    <div className="bnaznin">شناسه محقق :</div>
                    <div className="bnaznin">تاریخ تکمیل :</div>
                    <div className="bnaznin">امضاء :</div>
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
              `}</style>
            </div>
          </div>
        </div>
      )}
      <JambandiPanel
        open={jambandiPanelOpen}
        erjaId={jambandiPanelErjaId}
        onClose={() => setJambandiPanelOpen(false)}
        userId={user.UserId}
        JambandiOstan1={JambandiOstan1}
        GetFileNamePic={GetFileNamePic}
      />
      <TahghighatStateModal
        isOpen={ModalOpenStatus}
        onClose={() => setModalOpenStatus(false)}
        erjaid={data?.[0]?.ErjaId ?? erjaId}
      />

    </>
  );
}