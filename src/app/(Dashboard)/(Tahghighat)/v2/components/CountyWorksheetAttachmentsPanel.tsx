"use client";
import DocumentAttachmentsPanel from "./DocumentAttachmentsPanel";
/** Alias only: county worksheet attachments share the unified attachment table. */
export default function CountyWorksheetAttachmentsPanel({ worksheetId, readOnly = false }: { worksheetId: number; readOnly?: boolean }) {
  return <DocumentAttachmentsPanel targetEntity="RESEARCH_WORKSHEET" targetRecordId={worksheetId} readOnly={readOnly} />;
}
