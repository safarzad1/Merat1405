import { NextRequest } from "next/server";
import { listDocumentAttachments, uploadDocumentAttachment } from "@/app/lib/meratV2/unifiedDocumentAttachment";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Compatibility route: legacy worksheet UI now writes ONLY to DocumentAttachment. */
export async function GET(req: NextRequest) { return listDocumentAttachments(req, "RESEARCH_WORKSHEET"); }
export async function POST(req: NextRequest) { return uploadDocumentAttachment(req, "RESEARCH_WORKSHEET"); }
