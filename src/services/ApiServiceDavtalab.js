export async function FehrestDavtalaban(mahal, codeEntekhabat, codeHozeh, natije, page, sizePage, sortIndex, sesdec, search, userId, value) {
    try {
        const res = await fetch("/Api/Davtalabs/FehrestDavtalab", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ mahal, codeEntekhabat, codeHozeh, natije, page, sizePage, sortIndex, sesdec, search, userId, value }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function GetDavtalabPic(shomarehParvandeh) {
    try {
        const res = await fetch("/Api/Davtalabs/DavtalabPic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shomarehParvandeh }),
            cache: "no-store",
        });

        if (res.status === 404) return null;

        if (!res.ok) {
            const ct = res.headers.get("content-type") || "";

            if (ct.includes("application/json")) {
                const j = await res.json().catch(() => null);
                if (j && (j.message || j.status)) {
                    console.error("DavtalabPic error:", j);
                }
            } else {
                const t = await res.text().catch(() => "");
                if (t) console.error("DavtalabPic error:", t);
            }

            return null;
        }

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            return null;
        }

        return await res.blob();
    } catch (error) {
        console.error("DavtalabPic fatal:", error);
        return null;
    }
}
// -----------------------------------------------------------------
export async function GetDavtalabByParvandeh(shomarehParvandeh) {
    try {
        const res = await fetch("/Api/Davtalabs/GetDavtalab", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------..
export async function GetPeyvastMadarekPish(shomarehParvandeh) {
    try {
        const res = await fetch("/Api/Davtalabs/PeyvastMadarekPish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shomarehParvandeh }),
            cache: "no-store",
        });

        if (res.status === 404) return [];

        if (!res.ok) {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
                const j = await res.json().catch(() => null);
                console.error("GetPeyvastMadarekPish error:", j);
            } else {
                const t = await res.text().catch(() => "");
                console.error("GetPeyvastMadarekPish error:", t);
            }
            return [];
        }

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const j = await res.json().catch(() => null);

            const raw =
                j?.data?.items ??
                j?.data?.rows ??
                j?.data ??
                j?.items ??
                j?.rows ??
                j ??
                [];

            return Array.isArray(raw) ? raw : raw ? [raw] : [];
        }

        const b = await res.blob();
        return [b];
    } catch (error) {
        console.error("GetPeyvastMadarekPish fatal:", error);
        return [];
    }
}



// -----------------------------------------------------------------
export async function GetParvandehFehrest(shomarehParvandeh, mahal, noeBayegani) {
    try {
        const res = await fetch("/Api/Davtalabs/GetFehrestParvandeh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, mahal, noeBayegani }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetParvandehFehrestFiles(shomarehParvandeh, noeBayegani, azsafheh) {
    try {
        const res = await fetch("/Api/Davtalabs/GetFehrestParvandehFiles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, noeBayegani, azsafheh }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetDropDownAshkhasEntekhabat(mahal) {
    try {
        const res = await fetch("/Api/Davtalabs/DropDownAshkhasEntekhabat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ mahal }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}


// -----------------------------------------------------------------
export async function GetReportAshkhasEntekhabat(mahal, codeEntekhabat, natije) {
    try {
        const res = await fetch("/Api/Davtalabs/EntekhabatDavtalab", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ mahal, codeEntekhabat, natije }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function CheckParvandehAccess(mahal, codeEntekhabat) {
    try {
        const res = await fetch("/Api/Davtalabs/AccessCheckParvandeh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ mahal, codeEntekhabat }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetSokonats(shomarehParvandeh, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/Sokonat/GetSokonats", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, userId }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetTahsilats(shomarehParvandeh, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/Tahsilat/GetTahsilats", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, userId }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}


// -----------------------------------------------------------------
export async function GetShoghl(shomarehParvandeh, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/Shoghls/GetShoghls", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, userId }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetSabegheKari(shomarehParvandeh, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/Shoghls/GetSabegheKari", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, userId }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetFaliyats(shomarehParvandeh, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/Faliyats/GetFaliyat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, userId }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// // ----------------------------------------------------------------
export async function GetDaneshgahi(shomarehParvandeh, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/Tahsilat/GetTahsilatDaneshgah", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, userId }),
        });

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

export async function GetKarbargDavtalabByShomareh(shomarehParvandeh, CodeEntekhabat, userId) {
    try {
        const res = await fetch("/Api/Tahghigh/GetKarbargDavtalabOne", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, CodeEntekhabat, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

export async function GetKarbargTahghighByShomareh(shomarehParvandeh, CodeEntekhabat, userId) {
    try {
        const res = await fetch("/Api/Tahghigh/GetKarbargTahghigh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, CodeEntekhabat, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------


