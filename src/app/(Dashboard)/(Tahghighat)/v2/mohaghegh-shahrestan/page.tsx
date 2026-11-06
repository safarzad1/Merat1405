"use client";
import {useEffect,useState} from "react";
import { WorkflowHero, StateChip, EmptyMessage, AppNotice, SectionTitle, workflowStyles as u } from "@/app/(Dashboard)/(Tahghighat)/v2/components/MeratWorkflowUI";

import {meratV2Request,type V2Row} from "@/app/lib/meratV2/client";
import DocumentAttachmentsPanel from "@/app/(Dashboard)/(Tahghighat)/v2/components/DocumentAttachmentsPanel";
import CountyWorksheetAttachmentsPanel from "@/app/(Dashboard)/(Tahghighat)/v2/components/CountyWorksheetAttachmentsPanel";
const number=(x:unknown)=>Number(x||0),text=(x:unknown)=>x==null?"—":String(x);
export default function CountyInvestigatorPage(){
 const [inbox,setInbox]=useState<V2Row[]>([]),[worksheets,setWorksheets]=useState<V2Row[]>([]);
 const [selected,setSelected]=useState<number|null>(null),[report,setReport]=useState(""),[summary,setSummary]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function reload(){setInbox(await meratV2Request("/Api/TahghighV2/CountyInvestigatorInbox?page=1&pageSize=100"));}
 async function detail(id:number){setWorksheets(await meratV2Request(`/Api/TahghighV2/CountyWorksheets?assignmentId=${id}`));}
 useEffect(()=>{void reload().catch(e=>setError(String(e)));},[]);
 useEffect(()=>{setWorksheets([]);if(selected!==null)void detail(selected).catch(e=>setError(String(e)));},[selected]);
 const row=inbox.find(x=>number(x.AssignmentId)===selected),working=row?.StatusCode==="IN_PROGRESS";
 async function act(url:string,body:Record<string,unknown>,msg:string){setBusy(true);setError("");setNotice("");try{
  await meratV2Request(url,body);setNotice(msg);await reload();if(selected!==null)await detail(selected);
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <main dir="rtl" className={u.workspace}>
 <WorkflowHero eyebrow="تحقیقات مرآت · فاز ۲C" title="کارتابل محقق شهرستان"
 description="ثبت کاربرگ‌های تحقیق، بارگذاری اسناد و ارسال جمع‌بندی به نماینده شهرستان."
 stats={[{label:"مأموریت‌های دریافتی",value:inbox.length},{label:"در حال تحقیق",value:inbox.filter(x=>x.StatusCode==="IN_PROGRESS").length},{label:"کاربرگ‌های انتخابی",value:worksheets.length}]}/>
 <p style={{marginBottom:10}}><a style={{color:"#2563eb",textDecoration:"underline"}} href="/v2/mohaghegh-hoze">مشاهده مأموریت‌های مستقیم حوزه انتخابیه</a></p>
 <SectionTitle kicker="صندوق محقق" title="تحقیقات ارجاعی"/>
 {error&&<AppNotice kind="error">{error}</AppNotice>}{notice&&<AppNotice kind="success">{notice}</AppNotice>}
 <button type="button" onClick={()=>void reload().catch(e=>setError(String(e)))}>بازخوانی</button>
 <ul>{inbox.map(x=><li key={text(x.AssignmentId)}><button type="button" onClick={()=>setSelected(number(x.AssignmentId))}>تحقیق {text(x.AssignmentId)} — پرونده {text(x.ShomarehParvandeh)} — {text(x.StatusCode)}</button></li>)}</ul>{inbox.length===0&&<EmptyMessage title="تحقیقی ارجاع نشده"/>}
 {selected!==null&&row&&<section className={u.selectionPanel}>
 <SectionTitle kicker="جزئیات مأموریت" title={`تحقیق ${selected}`}/><p>{text(row.Instruction)}</p>
 {row.StatusCode==="PENDING"&&<button type="button" disabled={busy} onClick={()=>void act("/Api/TahghighV2/CountyInvestigatorAction",{assignmentId:selected,actionCode:"COUNTY_INVESTIGATOR_START"},"تحقیق شروع شد.")}>شروع تحقیق</button>}
 {working&&<section><label>گزارش کاربرگ<textarea rows={6} maxLength={12000} style={{display:"block",width:"100%"}} value={report} onChange={e=>setReport(e.target.value)}/></label>
 <button type="button" className={u.primary} disabled={busy||!report.trim()} onClick={()=>void act("/Api/TahghighV2/CountySaveWorksheet",{assignmentId:selected,reportText:report.trim()},"کاربرگ ثبت شد.")}>ثبت کاربرگ</button></section>}
 <SectionTitle kicker="مستندات" title="کاربرگ‌های ثبت‌شده"/>{worksheets.map(x=><article key={text(x.WorksheetId)} style={{border:"1px solid #ddd",padding:12}}>
 <h4>کاربرگ {text(x.WorksheetId)}</h4><p style={{whiteSpace:"pre-wrap"}}>{text(x.ReportText)}</p>
 <CountyWorksheetAttachmentsPanel worksheetId={number(x.WorksheetId)} readOnly={!working}/></article>)}
 {working&&<section><DocumentAttachmentsPanel targetEntity="RESEARCH_ASSIGNMENT" targetRecordId={selected} readOnly={!working}/><label>جمع‌بندی نهایی<textarea rows={4} maxLength={6000} style={{display:"block",width:"100%"}} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
 <button type="button" className={u.primary} disabled={busy||worksheets.length===0||!summary.trim()} onClick={()=>void act("/Api/TahghighV2/CountyInvestigatorAction",{assignmentId:selected,actionCode:"COUNTY_INVESTIGATOR_DONE",summary:summary.trim()},"تحقیق تکمیل شد.")}>تکمیل و ارسال نتیجه</button></section>}
 </section>}</main>;
}
