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

export default function UsersListClient() {
  const router = useRouter();
  const cityRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [currentUser, setCurrentUser] = useState<StoredUser>({});
  const [cities, setCities] = useState<CityRow[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState("");
  const [citySearch, setCitySearch] = useState("");
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
        setCities(Array.isArray(result.data) ? result.data : []);
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
        setPostOptions(
          rows
            .map((item) => ({
              PostId: Number(item.PostId),
              OnvanPost: String(item.OnvanPost || "").trim(),
            }))
            .filter((item) => item.PostId && item.OnvanPost),
        );
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
        const mapped = rows
          .map((item) => ({
            PersonId: Number(item.PersonId),
            FullName: String(item.FullName || "").trim(),
          }))
          .filter((item) => item.PersonId && item.FullName);
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

  const filteredCities = useMemo(() => {
    const q = citySearch.trim();
    if (!q) return cities;
    return cities.filter((city) => getCityTitle(city).includes(q) || String(city.CityId).includes(q));
  }, [cities, citySearch]);

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
      setUsersByCity((current) => ({ ...current, [cityId]: Array.isArray(result.data) ? result.data : [] }));
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
              value={citySearch}
              onChange={(event) => setCitySearch(event.target.value)}
              placeholder="جستجو در استان و شهرستان‌ها..."
              aria-label="جستجوی شهر"
            />
          </div>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => {
              setUsersByCity({});
              setExpandedCityId(null);
              const mahal = currentUser.Mahal;
              if (mahal !== undefined && mahal !== null && mahal !== "") {
                setCitiesLoading(true);
                void postJson<CityRow[]>("/Api/Citys/GetCitys", { pcityId: mahal })
                  .then((result) => {
                    if (!handleUnauthorized(result) && result.status === 200) {
                      setCities(Array.isArray(result.data) ? result.data : []);
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
          ) : filteredCities.length === 0 ? (
            <div className={styles.stateBox}>موردی برای نمایش وجود ندارد.</div>
          ) : (
            <div className={styles.cityList}>
              {filteredCities.map((city) => {
                const cityId = Number(city.CityId);
                const isOpen = expandedCityId === cityId;
                const rows = usersByCity[cityId] || [];
                const loading = Boolean(usersLoading[cityId]);
                const error = usersError[cityId] || "";

                return (
                  <div
                    key={cityId}
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
                        {usersByCity[cityId] ? <span>{rows.length} کاربر</span> : <span>نمایش کاربران</span>}
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
                                {rows.map((item) => (
                                  <tr key={item.UserId}>
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
                          personOptions.map((person) => (
                            <button
                              key={person.PersonId}
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
