"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Download,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  Link2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Dropdown } from "@/component/Dropdown";
import { useMeratUser } from "@/lib/useMeratUser";
import domtoimage from "@/lib/domToImageCompat";
import {
  AddHamkari,
  AddPerson,
  DeletePersonHamkari,
  GetPersonHamkari,
  GetPersonHamkariKholaseh,
} from "@/services/ApiServiseHamkari";
import { CityTree, GetUserPic, UploadUserPic } from "@/services/ApiServiceUsers";
import { IranNationalCode, IranTelHamrahCode } from "@/services/ApiService";
import { UploadNameh } from "@/services/ApiServiceNameha";
import styles from "./Hamkari.module.css";

type FlatCity = {
  ID: number;
  PID: number;
  Name: string;
  IsHoze: number;
  CityId: number;
};
type TreeCity = FlatCity & { children: TreeCity[] };
type PersonRow = Record<string, any>;
type CooperationRow = Record<string, any>;
type DfnItem = { NameFarsi: string; Value: number };
type CityOption = { CityId: number; FullName: string };
type RoleFilter = { key: string; value: number; label: string };
type ConfirmState = { open: boolean; title: string; message: string; onConfirm?: () => void | Promise<void> };
type Notice = { type: "success" | "error" | "info"; text: string } | null;

type PersonForm = {
  HamkariId: number;
  PersonId: number;
  CodeMelli: string;
  TelHamrah: string;
  PhoneNumber: string;
  FirstName: string;
  LastName: string;
  FatherName: string;
  TarikhTavalod: string;
  ShomareShenasnameh: string;
  SerialShenasnameh: string;
  MahalTavalod: string;
  MahalSodor: string;
  Jensiyat: number;
  Taahol: number;
  Din: number;
  Mazhab: number;
  MahalHamkari: number;
};

type CooperationForm = {
  NoeHamkari: number;
  SathHamkari: number;
  NoeGharardad: number;
  VaziyatHamkari: number;
  RadeTakhasos: number;
  MahalHamkari: number;
  SharhTakhasos: string;
};

const EMPTY_PERSON: PersonForm = {
  HamkariId: 0,
  PersonId: 0,
  CodeMelli: "",
  TelHamrah: "",
  PhoneNumber: "",
  FirstName: "",
  LastName: "",
  FatherName: "",
  TarikhTavalod: "",
  ShomareShenasnameh: "",
  SerialShenasnameh: "",
  MahalTavalod: "",
  MahalSodor: "",
  Jensiyat: 0,
  Taahol: 0,
  Din: 0,
  Mazhab: 0,
  MahalHamkari: 0,
};

const EMPTY_COOP: CooperationForm = {
  NoeHamkari: 0,
  SathHamkari: 0,
  NoeGharardad: 0,
  VaziyatHamkari: 0,
  RadeTakhasos: 0,
  MahalHamkari: 0,
  SharhTakhasos: "",
};

const ROLE_FILTERS: RoleFilter[] = [
  { key: "all", value: 0, label: "همه اشخاص" },
  { key: "notify", value: 1, label: "اطلاع‌رسان" },
  { key: "research", value: 2, label: "محقق" },
  { key: "source", value: 4, label: "منبع" },
  { key: "council", value: 8, label: "شورای تحقیق" },
  { key: "none", value: 20, label: "بدون سمت" },
];

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toText(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function normalizeCityTree(raw: any): FlatCity[] {
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : [];
  return rows
    .map((x: any) => {
      const id = x?.ID ?? x?.Id ?? x?.id ?? x?.MahalId ?? x?.NodeId ?? x?.CityTreeId;
      const pid = x?.PID ?? x?.Pid ?? x?.pid ?? x?.ParentID ?? x?.ParentId ?? x?.parentId ?? x?.ParentMahalId ?? 0;
      const name = x?.Name ?? x?.name ?? x?.Title ?? x?.title ?? x?.NameMahal ?? x?.CityName;
      const cityId = x?.CityId ?? x?.CityID ?? x?.cityId ?? x?.MahalId ?? x?.MahalID ?? id;
      if (id == null || name == null) return null;
      return {
        ID: toNumber(id),
        PID: toNumber(pid),
        Name: toText(name),
        IsHoze: toNumber(x?.IsHoze ?? x?.isHoze ?? x?.ISHOZE ?? x?.Is_Hoze ?? 0),
        CityId: toNumber(cityId ?? id),
      } as FlatCity;
    })
    .filter(Boolean) as FlatCity[];
}

function buildTree(items: FlatCity[]): TreeCity[] {
  const map = new Map<number, TreeCity>();
  items.forEach((it) => map.set(it.ID, { ...it, children: [] }));
  const roots: TreeCity[] = [];
  items.forEach((it) => {
    const node = map.get(it.ID)!;
    if (!it.PID || it.PID === it.ID || !map.has(it.PID)) roots.push(node);
    else map.get(it.PID)!.children.push(node);
  });
  return roots;
}

async function postJson<T = any>(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));
  if (payload?.status == null) payload.status = res.status;
  return payload as { status?: number; data?: T; error?: string; message?: string };
}

function getRows(result: any): any[] {
  return Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result?.recordset)
      ? result.recordset
      : Array.isArray(result)
        ? result
        : [];
}

function personFromRow(row: PersonRow): PersonForm {
  return {
    HamkariId: toNumber(row?.HamkariId),
    PersonId: toNumber(row?.PersonId),
    CodeMelli: toText(row?.CodeMelli),
    TelHamrah: toText(row?.TelHamrah),
    PhoneNumber: toText(row?.PhoneNumber ?? row?.phoneNumber),
    FirstName: toText(row?.FirstName),
    LastName: toText(row?.LastName),
    FatherName: toText(row?.FatherName ?? row?.NamePedar),
    TarikhTavalod: toText(row?.TarikhTavalod),
    ShomareShenasnameh: toText(row?.ShomareShenasnameh ?? row?.ShomarehShenasnameh),
    SerialShenasnameh: toText(row?.SerialShenasnameh),
    MahalTavalod: toText(row?.MahalTavalod),
    MahalSodor: toText(row?.MahalSodor),
    Jensiyat: toNumber(row?.Jensiyat),
    Taahol: toNumber(row?.Taahol),
    Din: toNumber(row?.Din),
    Mazhab: toNumber(row?.Mazhab),
    MahalHamkari: toNumber(row?.MahalHamkari),
  };
}

function DfnSelect({
  pid,
  label,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  pid: number;
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<DfnItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!pid) {
      setItems([]);
      return;
    }
    setLoading(true);
    postJson<any[]>("/Api/DFN/GetDFnByPID", { pid })
      .then((res) => {
        if (!alive) return;
        if (res.status === 401) return router.replace("/Login");
        setItems(
          (Array.isArray(res.data) ? res.data : []).map((x: any) => ({
            NameFarsi: toText(x?.NameFarsi),
            Value: toNumber(x?.Value),
          })),
        );
      })
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [pid, router]);

  return (
    <div className={styles.field}>
      <label>
        {label} {required ? <span className={styles.required}>*</span> : null}
      </label>
      <Dropdown<number>
        value={value || null}
        options={items.map((x) => ({ value: x.Value, label: x.NameFarsi }))}
        onChange={(v) => onChange(Number(v))}
        placeholder="انتخاب کنید"
        loading={loading}
        disabled={disabled || !pid}
        error={Boolean(error)}
      />
      {error ? <small className={styles.errorText}>{error}</small> : null}
    </div>
  );
}

function CitySelect({
  rootMahal,
  label,
  value,
  onChange,
  error,
}: {
  rootMahal: number;
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!rootMahal) return;
    setLoading(true);
    postJson<any[]>("/Api/Citys/GetCitys", { pcityId: rootMahal })
      .then((res) => {
        if (!alive) return;
        if (res.status === 401) return router.replace("/Login");
        const map = new Map<number, CityOption>();
        for (const x of Array.isArray(res.data) ? res.data : []) {
          const id = toNumber(x?.CityId ?? x?.ID ?? x?.Id);
          if (!id) continue;
          const title = toText(x?.FullName ?? x?.Name ?? x?.NameMahal ?? x?.Title) || `محل ${id}`;
          if (!map.has(id)) map.set(id, { CityId: id, FullName: title });
        }
        setItems(Array.from(map.values()));
      })
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [rootMahal, router]);

  return (
    <div className={styles.field}>
      <label>{label}</label>
      <Dropdown<number>
        value={value || null}
        options={items.map((x) => ({ value: x.CityId, label: x.FullName }))}
        onChange={(v) => onChange(Number(v))}
        placeholder="انتخاب محل"
        loading={loading}
        error={Boolean(error)}
      />
      {error ? <small className={styles.errorText}>{error}</small> : null}
    </div>
  );
}

function CityTreeView({
  nodes,
  expanded,
  selectedId,
  onToggle,
  onSelect,
  level = 0,
}: {
  nodes: TreeCity[];
  expanded: Set<number>;
  selectedId: number | null;
  onToggle: (id: number) => void;
  onSelect: (node: TreeCity) => void;
  level?: number;
}) {
  return (
    <div className={styles.treeList}>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const open = expanded.has(node.ID);
        const selected = selectedId === node.ID;
        return (
          <div key={node.ID}>
            <div
              className={`${styles.treeRow} ${selected ? styles.treeRowSelected : ""}`}
              style={{ paddingRight: 10 + level * 16 }}
              onClick={() => onSelect(node)}
            >
              <button
                type="button"
                className={styles.treeToggle}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) onToggle(node.ID);
                }}
                aria-label={open ? "بستن" : "باز کردن"}
              >
                {hasChildren ? open ? <ChevronDown size={15} /> : <ChevronLeft size={15} /> : <span />}
              </button>
              {open ? <FolderOpen size={17} /> : <Folder size={17} />}
              <span>{node.Name}</span>
              {node.IsHoze === 1 ? <small>حوزه</small> : null}
            </div>
            {hasChildren && open ? (
              <CityTreeView
                nodes={node.children}
                expanded={expanded}
                selectedId={selectedId}
                onToggle={onToggle}
                onSelect={onSelect}
                level={level + 1}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  wide = false,
  extraWide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  extraWide?: boolean;
}) {
  return (
    <div className={styles.modalLayer} role="dialog" aria-modal="true">
      <button type="button" className={styles.modalBackdrop} onClick={onClose} aria-label="بستن" />
      <section className={`${styles.modalCard} ${wide ? styles.modalWide : ""} ${extraWide ? styles.modalExtraWide : ""}`}>
        <header className={styles.modalHeader}>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="بستن">
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  required,
  error,
  maxLength,
  numeric,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  maxLength?: number;
  numeric?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={styles.field}>
      <label>
        {label} {required ? <span className={styles.required}>*</span> : null}
      </label>
      <input
        className={`${styles.input} ${error ? styles.inputError : ""}`}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder || label}
        onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, "") : e.target.value)}
      />
      {error ? <small className={styles.errorText}>{error}</small> : null}
    </div>
  );
}

export default function HamkariClient() {
  const router = useRouter();
  const user = useMeratUser();
  const searchSeq = useRef(0);

  const [cityRows, setCityRows] = useState<FlatCity[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedCity, setSelectedCity] = useState<TreeCity | null>(null);

  const [rows, setRows] = useState<PersonRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);
  const [totalRecord, setTotalRecord] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(0);
  const [sortIndex, setSortIndex] = useState(1);
  const [sortDirection, setSortDirection] = useState(1);

  const [detailOpen, setDetailOpen] = useState(false);
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [coopOpen, setCoopOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PersonRow | null>(null);
  const [form, setForm] = useState<PersonForm>(EMPTY_PERSON);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [savingPerson, setSavingPerson] = useState(false);
  const [profileUrl, setProfileUrl] = useState("/person.png");
  const [uploadingPic, setUploadingPic] = useState(false);
  const [cooperations, setCooperations] = useState<CooperationRow[]>([]);
  const [coopLoading, setCoopLoading] = useState(false);
  const [coopForm, setCoopForm] = useState<CooperationForm>(EMPTY_COOP);
  const [coopErrors, setCoopErrors] = useState<Record<string, string>>({});
  const [savingCoop, setSavingCoop] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: "", message: "" });
  const [notice, setNotice] = useState<Notice>(null);
  const [letterBusy, setLetterBusy] = useState(false);
  const [letterTemplateOk, setLetterTemplateOk] = useState(true);

  const tree = useMemo(() => buildTree(cityRows), [cityRows]);
  const selectedMahal = selectedCity ? Number(selectedCity.CityId || selectedCity.ID) : 0;
  const totalPages = Math.max(1, Math.ceil(totalRecord / 10));
  const ostanLabel = String(user.Mahal || "").substring(0, 3);
  const activeRoleLabel = ROLE_FILTERS.find((x) => x.value === filter)?.label || "همه اشخاص";

  const showNotice = (type: "success" | "error" | "info", text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    if (!user.Mahal) return;
    let alive = true;
    setCityLoading(true);
    setCityError("");
    CityTree(user.Mahal)
      .then((res: any) => {
        if (!alive) return;
        if (res?.status === 401) return router.replace("/Login");
        const normalized = normalizeCityTree(res?.data ?? res);
        setCityRows(normalized);
        setExpanded(new Set());
        setSelectedCity(null);
      })
      .catch((error: any) => alive && setCityError(error?.message || "خطا در دریافت ساختار استان / حوزه / شهرستان"))
      .finally(() => alive && setCityLoading(false));
    return () => {
      alive = false;
    };
  }, [user.Mahal, router]);

  useEffect(() => {
    const seq = ++searchSeq.current;
    const timer = window.setTimeout(() => {
      if (seq === searchSeq.current) {
        setPage(1);
        setSearch(searchInput.trim());
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadList = async () => {
    if (!selectedMahal) {
      setRows([]);
      setTotalRecord(0);
      return;
    }
    setListLoading(true);
    setListError("");
    try {
      const result: any = await GetPersonHamkari(selectedMahal, page, 10, sortIndex, sortDirection, search, filter);
      if (result?.status === 401) return router.replace("/Login");
      const list = getRows(result);
      setRows(list);
      setTotalRecord(toNumber(list?.[0]?.TotalCount, list.length));
    } catch (error: any) {
      setListError(error?.message || "خطا در دریافت فهرست همکاران");
      setRows([]);
      setTotalRecord(0);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMahal, page, sortIndex, sortDirection, search, filter]);

  const loadCooperations = async (personId: number) => {
    if (!personId) {
      setCooperations([]);
      return;
    }
    setCoopLoading(true);
    try {
      const result: any = await GetPersonHamkariKholaseh(personId);
      if (result?.status === 401) return router.replace("/Login");
      setCooperations(getRows(result));
    } catch {
      setCooperations([]);
    } finally {
      setCoopLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    const code = form.CodeMelli.trim();
    if (!code || (!detailOpen && !personFormOpen)) {
      setProfileUrl("/person.png");
      return;
    }
    GetUserPic(code).then((result: any) => {
      if (cancelled) return;
      if (result instanceof Blob) {
        objectUrl = URL.createObjectURL(result);
        setProfileUrl(objectUrl);
      } else if (typeof result === "string" && result) {
        setProfileUrl(result);
      } else {
        setProfileUrl("/person.png");
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [form.CodeMelli, detailOpen, personFormOpen]);

  const openPerson = async (row: PersonRow) => {
    const next = personFromRow(row);
    setSelectedRow(row);
    setForm(next);
    setFormErrors({});
    setDetailOpen(true);
    await loadCooperations(next.PersonId);
  };

  const openCreate = async () => {
    setSelectedRow(null);
    setForm({ ...EMPTY_PERSON, MahalHamkari: selectedMahal || user.Mahal });
    setFormErrors({});
    setCooperations([]);
    setProfileUrl("/person.png");
    setPersonFormOpen(true);
  };

  const openFullEdit = () => {
    setDetailOpen(false);
    setPersonFormOpen(true);
  };

  const changeForm = (name: keyof PersonForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const savePerson = async () => {
    const errors: Record<string, string> = {};
    if (!form.FirstName.trim()) errors.FirstName = "نام الزامی است";
    if (!form.LastName.trim()) errors.LastName = "نام خانوادگی الزامی است";
    if (!form.Jensiyat) errors.Jensiyat = "جنسیت را انتخاب کنید";
    if (!form.Taahol) errors.Taahol = "وضعیت تأهل را انتخاب کنید";
    if (!form.Din) errors.Din = "دین را انتخاب کنید";
    if (!form.Mazhab) errors.Mazhab = "مذهب را انتخاب کنید";
    if (!form.TelHamrah.trim() && !form.PhoneNumber.trim()) {
      errors.TelHamrah = "حداقل تلفن همراه یا ثابت وارد شود";
      errors.PhoneNumber = "حداقل تلفن همراه یا ثابت وارد شود";
    }

    setSavingPerson(true);
    try {
      if (form.CodeMelli.trim()) {
        const v: any = await IranNationalCode(form.CodeMelli.trim(), user.UserId);
        if (!Boolean(v?.data?.[0]?.IsValid)) errors.CodeMelli = "فرمت شماره ملی صحیح نیست";
      }
      if (form.TelHamrah.trim()) {
        const v: any = await IranTelHamrahCode(form.TelHamrah.trim(), user.UserId);
        if (!Boolean(v?.data?.[0]?.IsValid)) errors.TelHamrah = "فرمت تلفن همراه صحیح نیست";
      }
      if (Object.keys(errors).length) {
        setFormErrors(errors);
        return;
      }

      const result: any = await AddPerson(
        form.PersonId,
        form.CodeMelli,
        form.FirstName,
        form.LastName,
        form.FatherName,
        form.TarikhTavalod,
        form.ShomareShenasnameh,
        form.SerialShenasnameh,
        form.MahalTavalod,
        form.MahalSodor,
        form.TelHamrah,
        form.PhoneNumber,
        form.Jensiyat,
        form.Taahol,
        form.Din,
        form.Mazhab,
        selectedMahal || user.Mahal,
        user.UserId,
      );
      if (result?.status === 401) return router.replace("/Login");
      const first = getRows(result)?.[0] || {};
      const code = toNumber(first?.ResultInsert, 200);
      if (code === 201) return showNotice("error", "شماره ملی واردشده تکراری است؛ ابتدا جستجو کنید.");
      if (code === 202) return showNotice("error", "تلفن همراه واردشده تکراری است؛ ابتدا جستجو کنید.");
      const newPersonId = toNumber(first?.PersonId, form.PersonId);
      setForm((prev) => ({ ...prev, PersonId: newPersonId }));
      showNotice("success", "اطلاعات شخص با موفقیت ثبت شد.");
      await loadCooperations(newPersonId);
      await loadList();
    } catch (error: any) {
      showNotice("error", error?.message || "خطا در ثبت اطلاعات شخص");
    } finally {
      setSavingPerson(false);
    }
  };

  const uploadProfile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return showNotice("error", "فایل انتخابی باید تصویر باشد.");
    if (!form.CodeMelli.trim()) return showNotice("error", "برای ثبت تصویر ابتدا شماره ملی را وارد کنید.");
    setUploadingPic(true);
    try {
      const valid: any = await IranNationalCode(form.CodeMelli.trim(), user.UserId);
      if (!Boolean(valid?.data?.[0]?.IsValid)) return showNotice("error", "فرمت شماره ملی صحیح نیست.");
      await UploadUserPic(form.CodeMelli.trim(), user.UserId, file);
      setProfileUrl(URL.createObjectURL(file));
      showNotice("success", "تصویر پروفایل ثبت شد.");
    } catch (error: any) {
      showNotice("error", error?.message || "خطا در ثبت تصویر");
    } finally {
      setUploadingPic(false);
    }
  };

  const openCooperation = () => {
    if (!form.PersonId) return showNotice("info", "ابتدا اطلاعات شخص را ثبت کنید.");
    setCoopForm({ ...EMPTY_COOP, MahalHamkari: form.MahalHamkari || selectedMahal || user.Mahal });
    setCoopErrors({});
    setCoopOpen(true);
  };

  const cooperationLevelPid = useMemo(() => {
    if (coopForm.NoeHamkari === 1) return 11911;
    if (coopForm.NoeHamkari === 2) return 11912;
    if (coopForm.NoeHamkari === 4) return 11914;
    if (coopForm.NoeHamkari === 5) return 11915;
    if (coopForm.NoeHamkari === 6) return 11916;
    return 0;
  }, [coopForm.NoeHamkari]);

  const saveCooperation = async () => {
    const errors: Record<string, string> = {};
    if (!coopForm.NoeHamkari) errors.NoeHamkari = "نوع همکاری را انتخاب کنید";
    if (!coopForm.SathHamkari) errors.SathHamkari = "سطح همکاری را انتخاب کنید";
    if (!coopForm.NoeGharardad) errors.NoeGharardad = "نوع قرارداد را انتخاب کنید";
    if (!coopForm.VaziyatHamkari) errors.VaziyatHamkari = "وضعیت همکاری را انتخاب کنید";
    if (!coopForm.RadeTakhasos) errors.RadeTakhasos = "رده تخصصی را انتخاب کنید";
    if (!coopForm.MahalHamkari) errors.MahalHamkari = "محل همکاری را انتخاب کنید";
    if (Object.keys(errors).length) {
      setCoopErrors(errors);
      return;
    }
    setSavingCoop(true);
    try {
      const result: any = await AddHamkari(
        0,
        form.PersonId,
        coopForm.NoeHamkari,
        coopForm.NoeGharardad,
        coopForm.MahalHamkari,
        coopForm.SathHamkari,
        coopForm.RadeTakhasos,
        coopForm.SharhTakhasos,
        coopForm.VaziyatHamkari,
        user.UserId,
        true,
      );
      if (result?.status === 401) return router.replace("/Login");
      await loadCooperations(form.PersonId);
      await loadList();
      setCoopOpen(false);
      showNotice("success", "همکاری جدید با موفقیت ثبت شد.");
    } catch (error: any) {
      showNotice("error", error?.message || "خطا در ثبت همکاری");
    } finally {
      setSavingCoop(false);
    }
  };

  const askDeleteCooperation = (item: CooperationRow) => {
    setConfirmState({
      open: true,
      title: "حذف همکاری",
      message: `آیا از حذف «${toText(item?.OnvanHamkari) || "این همکاری"}» اطمینان دارید؟`,
      onConfirm: async () => {
        try {
          const result: any = await DeletePersonHamkari(toNumber(item?.HamkariId), user.UserId);
          if (result?.status === 401) return router.replace("/Login");
          await loadCooperations(form.PersonId);
          await loadList();
          showNotice("success", "همکاری حذف شد.");
        } catch (error: any) {
          showNotice("error", error?.message || "خطا در حذف همکاری");
        }
      },
    });
  };

  const sortBy = (field: string) => {
    const map: Record<string, number> = { CodeMelli: 1, FirstName: 2, LastName: 3, OnvanPost: 4, NameMahal: 5 };
    const nextIndex = map[field] || 1;
    setPage(1);
    if (sortIndex === nextIndex) setSortDirection((v) => (v === 1 ? 2 : 1));
    else {
      setSortIndex(nextIndex);
      setSortDirection(1);
    }
  };

  const downloadLetter = async () => {
    const node = document.getElementById("hamkari-letter-canvas");
    if (!node || !form.PersonId) return;
    setLetterBusy(true);
    try {
      const dataUrl = await domtoimage.toPng(node, { bgcolor: "#fff", width: node.scrollWidth, height: node.scrollHeight });
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Moarefi-${form.PersonId}.png`;
      a.click();
      await UploadNameh(form.PersonId, 31210, fileName, user.UserId, file).catch(() => null);
      showNotice("success", "معرفی‌نامه دانلود و در پرونده ذخیره شد.");
    } catch (error: any) {
      showNotice("error", error?.message || "خطا در تولید معرفی‌نامه");
    } finally {
      setLetterBusy(false);
    }
  };

  const pageNumbers = useMemo(() => {
    const out: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }, [page, totalPages]);

  return (
    <div className={styles.page} dir="rtl">
      {notice ? <div className={`${styles.notice} ${styles[`notice_${notice.type}`]}`}>{notice.text}</div> : null}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div>
              <strong>ساختار محل</strong>
              <span>استان / حوزه / شهرستان</span>
            </div>
            <MapPin size={20} />
          </div>
          <div className={styles.sidebarBody}>
            {cityLoading ? <div className={styles.stateText}>در حال دریافت ساختار...</div> : null}
            {cityError ? <div className={styles.errorBox}>{cityError}</div> : null}
            {!cityLoading && !cityError && tree.length === 0 ? <div className={styles.stateText}>موردی یافت نشد.</div> : null}
            <CityTreeView
              nodes={tree}
              expanded={expanded}
              selectedId={selectedCity?.ID ?? null}
              onToggle={(id) =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onSelect={(node) => {
                setSelectedCity(node);
                setPage(1);
                setSearchInput("");
                setSearch("");
              }}
            />
          </div>
        </aside>

        <main className={styles.content}>
          <div className={styles.hero}>
            <div className={styles.heroTitle}>
              <span className={styles.heroIcon}><UsersRound size={21} /></span>
              <div>
                <h1>مدیریت همکاران</h1>
                <p>{selectedCity ? `محل انتخاب‌شده: ${selectedCity.Name}` : "برای نمایش همکاران، محل را از ستون سمت راست انتخاب کنید."}</p>
              </div>
            </div>
            <button type="button" className={styles.primaryButton} onClick={openCreate} disabled={!selectedMahal}>
              <Plus size={17} /> افزودن شخص
            </button>
          </div>

          <div className={styles.filters}>
            {ROLE_FILTERS.filter((item) => item.value !== 8 || String(selectedMahal || user.Mahal).length === 3).map((item) => (
              <button
                key={item.key}
                type="button"
                className={`${styles.filterChip} ${filter === item.value ? styles.filterChipActive : ""}`}
                onClick={() => {
                  setFilter(item.value);
                  setPage(1);
                }}
              >
                {item.value === 2 ? <Search size={15} /> : item.value === 4 ? <Link2 size={15} /> : <UserRound size={15} />}
                {item.label}
              </button>
            ))}
          </div>

          <section className={styles.tableCard}>
            <div className={styles.tableToolbar}>
              <div className={styles.tableTitle}>
                <span>فهرست همکاران</span>
                <b>{totalRecord}</b>
                <small>{activeRoleLabel}</small>
              </div>
              <div className={styles.searchBox}>
                <Search size={17} />
                <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="جستجو در نام، نام خانوادگی، کد ملی و ..." />
                {searchInput ? (
                  <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}><X size={15} /></button>
                ) : null}
              </div>
            </div>

            {!selectedMahal ? (
              <div className={styles.emptyState}>
                <MapPin size={34} />
                <strong>محل انتخاب نشده است</strong>
                <span>ابتدا استان، حوزه یا شهرستان را از ستون سمت راست انتخاب کنید.</span>
              </div>
            ) : listLoading ? (
              <div className={styles.emptyState}><span className={styles.spinner} /> در حال دریافت همکاران...</div>
            ) : listError ? (
              <div className={styles.errorBox}>{listError}</div>
            ) : (
              <div className={styles.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th>ردیف</th>
                      <th>شماره پرونده</th>
                      <th onClick={() => sortBy("CodeMelli")}>شماره ملی</th>
                      <th onClick={() => sortBy("FirstName")}>نام</th>
                      <th onClick={() => sortBy("LastName")}>نام خانوادگی</th>
                      <th>نام پدر</th>
                      <th>تاریخ تولد</th>
                      <th>تلفن همراه</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((row, index) => (
                      <tr key={`${toNumber(row?.PersonId)}-${toNumber(row?.HamkariId)}-${index}`} onDoubleClick={() => openPerson(row)}>
                        <td>{toText(row?.Rdf) || (page - 1) * 10 + index + 1}</td>
                        <td>{toText(row?.ShomarehParvandeh) || "—"}</td>
                        <td>{toText(row?.CodeMelli) || "—"}</td>
                        <td>{toText(row?.FirstName) || "—"}</td>
                        <td>{toText(row?.LastName) || "—"}</td>
                        <td>{toText(row?.FatherName) || "—"}</td>
                        <td>{toText(row?.TarikhTavalod) || "—"}</td>
                        <td>{toText(row?.TelHamrah) || "—"}</td>
                        <td>
                          <button type="button" className={styles.iconButton} title="مشاهده / ویرایش" onClick={() => openPerson(row)}>
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={9} className={styles.noRows}>هیچ همکاری یافت نشد.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {selectedMahal && !listLoading ? (
              <div className={styles.pagination}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</button>
                {pageNumbers.map((n) => <button type="button" key={n} className={n === page ? styles.pageActive : ""} onClick={() => setPage(n)}>{n}</button>)}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>بعدی</button>
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {detailOpen ? (
        <ModalShell title="اطلاعات فرد" onClose={() => setDetailOpen(false)} wide>
          <div className={styles.detailBody}>
            <div className={styles.avatarWrap}>
              <img
                src={profileUrl || "/person.png"}
                alt="پروفایل"
                draggable={false}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith("/person.png")) target.src = "/person.png";
                }}
              />
            </div>
            <div className={styles.detailGrid}>
              {[
                ["نام", form.FirstName], ["نام خانوادگی", form.LastName], ["نام پدر", form.FatherName],
                ["شماره پرونده", toText(selectedRow?.ShomarehParvandeh)], ["شماره ملی", form.CodeMelli], ["تلفن همراه", form.TelHamrah],
                ["تاریخ تولد", form.TarikhTavalod], ["محل تولد", form.MahalTavalod], ["محل صدور", form.MahalSodor],
              ].map(([label, value]) => <div className={styles.detailField} key={label}><span>{label}</span><b>{value || "—"}</b></div>)}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setDetailOpen(false)}>بستن</button>
              <button type="button" className={styles.secondaryAccentButton} onClick={() => { setLetterTemplateOk(true); setLetterOpen(true); }}><FileText size={16} /> تولید معرفی‌نامه</button>
              <button type="button" className={styles.primaryButton} onClick={openFullEdit}><Pencil size={16} /> اطلاعات بیشتر</button>
            </div>

            <CooperationHistory rows={cooperations} loading={coopLoading} onAdd={openCooperation} onDelete={askDeleteCooperation} />
          </div>
        </ModalShell>
      ) : null}

      {personFormOpen ? (
        <ModalShell title={form.PersonId ? `اطلاعات شخص (${form.PersonId})` : "افزودن شخص جدید"} onClose={() => setPersonFormOpen(false)} extraWide>
          <div className={styles.personBody}>
            <div className={styles.profileEditor}>
              <label>
                <img
                src={profileUrl || "/person.png"}
                alt="پروفایل"
                draggable={false}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith("/person.png")) target.src = "/person.png";
                }}
              />
                <span><Upload size={18} />{uploadingPic ? "در حال آپلود" : "تغییر تصویر"}</span>
                <input type="file" accept="image/*" disabled={uploadingPic} onChange={(e) => uploadProfile(e.target.files?.[0])} />
              </label>
            </div>

            <div className={styles.formGrid}>
              <InputField label="نام" required value={form.FirstName} onChange={(v) => changeForm("FirstName", v)} error={formErrors.FirstName} maxLength={50} />
              <InputField label="نام خانوادگی" required value={form.LastName} onChange={(v) => changeForm("LastName", v)} error={formErrors.LastName} maxLength={100} />
              <InputField label="نام پدر" value={form.FatherName} onChange={(v) => changeForm("FatherName", v)} maxLength={100} />
              <InputField label="شماره ملی" value={form.CodeMelli} onChange={(v) => changeForm("CodeMelli", v)} error={formErrors.CodeMelli} numeric maxLength={10} />
              <InputField label="تاریخ تولد" value={form.TarikhTavalod} onChange={(v) => changeForm("TarikhTavalod", v)} placeholder="1405/07/01" maxLength={10} />
              <InputField label="شماره شناسنامه" value={form.ShomareShenasnameh} onChange={(v) => changeForm("ShomareShenasnameh", v)} numeric maxLength={10} />
              <InputField label="محل تولد" value={form.MahalTavalod} onChange={(v) => changeForm("MahalTavalod", v)} />
              <InputField label="محل صدور" value={form.MahalSodor} onChange={(v) => changeForm("MahalSodor", v)} />
              <InputField label="سریال شناسنامه" value={form.SerialShenasnameh} onChange={(v) => changeForm("SerialShenasnameh", v)} />
              <InputField label="تلفن همراه" value={form.TelHamrah} onChange={(v) => changeForm("TelHamrah", v)} error={formErrors.TelHamrah} numeric maxLength={11} />
              <InputField label="تلفن ثابت" value={form.PhoneNumber} onChange={(v) => changeForm("PhoneNumber", v)} error={formErrors.PhoneNumber} numeric maxLength={30} />
              <DfnSelect pid={10104} label="جنسیت" required value={form.Jensiyat} onChange={(v) => changeForm("Jensiyat", v)} error={formErrors.Jensiyat} />
              <DfnSelect pid={10103} label="تأهل" required value={form.Taahol} onChange={(v) => changeForm("Taahol", v)} error={formErrors.Taahol} />
              <DfnSelect pid={10101} label="دین" required value={form.Din} onChange={(v) => { changeForm("Din", v); changeForm("Mazhab", 0); }} error={formErrors.Din} />
              <DfnSelect pid={form.Din ? Number(`101010${form.Din}`) : 0} label="مذهب" required value={form.Mazhab} onChange={(v) => changeForm("Mazhab", v)} error={formErrors.Mazhab} disabled={!form.Din} />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setPersonFormOpen(false)}>انصراف</button>
              <button type="button" className={styles.primaryButton} disabled={savingPerson} onClick={savePerson}>{savingPerson ? "در حال ثبت..." : "ثبت اطلاعات"}</button>
            </div>

            <CooperationHistory rows={cooperations} loading={coopLoading} onAdd={openCooperation} onDelete={askDeleteCooperation} disableAdd={!form.PersonId} />
          </div>
        </ModalShell>
      ) : null}

      {coopOpen ? (
        <ModalShell title="افزودن همکاری جدید" onClose={() => setCoopOpen(false)} wide>
          <div className={styles.coopBody}>
            <div className={styles.coopGrid}>
              <DfnSelect pid={1191} label="نوع همکاری" required value={coopForm.NoeHamkari} onChange={(v) => { setCoopForm((p) => ({ ...p, NoeHamkari: v, SathHamkari: 0 })); setCoopErrors((p) => ({ ...p, NoeHamkari: "", SathHamkari: "" })); }} error={coopErrors.NoeHamkari} />
              <DfnSelect pid={cooperationLevelPid} label="سطح همکاری" required value={coopForm.SathHamkari} onChange={(v) => setCoopForm((p) => ({ ...p, SathHamkari: v }))} error={coopErrors.SathHamkari} disabled={!cooperationLevelPid} />
              <DfnSelect pid={1192} label="نوع قرارداد" required value={coopForm.NoeGharardad} onChange={(v) => setCoopForm((p) => ({ ...p, NoeGharardad: v }))} error={coopErrors.NoeGharardad} />
              <DfnSelect pid={1195} label="وضعیت همکاری" required value={coopForm.VaziyatHamkari} onChange={(v) => setCoopForm((p) => ({ ...p, VaziyatHamkari: v }))} error={coopErrors.VaziyatHamkari} />
              <DfnSelect pid={11917} label="رده تخصصی" required value={coopForm.RadeTakhasos} onChange={(v) => setCoopForm((p) => ({ ...p, RadeTakhasos: v }))} error={coopErrors.RadeTakhasos} />
              <CitySelect rootMahal={user.Mahal} label="محل همکاری" value={coopForm.MahalHamkari} onChange={(v) => setCoopForm((p) => ({ ...p, MahalHamkari: v }))} error={coopErrors.MahalHamkari} />
            </div>
            <div className={styles.field}>
              <label>شرح تخصص</label>
              <textarea className={styles.textarea} value={coopForm.SharhTakhasos} onChange={(e) => setCoopForm((p) => ({ ...p, SharhTakhasos: e.target.value }))} maxLength={3000} placeholder="شرح تخصص و توضیحات همکاری را وارد کنید" />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setCoopOpen(false)}>انصراف</button>
              <button type="button" className={styles.primaryButton} disabled={savingCoop} onClick={saveCooperation}>{savingCoop ? "در حال ثبت..." : "ثبت همکاری"}</button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {letterOpen ? (
        <ModalShell title="معرفی‌نامه همکار" onClose={() => setLetterOpen(false)} wide>
          <div className={styles.letterBody}>
            <div id="hamkari-letter-canvas" className={styles.letterCanvas}>
              {letterTemplateOk ? (
                <img
                  className={styles.letterTemplate}
                  src={`/MoarefiNameh/Ostan${ostanLabel}.jpg`}
                  alt="قالب معرفی‌نامه"
                  onError={() => setLetterTemplateOk(false)}
                />
              ) : null}
              <div className={styles.letterFallbackTitle}>معرفی‌نامه همکاری</div>
              <div className={styles.letterName}>
                {form.Jensiyat === 1 ? `جناب آقای ${form.FirstName} ${form.LastName}` : form.Jensiyat === 2 ? `سرکار خانم ${form.FirstName} ${form.LastName}` : `${form.FirstName} ${form.LastName}`}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setLetterOpen(false)}>بستن</button>
              <button type="button" className={styles.primaryButton} disabled={letterBusy} onClick={downloadLetter}><Download size={16} /> {letterBusy ? "در حال تولید..." : "دانلود و ذخیره"}</button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {confirmState.open ? (
        <div className={styles.confirmLayer}>
          <button type="button" className={styles.modalBackdrop} onClick={() => setConfirmState({ open: false, title: "", message: "" })} />
          <div className={styles.confirmCard}>
            <h3>{confirmState.title}</h3>
            <p>{confirmState.message}</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmState({ open: false, title: "", message: "" })}>انصراف</button>
              <button type="button" className={styles.dangerButton} onClick={async () => { const fn = confirmState.onConfirm; setConfirmState({ open: false, title: "", message: "" }); await fn?.(); }}>حذف</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CooperationHistory({
  rows,
  loading,
  onAdd,
  onDelete,
  disableAdd = false,
}: {
  rows: CooperationRow[];
  loading: boolean;
  onAdd: () => void;
  onDelete: (row: CooperationRow) => void;
  disableAdd?: boolean;
}) {
  return (
    <section className={styles.history}>
      <div className={styles.historyHeader}>
        <div>
          <strong>سوابق همکاری</strong>
          <span>{rows.length} مورد</span>
        </div>
        <button type="button" className={styles.smallPrimary} disabled={disableAdd} onClick={onAdd}><Plus size={15} /> افزودن همکاری</button>
      </div>
      {loading ? <div className={styles.stateText}>در حال دریافت سوابق...</div> : rows.length === 0 ? <div className={styles.historyEmpty}>همکاری‌ای برای این شخص ثبت نشده است.</div> : (
        <div className={styles.historyList}>
          {rows.map((item, index) => (
            <div className={styles.historyItem} key={`${toNumber(item?.HamkariId)}-${index}`}>
              <div>
                <strong>{toText(item?.OnvanHamkari) || "همکاری"}</strong>
                <span>{toText(item?.MahalHamkari_NameFarsi ?? item?.NameMahal) || ""}</span>
              </div>
              <div className={styles.historyActions}>
                <span className={Boolean(item?.IsActive) ? styles.activeBadge : styles.inactiveBadge}>{Boolean(item?.IsActive) ? "فعال" : "غیرفعال"}</span>
                <button type="button" className={styles.deleteIcon} title="حذف همکاری" onClick={() => onDelete(item)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
