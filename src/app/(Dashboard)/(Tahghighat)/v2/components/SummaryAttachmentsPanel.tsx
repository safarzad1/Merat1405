"use client";
import DocumentAttachmentsPanel from "./DocumentAttachmentsPanel";
type Level = "INVESTIGATOR" | "COUNTY" | "HOZE" | "PROVINCE";
const target = {
  INVESTIGATOR: "RESEARCH_ASSIGNMENT",
  COUNTY: "COUNTY_SUMMARY",
  HOZE: "HOZE_SUMMARY",
  PROVINCE: "PROVINCE_SUMMARY",
} as const;
/** Render only after the summary is persisted. summaryRecordId is AssignmentId / CountySummary.SummaryId / HozeSummary.SummaryId / ProvinceSummary.SummaryId. */
export default function SummaryAttachmentsPanel({ level, summaryRecordId, readOnly = false }: {
 level: Level; summaryRecordId: number; readOnly?: boolean;
}) {
 return <DocumentAttachmentsPanel targetEntity={target[level]} targetRecordId={summaryRecordId} readOnly={readOnly} />;
}
