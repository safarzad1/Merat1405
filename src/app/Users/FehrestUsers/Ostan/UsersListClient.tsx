"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./UsersList.module.css";
import { Dropdown } from "@/component/Dropdown";

type StoredUser = {
  Mahal?: number | string | null;
  UserId?: number | string | null;
  FullName?: string | null;
};

type CityRow = {
  CityId: number;
  PCityId?: number | null;
  FullName?: string | null;
  Name?: string | null;
};

type UserRow = {
  UserId: number;
  PersonId?: number | null;
  FullName?: string | null;
  CodeMelli?: string | null;
  Mahal?: string | number | null;
  NameMahal?: string | null;
  CityId?: number | null;
  PostId?: number | null;
  OnvanPost?: string | null;
  IsActive?: boolean | number | null;
  Active_NameFarsi?: string | null;
};

type PersonOption = {
  PersonId: number;
  FullName: string;
};

type PostOption = {
  PostId: number;
  OnvanPost: string;
};

type ApiResponse<T = unknown> = {
  status?: number;
  state?: number;
  data?: T;
  error?: string;
  message?: string;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={open ? styles.chevronOpen : ""} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 10 4 4 4-4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M18.5 10A7 7 0 0 0 6 7l-2 3M5.5 14A7 7 0 0 0 18 17l2-3" />
    </svg>
  );
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let payload: ApiResponse<T> = {};
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = { status: response.status, error: "پاسخ نامعتبر از سرور" };
  }

  if (payload.status == null) payload.status = response.status;
  return payload;
}

function getCityTitle(city: CityRow) {
  return String(city.FullName || city.Name || `شهر ${city.CityId}`).trim();
}

function uniqueCities(rows: CityRow[]) {
  const map = new Map<number, CityRow>();
  for (const row of rows) {
    const id = Number(row.CityId);
    if (id && !map.has(id)) map.set(id, row);
  }
  return Array.from(map.values());
}

function uniqueUsers(rows: UserRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const stableKey = `${Number(row.UserId) || 0}-${Number(row.PersonId) || 0}-${Number(row.CityId ?? row.Mahal) || 0}-${String(row.CodeMelli || "")}`;
    if (seen.has(stableKey)) return false;
    seen.add(stableKey);
    return true;
  });
}

export default function UsersListClient() {
  const router = useRouter();
  const cityRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [currentUser, setCurrentUser] = useState<StoredUser>({});
  const [cities, setCities] = useState<CityRow[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [searchResultsByCity, setSearchResultsByCity] = useState<Record<number, UserRow[]>>({});
  const [searchMatchedCityIds, setSearchMatchedCityIds] = useState<number[] | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [expandedCityId, setExpandedCityId] = useState<number | null>(null);
  const [usersByCity, setUsersByCity] = useState<Record<number, UserRow[]>>({});
  const [usersLoading, setUsersLoading] = useState<Record<number, boolean>>({});
  const [usersError, setUsersError] = useState<Record<number, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [personQuery, setPersonQuery] = useState("");
  const [personOptions, setPersonOptions] = useState<PersonOption[]>([]);
  const [personLoading, setPersonLoading] = useState(false);
  const [personMenuOpen, setPersonMenuOpen] = useState(false);
  const [postOptions, setPostOptions] = useState<PostOption[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ cityId: number; user: UserRow } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("merat-user");
      if (raw) setCurrentUser(JSON.parse(raw) as StoredUser);
    } catch {
      setCurrentUser({});
    }
  }, []);

  useEffect(() => {
    const mahal = currentUser.Mahal;
    if (mahal === undefined || mahal === null || mahal === "") return;

    let active = true;

    async function loadCities() {
      setCitiesLoading(true);
      setCitiesError("");
      try {
        const result = await postJson<CityRow[]>("/Api/Citys/GetCitys", { pcityId: mahal });
        if (!active) return;
        if (result.status === 401) {
          router.replace("/Login");
          return;
        }
        if (result.status !== 200) throw new Error(result.error || result.message || "خطا در دریافت شهرها");
        setCities(uniqueCities(Array.isArray(result.data) ? result.data : []));
      } catch (error) {
        if (active) setCitiesError(error instanceof Error ? error.message : "خطا در دریافت شهرها");
      } finally {
        if (active) setCitiesLoading(false);
      }
    }

    void loadCities();
    return () => {
      active = false;
    };
  }, [currentUser.Mahal, router]);

  useEffect(() => {
    if (!modalOpen) return;
    const mahal = currentUser.Mahal;
    if (mahal === undefined || mahal === null || mahal === "") return;

    let active = true;

    async function loadPosts() {
      setPostsLoading(true);
      try {
        const result = await postJson<PostOption[]>("/Api/Users/Getpost", { mahal });
        if (!active) return;
        if (result.status === 401) {
          router.replace("/Login");
          return;
        }
        const rows = Array.isArray(result.data) ? result.data : [];
        const uniquePosts = Array.from(
          new Map(
            rows
              .map((item) => ({
                PostId: Number(item.PostId),
                OnvanPost: String(item.OnvanPost || "").trim(),
              }))
              .filter((item) => item.PostId && item.OnvanPost)
              .map((item) => [item.PostId, item] as const),
          ).values(),
        );
        setPostOptions(uniquePosts);
      } catch {
        if (active) setPostOptions([]);
      } finally {
        if (active) setPostsLoading(false);
      }
    }

    void loadPosts();
    return () => {
      active = false;
    };
  }, [modalOpen, currentUser.Mahal, router]);

  useEffect(() => {
    const query = personQuery.trim();
    const mahal = currentUser.Mahal;

    if (!modalOpen || selectedPerson || query.length < 2 || mahal === undefined || mahal === null || mahal === "") {
      setPersonOptions([]);
      setPersonMenuOpen(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setPersonLoading(true);
      try {
        const result = await postJson<PersonOption[]>("/Api/Users/SearchPersonDropDown", { mahal, search: query });
        if (!active) return;
        if (result.status === 401) {
          router.replace("/Login");
          return;
        }
        const rows = Array.isArray(result.data) ? result.data : [];
        const mapped = Array.from(
          new Map(
            rows
              .map((item) => ({
                PersonId: Number(item.PersonId),
                FullName: String(item.FullName || "").trim(),
              }))
              .filter((item) => item.PersonId && item.FullName)
              .map((item) => [item.PersonId, item] as const),
          ).values(),
        );
        setPersonOptions(mapped);
        setPersonMenuOpen(true);
      } catch {
        if (active) {
          setPersonOptions([]);
          setPersonMenuOpen(true);
        }
      } finally {
        if (active) setPersonLoading(false);
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [personQuery, selectedPerson, modalOpen, currentUser.Mahal, router]);

  useEffect(() => {
    const query = userSearch.trim();
    const mahal = currentUser.Mahal;

    if (!query) {
      setSearchResultsByCity({});
      setSearchMatchedCityIds(null);
      setSearchingUsers(false);
      setSearchError("");
      return;
    }

    if (mahal === undefined || mahal === null || mahal === "" || cities.length === 0) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchingUsers(true);
      setSearchError("");

      try {
        let grouped: Record<number, UserRow[]> = {};
        let usedPagedSearch = false;

        const globalResult = await postJson<UserRow[]>("/Api/Users/GetUsers", {
          mahal,
          page: 1,
          sizepage: 1000,
          indexsort: 1,
          ascdesc: 1,
          search: query,
        });

        if (!active) return;
        if (globalResult.status === 401 || globalResult.state === 401) {
          router.replace("/Login");
          return;
        }

        if (globalResult.status === 200 && Array.isArray(globalResult.data)) {
          const knownCityIds = new Set(cities.map((city) => Number(city.CityId)));
          for (const row of globalResult.data) {
            const cityId = Number(row.CityId ?? row.Mahal);
            if (!cityId || !knownCityIds.has(cityId)) continue;
            if (!grouped[cityId]) grouped[cityId] = [];
            grouped[cityId].push(row);
          }
          usedPagedSearch = Object.keys(grouped).length > 0 || globalResult.data.length === 0;
        }

        if (!usedPagedSearch) {
          const results = await Promise.all(
            cities.map(async (city) => {
              const cityId = Number(city.CityId);
              const result = await postJson<UserRow[]>("/Api/Users/GetListUsers", { mahal: cityId, search: query });
              return { cityId, result };
            }),
          );

          if (!active) return;
          grouped = {};
          for (const item of results) {
            if (item.result.status === 401 || item.result.state === 401) {
              router.replace("/Login");
              return;
            }
            if (item.result.status === 200 && Array.isArray(item.result.data) && item.result.data.length > 0) {
              grouped[item.cityId] = item.result.data;
            }
          }
        }

        for (const cityId of Object.keys(grouped).map(Number)) {
          grouped[cityId] = uniqueUsers(grouped[cityId] || []);
        }

        const matchedIds = Object.keys(grouped).map(Number).filter(Boolean);
        setSearchResultsByCity(grouped);
        setSearchMatchedCityIds(matchedIds);
        setExpandedCityId(matchedIds[0] ?? null);
      } catch (error) {
        if (active) {
          setSearchResultsByCity({});
          setSearchMatchedCityIds([]);
          setSearchError(error instanceof Error ? error.message : "خطا در جستجوی کاربران");
        }
      } finally {
        if (active) setSearchingUsers(false);
      }
    }, 3000);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [userSearch, currentUser.Mahal, cities, router]);

  const filteredCities = useMemo(() => {
    const q = userSearch.trim();
    if (!q || searchMatchedCityIds === null) return cities;
    const matched = new Set(searchMatchedCityIds);
    return cities.filter((city) => matched.has(Number(city.CityId)));
  }, [cities, userSearch, searchMatchedCityIds]);

  const totalLoadedUsers = useMemo(
    () => (Object.values(usersByCity) as UserRow[][]).reduce((sum, rows) => sum + rows.length, 0),
    [usersByCity],
  );

  function handleUnauthorized(result: ApiResponse<unknown>) {
    if (result.status === 401 || result.state === 401) {
      router.replace("/Login");
      return true;
    }
    return false;
  }

  async function fetchUsersByCity(cityId: number, force = false) {
    if (!force && usersByCity[cityId]) return;

    setUsersLoading((current) => ({ ...current, [cityId]: true }));
    setUsersError((current) => ({ ...current, [cityId]: "" }));

    try {
      const result = await postJson<UserRow[]>("/Api/Users/GetListUsers", { mahal: cityId, search: "" });
      if (handleUnauthorized(result)) return;
      if (result.status !== 200) throw new Error(result.error || result.message || "خطا در دریافت کاربران");
      setUsersByCity((current) => ({ ...current, [cityId]: uniqueUsers(Array.isArray(result.data) ? result.data : []) }));
    } catch (error) {
      setUsersError((current) => ({
        ...current,
        [cityId]: error instanceof Error ? error.message : "خطا در دریافت کاربران",
      }));
    } finally {
      setUsersLoading((current) => ({ ...current, [cityId]: false }));
    }
  }

  async function toggleCity(cityId: number) {
    if (expandedCityId === cityId) {
      setExpandedCityId(null);
      return;
    }

    setExpandedCityId(cityId);
    await fetchUsersByCity(cityId);
    window.setTimeout(() => {
      const node = cityRefs.current[cityId];
      if (!node) return;
      const top = node.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top, behavior: "smooth" });
    }, 50);
  }

  function resetModal() {
    setUsername("");
    setPassword("");
    setSelectedPerson(null);
    setSelectedPostId(null);
    setPersonQuery("");
    setPersonOptions([]);
    setPersonMenuOpen(false);
    setFormErrors({});
  }

  function openAddUser(cityId: number) {
    resetModal();
    setSelectedCityId(cityId);
    setModalOpen(true);
  }

  function closeAddUser() {
    if (saving) return;
    setModalOpen(false);
    setSelectedCityId(null);
    resetModal();
  }

  async function saveUser() {
    const errors: Record<string, string> = {};
    if (!username.trim()) errors.username = "نام کاربر الزامی است.";
    if (!password.trim()) errors.password = "کلمه عبور الزامی است.";
    if (!selectedPerson) errors.person = "شخص را انتخاب کنید.";
    if (!selectedPostId) errors.post = "پست را انتخاب کنید.";
    if (!selectedCityId) errors.city = "شهر انتخاب نشده است.";

    setFormErrors(errors);
    if (Object.keys(errors).length > 0 || !selectedCityId) return;

    setSaving(true);
    try {
      const result = await postJson("/Api/Users/InsertUser", {
        userId: username.trim(),
        mahal: selectedCityId,
        personId: selectedPerson?.PersonId ?? null,
        postId: selectedPostId,
        password: password.trim(),
        createUserId: currentUser.UserId ?? null,
      });

      if (handleUnauthorized(result)) return;
      if (result.status !== 200) throw new Error(result.error || result.message || "ثبت کاربر انجام نشد");

      await fetchUsersByCity(selectedCityId, true);
      setExpandedCityId(selectedCityId);
      setSaving(false);
      closeAddUser();
    } catch (error) {
      setFormErrors({ submit: error instanceof Error ? error.message : "خطا در ثبت کاربر" });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);

    try {
      const result = await postJson("/Api/Users/DeleteUsers", {
        userID: deleteTarget.user.UserId,
        createUserId: currentUser.UserId ?? null,
      });
      if (handleUnauthorized(result)) return;
      if (result.status !== 200) throw new Error(result.error || result.message || "حذف کاربر انجام نشد");
      await fetchUsersByCity(deleteTarget.cityId, true);
      setDeleteTarget(null);
    } catch (error) {
      setUsersError((current) => ({
        ...current,
        [deleteTarget.cityId]: error instanceof Error ? error.message : "خطا در حذف کاربر",
      }));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.pageBody} dir="rtl">
      <section className={styles.workspace}>
        <header className={styles.workspaceHeader}>
          <div className={styles.headerTitle}>
            <span className={styles.headerIcon}><UserIcon /></span>
            <div>
              <h1>فهرست کاربران</h1>
              <p>مدیریت کاربران استان و شهرستان‌ها</p>
            </div>
          </div>

          <div className={styles.headerStats}>
            <div>
              <span>شهرها</span>
              <strong>{cities.length}</strong>
            </div>
            <div>
              <span>کاربران بارگذاری‌شده</span>
              <strong>{totalLoadedUsers}</strong>
            </div>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <span><SearchIcon /></span>
            <input
              value={userSearch}
              onChange={(event) => {
                setUserSearch(event.target.value);
                setSearchResultsByCity({});
                setSearchMatchedCityIds(null);
                setSearchingUsers(false);
                setSearchError("");
              }}
              placeholder="جستجو بر اساس نام یا کد کاربر..."
              aria-label="جستجوی کاربر بر اساس نام یا کد کاربر"
            />
          </div>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => {
              setUserSearch("");
              setSearchResultsByCity({});
              setSearchMatchedCityIds(null);
              setUsersByCity({});
              setExpandedCityId(null);
              const mahal = currentUser.Mahal;
              if (mahal !== undefined && mahal !== null && mahal !== "") {
                setCitiesLoading(true);
                void postJson<CityRow[]>("/Api/Citys/GetCitys", { pcityId: mahal })
                  .then((result) => {
                    if (!handleUnauthorized(result) && result.status === 200) {
                      setCities(uniqueCities(Array.isArray(result.data) ? result.data : []));
                      setCitiesError("");
                    }
                  })
                  .catch(() => setCitiesError("خطا در به‌روزرسانی فهرست"))
                  .finally(() => setCitiesLoading(false));
              }
            }}
          >
            <RefreshIcon />
            <span>به‌روزرسانی</span>
          </button>
        </div>

        <div className={styles.content}>
          {citiesLoading ? (
            <div className={styles.stateBox}>
              <span className={styles.spinner} />
              <p>در حال دریافت فهرست شهرها...</p>
            </div>
          ) : citiesError ? (
            <div className={`${styles.stateBox} ${styles.errorState}`}>{citiesError}</div>
          ) : searchingUsers ? (
            <div className={styles.stateBox}><span className={styles.spinner} />در حال جستجوی کاربران...</div>
          ) : searchError ? (
            <div className={`${styles.stateBox} ${styles.errorState}`}>{searchError}</div>
          ) : filteredCities.length === 0 ? (
            <div className={styles.stateBox}>کاربری با نام یا کد واردشده پیدا نشد.</div>
          ) : (
            <div className={styles.cityList}>
              {filteredCities.map((city, cityIndex) => {
                const cityId = Number(city.CityId);
                const isOpen = expandedCityId === cityId;
                const isSearching = Boolean(userSearch.trim());
                const rows = isSearching ? (searchResultsByCity[cityId] || []) : (usersByCity[cityId] || []);
                const loading = isSearching ? false : Boolean(usersLoading[cityId]);
                const error = usersError[cityId] || "";

                return (
                  <div
                    key={`${cityId}-${Number(city.PCityId) || 0}-${cityIndex}`}
                    ref={(node) => { cityRefs.current[cityId] = node; }}
                    className={`${styles.cityCard} ${isOpen ? styles.cityCardOpen : ""}`}
                  >
                    <button type="button" className={styles.cityHeader} onClick={() => void toggleCity(cityId)}>
                      <div className={styles.cityIdentity}>
                        <span className={styles.cityChevron}><ChevronIcon open={isOpen} /></span>
                        <div>
                          <strong>{getCityTitle(city)}</strong>
                          <small>کد شهر: {cityId}</small>
                        </div>
                      </div>
                      <div className={styles.cityMeta}>
                        {isSearching || usersByCity[cityId] ? <span>{rows.length} کاربر</span> : <span>نمایش کاربران</span>}
                      </div>
                    </button>

                    {isOpen ? (
                      <div className={styles.cityContent}>
                        <div className={styles.cityActions}>
                          <div>
                            <strong>کاربران {getCityTitle(city)}</strong>
                            <span>{loading ? "در حال بارگذاری" : `${rows.length} کاربر`}</span>
                          </div>
                          <button type="button" className={styles.addButton} onClick={() => openAddUser(cityId)}>
                            <PlusIcon />
                            <span>افزودن کاربر</span>
                          </button>
                        </div>

                        {loading ? (
                          <div className={styles.innerState}><span className={styles.spinner} />در حال دریافت کاربران...</div>
                        ) : error ? (
                          <div className={`${styles.innerState} ${styles.errorState}`}>{error}</div>
                        ) : rows.length === 0 ? (
                          <div className={styles.innerState}>برای این شهر کاربری ثبت نشده است.</div>
                        ) : (
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>نام کاربری</th>
                                  <th>شماره ملی</th>
                                  <th>نام و نام خانوادگی</th>
                                  <th>محل</th>
                                  <th>عنوان پست</th>
                                  <th>وضعیت</th>
                                  <th>عملیات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((item, rowIndex) => (
                                  <tr key={`${cityId}-${Number(item.UserId) || 0}-${Number(item.PersonId) || 0}-${String(item.CodeMelli || "")}-${rowIndex}`}>
                                    <td data-label="نام کاربری">{item.UserId}</td>
                                    <td data-label="شماره ملی">{item.CodeMelli || "-"}</td>
                                    <td data-label="نام و نام خانوادگی">{item.FullName || "-"}</td>
                                    <td data-label="محل">{item.NameMahal || "-"}</td>
                                    <td data-label="عنوان پست">{item.OnvanPost || "-"}</td>
                                    <td data-label="وضعیت">
                                      <span className={`${styles.statusBadge} ${item.IsActive === false || item.IsActive === 0 ? styles.statusInactive : ""}`}>
                                        <i />
                                        {item.Active_NameFarsi || (item.IsActive === false || item.IsActive === 0 ? "غیرفعال" : "فعال")}
                                      </span>
                                    </td>
                                    <td data-label="عملیات">
                                      <button
                                        type="button"
                                        className={styles.deleteButton}
                                        onClick={() => setDeleteTarget({ cityId, user: item })}
                                      >
                                        <TrashIcon />
                                        <span>حذف</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {modalOpen ? (
        <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-label="افزودن کاربر">
          <button type="button" className={styles.modalBackdrop} onClick={closeAddUser} aria-label="بستن" />
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <strong>افزودن کاربر جدید</strong>
                <span>اطلاعات کاربر را تکمیل کنید.</span>
              </div>
              <button type="button" className={styles.closeButton} onClick={closeAddUser} aria-label="بستن">
                <CloseIcon />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>نام کاربر</span>
                  <input
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      if (formErrors.username) setFormErrors((current) => ({ ...current, username: "" }));
                    }}
                    placeholder="نام کاربر"
                    className={formErrors.username ? styles.fieldError : ""}
                    autoComplete="off"
                  />
                  {formErrors.username ? <small>{formErrors.username}</small> : null}
                </label>

                <label className={styles.field}>
                  <span>کلمه عبور</span>
                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (formErrors.password) setFormErrors((current) => ({ ...current, password: "" }));
                    }}
                    placeholder="کلمه عبور"
                    type="password"
                    autoComplete="new-password"
                    className={formErrors.password ? styles.fieldError : ""}
                  />
                  {formErrors.password ? <small>{formErrors.password}</small> : null}
                </label>

                <div className={styles.field}>
                  <span>انتخاب شخص</span>
                  <div className={styles.personSearchWrap}>
                    <input
                      value={selectedPerson ? selectedPerson.FullName : personQuery}
                      onChange={(event) => {
                        setSelectedPerson(null);
                        setPersonQuery(event.target.value);
                        setPersonMenuOpen(event.target.value.trim().length >= 2);
                        if (formErrors.person) setFormErrors((current) => ({ ...current, person: "" }));
                      }}
                      onFocus={() => {
                        if (!selectedPerson && personQuery.trim().length >= 2) setPersonMenuOpen(true);
                      }}
                      placeholder="حداقل دو حرف از نام شخص را وارد کنید"
                      className={formErrors.person ? styles.fieldError : ""}
                      autoComplete="off"
                    />
                    {selectedPerson ? (
                      <button
                        type="button"
                        className={styles.clearPerson}
                        onClick={() => {
                          setSelectedPerson(null);
                          setPersonQuery("");
                          setPersonOptions([]);
                        }}
                        aria-label="پاک کردن انتخاب"
                      >
                        ×
                      </button>
                    ) : null}

                    {personMenuOpen && !selectedPerson ? (
                      <div className={styles.personMenu}>
                        {personLoading ? (
                          <div className={styles.personMenuState}>در حال جستجو...</div>
                        ) : personOptions.length === 0 ? (
                          <div className={styles.personMenuState}>نتیجه‌ای پیدا نشد.</div>
                        ) : (
                          personOptions.map((person, personIndex) => (
                            <button
                              key={`${person.PersonId}-${personIndex}`}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setSelectedPerson(person);
                                setPersonQuery("");
                                setPersonMenuOpen(false);
                                setFormErrors((current) => ({ ...current, person: "" }));
                              }}
                            >
                              <span>{person.FullName}</span>
                              <small>#{person.PersonId}</small>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                  {formErrors.person ? <small>{formErrors.person}</small> : null}
                </div>

                <div className={styles.field}>
                  <span>انتخاب پست</span>
                  <Dropdown<number>
                    value={selectedPostId}
                    options={postOptions.map((post) => ({
                      value: Number(post.PostId),
                      label: post.OnvanPost,
                    }))}
                    onChange={(value) => {
                      setSelectedPostId(Number(value));
                      if (formErrors.post) setFormErrors((current) => ({ ...current, post: "" }));
                    }}
                    placeholder="پست مورد نظر را انتخاب کنید"
                    loading={postsLoading}
                    loadingText="در حال بارگذاری..."
                    emptyText="پستی برای انتخاب وجود ندارد."
                    error={Boolean(formErrors.post)}
                    ariaLabel="انتخاب پست کاربر"
                  />
                  {formErrors.post ? <small>{formErrors.post}</small> : null}
                </div>
              </div>

              {formErrors.submit ? <div className={styles.submitError}>{formErrors.submit}</div> : null}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryButton} onClick={closeAddUser} disabled={saving}>انصراف</button>
              <button type="button" className={styles.primaryButton} onClick={() => void saveUser()} disabled={saving}>
                {saving ? "در حال ثبت..." : "ثبت کاربر"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className={styles.modalLayer} role="alertdialog" aria-modal="true" aria-label="حذف کاربر">
          <button type="button" className={styles.modalBackdrop} onClick={() => !deleting && setDeleteTarget(null)} aria-label="بستن" />
          <div className={styles.confirmCard}>
            <span className={styles.confirmIcon}><TrashIcon /></span>
            <strong>حذف کاربر</strong>
            <p>
              آیا از حذف کاربر <b>{deleteTarget.user.FullName || deleteTarget.user.UserId}</b> اطمینان دارید؟
            </p>
            <div>
              <button type="button" className={styles.secondaryButton} onClick={() => setDeleteTarget(null)} disabled={deleting}>انصراف</button>
              <button type="button" className={styles.dangerButton} onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? "در حال حذف..." : "حذف کاربر"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
