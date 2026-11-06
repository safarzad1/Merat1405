"use client";
import { useEffect, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import SummaryAttachmentsPanel from "./SummaryAttachmentsPanel";
import s from "./Consolidation.module.css";
const txt = (v: unknown) => v == null ? "—" : String(v);
const num = (v: unknown) => Number(v || 0);
export default function ProvinceCountyResults({ parentReferralId }: { parentReferralId: number }) {
  const [rows, setRows] = useState<V2Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true; setLoading(true); setRows([]); setError("");
    void meratV2Request(`/Api/TahghighV2/ProvinceCountyConsolidation?parentReferralId=${parentReferralId}`)
      .then(data => { if (live) setRows(data); })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [parentReferralId]);
  return <section className={s.panel} aria-label="مستندات جمع‌بندی شهرستان‌ها">
    <h3 className={s.heading}>جمع‌بندی و پیوست شهرستان‌های تابع</h3>
    <p className={s.help}>استان می‌تواند مستندات جمع‌بندی شهرستان‌ها را مشاهده کند؛ ویرایش این اسناد در اختیار نماینده همان شهرستان است.</p>
    {loading ? <p role="status">در حال دریافت مستندات شهرستان‌ها…</p> : rows.length === 0 ? <p>برای این پرونده جمع‌بندی شهرستانی ثبت نشده است.</p> :
      <div className={s.cardGrid}>{rows.map(row => {
        const id = num(row.CountySummaryId);
        return <article className={s.card} key={txt(row.CountyReferralId)}>
          <strong>شهرستان {txt(row.CountyCityId)} — حوزه {txt(row.HozeCityId)}</strong>
          <p className={s.meta}>ارجاع: {txt(row.CountyReferralId)} | وضعیت: {txt(row.CountyState)} | محققان باز: {txt(row.OpenAssignments)}</p>
          <p className={s.pre}>{txt(row.CountySummaryText)}</p>
          {id > 0 ? <SummaryAttachmentsPanel level="COUNTY" summaryRecordId={id} readOnly /> : <p className={s.meta}>جمع‌بندی ثبت نشده است؛ پیوستی برای آن وجود ندارد.</p>}
        </article>;
      })}</div>}
    {error && <p role="alert" className={s.warning}>{error}</p>}
  </section>;
}
