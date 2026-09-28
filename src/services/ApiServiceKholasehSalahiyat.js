export async function InsertAshkhasKholasehSalahiyat(shomarehParvandeh, codeEntekhabat
    , tagSalahiyat, kholasehMatlab, createUserId) {

    try {
        const res = await fetch("/Api/Davtalabs/KholasehSalahiyat/InsertKholasehSalahiyat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                shomarehParvandeh, codeEntekhabat
                , tagSalahiyat, kholasehMatlab, createUserId
            }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function GetAshkhasKholasehSalahiyat(shomarehParvandeh, codeEntekhabat) {
    try {
        const res = await fetch("/Api/Davtalabs/KholasehSalahiyat/GetKholasehSalahiyat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                shomarehParvandeh, codeEntekhabat
            }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function GetAshkhasKholasehSalahiyatByTag(
    shomarehParvandeh, codeEntekhabat, tagSalahiyat) {
    try {
        const res = await fetch("/Api/Davtalabs/KholasehSalahiyat/GetKholasehSalahiyat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                shomarehParvandeh, codeEntekhabat, tagSalahiyat
            }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function InsertAshkhasSalahiyat(shomarehParvandeh, codeEntekhabat, natije, tozihat, typeUser, recordState, createUserId) {

    try {
        const res = await fetch("/Api/Davtalabs/KholasehSalahiyat/InsertSalahiyat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                shomarehParvandeh, codeEntekhabat, natije, tozihat, typeUser, recordState, createUserId
            }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function GetAshkhasSalahiyat(
    shomarehParvandeh, codeEntekhabat, typeUser, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/KholasehSalahiyat/GetSalahiyat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                shomarehParvandeh, codeEntekhabat, typeUser, userId
            }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function InsertAshkhasSalahiyatMavad(salahiyatId, valueMavad, createUserId) {

    try {
        const res = await fetch("/Api/Davtalabs/KholasehSalahiyat/InsertSalahiyatMavad", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                salahiyatId, valueMavad, createUserId
            }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetAshkhasSalahiyatParvandeh(
    shomarehParvandeh, codeEntekhabat, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/KholasehSalahiyat/GetSalahiyatParvandeh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                shomarehParvandeh, codeEntekhabat, userId
            }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}


// -----------------------------------------------------------------
export async function DeleteAshkhasSalahiyatTag(
    shomarehParvandeh, codeEntekhabat, tagSalahiyat, userId) {
    try {
        const res = await fetch("/Api/Davtalabs/KholasehSalahiyat/DeleteSalahiyatTag", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                shomarehParvandeh, codeEntekhabat, tagSalahiyat, userId
            }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}
