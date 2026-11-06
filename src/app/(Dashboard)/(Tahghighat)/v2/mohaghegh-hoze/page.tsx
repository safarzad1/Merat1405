"use client";
import { useEffect, useState } from "react";
import { AppNotice, EmptyMessage, StateChip, SectionTitle, workflowStyles as u } from "@/app/(Dashboard)/(Tahghighat)/v2/components/MeratWorkflowUI";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
const toNum=(x:unknown)=>Number(x||0),toText=(x:unknown)=>x==null?"—":String(x);
export default function HozeInvestigatorPage(){
 const [inbox,setInbox]=useState<V2Row[]>([]),[selected,setSelected]=useState<number|null>(null),[worksheets,setWorksheets]=useState<V2Row[]>([]);
 const [report,setReport]=useState(""),[summary,setSummary]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function refresh(){setInbox(await meratV2Request("/Api/TahghighV2/HozeInvestigatorInbox?page=1&pageSize=100"));}
 async function loadWorksheets(id:number){setWorksheets(await meratV2Request(`/Api/TahghighV2/HozeWorksheets?assignmentId=${id}`));}
 useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:String(e)));},[]);
 useEffect(()=>{setWorksheets([]);setReport("");setSummary("");if(selected!==null)void loadWorksheets(selected).catch(e=>setError(e instanceof Error?e.message:String(e)));},[selected]);
 const chosen=inbox.find(x=>toNum(x.AssignmentId)===selected),working=chosen?.StatusCode==="IN_PROGRESS";
 async function act(url:string,body:Record<string,unknown>,message:string){
  if(busy)return;setBusy(true);setError("");setNotice("");
  try{await meratV2Request(url,body);setNotice(message);await refresh();if(selected!==null)await loadWorksheets(selected);
  if(url.includes("SaveWorksheet"))setReport("");}
  catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 }
 return <main dir="rtl" className={u.workspace}>
  <header style={{background:"#f0f7ff",padding:20,borderRadius:16,marginBottom:20,border:"1px solid #dbe9fc"}}><h1 style={{fontSize:22,fontWeight:800}}>کارتابل محقق حوزه انتخابیه</h1><p style={{color:"#5f7692"}}>ثبت کاربرگ و جمع‌بندی مأموریت‌هایی که مستقیم از حوزه دریافت کرده‌اید.</p></header>
  {error&&<AppNotice kind="error">{error}</AppNotice>}{notice&&<AppNotice kind="success">{notice}</AppNotice>}
  <button type="button" onClick={()=>void refresh().catch(e=>setError(String(e)))}>بازخوانی</button>
  <div className={u.tableScroll}><table style={{width:"100%",textAlign:"right"}}><thead><tr><th>پرونده</th><th>مأموریت</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
   {inbox.map(x=><tr key={toNum(x.AssignmentId)}><td>{toText(x.ShomarehParvandeh)}</td><td>{toText(x.Instruction)}</td><td><StateChip value={x.StatusCode}/></td><td><button type="button" onClick={()=>setSelected(toNum(x.AssignmentId))}>مشاهده</button></td></tr>)}
  </tbody></table></div>{inbox.length===0&&<EmptyMessage title="مأموریت فعالی ندارید"/>}
  {chosen&&selected!==null&&<section className={u.selectionPanel}>
   <SectionTitle title={`جزئیات مأموریت ${selected}`} description={toText(chosen.Instruction)}/>
   {chosen.StatusCode==="PENDING"&&<button type="button" disabled={busy} className={u.primary} onClick={()=>void act("/Api/TahghighV2/HozeInvestigatorAction",{assignmentId:selected,actionCode:"HOZE_INVESTIGATOR_START"},"تحقیق آغاز شد.")}>شروع تحقیق</button>}
   {working&&<><label style={{display:"block",marginTop:15}}>متن کاربرگ تحقیق<textarea rows={6} maxLength={12000} style={{display:"block",width:"100%"}} value={report} onChange={e=>setReport(e.target.value)}/></label>
    <button type="button" disabled={busy||!report.trim()} className={u.primary} onClick={()=>void act("/Api/TahghighV2/HozeSaveWorksheet",{assignmentId:selected,reportText:report.trim()},"کاربرگ ثبت شد.")}>ثبت کاربرگ</button></>}
   <SectionTitle kicker="گزارش‌ها" title="کاربرگ‌های ثبت‌شده"/>
   {worksheets.map(x=><article key={toNum(x.WorksheetId)} style={{border:"1px solid #dce8f5",borderRadius:12,padding:13,marginBottom:10,whiteSpace:"pre-wrap"}}>{toText(x.ReportText)}</article>)}
   {working&&<><label style={{display:"block",marginTop:15}}>متن جمع‌بندی محقق<textarea rows={5} maxLength={12000} style={{display:"block",width:"100%"}} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
    <button type="button" className={u.primary} disabled={busy||worksheets.length===0||!summary.trim()} onClick={()=>void act("/Api/TahghighV2/HozeInvestigatorAction",{assignmentId:selected,actionCode:"HOZE_INVESTIGATOR_DONE",summary:summary.trim()},"تحقیق تکمیل و جمع‌بندی به حوزه ارسال شد.")}>تکمیل و ارسال نتیجه به حوزه</button></>}
  </section>}
 </main>;
}
