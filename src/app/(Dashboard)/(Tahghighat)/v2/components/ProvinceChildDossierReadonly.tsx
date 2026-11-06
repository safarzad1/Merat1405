"use client";

import { useEffect, useMemo, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import ResearchReadOnlyDossier, { type ReadonlyBranch, type ReadonlyDocument } from "./ResearchReadOnlyDossier";

type Referral = { ReferralId: number; ReceiverLevel: string; Depth: number; IsClosed: boolean; DestinationName?: string | null; ReferralDescription?: string | null; HozeSummaryText?: string | null; ProvinceSummaryText?: string | null; CountyReplyText?: string | null; NoResearchReason?: string | null };
type Assignment = { AssignmentId: number; ReferralId: number; FullName: string; StatusCode: string; Instruction?: string | null; Summary?: string | null };
type Worksheet = { WorksheetId: number; AssignmentId: number; ReferralId: number; ReportText?: string | null; Description?: string | null; NahveAshnai?: string | null; AzSal?: number | null; TaSal?: number | null; NameSazman?: string | null; NameShahr?: string | null };
type Document = ReadonlyDocument & { ReferralId: number; TargetEntity: string; TargetRecordId: number };
const parse = <T,>(input: unknown): T[] => { try { const data = typeof input === "string" ? JSON.parse(input) as unknown : input; return Array.isArray(data) ? data as T[] : []; } catch { return []; } };
const fa = (n: number) => n.toLocaleString("fa-IR");
const levelName = (level: string) => level === "HOZE" ? "حوزه انتخابیه" : level === "OSTAN" ? "استان" : level === "SHAHR" ? "شهرستان فرعی" : "مقصد";

/** The same read-only evidence form used by the hoze, with province-scoped authorized API routes. */
export default function ProvinceChildDossierReadonly({ parentReferralId, childReferralId, onClose }: { parentReferralId: number; childReferralId: number; onClose: () => void }) {
  const [result, setResult] = useState<V2Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setResult(null);
    void meratV2Request(`/Api/TahghighV2/ProvinceChildDossier?parentReferralId=${parentReferralId}&childReferralId=${childReferralId}`)
      .then(rows => { if (active) { if (!rows[0]) throw new Error("گزارشی برای این ارجاع یافت نشد."); setResult(rows[0]); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [parentReferralId, childReferralId]);
  const branches = useMemo<ReadonlyBranch[]>(() => {
    if (!result) return [];
    const refs = parse<Referral>(result.ReferralsJson);
    const assignments = parse<Assignment>(result.AssignmentsJson);
    const worksheets = parse<Worksheet>(result.WorksheetsJson);
    const docs = parse<Document>(result.DocumentsJson);
    return refs.map(r => {
      const ownAssignments = assignments.filter(a => Number(a.ReferralId) === Number(r.ReferralId));
      const summaryEntity = r.ReceiverLevel === "HOZE" ? "HOZE_SUMMARY" : r.ReceiverLevel === "OSTAN" ? "PROVINCE_SUMMARY" : "COUNTY_SUMMARY";
      const summary = r.ReceiverLevel === "HOZE" ? r.HozeSummaryText : r.ReceiverLevel === "OSTAN" ? r.ProvinceSummaryText : r.CountyReplyText;
      return {
        id: Number(r.ReferralId),
        title: `${levelName(r.ReceiverLevel)} ${r.DestinationName || "—"}`,
        statusLabel: r.IsClosed ? "پاسخ دریافت‌شده" : "در جریان",
        description: r.ReferralDescription,
        note: r.NoResearchReason,
        summaryTitle: r.ReceiverLevel === "SHAHR" ? "متن خروجی ارسالی شهرستان" : `گزارش نهایی ${levelName(r.ReceiverLevel)}`,
        summary,
        documents: docs.filter(d => Number(d.ReferralId) === Number(r.ReferralId) && d.TargetEntity === summaryEntity),
        investigators: ownAssignments.map(a => ({
          id: Number(a.AssignmentId),
          name: `${a.FullName} — محقق ${levelName(r.ReceiverLevel)} ${r.DestinationName || ""}`,
          status: String(a.StatusCode),
          instruction: a.Instruction,
          summary: a.Summary,
          documents: docs.filter(d => Number(d.ReferralId) === Number(r.ReferralId) && d.TargetEntity === "RESEARCH_ASSIGNMENT" && Number(d.TargetRecordId) === Number(a.AssignmentId)),
          worksheets: worksheets.filter(w => Number(w.AssignmentId) === Number(a.AssignmentId)).map((w, i) => ({
            id: Number(w.WorksheetId),
            title: `کاربرگ ${fa(i + 1)}`,
            report: w.ReportText,
            description: w.Description,
            details: [w.NahveAshnai && `نحوه آشنایی: ${w.NahveAshnai}`, w.AzSal != null && `از سال ${fa(w.AzSal)}`, w.TaSal != null && `تا سال ${fa(w.TaSal)}`, w.NameSazman, w.NameShahr].filter((item): item is string => Boolean(item)),
            documents: docs.filter(d => Number(d.ReferralId) === Number(r.ReferralId) && d.TargetEntity === "RESEARCH_WORKSHEET" && Number(d.TargetRecordId) === Number(w.WorksheetId))
          }))
        }))
      };
    });
  }, [result]);
  return <ResearchReadOnlyDossier
    title={`جزئیات تحقیقات ${result ? `${levelName(String(result.ChildLevel))} ${String(result.ChildName || "")}` : "ارجاع مقصد"}`}
    description="نمایش عملکرد مقصد و تمام ارجاعات تابع؛ شامل محققان، کاربرگ‌ها، گزارش‌ها، تصاویر و اسناد — فقط‌خواندنی"
    branches={branches} loading={loading} error={error} onClose={onClose}
    fileUrl={d => `/Api/TahghighV2/ProvinceChildDossierFile?parentReferralId=${parentReferralId}&childReferralId=${childReferralId}&attachmentId=${encodeURIComponent(d.AttachmentId)}`}
  />;
}
