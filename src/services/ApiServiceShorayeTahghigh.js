
export async function InsertTahghigh(erjaid, description, expireDate, userId, createUserId) {
    try {
        const res = await fetch("/Api/ShorayeTahghigh/InsertTahghigh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ erjaid, description, expireDate, userId, createUserId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function GetTahghighat(recordState, userId) {
    try {
        const res = await fetch("/Api/ShorayeTahghigh/GetTahghighat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ recordState, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function InsertLogState(idShorayeTahghigh, recordState, description, createUserId) {
    try {
        const res = await fetch("/Api/ShorayeTahghigh/InsertLogState", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ idShorayeTahghigh, recordState, description, createUserId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function UpdateTahghighShoraye(idShorayeTahghigh, recordState, description, createUserId) {
    try {
        const res = await fetch("/Api/ShorayeTahghigh/Update_Tahghigh_Shoraye", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ idShorayeTahghigh, recordState, description, createUserId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function GetTahghighat_Mohaghegh_ByID(tahghighid) {
    try {
        const res = await fetch("/Api/Mohaghegh/GetTahghighat_Mohaghegh_ByID", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ tahghighid }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
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
// -----------------------------------------------------------------
export async function AddKarbargTahghighDavtalab
    (shomarehParvandeh, codeEntekhabat, safheh, fileName, soalat, pasokh, manba1, manba2
        , manba3, manba4, manba5, manba6, tozihatMohaghegh, countPeyvast, codeMohaghegh, tarikhTakmil
        , createUserId, file) {
    try {
        const formData = new FormData();
        formData.append("shomarehParvandeh", shomarehParvandeh);
        formData.append("codeEntekhabat", codeEntekhabat);
        formData.append("safheh", safheh);
        formData.append("fileName", fileName);
        formData.append("soalat", soalat);
        formData.append("pasokh", pasokh);
        formData.append("manba1", manba1);
        formData.append("manba2", manba2);
        formData.append("manba3", manba3);
        formData.append("manba4", manba4);
        formData.append("manba5", manba5);
        formData.append("manba6", manba6);
        formData.append("tozihatMohaghegh", tozihatMohaghegh);
        formData.append("countPeyvast", countPeyvast);
        formData.append("codeMohaghegh", codeMohaghegh);
        formData.append("tarikhTakmil", tarikhTakmil);
        formData.append("createUserId", createUserId);

        if (file) {
            formData.append("file", file);
        }

        const res = await fetch("/Api/Tahghigh/InsertKarbargTahghighDavtalab", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function InsertHamyarHoghoghi(shomarehParvandeh, personId, expireDate, description, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/HamyarHoghoghi/InsertHamyar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ shomarehParvandeh, personId, expireDate, description, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------

export async function GetamyarHoghoghi(shomarehParvandeh) {
    try {
        const res = await fetch("/Api/Davtalabs/HamyarHoghoghi/GetHamyarParvandeh", {
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
// -----------------------------------------------------------------
