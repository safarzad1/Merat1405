"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import styles from "./Profile.module.css";

type Profile = {
  userId:string; fullName:string; nationalCode:string; mobile:string;
  position:string; location:string; hasSignature:boolean; signatureUpdatedAtUtc:string|null;
};

const W=960, H=320;
const noCache:RequestInit={credentials:"same-origin",cache:"no-store"};

async function responseMessage(res:Response, fallback:string) {
  try {const body=await res.json() as {message?:string;error?:string}; return body.message || body.error || fallback;}
  catch {return fallback;}
}

export default function ProfileClient() {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [saving,setSaving]=useState(false);
  const [avatarVersion,setAvatarVersion]=useState(0);
  const [avatarUnavailable,setAvatarUnavailable]=useState(false);
  const [photoSaving,setPhotoSaving]=useState(false);
  const [photoError,setPhotoError]=useState("");
  const [photoNotice,setPhotoNotice]=useState("");
  const photoPickerRef=useRef<HTMLInputElement|null>(null);
  const [currentPassword,setCurrentPassword]=useState("");
  // Keep the current-password field empty until the user deliberately focuses it.
  // This also prevents old browser/password-manager autofill values being mistaken for user input.
  const [currentPasswordActivated,setCurrentPasswordActivated]=useState(false);
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [passwordVisible,setPasswordVisible]=useState(false);
  const [passwordSaving,setPasswordSaving]=useState(false);
  const [passwordError,setPasswordError]=useState("");
  const [passwordNotice,setPasswordNotice]=useState("");
  const [hasDraft,setHasDraft]=useState(false);
  const [storedImage,setStoredImage]=useState<string|null>(null);
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const pointerRef=useRef<number|null>(null);
  const imageUrlRef=useRef<string|null>(null);
  const uploaderRef=useRef<HTMLInputElement|null>(null);

  const resetCanvas=useCallback(() => {
    const canvas=canvasRef.current;
    if (!canvas) return;
    const ctx=canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle="#fff";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.lineCap="round";
    ctx.lineJoin="round";
    ctx.lineWidth=3;
    ctx.strokeStyle="#17233f";
    pointerRef.current=null;
    setHasDraft(false);
  },[]);

  const loadSignature=useCallback(async () => {
    const res=await fetch("/Api/Users/MySignature",noCache);
    if (!res.ok) {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current=null;
      setStoredImage(null);
      if (res.status !== 404) throw new Error(await responseMessage(res,"دریافت تصویر امضا ممکن نشد."));
      return;
    }
    const url=URL.createObjectURL(await res.blob());
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    imageUrlRef.current=url;
    setStoredImage(url);
  },[]);

  const loadProfile=useCallback(async () => {
    const res=await fetch("/Api/Users/MyProfile",noCache);
    if (!res.ok) throw new Error(await responseMessage(res,"دریافت اطلاعات پروفایل ممکن نشد."));
    const body=await res.json() as {ok?:boolean;profile?:Profile};
    if (!body.ok || !body.profile) throw new Error("اطلاعات حساب معتبر نیست.");
    setProfile(body.profile);
    await loadSignature();
  },[loadSignature]);

  useEffect(() => {
    let live=true;
    setLoading(true);
    loadProfile().catch((e:unknown)=>{if(live)setError(e instanceof Error?e.message:"خطای دریافت اطلاعات");})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;if(imageUrlRef.current)URL.revokeObjectURL(imageUrlRef.current);imageUrlRef.current=null;};
  },[loadProfile]);

  useEffect(() => {
    if (profile) resetCanvas();
  },[profile?.userId,resetCanvas]);

  const locationInCanvas=(ev:ReactPointerEvent<HTMLCanvasElement>)=>{
    const canvas=ev.currentTarget;
    const rect=canvas.getBoundingClientRect();
    return {x:(ev.clientX-rect.left)*canvas.width/rect.width,y:(ev.clientY-rect.top)*canvas.height/rect.height};
  };
  const startStroke=(event:ReactPointerEvent<HTMLCanvasElement>)=>{
    if(saving || (event.pointerType==="mouse"&&event.button!==0))return;
    event.preventDefault();
    const canvas=event.currentTarget;
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    const p=locationInCanvas(event);
    canvas.setPointerCapture(event.pointerId);
    pointerRef.current=event.pointerId;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+0.2,p.y+0.2);ctx.stroke();
    setHasDraft(true);setError("");setNotice("");
  };
  const moveStroke=(event:ReactPointerEvent<HTMLCanvasElement>)=>{
    if(pointerRef.current!==event.pointerId)return;
    event.preventDefault();
    const ctx=event.currentTarget.getContext("2d");
    if(!ctx)return;
    const p=locationInCanvas(event);
    ctx.lineTo(p.x,p.y);ctx.stroke();
  };
  const finishStroke=(event:ReactPointerEvent<HTMLCanvasElement>)=>{
    if(pointerRef.current!==event.pointerId)return;
    pointerRef.current=null;
    event.currentTarget.getContext("2d")?.closePath();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const importFile=async (event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    event.target.value="";
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>3*1024*1024){
      setError("تصویر PNG، JPG یا WEBP با حجم حداکثر ۳ مگابایت انتخاب کنید.");return;
    }
    try {
      const bitmap=await createImageBitmap(file);
      try {
        if (bitmap.width > 5000 || bitmap.height > 5000) throw new Error("ابعاد تصویر انتخاب‌شده بیش از حد مجاز است.");
        const canvas=canvasRef.current;
        const ctx=canvas?.getContext("2d");
        if(!canvas||!ctx)throw new Error("بوم امضا آماده نیست.");
        ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);
        const scale=Math.min((W-44)/bitmap.width,(H-35)/bitmap.height,1);
        const w=bitmap.width*scale,h=bitmap.height*scale;
        ctx.drawImage(bitmap,(W-w)/2,(H-h)/2,w,h);
        ctx.strokeStyle="#17233f";ctx.lineWidth=3;ctx.lineCap="round";ctx.lineJoin="round";
        setHasDraft(true);setError("");setNotice("");
      } finally {bitmap.close();}
    } catch {setError("خواندن تصویر انتخاب‌شده امکان‌پذیر نیست.");}
  };

  const save=async()=>{
    const canvas=canvasRef.current;
    if(!canvas||!hasDraft||saving)return;
    setSaving(true);setError("");setNotice("");
    try {
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("تولید تصویر امضا ناموفق بود.")),"image/png"));
      if(blob.size>524288)throw new Error("تصویر امضا بیش از ۵۱۲ کیلوبایت است؛ تصویر ساده‌تری ثبت کنید.");
      const form=new FormData();
      form.append("signature",new File([blob],"signature.png",{type:"image/png"}));
      const res=await fetch("/Api/Users/MySignature",{method:"POST",body:form,credentials:"same-origin",cache:"no-store"});
      if(!res.ok)throw new Error(await responseMessage(res,"ثبت امضا ممکن نشد."));
      await loadProfile();
      resetCanvas();
      setNotice("امضای شما با موفقیت در پروفایل ثبت شد.");
    } catch(e) {setError(e instanceof Error?e.message:"خطای ثبت امضا");}
    finally {setSaving(false);}
  };


  const updatePhoto=async (event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    event.target.value="";
    if(!file||photoSaving)return;
    setPhotoError("");setPhotoNotice("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){
      setPhotoError("تصویر JPG، PNG یا WEBP با حجم کمتر از ۵ مگابایت انتخاب کنید.");return;
    }
    setPhotoSaving(true);
    try{
      const bitmap=await createImageBitmap(file);
      let blob:Blob;
      try{
        if(bitmap.width>5500||bitmap.height>5500)throw new Error("ابعاد تصویر انتخاب‌شده بیش از حد مجاز است.");
        const canvas=document.createElement("canvas");
        canvas.width=512;canvas.height=512;
        const ctx=canvas.getContext("2d");
        if(!ctx)throw new Error("پردازش تصویر ممکن نیست.");
        const side=Math.min(bitmap.width,bitmap.height);
        ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,512,512);
        blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("تبدیل تصویر ناموفق بود.")),"image/jpeg",.88));
      }finally{bitmap.close();}
      if(blob.size>2*1024*1024)throw new Error("حجم تصویر آماده‌شده بیش از حد مجاز است.");
      const form=new FormData();
      form.append("photo",new File([blob],"profile.jpg",{type:"image/jpeg"}));
      const response=await fetch("/Api/Users/MyAvatar",{method:"POST",body:form,credentials:"same-origin",cache:"no-store"});
      if(!response.ok)throw new Error(await responseMessage(response,"ثبت تصویر پروفایل ممکن نشد."));
      setAvatarUnavailable(false);
      setAvatarVersion(Date.now());
      window.dispatchEvent(new Event("merat-profile-photo-updated"));
      setPhotoNotice("تصویر پروفایل شما با موفقیت تغییر کرد.");
    }catch(e){setPhotoError(e instanceof Error?e.message:"خطای بارگذاری تصویر پروفایل");}
    finally{setPhotoSaving(false);}
  };

  const updatePassword=async(event:import("react").FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(passwordSaving)return;
    setPasswordError("");setPasswordNotice("");
    if(!currentPassword){setPasswordError("کلمه عبور فعلی را وارد کنید.");return;}
    if(newPassword.length<8){setPasswordError("کلمه عبور جدید باید حداقل ۸ نویسه باشد.");return;}
    if(newPassword!==confirmPassword){setPasswordError("تکرار کلمه عبور جدید مطابقت ندارد.");return;}
    if(newPassword===currentPassword){setPasswordError("رمز جدید باید با رمز فعلی تفاوت داشته باشد.");return;}
    setPasswordSaving(true);
    try{
      const res=await fetch("/Api/Users/MyPassword",{method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({currentPassword,newPassword,confirmPassword})});
      if(!res.ok)throw new Error(await responseMessage(res,"تغییر کلمه عبور انجام نشد."));
      setCurrentPassword("");setNewPassword("");setConfirmPassword("");
      setCurrentPasswordActivated(false);setPasswordVisible(false);
      setPasswordNotice("کلمه عبور با موفقیت تغییر کرد. از این پس با رمز جدید وارد شوید.");
    }catch(e){setPasswordError(e instanceof Error?e.message:"تغییر کلمه عبور انجام نشد.");}
    finally{setPasswordSaving(false);}
  };

  const fields:[string,string][] = profile?[
    ["نام و نام خانوادگی",profile.fullName], ["شناسه کاربری",profile.userId],
    ["کد ملی",profile.nationalCode], ["شماره همراه",profile.mobile],
    ["عنوان پست",profile.position], ["محل خدمت",profile.location],
  ]:[];

  return <div className={styles.wrapper} dir="rtl">
    <header className={styles.hero}>
      <div className={styles.heroIdentity}>
        <div className={styles.avatar}>
          {!avatarUnavailable && profile ? (
            // Photo is served only through an authenticated, same-origin endpoint.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={avatarVersion} src={`/Api/Users/MyAvatar?v=${avatarVersion}`} alt="تصویر پروفایل" onError={()=>setAvatarUnavailable(true)} />
          ) : <span aria-hidden="true">{profile?.fullName?.trim()?.charAt(0) || "م"}</span>}
          <button className={styles.avatarEdit} type="button" title="تغییر تصویر" aria-label="انتخاب تصویر پروفایل"
            onClick={()=>photoPickerRef.current?.click()} disabled={photoSaving || !profile}>✎</button>
        </div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>حساب کاربری من</span>
          <h1>{profile?.fullName || "پروفایل من"}</h1>
          <p>{profile ? [profile.position,profile.location].filter(Boolean).join(" · ") : "مدیریت مشخصات و تنظیمات شخصی"}</p>
          <div className={styles.heroLinks}>
            <a href="#merat-profile-photo">تغییر تصویر</a>
            <a href="#merat-profile-password">تغییر کلمه عبور</a>
            <a href="#merat-profile-signature">امضای من</a>
          </div>
        </div>
      </div>
      <div className={styles.heroCaption} aria-hidden="true"><span>مرآت</span><small>پروفایل کاربری</small></div>
    </header>
    {loading&&<p role="status" className={styles.message}>در حال دریافت اطلاعات پروفایل…</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    {profile&&<>
      <div className={styles.primaryGrid}>
        <section className={styles.panel} id="merat-profile-photo" aria-label="تغییر تصویر پروفایل">
          <div className={styles.sectionTitle}>
            <div className={styles.titleGroup}><span className={styles.titleIcon} aria-hidden="true">◉</span><div><h2>تصویر پروفایل</h2><p>تصویر حساب کاربری شما</p></div></div>
          </div>
          <div className={styles.photoBody}>
            <div className={styles.photoInfo}>
              <strong>تغییر تصویر حساب کاربری</strong>
              <p>تصویر فعلی در سربرگ پروفایل نمایش داده می‌شود. برای جایگزینی آن، تصویر JPG، PNG یا WEBP انتخاب کنید؛ تصویر به‌صورت مربعی و بهینه ذخیره می‌شود.</p>
              <input ref={photoPickerRef} type="file" className={styles.hiddenInput} accept="image/jpeg,image/png,image/webp"
                onChange={event=>{void updatePhoto(event);}} aria-label="فایل تصویر پروفایل" />
              <button type="button" className={styles.primary} disabled={photoSaving} onClick={()=>photoPickerRef.current?.click()}>
                {photoSaving?"در حال ذخیره تصویر…":"تغییر تصویر پروفایل"}
              </button>
            </div>
          </div>
          {photoError&&<p role="alert" className={styles.error}>{photoError}</p>}
          {photoNotice&&<p role="status" className={styles.success}>{photoNotice}</p>}
        </section>

        <section className={styles.panel} id="merat-profile-password" aria-label="تغییر کلمه عبور">
          <div className={styles.sectionTitle}>
            <div className={styles.titleGroup}><span className={styles.titleIcon} aria-hidden="true">♢</span><div><h2>امنیت حساب</h2><p>تغییر کلمه عبور ورود به سامانه</p></div></div>
          </div>
          <form onSubmit={event=>{void updatePassword(event);}} className={styles.passwordForm} autoComplete="off">
            <label htmlFor="merat-current-password">کلمه عبور فعلی</label>
            <input id="merat-current-password" name="merat-manual-current-password" type={passwordVisible?"text":"password"}
              autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              readOnly={!currentPasswordActivated}
              onFocus={event=>{
                if (!currentPasswordActivated) {
                  event.currentTarget.value="";
                  setCurrentPassword("");
                  setCurrentPasswordActivated(true);
                }
              }}
              value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)}
              placeholder="رمز فعلی خود را وارد کنید" maxLength={250} required />
            <div className={styles.passwordColumns}>
              <div><label htmlFor="merat-new-password">کلمه عبور جدید</label>
                <input id="merat-new-password" type={passwordVisible?"text":"password"} autoComplete="new-password"
                  value={newPassword} onChange={event=>setNewPassword(event.target.value)} placeholder="حداقل ۸ نویسه" maxLength={250} required minLength={8}/></div>
              <div><label htmlFor="merat-confirm-password">تکرار کلمه عبور جدید</label>
                <input id="merat-confirm-password" type={passwordVisible?"text":"password"} autoComplete="new-password"
                  value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} placeholder="تکرار رمز جدید" maxLength={250} required minLength={8}/></div>
            </div>
            <div className={styles.passwordFooter}>
              <label className={styles.showPassword}><input type="checkbox" checked={passwordVisible} onChange={event=>setPasswordVisible(event.target.checked)}/>نمایش کلمه عبور</label>
              <button type="submit" className={styles.primary} disabled={passwordSaving}>{passwordSaving?"در حال تغییر…":"ثبت کلمه عبور جدید"}</button>
            </div>
            <small className={styles.passwordHint}>حداقل ۸ نویسه، شامل عدد و حرف یا نماد. کلمه عبور فعلی را خودتان وارد کنید؛ هیچ رمزی از قبل در این فیلد قرار نمی‌گیرد.</small>
            {passwordError&&<p role="alert" className={styles.error}>{passwordError}</p>}
            {passwordNotice&&<p role="status" className={styles.success}>{passwordNotice}</p>}
          </form>
        </section>
      </div>

      <section className={styles.panel} aria-label="مشخصات کاربر">
        <div className={styles.sectionTitle}>
          <div className={styles.titleGroup}><span className={styles.titleIcon} aria-hidden="true">◎</span><div><h2>مشخصات فردی و سازمانی</h2><p>اطلاعات ثبت‌شده در سامانه مرآت</p></div></div>
          <span className={styles.readonlyTag}>فقط‌خواندنی</span>
        </div>
        <div className={styles.fields}>
          {fields.map(([title,value])=><div key={title} className={styles.field}>
            <span>{title}</span><strong dir={title==="کد ملی"||title==="شماره همراه"?"ltr":"auto"}>{value||"—"}</strong>
          </div>)}
        </div>
      </section>

      <section className={styles.panel} id="merat-profile-signature" aria-label="امضای کاربر">
        <div className={styles.sectionTitle}>
          <div className={styles.titleGroup}><span className={styles.titleIcon} aria-hidden="true">✍</span><div><h2>امضای شخصی</h2><p>رسم یا بارگذاری تصویر امضا</p></div></div>
          <span className={styles.readonlyTag}>{profile.hasSignature?"امضای ثبت‌شده":"فاقد امضا"}</span>
        </div>
        <p className={styles.hint}>امضای خود را با موس یا لمس رسم کنید، یا تصویر امضا را بارگذاری کنید. ثبت جدید جایگزین امضای قبلی می‌شود.</p>
        {storedImage&&<div className={styles.stored}>
          <div className={styles.storedHeading}>امضای فعلی</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={storedImage} alt="تصویر امضای ثبت‌شده کاربر" />
          {profile.signatureUpdatedAtUtc&&<small>آخرین ثبت: {new Date(profile.signatureUpdatedAtUtc).toLocaleString("fa-IR")}</small>}
        </div>}
        <div className={styles.signatureEditor}>
          <label htmlFor="merat-user-signature-canvas">ثبت امضای جدید</label>
          <canvas ref={canvasRef} id="merat-user-signature-canvas" width={W} height={H}
            aria-label="بوم رسم امضا با موس یا لمس"
            className={styles.canvas} onPointerDown={startStroke} onPointerMove={moveStroke}
            onPointerUp={finishStroke} onPointerCancel={finishStroke} onLostPointerCapture={()=>{pointerRef.current=null;}} />
          <input ref={uploaderRef} type="file" className={styles.hiddenInput} accept="image/png,image/jpeg,image/webp"
            onChange={event=>{void importFile(event);}} aria-label="انتخاب تصویر امضا" />
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} disabled={saving} onClick={()=>uploaderRef.current?.click()}>بارگذاری تصویر امضا</button>
            <button type="button" className={styles.secondary} disabled={saving||!hasDraft} onClick={resetCanvas}>پاک‌کردن کادر</button>
            <button type="button" className={styles.primary} disabled={saving||!hasDraft} onClick={()=>void save()}>{saving?"در حال ثبت…":"ذخیره امضا"}</button>
          </div>
        </div>
      </section>
    </>}
  </div>;
}
