// -----------------------------------------------------------------
export async function UploadNameh(personId, codeEntekhabat, fileName, userId, file) {
    try {
        const form = new FormData();
        form.append("PersonId", personId);
        form.append("fileName", fileName);
        form.append("userId", String(userId));
        form.append("file", file);

        const res = await fetch("/Api/NameHa/InsertFilesNameh", {
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
export async function UploadKarbargTahghigh(shomarehParvandeh, manabePishnahadi
    , ebhamatParvandeh, fileName, userId, file) {
    try {
        const form = new FormData();
        form.append("shomarehParvandeh", shomarehParvandeh);
        form.append("manabePishnahadi", manabePishnahadi);
        form.append("ebhamatParvandeh", ebhamatParvandeh);
        form.append("fileName", fileName);
        form.append("userId", String(userId));
        form.append("file", file);

        const res = await fetch("/Api/Tahghigh/InsertImageKargroup", {
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
export async function GetFileNamePic(fileName, userId) {
    try {
        const res = await fetch("/Api/NameHa/GetFileNameh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName, userId }),
            cache: "no-store",
        });

        if (res.status === 404) return null;

        if (!res.ok) {
            const ct = res.headers.get("content-type") || "";

            if (ct.includes("application/json")) {
                const j = await res.json().catch(() => null);
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

        if (contentType.includes("application/json")) {
            return null;
        }

        return await res.blob();
    } catch (error) {
        console.error("GetUserPic fatal:", error);
        return null;
    }
}

// -----------------------------------------------------------------
export async function InsertFile(fileName, userId, file) {
    try {
        const form = new FormData();
        form.append("fileName", fileName);
        form.append("userId", String(userId));
        form.append("file", file);

        const res = await fetch("/Api/NameHa/AddFile", {
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
