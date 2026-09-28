// -----------------------------------------------------------------
export async function TahghighatAmar(mahal) {
    console.log(mahal);
    try {
        const res = await fetch("/Api/Dashoard/TahghighatAmar", {
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
