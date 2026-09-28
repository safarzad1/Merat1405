// -----------------------------------------------------------------
export async function GetUsers(mahal, page, sizepage, indexsort, ascdesc, search) {
    try {
        const res = await fetch("/Api/Users/GetUsers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ mahal, page, sizepage, indexsort, ascdesc, search }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function GetUserPic(username) {
    try {
        const u = String(username ?? "").trim();
        if (!u) return null;

        const res = await fetch("/Api/Users/GetPersonPic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: u }),
            cache: "no-store",
        });

        // ✅ حالت عادی: عکس وجود ندارد
        if (res.status === 404) return null;

        // سایر خطاها
        if (!res.ok) {
            const ct = res.headers.get("content-type") || "";

            // امن بخونیم (ممکنه بدنه خالی باشه)
            if (ct.includes("application/json")) {
                const j = await res.json().catch(() => null);
                // فقط اگر واقعاً چیزی هست لاگ کن
                if (j && (j.message || j.status)) {
                    console.error("GetUserPic error:", j);
                }
            } else {
                const t = await res.text().catch(() => "");
                if (t) console.error("GetUserPic error:", t);
            }

            return null;
        }

        const contentType = res.headers.get("content-type") || "";

        // اگر به جای عکس JSON برگشت (مثلاً پیام)
        if (contentType.includes("application/json")) {
            // این هم حالت غیرعادی است، ولی لازم نیست console.error بدهیم
            return null;
        }

        // ✅ عکس/باینری
        return await res.blob();
    } catch (error) {
        console.error("GetUserPic fatal:", error);
        return null;
    }
}

// -----------------------------------------------------------------
export async function UploadUserPic(username, userId, file) {
    try {
        const form = new FormData();
        form.append("username", username);
        form.append("userId", String(userId));
        form.append("file", file);

        const res = await fetch("/Api/Users/InsertPersonPic", {
            method: "POST",
            body: form,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "خطا در آپلود");

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function CityTree(pcityId) {
    try {
        const res = await fetch("/Api/Citys/CityTree", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ pcityId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function ChangePassword(password, userid) {
    try {
        const res = await fetch("/Api/Users/ChangePassword", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ password, userid }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetListUsers(mahal, search) {
    try {
        const res = await fetch("/Api/Users/GetListUsers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ mahal, search }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function AddUser(userId, mahal, personId, postId, password, createUserId) {
    try {
        const res = await fetch("/Api/Users/InsertUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId, mahal, personId, postId, password, createUserId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function DeleteUser(userID, createUserId) {
    try {
        const res = await fetch("/Api/Users/DeleteUsers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userID, createUserId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}