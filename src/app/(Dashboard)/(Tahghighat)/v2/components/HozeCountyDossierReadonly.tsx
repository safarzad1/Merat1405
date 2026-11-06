"use client";

import { useEffect, useMemo, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import ResearchReadOnlyDossier, { type ReadonlyBranch, type ReadonlyDocument } from "./ResearchReadOnlyDossier";

type Assignment = { AssignmentId: number; FullName: string; StatusCode: string; Summary?: string | null; Instruction?: string | null };
type Worksheet = { WorksheetId: number; AssignmentId: number; ReportText?: string | null; Description?: string | null; NahveAshnai?: string | null; AzSal?: number | null; TaSal?: number | null; NameSazman?: string | null; NameShahr?: string | null };
type Document = ReadonlyDocument & { TargetEntity: string; TargetRecordId: number };
const parse = <T,>(input: unknown): T[] => { try { const data = typeof input === "string" ? JSON.parse(input) as unknown : input; return Array.isArray(data) ? data as T[] : []; } catch { return []; } };
const fa = (n: number) => n.toLocaleString("fa-IR");

export default function HozeCountyDossierReadonly({ hozeReferralId, countyReferralId, onClose }: { hozeReferralId: number; countyReferralId: number; onClose: () => void }) {
  const [result, setResult] = useState<V2Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setResult(null);
    void meratV2Request(`/Api/TahghighV2/HozeCountyDossier?hozeReferralId=${hozeReferralId}&countyReferralId=${countyReferralId}`)
      .then(rows => { if (active) { if (!rows[0]) throw new Error("اطلاعات شهرستان در این ارجاع یافت نشد."); setResult(rows[0]); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "دریافت جزئیات شهرستان انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hozeReferralId, countyReferralId]);
  const branches = useMemo<ReadonlyBranch[]>(() => {
    if (!result) return [];
    const assignments = parse<Assignment>(result.AssignmentsJson);
    const worksheets = parse<Worksheet>(result.WorksheetsJson);
    const docs = parse<Document>(result.DocumentsJson);
    const name = String(result.CountyName || "مقصد");
    return [{
      id: countyReferralId,
      title: `شهرستان ${name}`,
      statusLabel: "گزارش دریافتی شهرستان",
      summaryTitle: "متن نهایی ارسالی شهرستان به حوزه",
      summary: String(result.CountyReplyText || ""),
      documents: docs.filter(d => d.TargetEntity === "COUNTY_SUMMARY"),
      investigators: assignments.map(a => ({
        id: Number(a.AssignmentId),
        name: `${a.FullName} — محقق شهرستان ${name}`,
        status: String(a.StatusCode),
        instruction: a.Instruction,
        summary: a.Summary,
        documents: docs.filter(d => d.TargetEntity === "RESEARCH_ASSIGNMENT" && Number(d.TargetRecordId) === Number(a.AssignmentId)),
        worksheets: worksheets.filter(w => Number(w.AssignmentId) === Number(a.AssignmentId)).map((w, i) => ({
          id: Number(w.WorksheetId),
          title: `کاربرگ ${fa(i + 1)}`,
          report: w.ReportText,
          description: w.Description,
          details: [w.NahveAshnai && `نحوه آشنایی: ${w.NahveAshnai}`, w.AzSal != null && `از سال ${fa(w.AzSal)}`, w.TaSal != null && `تا سال ${fa(w.TaSal)}`, w.NameSazman, w.NameShahr].filter((item): item is string => Boolean(item)),
          documents: docs.filter(d => d.TargetEntity === "RESEARCH_WORKSHEET" && Number(d.TargetRecordId) === Number(w.WorksheetId))
        }))
      }))
    }];
  }, [result, countyReferralId]);
  return <ResearchReadOnlyDossier
    title={`جزئیات تحقیقات شهرستان ${String(result?.CountyName || "فرعی")}`}
    description="گزارش نهایی، محققان، کاربرگ‌ها، جمع‌بندی‌ها و تصاویر شهرستان — نمایش فقط‌خواندنی"
    branches={branches} loading={loading} error={error} onClose={onClose}
    fileUrl={d => `/Api/TahghighV2/HozeCountyDossierFile?hozeReferralId=${hozeReferralId}&countyReferralId=${countyReferralId}&attachmentId=${encodeURIComponent(d.AttachmentId)}`}
  />;
}
