"use client";

import { useMeratUser } from "@/lib/useMeratUser";

import PdfModal from '@/component/PdfBox'

import FehrestParvandhContent from "@/app/Davtalab/CardDavtalab/Componnet/FehrestParvandhContent";
import KholasehSalahiyat from "@/app/Davtalab/Davtalaban/Componnet/KholasehSalahiyat";
import { encryptText } from "@/lib/cryptoUtil";
import { FilterXIcon, UserCheck2Icon, ShieldCheck } from "@/component/ResearchIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import DynamicTable from "@/component/DataTable/CustomTable1";
import { GetFileNamePic } from '@/services/ApiServiceNameha'
import { useAlert } from "@/component/AlertContext";
import EjraBeMohaghegh from '@/app/(Dashboard)/(Tahghighat)/Componnet/EjraBeMohaghegh'
import PersianDateInput from '@/component/Objects/InputPersianDatePicker'
import { InsertHamyarHoghoghi, GetamyarHoghoghi } from '@/services/ApiServiceShorayeTahghigh' // ✅ ایمپورت سرویس
import {
    GetDavtalabPic,
    FehrestDavtalaban,
    GetDavtalabByParvandeh,
    GetPeyvastMadarekPish, GetKarbargTahghighByShomareh
} from "@/services/ApiServiceDavtalab";
import { GetErjaIdByParvandeh } from '@/services/ApiService'
import { UploadKarbargTahghigh } from '@/services/ApiServiceNameha'
import { X, Download, FolderOpen, PanelLeftClose, User2Icon } from "@/component/ResearchIcons";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/Utils/ConfirmModalContext";
import Image from "next/image";
import ReadOnlyField from "@/component/Objects/ReadOnlyField";
import Moshakhast from './Componnet/Moshakhast'
import Sokonat from './Componnet/Sokonat'
import Tahsilat from './Componnet/Tahsilat'
import Shoghl from './Componnet/Shoghl'
import Faliyats from './Componnet/Faliyats'
import domtoimage from '@/lib/domToImageCompat';
import { v4 as uuidv4 } from "uuid";

type Props = {
    mahal: number;
    CodeEntekhabat: number;
    CodeHozeh: number;
    Natije: number;
    value: number;
    reloadTick?: number;
};

type DavtalabDetail = {
    ShomarehParvandeh?: number | null;
    CodeMelli?: string;
    TelHamrah?: string | null;
    FirstName?: string;
    LastName?: string;
    NamePedar?: string;
    NameMostar?: string | null;
    TarikhTavalod?: string | null;
    ShomareShenasnameh?: string | null;
    MahalTavalod?: string | null;
    MahalSodor?: string | null;
    IsLife_NameFarsi?: string | null;
    IsRohani_NameFarsi?: string | null;
    Jensiyat_NameFarsi?: string | null;
    Taahol_NameFarsi?: string | null;
    NezamVazife_NameFarsi?: string | null;
    NoeMoafiyat_NameFarsi?: string | null;
    SharhMoafiyat?: string;
    TaghiratShenasnameh?: string | null;
};

type PeyvastItem = {
    id?: string | number;
    title?: string;
    src: string;
    isObjectUrl?: boolean;
};


type HamyarInfo = {
    FullName?: string;
    RecordState_NameFarsi?: string;
};

const sizePage = 10;
const SWIPE_THRESHOLD = 60;

export default function FehrestUsersClient({
    mahal,
    CodeEntekhabat,
    CodeHozeh,
    Natije,
    value,
    reloadTick = 0,
}: Props) {
    const { showAlert } = useAlert();
    const user = useMeratUser();

    const [filterValue, setFilterValue] = useState<number>(value);
    const [hamyarMap, setHamyarMap] = useState<Record<string | number, HamyarInfo | null | undefined>>({});
    const hamyarLoadingRef = useRef<Set<string | number>>(new Set());

    const getHamyarTooltipText = (row: any) => {
        const key = row?.ShomarehParvandeh;
        const h = key ? hamyarMap[key] : undefined;

        if (!key) return "شماره پرونده نامعتبر";
        if (Number(row?.InHamyar) !== 1) return "این ردیف همیار ندارد";
        if (h === undefined) return "در حال دریافت اطلاعات همیار...";
        if (h === null) return "اطلاعات همیار یافت نشد";
        return `نام: ${h.FullName ?? "-"} | وضعیت: ${h.RecordState_NameFarsi ?? "-"}`;
    };

    useEffect(() => {
        setFilterValue(value);
    }, [value]);

    const handleRowMouseEnter = async (
        _e: React.MouseEvent<HTMLElement>,
        rowKeyValue: any,
        row: any,
        _rowIndex: number
    ) => {
        if (Number(row?.InHamyar) !== 1) return;

        const shomarehParvandeh = rowKeyValue ?? row?.ShomarehParvandeh;
        if (!shomarehParvandeh) return;

        if (hamyarMap[shomarehParvandeh] !== undefined) return;

        if (hamyarLoadingRef.current.has(shomarehParvandeh)) return;
        hamyarLoadingRef.current.add(shomarehParvandeh);

        setHamyarMap((prev) => ({ ...prev, [shomarehParvandeh]: undefined }));

        try {
            const res: any = await GetamyarHoghoghi(shomarehParvandeh);
            console.log(res);
            const info = Array.isArray(res?.data) ? res.data[0] : res?.data;

            const mapped: HamyarInfo | null = info
                ? { FullName: info.FullName, RecordState_NameFarsi: info.RecordState_NameFarsi }
                : null;

            setHamyarMap((prev) => ({ ...prev, [shomarehParvandeh]: mapped }));
        } catch {
            setHamyarMap((prev) => ({ ...prev, [shomarehParvandeh]: null }));
        } finally {
            hamyarLoadingRef.current.delete(shomarehParvandeh);
        }
    };

    const mavaredBoxRef = useRef<HTMLDivElement | null>(null);
    const [MavaredEbhami, setMavaredEbhami] = useState<string>("");
    const fehrestPishnahadiBoxRef = useRef<HTMLDivElement | null>(null);
    const [FehrestPishnadiTahghigh, setFehrestPishnadiTahghigh] = useState<string>("");
    const [errorMohaghegh, setErrorMohaghegh] = useState<boolean>(false);
    const [errorTarikh, seterrorTarikh] = useState<boolean>(false);
    const [CodeMohaghegh, setCodeMohaghegh] = useState<number | null>(null);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [dragStartY, setDragStartY] = useState<number | null>(null);
    const [dragDeltaY, setDragDeltaY] = useState(0);
    const [tarikh, settarikh] = useState<string | null>(null);
    const router = useRouter();
    const { showConfirm } = useConfirm();
    const [tozihat, setTozihat] = useState("");
    const [data, setData] = useState<any[]>([]);
    const [page, setPage] = useState<number>(1);
    const [indexsorat, setindexsorat] = useState<number>(1);
    const [descsort, setdescsort] = useState<number>(1);
    const [totalRecord, setTotalRecord] = useState<number>(0);
    const [searchText, setSearchText] = useState<string>("");
    const [NameOstan, setNameOstan] = useState<string>("");
    const [NameHozeh, setNameHozeh] = useState<string>("");
    const [ModalOpenUser, setModalOpenUser] = useState(false);
    const [form, setForm] = useState<{ ShomarehParvandeh: number }>({
        ShomarehParvandeh: 0,
    });
    const parvandehStr = useMemo(
        () => String(form.ShomarehParvandeh ?? "").trim(),
        [form.ShomarehParvandeh]
    );
    const [imgSrc, setImgSrc] = useState("/person.png");
    const [detail, setDetail] = useState<DavtalabDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [peyvast, setPeyvast] = useState<PeyvastItem[]>([]);
    const [loadingPeyvast, setLoadingPeyvast] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [ShomarehParvandeh, setShomarehParvandeh] = useState(0);
    const [FullName, setFullName] = useState("");
    const [viewerIndex, setViewerIndex] = useState(0);
    const [dragStartX, setDragStartX] = useState<number | null>(null);
    const [dragDeltaX, setDragDeltaX] = useState(0);
    const [ModalOpenCreateForm, setModalOpenCreateForm] = useState(false);
    const [ModalOpenFehrestParvandh, setModalOpenFehrestParvandh] = useState(false);
    const [ModalOpenKholasehSalahiyat, setModalOpenKholasehSalahiyat] = useState(false);

    const [PdfModalOpen, setPdfModalOpen] = useState(false);
    const [PdfFileName, setPdfFileName] = useState<string>("");
    const [PdfTitle, setPdfTitle] = useState<string>("");


    const [ModalHamyar, setModalHamyar] = useState(false);
    const peyvastObjectUrlsRef = useRef<string[]>([]);
    const picObjectUrlRef = useRef<string | null>(null);

    const [hamyarTooltip, setHamyarTooltip] = useState<HamyarInfo | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const closeViewer = () => {
        setViewerOpen(false);
        setDragStartX(null);
        setDragStartY(null);
        setDragDeltaX(0);
        setDragDeltaY(0);
        setZoomLevel(1);
    };

    const SaveErjaBeHamyar = async (ShomarehParvandeh: number, CodeMohaghegh: number, tozihat: string, tarikh: string, user: number) => {
        const result = await InsertHamyarHoghoghi(ShomarehParvandeh, CodeMohaghegh, tarikh, tozihat, user);
        if (result.status == 200) {
            setModalHamyar(false);
        }
    }

    const LoadOneKarbargMosahebe = async () => {
        setFehrestPishnadiTahghigh("");
        setMavaredEbhami("");
        const result = await GetKarbargTahghighByShomareh(form.ShomarehParvandeh, 31210, user.UserId);
        if (result.data) {
            if (result.data && result.data.length > 0) {
                setFehrestPishnadiTahghigh(result.data[0].ManabePishnahadi);
                setMavaredEbhami(result.data[0].EbhamatParvandeh);
            }
        }
        setModalOpenCreateForm(true);
    }

    const openEditModal = (row: any) => {
        setForm({ ShomarehParvandeh: row?.ShomarehParvandeh ?? 0 });
        setNameOstan(row?.NameOstan);
        setNameHozeh(row?.NameHozeh);
        setModalOpenUser(true);
    };
    const openslahiyat = (row: any) => {
        setForm({ ShomarehParvandeh: row?.ShomarehParvandeh ?? 0 });
        setNameOstan(row?.NameOstan);
        setNameHozeh(row?.NameHozeh);
        setModalOpenKholasehSalahiyat(true);
    };

    const downloadfilenameh = async (row: any) => {
        const fileName = row?.FileName;
        try {
            const result = await GetFileNamePic(fileName, user.UserId);
            if (!result || !(result instanceof Blob)) {
                alert("خطا در دریافت فایل.");
                return;
            }
            const url = window.URL.createObjectURL(result);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
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

    const openViewer = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
        setDragStartX(null);
        setDragStartY(null);
        setDragDeltaX(0);
        setDragDeltaY(0);
        setZoomLevel(1);
    };

    const prevImage = () =>
        setViewerIndex((i) => Math.max(0, i - 1));
    const nextImage = () =>
        setViewerIndex((i) => Math.min(peyvast.length - 1, i + 1));

    const closeUserModal = () => {
        setModalOpenUser(false);
        setForm({ ShomarehParvandeh: 0 });
        setDetail(null);
        setImgSrc("/person.png");
        setPeyvast([]);
        setLoadingDetail(false);
        setLoadingPeyvast(false);
        closeViewer();
        if (picObjectUrlRef.current) {
            URL.revokeObjectURL(picObjectUrlRef.current);
            picObjectUrlRef.current = null;
        }
        peyvastObjectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        peyvastObjectUrlsRef.current = [];
    };

    const handleSortChange = (field: string, direction: "asc" | "desc") => {
        const sortIndexMap: Record<string, number> = {
            CodeMelli: 1,
            FirstName: 2,
            LastName: 3,
            OnvanPost: 4,
            NameMahal: 5,
        };
        const columnIndex = sortIndexMap[field] ?? 1;
        const sortDirection = direction === "asc" ? 1 : 2;
        setindexsorat(columnIndex);
        setdescsort(sortDirection);
        setPage(1);
    };


    useEffect(() => {
        if (!mahal || !CodeEntekhabat) return;
        setPage(1);
    }, [mahal, CodeEntekhabat, CodeHozeh, reloadTick]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!mahal || !CodeEntekhabat) {
                setData([]);
                setTotalRecord(0);
                return;
            }
            try {
                const res = await FehrestDavtalaban(
                    mahal,
                    CodeEntekhabat,
                    CodeHozeh, Natije,
                    page,
                    sizePage,
                    indexsorat,
                    descsort,
                    searchText,
                    user.UserId
                    , filterValue
                );
                if (cancelled) return;
                if ((res as any)?.status === 401) {
                    router.push("/Login");
                    return;
                }
                const rows =
                    (res as any)?.data?.items ??
                    (res as any)?.data?.rows ??
                    (res as any)?.data ??
                    (res as any)?.rows ??
                    [];
                const total =
                    (res as any)?.data?.totalRecord ??
                    (res as any)?.totalRecord ??
                    (res as any)?.TotalRecord ??
                    (res as any)?.data?.[0]?.TotalCount ??
                    0;
                setData(Array.isArray(rows) ? rows : []);
                setTotalRecord(Number(total ?? 0));
            } catch {
                if (cancelled) return;
                setData([]);
                setTotalRecord(0);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [
        mahal,
        CodeEntekhabat,
        CodeHozeh,
        Natije,
        reloadTick,
        page,
        indexsorat,
        descsort,
        searchText,
        filterValue,
        router,
    ]);

    useEffect(() => {
        let cancelled = false;
        const loadPic = async () => {
            if (!ModalOpenUser || !parvandehStr) {
                setImgSrc("/person.png");
                return;
            }
            if (picObjectUrlRef.current) {
                URL.revokeObjectURL(picObjectUrlRef.current);
                picObjectUrlRef.current = null;
            }
            try {
                const res: any = await GetDavtalabPic(parvandehStr);
                if (cancelled) return;
                if (res?.status === 401) {
                    router.push("/Login");
                    return;
                }
                if (res instanceof Blob) {
                    if (res.size > 0) {
                        const url = URL.createObjectURL(res);
                        picObjectUrlRef.current = url;
                        setImgSrc(url);
                        return;
                    } else {
                        setImgSrc("/person.png");
                        return;
                    }
                }
                if (typeof res === "string") {
                    if ((res.startsWith("http") || res.startsWith("/")) && res.length > 5) {
                        setImgSrc(res);
                        return;
                    }
                    if (res.length > 50) {
                        setImgSrc(`data:image/jpeg;base64,${res}`);
                        return;
                    }
                }
                setImgSrc("/person.png");
            } catch (error) {
                if (!cancelled) {
                    setImgSrc("/person.png");
                }
            }
        };
        loadPic();
        return () => {
            cancelled = true;
        };
    }, [ModalOpenUser, parvandehStr, router]);

    useEffect(() => {
        let cancelled = false;
        const loadDetail = async () => {
            if (!ModalOpenUser || !parvandehStr) {
                setDetail(null);
                return;
            }
            try {
                setLoadingDetail(true);
                const res: any = await GetDavtalabByParvandeh(parvandehStr);
                if (cancelled) return;
                if (res?.status === 401) {
                    router.push("/Login");
                    return;
                }
                const raw = res?.data ?? res;
                const one = Array.isArray(raw) ? raw[0] : raw;
                setDetail(one ?? null);
            } catch {
                if (!cancelled) setDetail(null);
            } finally {
                if (!cancelled) setLoadingDetail(false);
            }
        };
        loadDetail();
        return () => {
            cancelled = true;
        };
    }, [ModalOpenUser, parvandehStr, router]);

    const toImageSrc = (x: any) => {
        if (x instanceof Blob) {
            const url = URL.createObjectURL(x);
            peyvastObjectUrlsRef.current.push(url);
            return { src: url, isObjectUrl: true };
        }
        if (typeof x === "string" && (x.startsWith("http") || x.startsWith("/"))) {
            return { src: x, isObjectUrl: false };
        }
        if (typeof x === "string" && x.length > 50) {
            return { src: `data:image/jpeg;base64,${x}`, isObjectUrl: false };
        }
        const base64 = x?.base64 ?? x?.Base64 ?? x?.dataBase64 ?? x?.DataBase64;
        if (typeof base64 === "string" && base64.length > 50) {
            const mime = x?.mime ?? x?.Mime ?? "image/jpeg";
            return { src: `data:${mime};base64,${base64}`, isObjectUrl: false };
        }
        const url = x?.url ?? x?.Url ?? x?.src ?? x?.Src;
        if (typeof url === "string" && (url.startsWith("http") || url.startsWith("/"))) {
            return { src: url, isObjectUrl: false };
        }
        return null;
    };

    useEffect(() => {
        let cancelled = false;
        const loadPeyvast = async () => {
            if (!ModalOpenUser || !parvandehStr) {
                setPeyvast([]);
                return;
            }
            peyvastObjectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
            peyvastObjectUrlsRef.current = [];
            try {
                setLoadingPeyvast(true);
                const res: any = await GetPeyvastMadarekPish(parvandehStr);
                if (cancelled) return;
                if (res?.status === 401) {
                    router.push("/Login");
                    return;
                }
                const raw =
                    res?.data?.items ??
                    res?.data?.rows ??
                    res?.data ??
                    res?.items ??
                    res?.rows ??
                    res;
                const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
                const top2 = arr.slice(0, 2);
                const mapped: PeyvastItem[] = [];
                for (let i = 0; i < top2.length; i++) {
                    const it = top2[i];
                    const candidate =
                        it?.blob ??
                        it?.Blob ??
                        it?.file ??
                        it?.File ??
                        it?.image ??
                        it?.Image ??
                        it?.data ??
                        it?.Data ??
                        it;
                    const converted = toImageSrc(candidate);
                    if (!converted) continue;
                    mapped.push({
                        id: it?.id ?? it?.ID ?? it?.type ?? it?.Type ?? i,
                        title:
                            it?.title ??
                            it?.Title ??
                            it?.name ??
                            it?.Name ??
                            it?.fileName ??
                            it?.FileName ??
                            `پیوست ${i + 1}`,
                        src: converted.src,
                        isObjectUrl: converted.isObjectUrl,
                    });
                }
                setPeyvast(mapped);
            } catch {
                if (cancelled) setPeyvast([]);
            } finally {
                if (!cancelled) setLoadingPeyvast(false);
            }
        };
        loadPeyvast();
        return () => {
            cancelled = true;
        };
    }, [ModalOpenUser, parvandehStr, router]);

    useEffect(() => {
        if (!viewerOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeViewer();
            if (e.key === "ArrowLeft") prevImage();
            if (e.key === "ArrowRight") nextImage();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [viewerOpen, viewerIndex, peyvast.length]);

    const exportNodeToPNGFile = async (nodeId: string, fileName: string, isDownload: boolean) => {
        const node = document.getElementById(nodeId);
        if (!node) {
            console.error(`❌ عنصر با id="${nodeId}" پیدا نشد`);
            return null;
        }
        const scale = 1;
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
        if (isDownload) {
            const link = document.createElement('a');
            link.download = 'Export.png';
            link.href = dataUrl;
            link.click();
        }
        const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            return new File([blob], fileName, { type: blob.type || "image/png" });
        };
        const file = await dataUrlToFile(dataUrl, fileName);
        const previewUrl = URL.createObjectURL(file);
        return { file, previewUrl };
    };

    const handleExportPNG = async () => {
        try {
            const f1 = await exportNodeToPNGFile("div_image_page1", "page1.png", true);
            if (!f1) return;
            const guidName = uuidv4() + ".png";
            const Result = await UploadKarbargTahghigh(form.ShomarehParvandeh
                , FehrestPishnadiTahghigh, MavaredEbhami, guidName, user.UserId, f1.file);
        } catch (err) {
            showAlert({
                type: "error",
                title: "خطا",
                description: "خطا در ذخیره کاربرگ :" + err,
            });
        }
    };

    const openParvandeh = async (shomarehParvandeh: number, mahal: number) => {
        const result = await GetErjaIdByParvandeh(shomarehParvandeh, mahal);
        const ErjaId = result.data[0].ErjaId;
        const encrypted = encryptText(String(ErjaId));
        const mahalId = user.Mahal;
        if (mahalId.toString().length == 3) {
            router.push(`/ParvandehOstan/${encodeURIComponent(encrypted)}`);
        }
    }

    return (
        <>
            <div className="cursor-pointer bg-white m-1 py-2 px-2 flex flex-col md:flex-row gap-4 rounded-b-xl">
                <div className="bg-white rounded-b-xl shadow w-full flex flex-col gap-2">
                    <div className="p-3">
                        <DynamicTable
                            title="📋 فهرست اشخاص"
                            columns={[
                                { title: "ردیف", field: "Rdf", width: "60px" },
                                { title: "شماره پرونده", field: "ShomarehParvandeh", width: "100px" },
                                { title: "شماره ملی", field: "CodeMelli", width: "120px" },
                                { title: "نام", field: "FirstName", width: "150px" },
                                { title: "نام خانوادگی", field: "LastName", width: "200px" },
                                { title: "نام پدر", field: "NamePedar", width: "100px" },
                                { title: "تاریخ تولد", field: "TarikhTavalod", width: "110px" },
                                { title: "تلفن همراه", field: "TelHamrah", width: "100px" },
                                { title: "حوزه انتخابیه", field: "NameHozeh", width: "250px" },
                                {
                                    title: "همیار حقوقی",
                                    field: "InHamyar",
                                    width: "20px",
                                    render: (value) => (Number(value) === 1 ? "✅" : "—"),
                                    showTooltip: true,
                                    renderTooltip: (row: any) => getHamyarTooltipText(row),
                                    hoverFetch: true,
                                },
                            ]}
                            data={data}
                            totalRecord={totalRecord}
                            page={page}
                            recordsPerPage={sizePage}
                            search={searchText}
                            onPageChange={(newPage: number) => setPage(newPage)}
                            onSearch={(text: string) => {
                                setPage(1);
                                setSearchText(text);
                            }}
                            onSortChange={handleSortChange}
                            rowClassName={(_row: any, idx: number) =>
                                `${idx % 2 === 0 ? "bg-white" : "bg-gray-100"} hover:bg-gray-200`
                            }
                            rowKeyField="ShomarehParvandeh"
                            onRowMouseEnter={handleRowMouseEnter}
                            onRowMouseLeave={() => { }}
                            actions={[
                                {
                                    icon: <User2Icon size={16} />,
                                    title: "ویرایش",
                                    onClick: openEditModal,
                                    colorClass: "bg-blue-500",
                                },
                                {
                                    icon: <ShieldCheck size={16} />,
                                    title: "خلاصه صلاحیت",
                                    onClick: openslahiyat,
                                    colorClass: "bg-blue-500",
                                },
                                {
                                    icon: <Download size={16} />,
                                    title: "دانلود کاربرگ",
                                    onClick: downloadfilenameh,
                                    colorClass: "bg-green-700",
                                    condition: (row: any) => row.FileName !== null,
                                },
                                {
                                    icon: <Download size={16} />,
                                    title: "",
                                    onClick: () => { },
                                    colorClass: "bg-gray-500",
                                    condition: (row: any) => row.FileName == null,
                                },
                            ]}

                            headerActions={[
                                {
                                    title: "ارسال به همیار",
                                    icon: <User2Icon size={16} />,
                                    className: "bg-indigo-700 hover:bg-indigo-600",
                                    onClick: () => {
                                        setPage(1);
                                        setFilterValue(1);
                                    },
                                },
                                {
                                    title: "دریافت از همیار",
                                    icon: <UserCheck2Icon size={16} />,
                                    className: "bg-green-700 hover:bg-green-600",
                                    onClick: () => {
                                        setPage(1);
                                        setFilterValue(2);
                                    },
                                },
                                {
                                    title: "بدون فیلتر",
                                    icon: <FilterXIcon size={16} />,
                                    className: "bg-black hover:bg-gray-800",
                                    onClick: () => {
                                        setPage(1);
                                        setFilterValue(0);
                                    },
                                },
                                //  {
                                //     title: "بدون فیلتر",
                                //     icon: <FilterXIcon size={16} />,
                                //     className: "bg-black hover:bg-gray-800",
                                //     onClick: () => {
                                //         router.push("/")
                                //     },
                                // },

                                {
                                    title: "گزارش‌ها",
                                    icon: <Download size={16} />,
                                    className: "bg-amber-700 hover:bg-amber-600",
                                    children: [
                                        {
                                            title: "فهرست داوطلبان میاندوره ای اول مجلس دوازدهم",
                                            icon: <Download size={16} />,
                                            onClick: () => {
                                                setPdfFileName("Report_" + user.Mahal + ".pdf");
                                                setPdfTitle("فهرست داوطلبان میاندوره ای اول مجلس دوازدهم");
                                                setPdfModalOpen(true);
                                            },
                                        },
                                        //  {
                                        //      title: "فهرست نهایی تایید صلاحیت‌شده‌ها",
                                        //      icon: <Download size={16} />,
                                        //      onClick: () => {
                                        //          setPdfFileName("FinalApproved.pdf");
                                        //          setPdfTitle("فهرست نهایی تایید صلاحیت‌شده‌ها");
                                        //          setPdfModalOpen(true);
                                        //      },
                                        //  },
                                        //  {
                                        //     title: "لیست داوطلبان بدون همیار",
                                        //      icon: <Download size={16} />,
                                        //      onClick: () => {
                                        //          setPdfFileName("NoHamyar.pdf");
                                        //          setPdfTitle("لیست داوطلبان بدون همیار");
                                        //          setPdfModalOpen(true);
                                        //      },
                                        //  },
                                    ],
                                },
                            ]}
                        />

                    </div>
                </div>
            </div>

            {hamyarTooltip && (
                <div
                    className="fixed z-[100] bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl pointer-events-none border border-gray-700 max-w-xs"
                    style={{
                        left: tooltipPosition.x + 15,
                        top: tooltipPosition.y + 15,
                    }}
                >
                    <div className="font-bold mb-1 text-blue-300">اطلاعات همیار حقوقی</div>
                    <div className="flex flex-col gap-1">
                        <div>
                            <span className="text-gray-400">نام:</span> {hamyarTooltip.FullName || "-"}
                        </div>
                        <div>
                            <span className="text-gray-400">وضعیت:</span> {hamyarTooltip.RecordState_NameFarsi || "-"}
                        </div>
                    </div>
                </div>
            )}

            {/* =========================
          مودال اطلاعات فرد
      ========================= */}
            {data.length > 0 && ModalOpenUser && (
                <div className="fixed inset-0 z-[30000] flex items-start justify-center" style={{ paddingTop: "44px" }}>
                    <div className="absolute inset-0 bg-black opacity-40" onClick={closeUserModal} />
                    <div className="bg-white rounded-2xl pb-4 mx-4 shadow-2xl z-50 w-[1000px] relative max-h-[82vh] overflow-visible border border-gray-200">
                        <div className="bg-sky-300 px-5 py-2 rounded-t-2xl border-b border-gray-300 h-[46px] flex items-center">
                            <h2 className="text-base font-normal text-white">اطلاعات فرد</h2>
                        </div>
                        <div
                            className="absolute left-1/2 z-30"
                            style={{ transform: "translateX(-50%)", top: "-32px" }}
                        >
                            <div
                                style={{
                                    width: "84px",
                                    height: "84px",
                                    minWidth: "84px",
                                    minHeight: "84px",
                                    borderRadius: "9999px",
                                    background: "#ffffff",
                                    border: "3px solid #ffffff",
                                    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)",
                                    outline: "1px solid #d9e3ef",
                                    overflow: "hidden",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <img
                                    src={imgSrc || "/person.png"}
                                    alt="پروفایل"
                                    width={84}
                                    height={84}
                                    style={{
                                        width: "84px",
                                        height: "84px",
                                        minWidth: "84px",
                                        minHeight: "84px",
                                        borderRadius: "9999px",
                                        objectFit: "cover",
                                        display: "block",
                                        background: "#ffffff",
                                        flexShrink: 0,
                                    }}
                                    draggable={false}
                                    onError={(event) => {
                                        const target = event.currentTarget;
                                        if (!target.src.endsWith("/person.png")) {
                                            target.src = "/person.png";
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="mt-5 max-h-[calc(82vh-100px)] overflow-y-auto px-6 pr-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <ReadOnlyField label="نام" value={detail?.FirstName} loading={loadingDetail} />
                                <ReadOnlyField label="نام خانوادگی" value={detail?.LastName} loading={loadingDetail} />
                                <ReadOnlyField label="نام پدر" value={detail?.NamePedar} loading={loadingDetail} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
                                <ReadOnlyField label="شماره پرونده" value={detail?.ShomarehParvandeh} loading={loadingDetail} />
                                <ReadOnlyField label="کد ملی" value={detail?.CodeMelli} loading={loadingDetail} dir="ltr" />
                                <ReadOnlyField label="تلفن همراه" value={detail?.TelHamrah} loading={loadingDetail} dir="ltr" />
                                <ReadOnlyField label="تاریخ تولد" value={detail?.TarikhTavalod} loading={loadingDetail} dir="ltr" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
                                <ReadOnlyField label="شماره شناسنامه" value={detail?.ShomareShenasnameh} loading={loadingDetail} />
                                <ReadOnlyField label="محل تولد" value={detail?.MahalTavalod} loading={loadingDetail} />
                                <ReadOnlyField label="محل صدور" value={detail?.MahalSodor} loading={loadingDetail} />
                                <ReadOnlyField label="نظام وظیفه" value={detail?.NezamVazife_NameFarsi} loading={loadingDetail} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                <div className="md:col-span-3">
                                    <ReadOnlyField
                                        label="توضیحات شناسنامه"
                                        value={detail?.TaghiratShenasnameh}
                                        loading={loadingDetail}
                                        multiline
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-semibold text-gray-700">مدارک پیش ثبت نام</div>
                                    {loadingPeyvast && <div className="text-xs text-gray-500">در حال دریافت...</div>}
                                </div>
                                {!loadingPeyvast && peyvast.length === 0 ? (
                                    <div className="text-xs text-gray-500">پیوستی یافت نشد.</div>
                                ) : (
                                    <div className="flex gap-3 flex-wrap">
                                        {peyvast.map((p, idx) => (
                                            <div
                                                key={`${parvandehStr}-${p.id ?? "x"}-${idx}`}
                                                onClick={() => openViewer(idx)}
                                                className="cursor-pointer w-[70px] h-[90px] rounded-xl border border-gray-400 bg-gray-50 overflow-hidden shadow-sm hover:shadow-md transition"
                                                title={p.title}
                                            >
                                                <Image
                                                    src={p.src}
                                                    alt={p.title ?? "پیوست"}
                                                    width={120}
                                                    height={90}
                                                    className="w-full h-full object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 px-6">
                            <button
                                className="flex gap-2 bg-green-700 hover:bg-green-700 text-white px-4 py-2 rounded-xl cursor-pointer"
                                onClick={() => {
                                    openParvandeh(detail?.ShomarehParvandeh || 0, user.Mahal);
                                }}
                            >
                                پرونده تحقیق
                                <FolderOpen />
                            </button>
                            <button
                                className="flex gap-2 bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-xl cursor-pointer"
                                onClick={() => {
                                    LoadOneKarbargMosahebe();
                                }}
                            >
                                کاربرگ تحقیق
                                <FolderOpen />
                            </button>
                            <button
                                className="flex gap-2 bg-purple-500 hover:bg-purple-600 text-white  px-4 py-2 rounded-xl cursor-pointer"
                                onClick={() => {
                                    setShomarehParvandeh(detail?.ShomarehParvandeh || 0);
                                    setFullName(detail?.FirstName + " " + detail?.LastName || "");
                                    setModalOpenFehrestParvandh(true);
                                }}
                            >
                                پرونده داوطلب
                                <FolderOpen />
                            </button>
                            <button
                                className="flex gap-2 bg-purple-500 hover:bg-purple-600 text-white  px-4 py-2 rounded-xl cursor-pointer"
                                onClick={() => {
                                    setModalOpenKholasehSalahiyat(true);
                                    setShomarehParvandeh(detail?.ShomarehParvandeh || 0);
                                    setFullName(detail?.FirstName + " " + detail?.LastName || "");
                                    closeUserModal();
                                }}
                            >
                                صلاحیت داوطلب
                                <FolderOpen />
                            </button>
                            {user.PostId != 55 && (
                                <button
                                    className="flex gap-2 bg-sky-500 hover:bg-sky-600 text-white  px-4 py-2 rounded-xl cursor-pointer"
                                    onClick={() => {
                                        setShomarehParvandeh(detail?.ShomarehParvandeh || 0);
                                        setFullName(detail?.FirstName + " " + detail?.LastName || "");
                                        setModalHamyar(true);
                                    }}
                                >
                                    ارجاع به همیار
                                    <FolderOpen />
                                </button>
                            )}
                            <button
                                className="flex gap-2 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-xl cursor-pointer"
                                onClick={closeUserModal}
                            >
                                بستن
                                <PanelLeftClose />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* =========================
          Viewer بزرگ + سوایپ + زوم + Pan
      ========================= */}
            {viewerOpen && peyvast.length > 0 && (
                <div className="fixed inset-0 z-[30010] bg-black/80 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0" onClick={closeViewer} />
                    <div className="relative w-full h-full flex items-center justify-center">
                        {viewerIndex > 0 && (
                            <button
                                onClick={prevImage}
                                className="absolute left-4 md:left-10 text-white text-4xl hover:text-gray-300 select-none z-20 bg-black/20 p-2 rounded-full"
                            >
                                ‹
                            </button>
                        )}
                        <div
                            className="relative w-full h-full flex items-center justify-center select-none"
                            style={{ touchAction: "none" }}
                            onWheel={(e) => {
                                e.preventDefault();
                                setZoomLevel((prev) => {
                                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                                    const newZoom = Math.min(Math.max(0.5, prev + delta), 5);
                                    return newZoom;
                                });
                            }}
                            onPointerDown={(e) => {
                                if ((e as any).button !== undefined && (e as any).button !== 0) return;
                                setDragStartX(e.clientX);
                                setDragStartY(e.clientY);
                                setDragDeltaX(0);
                                setDragDeltaY(0);
                                (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
                            }}
                            onPointerMove={(e) => {
                                if (dragStartX === null || dragStartY === null) return;
                                const deltaX = e.clientX - dragStartX;
                                const deltaY = e.clientY - dragStartY;
                                setDragDeltaX(deltaX);
                                setDragDeltaY(deltaY);
                            }}
                            onPointerUp={(e) => {
                                if (dragStartX === null || dragStartY === null) return;
                                if (zoomLevel === 1) {
                                    if (dragDeltaX <= -SWIPE_THRESHOLD) {
                                        if (viewerIndex < peyvast.length - 1) nextImage();
                                    } else if (dragDeltaX >= SWIPE_THRESHOLD) {
                                        if (viewerIndex > 0) prevImage();
                                    }
                                } else {
                                    // Pan logic
                                }
                                setDragStartX(null);
                                setDragStartY(null);
                                setDragDeltaX(0);
                                setDragDeltaY(0);
                            }}
                            onPointerCancel={() => {
                                setDragStartX(null);
                                setDragStartY(null);
                                setDragDeltaX(0);
                                setDragDeltaY(0);
                            }}
                        >
                            <img
                                src={peyvast[viewerIndex].src}
                                alt={peyvast[viewerIndex].title ?? "پیوست"}
                                className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl transition-transform duration-75 ease-out will-change-transform"
                                style={{
                                    transformOrigin: "center center",
                                    transform: `translate(${dragDeltaX}px, ${dragDeltaY}px) scale(${zoomLevel})`,
                                    cursor: zoomLevel > 1 ? "grab" : "default",
                                }}
                                draggable={false}
                            />
                        </div>
                        {viewerIndex < peyvast.length - 1 && (
                            <button
                                onClick={nextImage}
                                className="absolute right-4 md:right-10 text-white text-4xl hover:text-gray-300 select-none z-20 bg-black/20 p-2 rounded-full"
                            >
                                ›
                            </button>
                        )}
                        {/* دکمه‌های کنترل زوم */}
                        <div className="absolute bottom-8 flex gap-4 z-20 bg-black/50 p-2 rounded-full backdrop-blur-sm">
                            <button
                                onClick={() => setZoomLevel((p) => Math.min(p + 0.5, 5))}
                                className="bg-white hover:bg-gray-200 text-black w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition"
                            >
                                +
                            </button>
                            <button
                                onClick={() => setZoomLevel(1)}
                                className="bg-white hover:bg-gray-200 text-black px-4 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setZoomLevel((p) => Math.max(p - 0.5, 0.5))}
                                className="bg-white hover:bg-gray-200 text-black w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition"
                            >
                                -
                            </button>
                        </div>
                        <div className="absolute top-4 left-0 right-0 text-center text-gray-200 text-sm z-20 pointer-events-none">
                            {peyvast[viewerIndex].title}{" "}
                            <span className="opacity-70">
                                ({viewerIndex + 1}/{peyvast.length})
                            </span>
                        </div>
                        <button
                            onClick={closeViewer}
                            className="absolute top-4 right-4 text-white text-3xl hover:text-red-400 select-none z-20 bg-black/20 p-2 rounded-full"
                            title="بستن"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
            {
                ModalOpenCreateForm && (
                    <div className="fixed inset-0 z-[30000] flex items-center justify-center">
                        {/* پس‌زمینه تیره */}
                        <div
                            className="absolute inset-0 bg-black opacity-40"
                            onClick={() => setModalOpenCreateForm(false)}
                        ></div>
                        {/* مودال اصلی */}
                        <div
                            className="bg-white rounded-lg shadow-2xl z-50 relative overflow-auto flex items-start justify-center"
                            style={{
                                width: "80vw",
                                height: "100vh",
                                margin: "5px",
                                padding: "20px",
                                boxSizing: "border-box",
                            }}
                        >
                            <div className="w-full h-full flex flex-col items-center">
                                <div className="w-[210mm] flex justify-center gap-3 mt-0">
                                    <button
                                        onClick={() => {
                                            handleExportPNG();
                                        }
                                        }
                                        className="cursor-pointer  bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                    >
                                        تولید کاربرگ تحقیق
                                    </button>
                                    <button
                                        onClick={() => setModalOpenCreateForm(false)}
                                        className="cursor-pointer  bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                                    >
                                        بستن
                                    </button>
                                </div>
                                <div className="m-5" id="div_image_page1"
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
                                                src="/logo/DarkhastTahghigh/mohr.jpg"
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
                                                width: "95%",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <img
                                                src="/logo/DarkhastTahghigh/Vasat.jpg"
                                                alt="لوگو دوم"
                                                style={{
                                                    width: "100%",
                                                    maxWidth: "500px",
                                                    height: "130px",
                                                    objectFit: "contain",
                                                    margin: 0,
                                                    padding: 0,
                                                    display: "block",
                                                }}
                                            />
                                        </div>
                                        <div
                                            style={{
                                                width: "50%",
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
                                                <span className="mx-1 text-[18px] text-purple-800"> {NameOstan}</span>
                                            </div>
                                            <div className="flex items-center justify-end">
                                                <span className="bnaznin text-[20px]">حوزه انتخابیه:</span>
                                                {NameHozeh.length <= 20 && (
                                                    <span className="mx-1 text-[16px] text-purple-800"> {NameHozeh}</span>
                                                )}
                                            </div>
                                            {NameHozeh.length > 20 && (
                                                <div className="flex items-center justify-end">
                                                    <span className="mx-1 text-[16px] text-purple-800"> {NameHozeh}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                width: "15%",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "flex-start",
                                                justifyContent: "center",
                                                gap: "2px",
                                                paddingRight: "5px",
                                            }}
                                        >
                                            <div className="flex justify-left">
                                                <div className="z-10 w-[90px] h-[90px] rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center">
                                                    <Image
                                                        src={imgSrc}
                                                        alt="پروفایل"
                                                        width={90}
                                                        height={90}
                                                        className="rounded-full object-cover"
                                                        unoptimized
                                                        onError={() => setImgSrc("/person.png")}
                                                    />
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
                                                مشخصات داوطلب
                                            </span>
                                        </div>
                                        <div className="flex flex-col justify-center h-full">
                                            <Moshakhast shomarehparvandeh={detail?.ShomarehParvandeh || 0} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <Sokonat shomarehparvandeh={detail?.ShomarehParvandeh || 0} />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <Shoghl shomarehparvandeh={detail?.ShomarehParvandeh || 0} />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <Tahsilat shomarehparvandeh={detail?.ShomarehParvandeh || 0} />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <Faliyats shomarehparvandeh={detail?.ShomarehParvandeh || 0} />
                                    </div>
                                    <div
                                        style={{
                                            width: "100%",
                                            minHeight: "250px",
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
                                                مشخصات منابع تحقیق پیشنهادی
                                            </span>
                                        </div>
                                        <div className="flex flex-col justify-center h-full w-full">
                                            <div
                                                ref={fehrestPishnahadiBoxRef}
                                                contentEditable
                                                suppressContentEditableWarning
                                                className="shabnam text-[18px] leading-loose w-full"
                                                style={{
                                                    flex: 1,
                                                    border: "1px dashed #999",
                                                    borderRadius: "10px",
                                                    padding: "12px",
                                                    marginBottom: "10px",
                                                    outline: "none",
                                                    color: "#0c4a6e",
                                                    whiteSpace: "pre-wrap",
                                                }}
                                                dangerouslySetInnerHTML={{
                                                    __html: FehrestPishnadiTahghigh,
                                                }}
                                                onBlur={(e) => {
                                                    const content = e.currentTarget.innerHTML;
                                                    setFehrestPishnadiTahghigh(content);
                                                }}
                                            />
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
                                        <div className="flex flex-col bnaznin text-[22px] leading-[1.3] mt-2">
                                            <span>ابهامات پرونده و موارد قابل پیگیری در تحقیقات :</span>
                                        </div>
                                        <div
                                            ref={mavaredBoxRef}
                                            contentEditable
                                            suppressContentEditableWarning
                                            className="shabnam text-[18px] leading-loose"
                                            style={{
                                                flex: 1,
                                                border: "1px dashed #999",
                                                borderRadius: "10px",
                                                padding: "12px",
                                                marginBottom: "10px",
                                                outline: "none",
                                                color: "#0c4a6e",
                                                whiteSpace: "pre-wrap",
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: MavaredEbhami,
                                            }}
                                            onBlur={(e) => {
                                                const content = e.currentTarget.innerHTML;
                                                setMavaredEbhami(content);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            {
                ModalOpenFehrestParvandh && (
                    <>
                        <div className="fixed inset-0 z-[30000] bg-black/50 backdrop-blur-sm" />
                        <div className="fixed inset-0 z-[30000] flex flex-col bg-white h-screen w-screen">
                            <div className="flex items-center justify-between px-6 h-15 bg-sky-700 shadow-md">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setModalOpenFehrestParvandh(false)}
                                        className="p-2 cursor-pointer  hover:bg-blue-700 rounded-full transition-colors text-white"
                                    >
                                        <X size={24} />
                                    </button>
                                    <h2 className="text-white text-[17px]">پرونده  <span className="bg-white text-black rounded-2xl px-2 py-1">{FullName}</span></h2>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setModalOpenFehrestParvandh(false)}
                                        className="flex items-center justify-center gap-2 cursor-pointer px-10 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <X size={20} />
                                        بستن
                                    </button>
                                </div>
                            </div>
                            <div className="m-0 flex-1 overflow-y-auto px-5 bg-gray-50">
                                <FehrestParvandhContent
                                    shomarehParvandeh={ShomarehParvandeh || 0}
                                    noeBayegani={1}
                                    mahal={user.Mahal}
                                />
                            </div>
                        </div>
                    </>
                )
            }
            {
                ModalOpenKholasehSalahiyat && (
                    <>
                        <div className="fixed inset-0 z-[30000] bg-black/50 backdrop-blur-sm" />
                        <div className="fixed inset-0 z-[30000] flex flex-col bg-white h-screen w-screen">
                            <div className="flex items-center justify-between px-6 h-15 bg-sky-700 shadow-md">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setModalOpenKholasehSalahiyat(false)}
                                        className="p-2 cursor-pointer  hover:bg-blue-700 rounded-full transition-colors text-white"
                                    >
                                        <X size={24} />
                                    </button>
                                    <h2 className="text-white text-[17px] ">خلاصه صلاحیت پرونده <span className="bg-white text-black rounded-2xl px-2 py-1">{FullName}</span>  </h2>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setModalOpenKholasehSalahiyat(false)}
                                        className="flex items-center justify-center gap-2 cursor-pointer px-10 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <X size={20} />
                                        بستن
                                    </button>
                                </div>
                            </div>
                            <div className="m-0 flex-1 overflow-y-auto px-5 bg-gray-50">
                                <KholasehSalahiyat
                                    ShomarehParvandeh={ShomarehParvandeh || 0}
                                    noeBayegani={1}
                                    CodeEntekhabat={31210}
                                    mahal={user.Mahal}
                                />
                            </div>
                        </div>
                    </>
                )
            }

            {data.length > 0 && ModalHamyar && (
                <div className="fixed inset-0 z-[30000] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black opacity-40"
                        onClick={() => setModalHamyar(false)}
                    ></div>
                    <div className="bg-white rounded-lg px-6 pb-4 shadow-lg z-50 w-96 relative">
                        <div className="bg-gray-200 -mx-6 p-3 rounded-t-lg border-b border-gray-300">
                            <h2 className="text-lg font-bold">انتخاب همیار حقوقی</h2>
                        </div>
                        <hr className="mb-3 text-blue-800" />
                        <EjraBeMohaghegh
                            codeEntekhabat={31201}
                            label="کاربر همیار حقوقی"
                            mahal={user.Mahal}
                            noeHamkari={5}
                            vije={9}
                            onSelect={(info) => {
                                setCodeMohaghegh(info ? info.id : null);
                                setErrorMohaghegh(false);
                            }}
                            error={errorMohaghegh}
                            errorMessage={errorMohaghegh ? "لطفاً محقق را انتخاب کنید" : ""}
                        />
                        <div className="mt-2">
                            <PersianDateInput
                                label="مهلت انجام"
                                allowPastDates={false}
                                onChange={(v: any) => {
                                    settarikh(v)
                                    seterrorTarikh(false);
                                }
                                }
                                error={errorTarikh}
                                errorMessage={errorTarikh ? "لطفاً تاریخ را انتخاب کنید" : ""}
                            />
                        </div>
                        <textarea
                            className="text-[15px] mt-2 w-full h-24 border border-gray-300 rounded p-2 mb-2 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                            placeholder="توضیحات ارجاع پرونده "
                            value={tozihat}
                            onChange={(e: any) => setTozihat(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                className="bg-gray-300 hover:bg-gray-400 px-4 py-1 rounded cursor-pointer"
                                onClick={() => setModalHamyar(false)}
                            >
                                انصراف
                            </button>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded cursor-pointer"
                                onClick={() => (SaveErjaBeHamyar(ShomarehParvandeh, CodeMohaghegh!, tozihat, tarikh!, user.UserId ?? ""))}
                            >
                                تایید
                            </button>
                        </div>
                    </div>
                </div >
            )
            }

            <PdfModal
                open={PdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                fileName={PdfFileName}
                title={PdfTitle}   // ✅ اینم مهمه
            />

        </>
    );
}