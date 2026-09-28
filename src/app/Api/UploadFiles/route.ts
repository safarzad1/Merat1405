import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { verifyToken } from "@/lib/auth";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("token")?.value;
        if (!token) {
            return NextResponse.json(
                { status: 401, error: "Unauthorized: No token" },
                { status: 401 }
            );
        }

        try {
            verifyToken(token);
        } catch {
            return NextResponse.json(
                { status: 401, error: "Unauthorized: Invalid or expired token" },
                { status: 401 }
            );
        }
        const formData = await req.formData();

        const savedFiles: string[] = [];

        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                const ext = path.extname(value.name);
                const guidName = uuidv4() + ext;
                const filePath = path.join(UPLOAD_DIR, guidName);

                // Read file data و ذخیره در مسیر
                const arrayBuffer = await value.arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

                savedFiles.push(guidName);
            }
        }

        return NextResponse.json({ status: 200, files: savedFiles });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ status: 500, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
    }
}
