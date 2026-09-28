
// -----------------------------------------------------------------
export async function GetEntekhabat(mahal) {
    try {
        const res = await fetch("/Api/Entekhabat/GetEntekhabat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ mahal }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در فراخوانی :", error);
        throw error;
    }
}
// -----------------------------------------------------------------
export async function GetEntekhabatHozeh(mahal) {
    try {
        const res = await fetch("/Api/Entekhabat/GetEntekhabatHozeh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ mahal }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در فراخوانی :", error);
        throw error;
    }
}// -----------------------------------------------------------------
export async function EntekhabatCitys(codeEntekhabat, pCityId) {
    try {
        const res = await fetch("/Api/Entekhabat/EntekhabatCitys", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ codeEntekhabat, pCityId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در فراخوانی :", error);
        throw error;
    }
}