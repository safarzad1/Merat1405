"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import domtoimage from "@/lib/domToImageCompat";
import { InvestigatorSummarySheet, type SummaryIdentity, type SummaryWorksheet } from "./InvestigatorSummarySheet";
import { showToast } from "@/component/CustomToast";
import WorksheetSummaryDocuments from "./WorksheetSummaryDocuments";
import s from "./ProvinceInvestigatorEvidence.module.css";

type Target = "RESEARCH_WORKSHEET" | "RESEARCH_ASSIGNMENT";
type DocumentItem = {
  AttachmentKind?: string; SummaryLevel?: string | null;
  AttachmentId: string; OriginalFileName: string; MimeType: string; FileSizeBytes: number;
  CreatedAtUtc: string; AttachmentDescription: string | null; CaseId: number;
  AssignmentId: number; InvestigatorKey: number; InvestigatorPersonId: number | null;
};
type Result<T> = {ok:boolean;data?:T;message?:string;code?:string};
type EvidenceScope = "OSTAN" | "HOZE" | "COUNTY";
const fileUrl=(id:string,download=false,scope:EvidenceScope="OSTAN")=>scope!=="OSTAN"
  ? `/Api/TahghighV2/DocumentAttachmentFile?attachmentId=${encodeURIComponent(id)}${download?"&download=1":""}`
  : `/Api/TahghighV2/ProvinceInvestigatorDocumentFile?attachmentId=${encodeURIComponent(id)}${download?"&download=1":""}`;
const isImage=(doc:DocumentItem)=>doc.MimeType.startsWith("image/");
async function dataRows<T>(url:string, init?:RequestInit):Promise<T> {
  const response=await fetch(url,{cache:"no-store",credentials:"same-origin",...init});
  const body=await response.json() as Result<T>;
  if(!response.ok || !body.ok) {
    // Show only the safe server error code, never database paths/SQL internals.
    const diagnostic = typeof body.code === "string" && /^[A-Z0-9_]{2,60}$/.test(body.code)
      ? ` [${body.code}]` : "";
    throw new Error((body.message || "عملیات فایل انجام نشد.") + diagnostic);
  }
  return body.data as T;
}

export function ProvinceInvestigatorEvidence({targetEntity,targetRecordId,investigatorName,readOnly=false,scope="OSTAN"}: {
  targetEntity:Target; targetRecordId:number; investigatorName:string; readOnly?:boolean;scope?:EvidenceScope;
}) {
  const [items,setItems]=useState<DocumentItem[]>([]);
  const [summaryPages,setSummaryPages]=useState<DocumentItem[]>([]);
  // Phase 73: each selected file uploads immediately; no intermediate form.
  const uploadLock=useRef(false);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [galleryOpen,setGalleryOpen]=useState(false);
  const [previewOpen,setPreviewOpen]=useState(false);
  const [selected,setSelected]=useState<string|null>(null);
  const [deleteId,setDeleteId]=useState<string|null>(null);
  // Phase 72: keep scale and pan together so wheel events cannot desynchronize them.
  const [view,setView]=useState({scale:1,x:0,y:0});
  const stageRef=useRef<HTMLDivElement>(null);
  const imageRef=useRef<HTMLImageElement>(null);
  const drag=useRef<{pointerId:number;x:number;y:number;startX:number;startY:number}|null>(null);
  const resetView=useCallback(()=>setView({scale:1,x:0,y:0}),[]);
  const clampView=useCallback((value:{scale:number;x:number;y:number})=>{
    const stage=stageRef.current;
    const img=imageRef.current;
    if(!stage||!img||value.scale<=1) return {scale:value.scale,x:0,y:0};
    const maxX=Math.max(0,(img.offsetWidth*value.scale-stage.clientWidth)/2);
    const maxY=Math.max(0,(img.offsetHeight*value.scale-stage.clientHeight)/2);
    return {scale:value.scale,x:Math.max(-maxX,Math.min(maxX,value.x)),y:Math.max(-maxY,Math.min(maxY,value.y))};
  },[]);
  const zoomBy=useCallback((factor:number,clientX?:number,clientY?:number)=>{
    const rect=stageRef.current?.getBoundingClientRect();
    const px=rect&&clientX!==undefined?clientX-rect.left-rect.width/2:0;
    const py=rect&&clientY!==undefined?clientY-rect.top-rect.height/2:0;
    setView(current=>{
      const nextScale=Math.max(1,Math.min(6,current.scale*factor));
      if(nextScale===1)return {scale:1,x:0,y:0};
      const ratio=nextScale/current.scale;
      return clampView({scale:nextScale,x:px-(px-current.x)*ratio,y:py-(py-current.y)*ratio});
    });
  },[clampView]);
  const closeButton=useRef<HTMLButtonElement>(null);
  const previewCloseButton=useRef<HTMLButtonElement>(null);
  const endpoint=`/Api/TahghighV2/${scope!=="OSTAN"?"DocumentAttachments":"ProvinceInvestigatorDocuments"}?targetEntity=${targetEntity}&targetRecordId=${targetRecordId}`;
  const reload=useCallback(async(signal?:AbortSignal)=> {
    const rows=await dataRows<DocumentItem[]>(endpoint,{signal});
    // A worksheet has separate ordinary evidence and one/two summary pages.
    const ordinary=(rows||[]).filter(item=>!(targetEntity==="RESEARCH_WORKSHEET" && /^\[WS-SUMMARY-[12]\]/.test(item.AttachmentDescription || "")));
    const summaries=targetEntity==="RESEARCH_WORKSHEET"
      ? (rows||[]).filter(item=>/^\[WS-SUMMARY-[12]\]/.test(item.AttachmentDescription || ""))
          .sort((a,b)=>Number(b.AttachmentDescription?.startsWith("[WS-SUMMARY-2]"))-Number(a.AttachmentDescription?.startsWith("[WS-SUMMARY-2]")))
      : [];
    if(!signal?.aborted) {setItems(ordinary);setSummaryPages(summaries);}
    return ordinary;
  },[endpoint,targetEntity]);
  useEffect(()=> {
    const controller=new AbortController();
    setItems([]);setSummaryPages([]);setLoading(true);setError("");setSelected(null);setGalleryOpen(false);setPreviewOpen(false);
    void reload(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"خطای دریافت پیوست");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[reload]);

  // Ordinary documents first (right in RTL); summary page 1 and 2 at the far left.
  const galleryItems=[...items,...summaryPages];
  const previewIndex=galleryItems.findIndex(x=>x.AttachmentId===selected);
  const active=previewIndex>=0?galleryItems[previewIndex]:null;
  const activeIsSummary=!!active && summaryPages.some(x=>x.AttachmentId===active.AttachmentId);
  const activeImage=active!==null&&isImage(active);
  const switchTo=useCallback((id:string|null)=>{setSelected(id);resetView();drag.current=null;},[resetView]);
  const retryLoad=async()=>{
    if(busy||loading)return;
    setLoading(true);setError("");
    try{await reload();}
    catch(e){setError(e instanceof Error?e.message:"خطای دریافت تصاویر محقق");}
    finally{setLoading(false);}
  };
  const openGallery=()=> {
    // Only the file manager opens. Its large preview never opens by default.
    setPreviewOpen(false);
    switchTo(null);
    setGalleryOpen(true);
    void reload().catch(e=>setError(e instanceof Error?e.message:"خطا در بازخوانی اسناد"));
    setError("");
  };
  const openPreview=(id:string)=> {
    switchTo(id);
    setPreviewOpen(true);
    setError("");
  };
  const closePreview=useCallback(()=> {
    setPreviewOpen(false);
    setSelected(null);
    resetView();
    drag.current=null;
  },[resetView]);
  const closeGallery=useCallback(()=> {
    setGalleryOpen(false);setPreviewOpen(false);setSelected(null);resetView();drag.current=null;
    setError("");
  },[resetView]);
  const move=useCallback((change:number)=>{
    if(previewIndex<0 || galleryItems.length===0)return;
    switchTo(galleryItems[(previewIndex+change+galleryItems.length)%galleryItems.length].AttachmentId);
  },[galleryItems,previewIndex,switchTo]);

  useEffect(()=>{
    if(!galleryOpen && !previewOpen)return;
    const prior=document.body.style.overflow;
    document.body.style.overflow="hidden";
    if(previewOpen) previewCloseButton.current?.focus();
    else closeButton.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(deleteId)return;
      if(event.key==="Escape"){
        event.preventDefault();
        if(busy)return; // Preserve the visible upload state until the request finishes.
        if(previewOpen) closePreview();
        else closeGallery();
        return;
      }
      if(!previewOpen)return;
      const element=event.target;
      const isEditing=element instanceof HTMLElement && (element.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(element.tagName));
      if(isEditing)return;
      if(event.key==="ArrowLeft"){event.preventDefault();move(1);}
      if(event.key==="ArrowRight"){event.preventDefault();move(-1);}
      if(event.key==="+"||event.key==="="){event.preventDefault();zoomBy(1.25);}
      if(event.key==="-"){event.preventDefault();zoomBy(1/1.25);}
    };
    document.addEventListener("keydown",key);
    return ()=>{document.removeEventListener("keydown",key);document.body.style.overflow=prior;};
  },[galleryOpen,previewOpen,deleteId,busy,move,closeGallery,closePreview,zoomBy]);

  async function upload(files:File[]){
    // Phase 74: auto-upload images, including multiple selected pages, sequentially.
    // A ref lock prevents duplicate uploads before state commits.
    if(uploadLock.current || readOnly || loading || !!error || files.length===0)return;
    uploadLock.current=true;
    setError("");setBusy(true);
    let uploaded=0;
    const failures:string[]=[];
    try{
      for(const file of files){
        if(file.size<1 || file.size>3*1024*1024 || !/\.(jpe?g|png|webp)$/i.test(file.name) ||
          (file.type!=="" && !["image/jpeg","image/png","image/webp"].includes(file.type))){
          failures.push(`${file.name}: فقط تصویر JPG، PNG یا WEBP تا ۳ مگابایت مجاز است.`);
          continue;
        }
        try{
          const form=new FormData();
          form.set("targetEntity",targetEntity);
          form.set("targetRecordId",String(targetRecordId));
          form.set("description","");
          form.set("file",file);
          await dataRows<unknown>(scope!=="OSTAN"?"/Api/TahghighV2/DocumentAttachments":"/Api/TahghighV2/ProvinceInvestigatorDocuments",{method:"POST",body:form});
          uploaded++;
        }catch(e){
          failures.push(`${file.name}: ${e instanceof Error?e.message:"ثبت ناموفق بود."}`);
        }
      }
      if(uploaded>0){
        showToast.success(`${uploaded.toLocaleString("fa-IR")} تصویر ذخیره شد.`,"اسناد تحقیق");
        try{await reload();}
        catch(e){failures.push(`بازخوانی تصاویر: ${e instanceof Error?e.message:"ناموفق بود."}`);}
      }
      if(failures.length)setError(failures.join(" | "));
    }finally{
      uploadLock.current=false;
      setBusy(false);
    }
  }
  // Render independent image-pickers in both the compact panel and the gallery.
  function uploadPicker(compact=false){
    if(readOnly)return null;
    return <label className={`${s.quickUpload} ${compact?s.compactUpload:""}`} title="افزودن تصویر؛ بارگذاری خودکار، حداکثر ۳ مگابایت برای هر تصویر">
      <span aria-hidden="true">＋</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple
        aria-label="انتخاب تصاویر برای بارگذاری خودکار" disabled={busy||loading||!!error}
        onChange={e=>{
          const files=Array.from(e.currentTarget.files||[]);
          e.currentTarget.value="";
          if(files.length)void upload(files);
        }}/>
    </label>;
  }
  async function remove(){
    if(!deleteId||busy)return;
    setBusy(true);setError("");
    try{
      await dataRows<unknown>(fileUrl(deleteId,false,scope),{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
      const updated=await reload();
      if(selected===deleteId) {
        if(updated.length===0) closePreview();
        else switchTo(updated[0].AttachmentId);
      }
      setDeleteId(null);showToast.success("پیوست حذف منطقی شد.","پیوست تحقیق");
    }catch(e){setError(e instanceof Error?e.message:"حذف پیوست ناموفق بود.");}
    finally{setBusy(false);}
  }
  // Attach a non-passive wheel listener: React's delegated wheel events can be passive.
  // The browser must not scroll the page or zoom its own viewport while the image is open.
  useEffect(()=>{
    if(!previewOpen||!activeImage)return;
    const stage=stageRef.current;
    if(!stage)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();
      event.stopPropagation();
      const factor=Math.exp(-event.deltaY*(event.deltaMode === 1 ? 0.045 : event.deltaMode === 2 ? 0.35 : 0.002));
      zoomBy(factor,event.clientX,event.clientY);
    };
    stage.addEventListener("wheel",wheel,{passive:false});
    return ()=>stage.removeEventListener("wheel",wheel);
  },[previewOpen,active?.AttachmentId,activeImage,zoomBy]);
  useEffect(()=>{
    if(!previewOpen)return;
    const resize=()=>setView(current=>clampView(current));
    window.addEventListener("resize",resize);
    return ()=>window.removeEventListener("resize",resize);
  },[previewOpen,clampView]);
  function onPointerDown(e:ReactPointerEvent<HTMLDivElement>){
    if(e.button!==0||e.target!==e.currentTarget||view.scale<=1||!active||!isImage(active))return;
    e.preventDefault();
    drag.current={pointerId:e.pointerId,x:e.clientX,y:e.clientY,startX:view.x,startY:view.y};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e:ReactPointerEvent<HTMLDivElement>){
    const start=drag.current;
    if(!start||start.pointerId!==e.pointerId)return;
    e.preventDefault();
    setView(current=>clampView({scale:current.scale,x:start.startX+e.clientX-start.x,y:start.startY+e.clientY-start.y}));
  }
  function onPointerEnd(e:ReactPointerEvent<HTMLDivElement>){
    if(drag.current?.pointerId!==e.pointerId)return;
    drag.current=null;
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const caption=targetEntity==="RESEARCH_WORKSHEET"?"اسناد کاربرگ":"تصاویر جمع‌بندی محقق";
  return <section dir="rtl" className={s.evidence} aria-label={caption}>
    <div className={s.compactBar}>
      <div className={s.compactHeading}>
        <strong>{caption}</strong>
        <span>{loading?"در حال دریافت…":error?"بارگذاری ناموفق":`${items.length.toLocaleString("fa-IR")} فایل`}</span>
      </div>
      <div className={s.compactThumbnails} aria-label="نوار اسناد اصلی و صفحات جمع‌بندی">
        <div className={s.compactMainDocs} role="list" aria-label="اسناد اصلی">
          {!loading&&items.map(doc=><button type="button" key={doc.AttachmentId} role="listitem" onClick={()=>openPreview(doc.AttachmentId)} title={doc.OriginalFileName} aria-label={`باز کردن ${doc.OriginalFileName}`}>
            {isImage(doc)?<img src={fileUrl(doc.AttachmentId,false,scope)} alt="" loading="lazy"/>:<span>PDF</span>}
          </button>)}
        </div>
        {!loading&&summaryPages.length>0&&<>
          <span className={s.compactDivider} aria-hidden="true"/>
          <div className={s.compactSummaryDocs} role="list" aria-label="صفحات جمع‌بندی">
            {summaryPages.map(doc=><button type="button" role="listitem" key={doc.AttachmentId} className={s.compactSummaryDoc} onClick={()=>openPreview(doc.AttachmentId)} title={doc.AttachmentDescription?.startsWith("[WS-SUMMARY-2]")?"جمع‌بندی، صفحه دوم":"جمع‌بندی، صفحه اول"} aria-label={doc.AttachmentDescription?.startsWith("[WS-SUMMARY-2]")?"باز کردن صفحه دوم جمع‌بندی":"باز کردن صفحه اول جمع‌بندی"}>
              {isImage(doc)?<img src={fileUrl(doc.AttachmentId,false,scope)} alt="" loading="lazy"/>:<span>PDF</span>}
            </button>)}
          </div>
        </>}
        {!loading&&!error&&items.length===0&&summaryPages.length===0&&<span className={s.noFiles}>هنوز پیوستی ثبت نشده</span>}
      </div>
      <div className={s.compactActions}>
        {uploadPicker(true)}
        <button type="button" className={s.galleryButton} onClick={openGallery} disabled={loading||!!error} aria-label={`نمایش و مدیریت ${caption}`}>
          نمایش تصاویر
        </button>
      </div>
    </div>
    {error&&!galleryOpen&&<div className={s.errorRow} role="alert">
      <span>{error}</span>
      <button type="button" onClick={()=>void retryLoad()} disabled={busy||loading}>تلاش مجدد</button>
    </div>}
    {galleryOpen&&typeof document!=="undefined"&&createPortal(<div className={s.viewerBackdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)closeGallery();}}>
      <div className={s.viewer} role="dialog" aria-modal="true" aria-label={`${caption} ${investigatorName}`} dir="rtl">
        <div className={s.viewerHead}>
          <div><strong>{caption}</strong><small>{investigatorName} · {items.length.toLocaleString("fa-IR")} سند اصلی{summaryPages.length>0?` · ${summaryPages.length.toLocaleString("fa-IR")} صفحه جمع‌بندی`:""}</small></div>
          <div className={s.viewerControls}>
            {uploadPicker()}
            {busy&&<span className={s.uploadStatus} role="status">در حال بارگذاری…</span>}
            <button ref={closeButton} type="button" onClick={closeGallery} aria-label="بستن گالری" disabled={busy}>بستن ×</button>
          </div>
        </div>
        {error&&<p className={s.error} role="alert">{error}</p>}
        <div className={s.ribbon} aria-label="نوار تصاویر اصلی و جمع‌بندی">
          <div className={s.ribbonGroup} role="list" aria-label="اسناد اصلی">
            {items.length===0&&<p className={s.muted}>هنوز سند اصلی ثبت نشده است.</p>}
            {items.map((doc,i)=><div role="listitem" className={s.ribbonItem} key={doc.AttachmentId}>
              <button type="button" className={s.ribbonPreview} onClick={()=>openPreview(doc.AttachmentId)} aria-label={`نمایش بزرگ ${doc.OriginalFileName}`} title={`نمایش بزرگ ${doc.OriginalFileName}`}>
                {isImage(doc)?<img src={fileUrl(doc.AttachmentId,false,scope)} alt="" loading="lazy"/>:<span className={s.pdfSymbol}>PDF</span>}
                <span className={s.sequence}>{(i+1).toLocaleString("fa-IR")}</span>
              </button>
              <span className={s.ribbonName} title={doc.OriginalFileName}>{doc.OriginalFileName}</span>
              {!readOnly&&<button type="button" className={s.ribbonDelete} onClick={()=>setDeleteId(doc.AttachmentId)} disabled={busy} aria-label={`حذف ${doc.OriginalFileName}`} title="حذف پیوست">×</button>}
            </div>)}
          </div>

        </div>
        {targetEntity==="RESEARCH_WORKSHEET"&&<WorksheetSummaryDocuments
          worksheetId={targetRecordId} scope={scope} readOnly={readOnly} onChange={()=>{void reload().catch(e=>setError(e instanceof Error?e.message:"خطا در بازخوانی تصاویر"));}}/>} 
      </div>
    </div>,document.body)}
    {previewOpen&&active&&typeof document!=="undefined"&&createPortal(<div className={`${s.viewerBackdrop} ${s.previewBackdrop}`} role="presentation">
      <div className={`${s.viewer} ${s.previewDialog}`} role="dialog" aria-modal="true" aria-label={`نمایش بزرگ ${active.OriginalFileName}`} dir="rtl">
        <div className={s.previewToolbar}>
          <div className={s.previewInfo} title={active.OriginalFileName}>
            <strong>{active.OriginalFileName}</strong>
            <small>{(previewIndex+1).toLocaleString("fa-IR")} از {galleryItems.length.toLocaleString("fa-IR")}</small>
          </div>
          <div className={s.viewerControls}>
            {isImage(active)&&<>
              <button type="button" title="کوچک‌نمایی" aria-label="کوچک‌نمایی" onClick={()=>zoomBy(1/1.25)} disabled={view.scale<=1}>−</button>
              <span aria-live="polite">{Math.round(view.scale*100)}٪</span>
              <button type="button" title="بزرگ‌نمایی" aria-label="بزرگ‌نمایی" onClick={()=>zoomBy(1.25)} disabled={view.scale>=6}>＋</button>
              <button type="button" title="بازنشانی زوم" aria-label="بازنشانی زوم" onClick={resetView}>↺</button>
            </>}
            <a href={fileUrl(active.AttachmentId,true,scope)} title="دریافت فایل" aria-label="دریافت فایل">↓</a>
            {!readOnly&&!activeIsSummary&&<button type="button" className={s.deleteAction} title="حذف پیوست" aria-label="حذف پیوست" onClick={()=>{setDeleteId(active.AttachmentId);}}>حذف</button>}
            <button ref={previewCloseButton} type="button" className={s.previewClose} onClick={closePreview} aria-label="بستن نمایش بزرگ" title="بستن (Esc)">×</button>
          </div>
        </div>
        <div ref={stageRef} className={s.viewerStage}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
          onDoubleClick={e=>{
            if(e.target!==e.currentTarget||!isImage(active))return;
            e.preventDefault();
            if(view.scale>1)resetView();else zoomBy(2.5,e.clientX,e.clientY);
          }}
          style={{cursor:isImage(active)?(view.scale>1?(drag.current?"grabbing":"grab"):"zoom-in"):"default"}}>
          {isImage(active)?<img ref={imageRef} key={active.AttachmentId} src={fileUrl(active.AttachmentId,false,scope)} alt={active.OriginalFileName}
            className={s.previewImage} draggable={false}
            style={{transform:`translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,transition:drag.current?"none":undefined}}/>:
            <iframe key={active.AttachmentId} title={active.OriginalFileName} src={fileUrl(active.AttachmentId,false,scope)} className={s.pdfPreview}/>}
          {galleryItems.length>1&&<>
            <button type="button" className={`${s.sideButton} ${s.prev}`} onClick={()=>move(-1)} aria-label="سند قبلی" title="سند قبلی">‹</button>
            <button type="button" className={`${s.sideButton} ${s.next}`} onClick={()=>move(1)} aria-label="سند بعدی" title="سند بعدی">›</button>
          </>}
        </div>
        {active.AttachmentDescription?.trim()&&<div className={s.previewCaption} title={active.AttachmentDescription}>{active.AttachmentDescription}</div>}
      </div>
    </div>,document.body)}
    {deleteId&&typeof document!=="undefined"&&createPortal(<div className={`${s.viewerBackdrop} ${s.deleteBackdrop}`} role="presentation">
      <div className={s.deleteDialog} role="dialog" aria-modal="true" aria-label="حذف پیوست" dir="rtl">
        <h3>حذف پیوست</h3><p>فایل به‌صورت منطقی حذف می‌شود و سوابق آن باقی می‌ماند.</p>
        <div className={s.dialogActions}><button type="button" onClick={()=>setDeleteId(null)} disabled={busy}>انصراف</button>
          <button type="button" className={s.remove} disabled={busy} onClick={()=>void remove()}>تأیید حذف</button></div>
      </div>
    </div>,document.body)}
  </section>;
}

// The old form's editable final section is the sole source of the saved text
// and of the generated image. Both are scoped to ONE ResearchAssignment.
export function ProvinceInvestigatorSummary({assignmentId,investigatorName,readOnly=false,scope="OSTAN",onSaved}: {
  assignmentId:number;investigatorName:string;readOnly?:boolean;scope?:EvidenceScope;onSaved?:()=>Promise<void>;
}) {
  const [text,setText]=useState("");
  const [savedText,setSavedText]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [canWrite,setCanWrite]=useState(false);
  const [identity,setIdentity]=useState<SummaryIdentity>({});
  const [worksheets,setWorksheets]=useState<SummaryWorksheet[]>([]);
  const [reportOpen,setReportOpen]=useState(false);
  const [refreshKey,setRefreshKey]=useState(0);
  const [imagePending,setImagePending]=useState(false);
  const [replaceApprovalIds,setReplaceApprovalIds]=useState<string[]|null>(null);
  const snapshotRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError("");setText("");setSavedText("");setIdentity({});
    setWorksheets([]);setReportOpen(false);setImagePending(false);setReplaceApprovalIds(null);
    void Promise.all([
      dataRows<Array<{SummaryText:string;CanWrite:boolean|number}>>(`/Api/TahghighV2/${scope==="COUNTY"?"CountyInvestigatorSummary":scope==="HOZE"?"HozeInvestigatorSummary":"ProvinceInvestigatorSummary"}?assignmentId=${assignmentId}`,{signal:controller.signal}),
      dataRows<SummaryIdentity[]>(scope!=="OSTAN"
        ? `/Api/TahghighV2/${scope==="COUNTY"?"CountyInvestigatorSummary":"HozeInvestigatorSummary"}?kind=report&assignmentId=${assignmentId}`
        : `/Api/TahghighV2/ProvinceInvestigatorReport?assignmentId=${assignmentId}`,{signal:controller.signal}),
      dataRows<SummaryWorksheet[]>(`/Api/TahghighV2/${scope==="COUNTY"?"CountyInvestigatorWorksheet":scope==="HOZE"?"HozeInvestigatorWorksheet":"ProvinceInvestigatorWorksheet"}?assignmentId=${assignmentId}`,{signal:controller.signal})
    ]).then(([summary,identities,work])=>{
      if(controller.signal.aborted)return;
      const original=summary[0]?.SummaryText||"";
      setText(original);setSavedText(original);
      setCanWrite(Boolean(summary[0]?.CanWrite));
      if(!identities.length)throw new Error("دسترسی به مشخصات داوطلب در این انتساب وجود ندارد.");
      setIdentity(identities[0]);setWorksheets(work||[]);
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"خطای دریافت فرم جمع‌بندی");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[assignmentId,scope]);

  useEffect(()=>{
    if(!reportOpen)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape"&&!busy){
        event.preventDefault();
        if(replaceApprovalIds!==null)setReplaceApprovalIds(null);
        else setReportOpen(false);
      }
    };
    document.addEventListener("keydown",onEscape);
    return ()=>{document.body.style.overflow=previous;document.removeEventListener("keydown",onEscape);};
  },[reportOpen,busy,replaceApprovalIds]);

  async function exportReport():Promise<File>{
    const node=snapshotRef.current?.firstElementChild as HTMLElement | null;
    if(!node)throw new Error("برگه چاپی جمع‌بندی آماده نیست.");
    if(document.fonts?.ready)await document.fonts.ready;
    // Wait for React to commit the newest text before capturing the immutable
    // read-only sheet. Never capture form controls, buttons or the main modal.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    // Both official header images must be loaded before taking a PNG snapshot.
    // Do not attach an incomplete official document if either file is absent.
    const officialImages: { selector: string; filename: string }[] = [
      {selector: 'img[data-merat-summary-logo="true"]', filename: "Mohr1.png"},
      {selector: 'img[data-merat-summary-heading="true"]', filename: "JambandiMohaghegh.PNG"},
    ];
    for (const {selector, filename} of officialImages) {
      const img=node.querySelector<HTMLImageElement>(selector);
      if(!img)throw new Error(`تصویر ${filename} در سربرگ جمع‌بندی پیدا نشد.`);
      try {
        await img.decode();
      } catch {
        throw new Error(`بارگذاری تصویر ${filename} ناموفق بود؛ فایل را در مسیر public/logo/karbargmohaghegh بررسی کنید.`);
      }
      if(img.naturalWidth===0||img.naturalHeight===0) {
        throw new Error(`تصویر ${filename} معتبر نیست یا در مسیر public/logo/karbargmohaghegh وجود ندارد.`);
      }
    }
    // Original Merat (ErjaMohaghegh.tsx): exportNodeToPNGFile uses
    // dom-to-image.toPng with scale=3 and the original sheet dimensions.
    // The shared compatibility renderer now uses its original SVG data-URL
    // strategy, avoiding tainted canvas caused by blob: SVGs.
    const width=node.scrollWidth,height=node.scrollHeight;
    if(width<100||height<100)throw new Error("اندازه برگه جمع‌بندی معتبر نیست.");
    const scale=3;
    const pngData=await domtoimage.toPng(node,{
      width:width*scale,
      height:height*scale,
      style:{
        transform:`scale(${scale})`,
        transformOrigin:"top left",
        width:`${width}px`,
        height:`${height}px`,
      },
      bgcolor:"#ffffff",
    });
    // Same dataUrlToFile conversion as the original report (Blob -> File).
    const png=await (await fetch(pngData)).blob();
    const maxBytes=3*1024*1024;
    if(png.size<=maxBytes)return new File([png],`JambandiMohaghegh_${assignmentId}.png`,{type:"image/png"});
    // Long reports can produce a >3MB PNG. Compress without cropping content.
    const bitmap=await createImageBitmap(png);
    try{
      const canvas=document.createElement("canvas");
      canvas.width=bitmap.width;canvas.height=bitmap.height;
      canvas.getContext("2d")?.drawImage(bitmap,0,0);
      for(const quality of [0.91,0.83,0.7]){
        const jpeg=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
        if(jpeg && jpeg.size<=maxBytes)return new File([jpeg],`JambandiMohaghegh_${assignmentId}.jpg`,{type:"image/jpeg"});
      }
    }finally{bitmap.close();}
    throw new Error("تصویر فرم بیش از ۳ مگابایت است. متن را به چند بخش کوتاه‌تر تقسیم کنید.");
  }

  const summaryEndpoint=scope==="COUNTY"?"/Api/TahghighV2/CountyInvestigatorSummary"
    :scope==="HOZE"?"/Api/TahghighV2/HozeInvestigatorSummary"
    :"/Api/TahghighV2/ProvinceInvestigatorSummary";
  const documentListEndpoint=`/Api/TahghighV2/${scope==="OSTAN"?"ProvinceInvestigatorDocuments":"DocumentAttachments"}?targetEntity=RESEARCH_ASSIGNMENT&targetRecordId=${assignmentId}`;

  // Temporary save deliberately does not render, upload, or replace a document.
  async function saveDraft(){
    if(text.trim().length<50||text.length>12000||busy||readOnly||!canWrite)return;
    setBusy(true);setError("");
    try{
      await dataRows<unknown>(summaryEndpoint,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({assignmentId,summaryText:text.trim()})
      });
      setSavedText(text.trim());
      setImagePending(true);
      setReportOpen(false);
      try { if(onSaved)await onSaved(); } catch { /* The text was already persisted. */ }
      showToast.success("متن جمع‌بندی موقت ذخیره شد؛ تصویری تولید یا جایگزین نشد.","ذخیره موقت");
    }catch(e){setError(e instanceof Error?e.message:"ذخیره موقت انجام نشد.");}
    finally{setBusy(false);}
  }

  // Replace documents only after explicit approval; the database operation
  // validates the exact acknowledged document IDs to prevent stale deletions.
  async function commitFinal(oldIds:string[]){
    setReplaceApprovalIds(null);
    setBusy(true);setError("");
    let textSaved=false;
    try{
      await dataRows<unknown>(summaryEndpoint,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({assignmentId,summaryText:text.trim()})
      });
      textSaved=true;
      setSavedText(text.trim());setImagePending(true);
      const file=await exportReport();
      const data=new FormData();
      data.set("assignmentId",String(assignmentId));
      data.set("scope",scope);
      data.set("expectedAttachmentIds",oldIds.join(","));
      data.set("file",file);
      await dataRows<unknown>("/Api/TahghighV2/InvestigatorSummaryReplaceImage",{method:"POST",body:data});
      setImagePending(false);
      setRefreshKey(x=>x+1);
      setReportOpen(false);
      try { if(onSaved)await onSaved(); } catch { /* Image and summary already saved. */ }
      showToast.success(oldIds.length
        ?"تصویر جدید ثبت و اسناد قبلی با تأیید شما جایگزین شدند."
        :"جمع‌بندی و تصویر نهایی ثبت شدند.",
        scope==="COUNTY"?"تحقیقات شهرستان":scope==="HOZE"?"تحقیقات حوزه":"تحقیقات استان");
    }catch(e){
      const reason=e instanceof Error?e.message:"ثبت جمع‌بندی انجام نشد.";
      setError(textSaved?`متن جمع‌بندی ذخیره شد، ولی جایگزینی تصویر انجام نشد و اسناد قبلی حفظ شدند: ${reason}`:reason);
    }finally{setBusy(false);}
  }

  async function save(){
    if(text.trim().length<50||text.length>12000||busy||readOnly||!canWrite||replaceApprovalIds!==null)return;
    setBusy(true);setError("");
    let oldIds:string[];
    try{
      const previous=await dataRows<DocumentItem[]>(documentListEndpoint);
      oldIds=previous.filter(x=>x.AttachmentKind==="SUMMARY" && x.SummaryLevel==="INVESTIGATOR").map(x=>x.AttachmentId);
    }catch(e){
      setError(e instanceof Error?e.message:"بررسی اسناد قبلی انجام نشد؛ هیچ سندی حذف نشد.");
      setBusy(false);
      return;
    }
    setBusy(false);
    if(oldIds.length){
      setReplaceApprovalIds(oldIds);
      return;
    }
    await commitFinal([]);
  }
  return <section dir="rtl" className={s.summary}>
    <div className={s.sectionTitle}><strong>جمع‌بندی محقق</strong><small>{investigatorName}</small></div>
    {error&&<p role="alert" className={s.error}>{error}</p>}
    {loading?<p className={s.muted}>در حال دریافت فرم و اطلاعات پرونده…</p>:<div className={s.summaryLayout}>
      <div className={s.summaryEditorArea}>
        <div className={s.summarySavedTitle}>متن جمع‌بندی ثبت‌شده</div>
        <div className={s.summarySavedText}>{savedText.trim()||"هنوز جمع‌بندی برای این محقق ثبت نشده است."}</div>
      </div>
      <div className={s.summaryBelow}>
        <div className={s.summaryFormActions}>
          {!readOnly&&canWrite&&<button type="button" className={s.primary} onClick={()=>setReportOpen(true)} disabled={busy||!identity.ShomarehParvandeh}>
            {savedText?"مشاهده و ویرایش فرم جمع‌بندی":"تکمیل فرم جمع‌بندی محقق"}
          </button>}
          {imagePending&&<p className={s.summaryImageWarning}>متن به‌صورت موقت ذخیره شده است؛ برای تولید و جایگزینی تصویر، فرم را باز کنید و «تأیید و بستن» را انتخاب کنید.</p>}
          {readOnly&&<button type="button" className={s.primary} onClick={()=>setReportOpen(true)} disabled={!identity.ShomarehParvandeh}>مشاهده فرم جمع‌بندی</button>}
        </div>
        <div className={s.summaryAttachmentArea}>
          <ProvinceInvestigatorEvidence key={`${assignmentId}-${refreshKey}`} targetEntity="RESEARCH_ASSIGNMENT"
            targetRecordId={assignmentId} investigatorName={investigatorName} readOnly={readOnly||!canWrite} scope={scope}/>
        </div>
      </div>
    </div>}
    {/* Off-screen but laid-out clone for faithful PNG export. No form controls
        are included in the generated image. */}
    {!loading&&<div className={s.reportCapture} ref={snapshotRef} aria-hidden="true">
      <InvestigatorSummarySheet identity={identity} worksheets={worksheets} investigatorName={investigatorName}
        assignmentId={assignmentId} summaryText={text.trim()}/>
    </div>}
    {reportOpen&&typeof document!=="undefined"&&createPortal(<div className={s.summaryReportBackdrop} role="presentation">
      <div className={s.summaryReportDialog} role="dialog" aria-modal="true" aria-label="فرم جمع‌بندی محقق" dir="rtl">
        <div className={s.summaryReportToolbar}>
          <strong>فرم جمع‌بندی محقق</strong>
          <div>
            {!readOnly&&canWrite&&<button type="button" disabled={busy||text.trim().length<50||text.length>12000} onClick={()=>void saveDraft()} aria-label="ذخیره موقت متن جمع‌بندی بدون ایجاد تصویر">
              {busy?"در حال ذخیره…":"ذخیره موقت (بدون تصویر)"}
            </button>}
            {!readOnly&&canWrite&&<button type="button" className={s.confirmClose} disabled={busy||text.trim().length<50||text.length>12000} onClick={()=>void save()} aria-label="تأیید نهایی؛ تأیید جایگزینی اسناد قدیمی در صورت وجود">
              {busy?"در حال ثبت متن و تصویر…":"✓ تأیید و بستن"}
            </button>}
            <button type="button" disabled={busy} onClick={()=>setReportOpen(false)}>بستن</button>
          </div>
        </div>
        <div className={s.summaryReportScroll}>
          <InvestigatorSummarySheet identity={identity} worksheets={worksheets} investigatorName={investigatorName}
            assignmentId={assignmentId} summaryText={text} onChange={setText} editable={!readOnly&&canWrite}/>
          {!readOnly&&canWrite&&<small>ذخیره موقت فقط متن را ثبت می‌کند. تأیید نهایی تصویر را تولید می‌کند و اگر سند قبلی وجود داشته باشد، پیش از جایگزینی از شما تأیید می‌گیرد.</small>}
        </div>
        {error&&<p role="alert" className={s.error}>{error}</p>}
      </div>
    </div>,document.body)}
    {replaceApprovalIds!==null&&typeof document!=="undefined"&&createPortal(
      <div className={s.summaryReplaceBackdrop} role="presentation">
        <div role="alertdialog" aria-modal="true" aria-labelledby="summary-replace-title"
          aria-describedby="summary-replace-description" className={s.summaryReplaceDialog} dir="rtl">
          <div className={s.summaryReplaceTitle}>
            <span aria-hidden="true">⚠</span>
            <strong id="summary-replace-title">تأیید جایگزینی اسناد جمع‌بندی</strong>
          </div>
          <div className={s.summaryReplaceBody} id="summary-replace-description">
            برای جمع‌بندی این محقق <b>{replaceApprovalIds.length.toLocaleString("fa-IR")} سند قبلی</b> ثبت شده است.
            آیا اسناد قبلی به‌صورت منطقی حذف و تصویر جمع‌بندی جدید جایگزین شوند؟
            <small>سوابق حذف حفظ می‌شوند. تصاویر کاربرگ‌ها و سایر پرونده‌ها تغییر نمی‌کنند.</small>
          </div>
          <div className={s.summaryReplaceActions}>
            <button type="button" autoFocus disabled={busy} onClick={()=>setReplaceApprovalIds(null)}>انصراف</button>
            <button type="button" className={s.summaryReplaceConfirm} disabled={busy}
              onClick={()=>{const ids=replaceApprovalIds;if(ids)void commitFinal(ids);}}>
              تأیید و جایگزینی
            </button>
          </div>
        </div>
      </div>,document.body)}
  </section>;
}
