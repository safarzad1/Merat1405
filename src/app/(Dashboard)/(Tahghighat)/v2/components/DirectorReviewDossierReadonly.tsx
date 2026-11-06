"use client";

import { useEffect, useMemo, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import ResearchReadOnlyDossier, { type ReadonlyBranch, type ReadonlyDocument } from "./ResearchReadOnlyDossier";

type Referral = { ReferralId: number; ReceiverLevel: string; Depth: number; IsClosed: boolean;
  DestinationName?: string | null; ReferralDescription?: string | null; HozeSummaryText?: string | null;
  ProvinceSummaryText?: string | null; CountyReplyText?: string | null; NoResearchReason?: string | null };
type Assignment = { AssignmentId: number; ReferralId: number; FullName: string; StatusCode: string;
  Instruction?: string | null; Summary?: string | null };
type Worksheet = { WorksheetId: number; AssignmentId: number; ReferralId: number; ReportText?: string | null;
  Description?: string | null; NahveAshnai?: string | null; AzSal?: number | null; TaSal?: number | null;
  NameSazman?: string | null; NameShahr?: string | null };
type Document = ReadonlyDocument & { ReferralId: number; TargetEntity: string; TargetRecordId: number; CreatedAtUtc?: string | null };
const parse = <T,>(value: unknown): T[] => {
  try { const decoded: unknown = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(decoded) ? decoded as T[] : [];
  } catch { return []; }
};
const fa = (n: number) => n.toLocaleString("fa-IR");
const levelName = (level: string) => level === "HOZE" ? "حوزه انتخابیه" : level === "OSTAN" ? "استان" : level === "SHAHR" ? "شهرستان فرعی" : "مقصد";

/** The same readonly dossier as the province / hoze panels, scoped to director post 50. */
export default function DirectorReviewDossierReadonly({ referralId, onClose, viewer = "director" }: { referralId: number; onClose: () => void; viewer?: "director" | "setad" }) {
  const apiName = viewer === "setad" ? "SetadReviewDossier" : "DirectorReviewDossier";
  const [result, setResult] = useState<V2Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setResult(null);
    void meratV2Request(`/Api/TahghighV2/${apiName}?referralId=${referralId}`)
      .then(rows => { if (active) { if (!rows[0]) throw new Error("اطلاعات تحقیقات برای این پرونده یافت نشد."); setResult(rows[0]); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "خطای دریافت جزئیات تحقیقات"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [referralId, apiName]);

  const branches = useMemo<ReadonlyBranch[]>(() => {
    if (!result) return [];
    const refs = parse<Referral>(result.ReferralsJson);
    const investigators = parse<Assignment>(result.AssignmentsJson);
    const worksheets = parse<Worksheet>(result.WorksheetsJson);
    const docs = parse<Document>(result.DocumentsJson);
    const rootId = Number(result.ReferralId);
    return refs.map(ref => {
      const isRoot = Number(ref.ReferralId) === rootId;
      const summaryTarget = ref.ReceiverLevel === "HOZE" ? "HOZE_SUMMARY" : ref.ReceiverLevel === "SHAHR" ? "COUNTY_SUMMARY" : "PROVINCE_SUMMARY";
      const summary = ref.ReceiverLevel === "HOZE" ? ref.HozeSummaryText : ref.ReceiverLevel === "SHAHR" ? ref.CountyReplyText : ref.ProvinceSummaryText;
      const attached = docs.filter(d => Number(d.ReferralId) === Number(ref.ReferralId));
      const assigned = investigators.filter(a => Number(a.ReferralId) === Number(ref.ReferralId));
      const reportFiles = attached.filter(d => d.TargetEntity === summaryTarget ||
        (ref.ReceiverLevel === "SHAHR" && d.TargetEntity === "COUNTY_REPLY_EVENT"));
      const orderedReportFiles = isRoot ? reportFiles
        .sort((a, b) => String(a.CreatedAtUtc || "").localeCompare(String(b.CreatedAtUtc || "")) ||
          String(a.OriginalFileName || "").localeCompare(String(b.OriginalFileName || ""), "en", {numeric: true}))
        .map((doc, index) => ({ ...doc,
          OriginalFileName: /^image\//i.test(doc.MimeType) ? `صفحه ${fa(index + 1)} جمع‌بندی استان` : (doc.OriginalFileName || "سند جمع‌بندی استان")
        })) : reportFiles;
      return {
        id: Number(ref.ReferralId),
        title: isRoot ? "فرم رسمی جمع‌بندی و تحقیقات استان" : `${levelName(ref.ReceiverLevel)} ${ref.DestinationName || ""}`,
        statusLabel: isRoot ? (viewer === "setad" ? "سابقه تحقیقات استان در ستاد" : "ارسال‌شده برای بررسی رئیس دفتر") : ref.IsClosed ? "پاسخ دریافت‌شده" : "در جریان",
        description: ref.ReferralDescription,
        note: ref.NoResearchReason,
        summaryTitle: isRoot ? "جمع‌بندی نهایی استان و تمام صفحات تصویری فرم" : ref.ReceiverLevel === "SHAHR" ? "گزارش ارسالی شهرستان" : `گزارش نهایی ${levelName(ref.ReceiverLevel)}`,
        summary,
        documents: orderedReportFiles,
        investigators: assigned.map(a => ({
          id: Number(a.AssignmentId),
          name: `${a.FullName} — محقق ${levelName(ref.ReceiverLevel)} ${ref.DestinationName || ""}`,
          status: String(a.StatusCode),
          instruction: a.Instruction,
          summary: a.Summary,
          documents: attached.filter(d => d.TargetEntity === "RESEARCH_ASSIGNMENT" && Number(d.TargetRecordId) === Number(a.AssignmentId)),
          worksheets: worksheets.filter(w => Number(w.AssignmentId) === Number(a.AssignmentId)).map((w, index) => ({
            id: Number(w.WorksheetId),
            title: `کاربرگ ${fa(index + 1)}`,
            report: w.ReportText, description: w.Description,
            details: [w.NahveAshnai && `نحوه آشنایی: ${w.NahveAshnai}`,
              w.AzSal != null && `از سال ${fa(Number(w.AzSal))}`,
              w.TaSal != null && `تا سال ${fa(Number(w.TaSal))}`,
              w.NameSazman, w.NameShahr].filter((value): value is string => typeof value === "string" && value.trim() !== ""),
            documents: attached.filter(d => d.TargetEntity === "RESEARCH_WORKSHEET" && Number(d.TargetRecordId) === Number(w.WorksheetId))
          }))
        }))
      };
    });
  }, [result, viewer]);

  return <ResearchReadOnlyDossier title={viewer === "setad" ? "جزئیات کامل تحقیقات پرونده در ستاد" : "بازبینی پرونده تحقیقات استان"}
    description={`ارجاع ${fa(referralId)} · فرم جمع‌بندی چندصفحه‌ای، تحقیقات حوزه اصلی و شهرستان‌های تابع و پاسخ استان‌های دیگر — فقط‌خواندنی`}
    branches={branches} loading={loading} error={error} onClose={onClose}
    fileUrl={doc => `/Api/TahghighV2/${viewer === "setad" ? "SetadReviewDossierFile" : "DirectorReviewDossierFile"}?referralId=${referralId}&attachmentId=${encodeURIComponent(doc.AttachmentId)}`} />;
}
