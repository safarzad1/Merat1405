import { NextRequest } from "next/server";
import { downloadDocumentAttachment, deleteDocumentAttachment } from "@/app/lib/meratV2/unifiedDocumentAttachment";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return downloadDocumentAttachment(req); }
export async function DELETE(req: NextRequest) { return deleteDocumentAttachment(req); }
