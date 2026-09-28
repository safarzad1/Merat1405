// -----------------------------------------------------------------
export async function GetPersonHamkari(mahal, page, sizepage, indexsort, ascdesc, search, noehamkari) {
    try {
        const res = await fetch("/Api/Hamkari/GetPersonHamkari", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ mahal, page, sizepage, indexsort, ascdesc, search, noehamkari }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetPersonHamkariKholaseh(personId) {
    try {
        const res = await fetch("/Api/Hamkari/GetPersonHamkariKholaseh", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ personId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetHamkari(PersonId) {
    try {
        const res = await fetch("/Api/Hamkari/GetHamkari", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ PersonId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function DeletePersonHamkari(hamkariId, userId) {
    try {
        const res = await fetch("/Api/Hamkari/DeleteHamkari", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ hamkariId, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function AddHamkari(hamkariId, personId, noeHamkari, noeGharardad
    , mahalHamkari, sathHamkari, radeTakhasos, sharhTakhasos
    , vaziyatHamkari, userId, isActive) {
    try {
        const res = await fetch("/Api/Hamkari/InsertHamkari", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({
                hamkariId, personId, noeHamkari, noeGharardad
                , mahalHamkari, sathHamkari, radeTakhasos, sharhTakhasos
                , vaziyatHamkari, userId, isActive
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
export async function GetPersonByUserID(personId, userId) {
    try {
        const res = await fetch("/Api/Hamkari/GetPersonById", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ personId, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function AddPerson(personId, codeMelli, firstName, lastName, fatherName, tarikhTavalod, shomareShenasnameh, serialShenasnameh, mahalTavalod, mahalSodor, telHamrah, phoneNumber, jensiyat, taahol, din, mazhab, mahal, createUserId) {
    try {
        const res = await fetch("/Api/Hamkari/InsertPerson", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",

            },
            body: JSON.stringify({ personId, codeMelli, firstName, lastName, fatherName, tarikhTavalod, shomareShenasnameh, serialShenasnameh, mahalTavalod, mahalSodor, telHamrah, phoneNumber, jensiyat, taahol, din, mazhab, mahal, createUserId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}


// -----------------------------------------------------------------
export async function GetAmarNemodarHamkaran(mahal) {
    try {
        const res = await fetch("/Api/Hamkari/GetAmarHamkari", {
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
export async function GetCityAmarHamaran(mahal) {
    try {
        const res = await fetch("/Api/Hamkari/GetAmarHamaranCity", {
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
export async function GetSearchPersonDropDown(mahal, search) {
    try {
        const res = await fetch("/Api/Users/SearchPersonDropDown", {
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


