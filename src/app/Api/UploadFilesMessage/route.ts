import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { verifyToken } from "@/lib/auth";

const UPLOAD_DIR = path.join(process.cwd(), "public", "MessageUploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export async function POST(req: NextRequest) {
    try {
        console.log("[UploadFilesMessage] START");

        const token = req.cookies.get("token")?.value;
        if (!token) {
            console.log("[UploadFilesMessage] 401 No token cookie");
            return NextResponse.json(
                { status: 401, error: "Unauthorized: No token" },
                { status: 401 }
            );
        }

        try {
            verifyToken(token);
        } catch {
            console.log("[UploadFilesMessage] 401 Invalid token");
            return NextResponse.json(
                { status: 401, error: "Unauthorized: Invalid or expired token" },
                { status: 401 }
            );
        }

        const formData = await req.formData();

        // ✅ خروجی استاندارد و قابل استفاده سمت کلاینت
        const savedFiles: {
            originalName: string;
            guidName: string;
            size: number;
            type: string;
        }[] = [];

        // ✅ نکته: این loop تمام entry های FormData را می‌خواند
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                const ext = path.extname(value.name);
                const guidName = uuidv4() + ext;
                const filePath = path.join(UPLOAD_DIR, guidName);

                const arrayBuffer = await value.arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

                savedFiles.push({
                    originalName: value.name,
                    guidName,
                    size: value.size,
                    type: value.type || "application/octet-stream",
                });

                console.log("[UploadFilesMessage] saved:", {
                    key,
                    originalName: value.name,
                    guidName,
                    size: value.size,
                    type: value.type,
                });
            }
        }

        console.log("[UploadFilesMessage] DONE. files:", savedFiles.length);

        return NextResponse.json({ status: 200, files: savedFiles });
    } catch (err) {
        console.error("[UploadFilesMessage] ERROR:", err);
        return NextResponse.json(
            {
                status: 500,
                error: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
