"use client";
import DocumentAttachmentsPanel from "./DocumentAttachmentsPanel";
/** Alias only: both UI components operate on MeratFilesDB.dbo.TahghighatDocument. */
export default function WorksheetAttachmentsPanel({ worksheetId, readOnly = false }: { worksheetId: number; readOnly?: boolean }) {
  return <DocumentAttachmentsPanel targetEntity="RESEARCH_WORKSHEET" targetRecordId={worksheetId} readOnly={readOnly} />;
}
