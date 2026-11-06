"use client";
import { useEffect, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";

export default function ChildReturnNotice({ referralId }: { referralId: number }) {
  const [notice, setNotice] = useState<V2Row | null>(null);
  useEffect(() => {
    if (!Number.isSafeInteger(referralId) || referralId<=0) return;
    let live = true;
    void meratV2Request(`/Api/TahghighV2/ChildReturnNotice?childReferralId=${referralId}`)
      .then(rows => { if(live) setNotice(rows[0] || null); })
      .catch(() => { if(live) setNotice(null); });
    return () => { live = false; };
  }, [referralId]);
  if (!notice) return null;
  const sender = String(notice.SenderName || "مبدأ ارجاع");
  const reason = String(notice.ReturnReason || "");
  return <div role="alert" dir="rtl" style={{background:"#fff7df",border:"1px solid #efcd79",borderRight:"5px solid #d5a52d",color:"#64460e",padding:"14px 18px",borderRadius:12,margin:"12px 0",lineHeight:2}}>
    <strong style={{display:"block",fontSize:15}}>پرونده برای اصلاح از {sender} برگشت داده شده است</strong>
    <div style={{fontSize:13,marginTop:5,fontWeight:700}}>دلیل برگشت</div>
    <div style={{whiteSpace:"pre-wrap",fontSize:14}}>{reason}</div>
    <div style={{fontSize:12,marginTop:7}}>پس از رفع موارد اعلام‌شده، پرونده را از همین ارجاع دوباره ارسال کنید.</div>
  </div>;
}
