"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { useRouter } from "next/navigation";
import DescriptionWithModal from "./DescriptionWithModal";
import { CircleAlert, Delete, AlertTriangle, PlusCircle, ArrowBigLeft } from "@/component/ResearchIcons";
import { useConfirm } from "@/Utils/ConfirmModalContext";
import { DeleteErjabyId, GetTahghighByID, JambandiOstan1, Update_ErjaParvandehState } from "@/services/ApiService";
import TahghighatStateModal from "./TahghighatStateModal";
import { GetFileNamePic } from "@/services/ApiServiceNameha";
// فرض بر این است که کامپوننت‌های زیر را ایمپورت کرده‌اید
import ErjaHozeh from "./ErjaHozeh";
import ErjaMohaghegh from "./ErjaMohaghegh";
import Textarea1 from "@/component/Objects/Textarea1";

interface TahghighItem {
  ErjaId: number;
  ID: number;
  CountKolErja: number;
  CountErjaShahrestan: number;
  CountErjaShahrestanDone: number;
  CountErjaMohaghegh: number;
  CountErjaMohagheghDone: number;
  CountErja: number;
  ErjaLastStat: number;
  IsDone: boolean;
  ShomarehParvandeh: string;
  FirstName: string;
  LastName: string;
  NameHozeh: string;
  MahalSender_NameFarsi: string;
  MahalReciver_NameFarsi: string;
  CreateDateTime: string;
  Description: string;
  RecordState_ShorayeTahghigh?: number;
}

interface FehrestErjaParvandehProps {
  erjaParentId: number;
}

/** خروجی سرویس JambandiOstan1 */
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

type PanelTab = "Jambandi" | "Page1" | "Page2";
type ViewerItem = { url: string; label: string };

const SWIPE_THRESHOLD = 60;

const FehrestErjaParvandeh = ({ erjaParentId }: FehrestErjaParvandehProps) => {
  const user = useMeratUser();

  const [errortozihat, setErrortozihat] = useState(false);
  const [Mahal, SetMahal] = useState(0);
  const [UserId, SetUserId] = useState(0);
  const { showConfirm } = useConfirm();
  const router = useRouter();

  const [data, setData] = useState<TahghighItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // مودال تغییرات
  const [open, setOpen] = useState(false);
  const [erjaId, setErjaId] = useState<number | null>(null);
  const [ModalBargashtParvandeh, setModalBargashtParvandeh] = useState(false);
  const [ModalTaidParvandeh, setModalTaidParvandeh] = useState(false);

  // ✅ استیت برای مدیریت باز و بسته شدن آیتم‌ها (Accordion)
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});

  // مودال ارجاع به محقق
  const [modalOpenErjaBeMohaghegh, setModalOpenErjaBeMohaghegh] = useState(false);
  const [activeErjaIdForMohaghegh, setActiveErjaIdForMohaghegh] = useState<number | null>(null);
  const [tozihat, setTozihat] = useState("");

  // پنل جم‌بندی/صفحات
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelErjaId, setPanelErjaId] = useState<number | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>("Jambandi");

  const [jambandi, setJambandi] = useState<JambandiResponse | null>(null);
  const [jambandiLoading, setJambandiLoading] = useState(false);
  const [jambandiError, setJambandiError] = useState("");

  // -----------------------------
  // Resolve FileName -> Blob URL (GetFileNamePic)
  // -----------------------------
  const [resolvedFiles, setResolvedFiles] = useState<Record<string, string>>({});
  const [resolvingFiles, setResolvingFiles] = useState<Record<string, boolean>>({});
  const [resolveErrors, setResolveErrors] = useState<Record<string, string>>({});

  const objectUrlsRef = useRef<string[]>([]);

  const cleanupObjectUrls = () => {
    try {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    } catch { }
    objectUrlsRef.current = [];
  };


  const ResultToHozeh = async (erjaid: number, stateparvandeh: number, tozihat: string) => {
    const result = await Update_ErjaParvandehState(erjaid, stateparvandeh, tozihat, user.UserId);
    if (result.state == 401) {
      router.push("/Login");
    }
    else {
      setModalTaidParvandeh(false);
      await loadData();
    }
  };

  useEffect(() => {
    return () => {
      cleanupObjectUrls();
    };
  }, []);

  useEffect(() => {
    if (!panelOpen) {
      cleanupObjectUrls();
      setResolvedFiles({});
      setResolvingFiles({});
      setResolveErrors({});
    }
  }, [panelOpen]);

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

  const ensureResolved = async (fileName?: string) => {
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
      const res: any = await GetFileNamePic(fileName, user.UserId);
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
  };

  useEffect(() => {
    if (jambandi?.Page1) ensureResolved(jambandi.Page1);
    if (jambandi?.Page2) ensureResolved(jambandi.Page2);
  }, [jambandi?.Page1, jambandi?.Page2]);

  // -----------------------------
  // Viewer (Zoom / Pan / Swipe)
  // -----------------------------
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<ViewerItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });

  const swipeStartXRef = useRef<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);

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

  const pageItems: ViewerItem[] = useMemo(() => {
    const p1Name = jambandi?.Page1;
    const p2Name = jambandi?.Page2;
    const p1Url = p1Name ? (resolvedFiles[p1Name] || fallbackPublicUploads(p1Name)) : "";
    const p2Url = p2Name ? (resolvedFiles[p2Name] || fallbackPublicUploads(p2Name)) : "";
    const p1 = p1Name ? { url: p1Url, label: "Page1" } : null;
    const p2 = p2Name ? { url: p2Url, label: "Page2" } : null;
    return [p1, p2].filter(Boolean) as ViewerItem[];
  }, [jambandi?.Page1, jambandi?.Page2, resolvedFiles]);

  // -----------------------------
  // API Calls
  // -----------------------------
  const loadData = async () => {
    try {
      const result = await GetTahghighByID(0, erjaParentId, 3);
      if (result.status === 200) {
        setData(result.data || []);
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
    SetMahal(user.Mahal);
    SetUserId(user.UserId);
    loadData();
  }, [erjaParentId, router]);

  const DeleteErja = async (ID: number) => {
    await DeleteErjabyId(ID, UserId);
    loadData();
  };

  const loadJambandi = async (id: number) => {
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
  };

  const openPanel = (id: number) => {
    setPanelErjaId(id);
    setPanelTab("Jambandi");
    setPanelOpen(true);
    setJambandi(null);
    setJambandiError("");
    setJambandiLoading(false);
    cleanupObjectUrls();
    setResolvedFiles({});
    setResolvingFiles({});
    setResolveErrors({});
    loadJambandi(id);
  };

  useEffect(() => {
    if (panelOpen && panelTab === "Jambandi" && panelErjaId) {
      loadJambandi(panelErjaId);
    }
  }, [panelTab]);

  // -----------------------------
  // UI Components
  // -----------------------------
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
            <button
              type="button"
              className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => ensureResolved(fileName)}
            >
              بروزرسانی فایل
            </button>
            <button
              type="button"
              className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                const items = pageItems;
                const idx = items.findIndex((x) => x.label === label);
                if (idx >= 0) openViewer(items, idx);
              }}
            >
              نمایش با زوم
            </button>
          </div>
        </div>
        <div className="w-full border rounded-md overflow-hidden bg-gray-100">
          <img
            src={url}
            alt={label}
            className="w-full h-[240px] object-contain"
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

  // -----------------------------
  // Render
  // -----------------------------
  if (loading) return <div>در حال بارگذاری...</div>;
  if (data.length === 0) return <div>داده‌ای وجود ندارد.</div>;

  return (
    <div className="px-1">
      {/* ✅ لیست استان‌ها */}
      <div className="flex flex-col gap-2">
        {data.map((item) => {
          const isOpen = openItems[item.ErjaId] || false;

          return (
            <div key={item.ErjaId} className="border rounded-xl shadow-sm bg-white overflow-hidden">
              {/* هدر آیتم (قابل کلیک) */}
              <div
                className={`
                  p-3 flex justify-between items-center cursor-pointer transition-colors duration-200
                  ${item.IsDone === true ? "bg-green-50" : "bg-white hover:bg-gray-50"}
                `}
                onClick={() => setOpenItems(prev => ({ ...prev, [item.ErjaId]: !prev[item.ErjaId] }))}
              >
                <div className="flex gap-5 whitespace-nowrap items-center">
                  {item.CountKolErja === 0 && item.IsDone === false ? (
                    <p className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <Delete
                        onClick={() =>
                          showConfirm(
                            "آیا از حذف ارجاع اطمینان دارید؟",
                            () => DeleteErja(item.ErjaId),
                            "هشدار!",
                            "error"
                          )
                        }
                        className="text-red-500"
                      />
                    </p>
                  ) : (
                    <p>
                      <Delete className="text-gray-300" />
                    </p>
                  )}

                  <p>
                    <span className="font-semibold text-blue-600 text-[13px]">ارسال به استان :</span>
                    <span className="text-gray-700 text-[15px] mr-2 inline-block min-w-[100px]">
                      {item.MahalReciver_NameFarsi}
                    </span>
                  </p>

                  <p>
                    <span className="font-semibold text-blue-600 text-[13px]">زمان ارجاع :</span>
                    <span className="text-gray-700 text-[14px] mr-2">{item.CreateDateTime}</span>
                  </p>

                  <p>
                    <span className="font-semibold text-blue-600 text-[13px]"> تعداد ارجاع :</span>
                    <span className="text-gray-700 text-[14px] mr-2">{item.CountKolErja}</span>
                  </p>

                  <p>
                    <span className="font-semibold text-blue-600 text-[13px]">ارجاع به شهرستان :</span>
                    <span className="text-gray-700 text-[14px] mr-2">{item.CountErjaShahrestan}</span>
                  </p>

                  <p>
                    <span className="font-semibold text-blue-600 text-[13px]">ارجاع به محقق :</span>
                    <span className="text-gray-700 text-[14px] mr-2">{item.CountErjaMohaghegh}</span>
                  </p>

                  <p>
                    <span className="font-semibold text-blue-600 text-[13px]">توضیحات :</span>
                    <DescriptionWithModal status="info" description={item.Description || ""} />
                  </p>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openPanel(item.ErjaId); }}
                    className="px-4 py-1 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700 transition cursor-pointer"
                  >
                    جمع بندی
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); setOpen(true); setErjaId(item.ErjaId); }}
                    className="flex items-center gap-1 p-1 px-4 bg-purple-500 text-white rounded shadow hover:bg-purple-700 transition-colors text-sm cursor-pointer"
                  >
                    <CircleAlert className="w-4 h-4" />
                    تغییرات
                  </button>

                  {item.IsDone && item.ErjaLastStat == 2 && (
                    <button
                      onClick={() => {
                        setErjaId(item.ErjaId);
                        setTozihat("");
                        setModalBargashtParvandeh(true);
                      }
                      }
                      type="button"
                      className="gap-2 py-1 pl-3.5 pr-3 text-sm bg-yellow-300 text-black rounded-full 
                 cursor-pointer font-semibold text-center shadow-xs transition-all 
                 duration-500 flex items-center hover:bg-yellow-500"
                    >
                      <ArrowBigLeft className="w-4 h-4" />
                      برگشت پرونده به حوزه
                    </button>

                  )}


                  {item.IsDone && item.ErjaLastStat == 2 && (
                    <button
                      onClick={() => {
                        setErjaId(item.ErjaId);
                        setTozihat("");
                        setModalTaidParvandeh(true);
                      }
                      }
                      type="button"
                      className="gap-2 py-1 pl-3.5 pr-3 text-sm bg-green-300 text-black rounded-full 
                 cursor-pointer font-semibold text-center shadow-xs transition-all 
                 duration-500 flex items-center hover:bg-green-500"
                    >
                      <ArrowBigLeft className="w-4 h-4" />
                      تایید تحقیق
                    </button>

                  )}



                </div>
              </div>

              {/* ✅ محتوای بازشونده (Accordion Body) */}
              {isOpen && (
                <div className="border-t bg-slate-50 p-4 space-y-4">

                  {/* بخش ارجاع به شهرستان */}
                  <div className="border rounded-xl shadow-sm bg-white">
                    <div className="flex items-center justify-between p-3 select-none hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-purple-600 w-5 h-5" />
                        <h2 className="text-[16px] text-purple-800 font-semibold flex items-center gap-2">
                          ارجاع به شهرستان
                          <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            {item.CountErjaShahrestan || 0}
                          </span>
                          <span className="bg-green-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            {item.CountErjaShahrestanDone || 0}
                          </span>
                        </h2>
                      </div>
                    </div>
                    <div className="border-t">
                      {/* ✅ اصلاح شده: Key یکتا با پیشوند */}
                      <ErjaHozeh
                        key={`hozeh-${item.ErjaId}`}
                        erjaParentId={item.ErjaId}
                        typeLevel="ostan"
                        onChangeCountErjaHozeh={(count, doneCount) => {
                          setData(prev => {
                            const newData = [...prev];
                            const index = newData.findIndex(x => x.ErjaId === item.ErjaId);
                            if (index !== -1) {
                              newData[index].CountErjaShahrestan = count;
                              newData[index].CountErjaShahrestanDone = doneCount;
                            }
                            return newData;
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* بخش ارجاع به محقق ویژه استان */}
                  <div className="border rounded-xl shadow-sm bg-white">
                    <div className="flex items-center justify-between p-3 select-none hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-purple-600 w-5 h-5" />
                        <h2 className="text-[16px] text-purple-800 font-semibold flex items-center gap-2">
                          ارجاع به محقق ویژه استان
                          <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            {item.CountErjaMohaghegh || 0}
                          </span>
                          <span className="bg-green-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            {item.CountErjaMohagheghDone || 0}
                          </span>
                        </h2>
                      </div>

                      {/* شرط نمایش دکمه ارجاع به محقق */}
                      {(item.RecordState_ShorayeTahghigh === 0 && item.IsDone === false) && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setActiveErjaIdForMohaghegh(item.ErjaId);
                              setTozihat("");
                              setModalOpenErjaBeMohaghegh(true);
                            }}
                            className="flex items-center gap-1 p-1 px-4 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors text-sm cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                            ارجاع به محقق ویژه استان
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="border-t">
                      {/* ✅ اصلاح شده: Key یکتا با پیشوند */}
                      <ErjaMohaghegh
                        key={`mohaghegh-${item.ErjaId}`}
                        erjaId={item.ErjaId}
                        onChangeCountJambandi={(countjambandi) => {
                          setData(prev => {
                            const newData = [...prev];
                            const index = newData.findIndex(x => x.ErjaId === item.ErjaId);
                            if (index !== -1) {
                              newData[index].CountErjaMohagheghDone = countjambandi;
                            }
                            return newData;
                          });
                        }}
                      />
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ پنل جم‌بندی و صفحات */}
      {panelOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPanelOpen(false)} />
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[92%] max-w-[1200px] bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div className="font-bold text-gray-800">پنل نمایش</div>
              <button
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                onClick={() => setPanelOpen(false)}
              >
                بستن
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-auto">
              {jambandiLoading && <div className="p-3 text-sm text-gray-600">در حال دریافت اطلاعات...</div>}
              {!!jambandiError && <div className="p-3 text-sm text-red-600">{jambandiError}</div>}
              {!jambandiLoading && !jambandiError && (
                <>
                  {panelTab === "Jambandi" && (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-3 bg-white">
                        <div className="font-semibold mb-2">توضیحات جمع بندی</div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                          {jambandi?.Jambandi?.trim() ? jambandi.Jambandi : "—"}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <ThumbCard label="Page1" fileName={jambandi?.Page1} />
                        <ThumbCard label="Page2" fileName={jambandi?.Page2} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Viewer زوم/پن/سوایپ */}
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
            onClick={(e) => { e.stopPropagation(); goPrevViewer(); }}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-3xl select-none"
            onClick={(e) => { e.stopPropagation(); goNextViewer(); }}
          >
            ›
          </button>
          <button
            type="button"
            className="absolute top-4 right-4 z-50 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-2xl select-none"
            onClick={(e) => { e.stopPropagation(); closeViewer(); }}
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

      {ModalTaidParvandeh && (
        <div className="fixed inset-0 z-50">

          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setModalTaidParvandeh(false)}
          ></div>

          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[30%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">

            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">برگشت پرونده به حوزه</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <Textarea1
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
              errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 رقم " : ""}
            />

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 cursor-pointer rounded"
                onClick={() => setModalTaidParvandeh(false)}
              >
                بستن
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (tozihat.length > 10) {
                    setErrortozihat(false);
                    await ResultToHozeh(erjaId || 0, 3, tozihat);
                  }
                  else {
                    setErrortozihat(true);

                  }

                }}
                // disabled={!canSubmit}
                className={`cursor-pointer px-4 py-1 rounded-xl bg-green-700 text-white 
                  ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
                  }`}
              >
                ارسال
              </button>

            </div>
          </div>

        </div >
      )
      }

      {ModalBargashtParvandeh && (
        <div className="fixed inset-0 z-50">

          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setModalBargashtParvandeh(false)}
          ></div>

          <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-[30%] max-h-[90vh] overflow-hidden absolute top-5 left-1/2 -translate-x-1/2">

            <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
              <h2 className="text-lg font-bold">برگشت پرونده به حوزه</h2>
            </div>
            <hr className="mb-3 text-blue-800" />

            <Textarea1
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
              errorMessage={errortozihat ? "این فیلد اجباری است حداقل 10 رقم " : ""}
            />

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 cursor-pointer rounded"
                onClick={() => setModalBargashtParvandeh(false)}
              >
                بستن
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (tozihat.length > 10) {
                    setErrortozihat(false);
                    await ResultToHozeh(erjaId || 0, 3, tozihat);
                  }
                  else {
                    setErrortozihat(true);

                  }

                }}
                // disabled={!canSubmit}
                className={`cursor-pointer px-4 py-1 rounded-xl bg-green-700 text-white 
                  ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
                  }`}
              >
                ارسال
              </button>

            </div>
          </div>

        </div >
      )
      }



      <TahghighatStateModal isOpen={open} onClose={() => setOpen(false)} erjaid={erjaId} />

    </div>
  );
};

export default FehrestErjaParvandeh;