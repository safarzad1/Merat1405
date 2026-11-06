import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAuthActor } from "@/lib/userScope";

export const dynamic="force-dynamic";
const headers={ "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" };
const LIMIT=8*1024*1024;
async function userId(req:NextRequest):Promise<number>{
 if(req.cookies.get("merat-new-session")?.value!=="1") throw new Error("UNAUTHORIZED");
 return (await getAuthActor(req.cookies.get("token")?.value)).userId;
}
function id(v:unknown){const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw new Error("شناسه فایل یا گزارش معتبر نیست.");return n;}
function typeFromSignature(b:Buffer):string|null{
 if(b.length>=8 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
 if(b.length>=3 && b[0]===255 && b[1]===216 && b[2]===255) return "image/jpeg";
 if(b.length>=12 && b.toString("ascii",0,4)==="RIFF" && b.toString("ascii",8,12)==="WEBP") return "image/webp";
 if(b.length>=5 && b.toString("ascii",0,5)==="%PDF-") return "application/pdf";
 return null;
}
function filename(name:string){return name.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f<>:"|?*]/g,"").trim().slice(0,180)||"document";}
function failure(err:unknown){
 console.error("TaskManagementV2 file operation",err);
 const msg=err instanceof Error?err.message:String(err);
 const business=/574\d{2}|مجاز نیست|شناسه|فایل|پیوست/.test(msg);
 const error=business?(msg.match(/[^\r\n]*[\u0600-\u06FF][^\r\n]*/)?.[0]??"عملیات پیوست مجاز نیست."):"خطا در پردازش پیوست؛ SQL فاز چهارم را بررسی کنید.";
 return NextResponse.json({error},{status:business?400:500,headers});
}
export async function GET(req:NextRequest){
 let uid:number;try{uid=await userId(req);}catch{return NextResponse.json({error:"نشست معتبر نیست."},{status:401,headers});}
 try{
  const fid=id(req.nextUrl.searchParams.get("fileId"));
  const pool=await getConnection();
  const result=await pool.request().input("UserId",sql.BigInt,uid).input("FileId",sql.BigInt,fid)
   .execute("TaskManagementV2.SP_ReadProgressFile");
  const file=result.recordset?.[0] as {FileData:Buffer;MimeType:string}|undefined;
  if(!file)return NextResponse.json({error:"فایل در محدوده مجاز یافت نشد."},{status:404,headers});
  const data=Uint8Array.from(file.FileData);
  return new NextResponse(data.buffer,{status:200,headers:{...headers,"Content-Type":file.MimeType,
   "Content-Disposition":"inline; filename=\"document\"","Content-Length":String(data.length),"Content-Security-Policy":"default-src 'none'; sandbox"}});
 }catch(e){return failure(e);}
}
export async function POST(req:NextRequest){
 let uid:number;try{uid=await userId(req);}catch{return NextResponse.json({error:"نشست معتبر نیست."},{status:401,headers});}
 try{
  const size=Number(req.headers.get("content-length")||0);
  if(size>LIMIT+1024*1024)throw new Error("حجم فایل بیش از ۸ مگابایت است.");
  const form=await req.formData();
  const recordId=id(form.get("recordId"));
  const file=form.get("file");
  if(!(file instanceof File))throw new Error("فایل انتخاب نشده است.");
  if(!file.size || file.size>LIMIT)throw new Error("حجم فایل باید حداکثر ۸ مگابایت باشد.");
  const bytes=Buffer.from(await file.arrayBuffer());
  const mime=typeFromSignature(bytes);
  if(!mime)throw new Error("فقط تصویر PNG، JPG، WEBP یا PDF قابل بارگذاری است.");
  const ext=filename(file.name).split(".").pop()?.toLowerCase();
  if(!({"image/png":["png"],"image/jpeg":["jpg","jpeg"],"image/webp":["webp"],"application/pdf":["pdf"]} as Record<string,string[]>)[mime]?.includes(ext||""))
   throw new Error("پسوند فایل با محتوای آن سازگار نیست.");
  const pool=await getConnection();
  const result=await pool.request().input("UserId",sql.BigInt,uid)
   .input("RecordId",sql.BigInt,recordId)
   .input("OriginalFileName",sql.NVarChar(180),filename(file.name))
   .input("MimeType",sql.VarChar(50),mime)
   .input("FileData",sql.VarBinary(sql.MAX),bytes)
   .execute("TaskManagementV2.SP_AddProgressFile");
  return NextResponse.json({success:true,result:result.recordset?.[0]??null},{headers});
 }catch(e){return failure(e);}
}
export async function DELETE(req:NextRequest){
 let uid:number;try{uid=await userId(req);}catch{return NextResponse.json({error:"نشست معتبر نیست."},{status:401,headers});}
 try{
  const body:unknown=await req.json();
  if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("شناسه فایل معتبر نیست.");
  const fileId=id((body as {fileId?:unknown}).fileId);
  const pool=await getConnection();
  await pool.request().input("UserId",sql.BigInt,uid).input("FileId",sql.BigInt,fileId)
   .execute("TaskManagementV2.SP_RemoveProgressFile");
  return NextResponse.json({success:true},{headers});
 }catch(e){return failure(e);}
}
