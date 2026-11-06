import { NextRequest } from "next/server";
import { listDocumentAttachments, uploadDocumentAttachment } from "@/app/lib/meratV2/unifiedDocumentAttachment";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return listDocumentAttachments(req); }
export async function POST(req: NextRequest) { return uploadDocumentAttachment(req); }
