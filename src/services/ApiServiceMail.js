// -----------------------------------------------------------------
export async function MailGroup(mahal, userId) {
    try {
        const res = await fetch("/Api/Mail/GetMailGroup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ mahal, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function InsertMessageMail(OnvanPayam, Payam, isSend, userId) {
    try {
        const res = await fetch("/Api/Mail/InsertMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ OnvanPayam, Payam, isSend, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function InsertMessageUserMail(messageId, senderUserId, reciverUserId, userId) {
    try {
        const res = await fetch("/Api/Mail/InsertMessageUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ messageId, senderUserId, reciverUserId, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function InsertMessageFilesMail(messageId, fileName, captionName, mMType, userId) {
    try {
        const res = await fetch("/Api/Mail/InsertMessageFiles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ messageId, fileName, captionName, mMType, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function GetUsersFromGroup(idGroup) {
    try {
        const res = await fetch("/Api/Mail/GetUsersGroupMail", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ idGroup }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}


// -----------------------------------------------------------------
export async function MessageInbox(userId, boxValue) {
    try {
        const res = await fetch("/Api/Mail/GetMessageInbox", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId, boxValue }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}// -----------------------------------------------------------------
export async function MessageByID(messageId) {
    try {
        const res = await fetch("/Api/Mail/GetMessageByID", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ messageId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function MessageFilesByID(messageId) {
    try {
        const res = await fetch("/Api/Mail/GetMessageFiles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ messageId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function MessageCount(userId) {
    try {
        const res = await fetch("/Api/Mail/GetCountMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}

// -----------------------------------------------------------------
export async function ReadMessageset(messageId, userId) {
    try {
        const res = await fetch("/Api/Mail/SetReadMessage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ messageId, userId }),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error("خطا در انجام فرآیند:", error);
        throw error;
    }
}