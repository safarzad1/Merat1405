export async function ReportTahghighat() {
    try {
        const res = await fetch("/Api/Report/Setad/ReportTahghighatSetad", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}