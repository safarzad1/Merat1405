import {NextRequest,NextResponse} from "next/server";
import sql from "mssql";
import {getConnection} from "@/lib/db";
import {verifyToken} from "@/lib/auth";
const id=(v:unknown,zero=false)=>{const n=Number(v);return Number.isSafeInteger(n)&&(zero?n>=0:n>0)?n:null;};
const success=(data:unknown)=>NextResponse.json({status:200,data});
const bad=(error:string,status=400)=>NextResponse.json({status,error},{status});
export async function POST(req:NextRequest){
 if(!req.cookies.get("token")?.value)return bad("Unauthorized",401);
 try{
 verifyToken(req.cookies.get("token")!.value);
 const multipart=req.headers.get("content-type")?.includes("multipart/form-data");
 const b:Record<string,unknown>=multipart?Object.fromEntries((await req.formData()).entries()):await req.json();
 const action=String(b.action||"list"),personId=id(b.personId);if(!personId)return bad("شناسه شخص معتبر نیست.");
 const pool=await getConnection();
 if(action==="list")return success((await pool.request().input("PersonId",sql.BigInt,personId).execute("Hamkari.SP_GetPersonTrainings")).recordset||[]);
 const userId=id(b.userId),trainingId=id(b.trainingId,true);
 if(action==="attachments"||action==="download"){
 const tid=id(b.trainingId);if(!tid)return bad("شناسه دوره نامعتبر است.");
 if(action==="attachments")return success((await pool.request().input("PersonId",sql.BigInt,personId).input("TrainingId",sql.BigInt,tid).execute("Hamkari.SP_GetPersonTrainingAttachments")).recordset||[]);
 const aid=id(b.attachmentId);if(!aid)return bad("شناسه گواهی نامعتبر است.");
 const record=(await pool.request().input("PersonId",sql.BigInt,personId).input("TrainingId",sql.BigInt,tid).input("AttachmentId",sql.BigInt,aid).execute("Hamkari.SP_DownloadPersonTrainingAttachment")).recordset?.[0];
 if(!record)return bad("گواهی یافت نشد.",404);return success({Base64:Buffer.from(record.FileData).toString("base64")});
 }
 if(!userId||trainingId===null)return bad("شناسه کاربر یا سابقه نامعتبر است.");
 if(action==="delete"){
 if(!trainingId)return bad("شناسه دوره نامعتبر است.");const r=await pool.request().input("PersonId",sql.BigInt,personId).input("TrainingId",sql.BigInt,trainingId).input("UserId",sql.BigInt,userId).execute("Hamkari.SP_DeletePersonTraining");return success(r.recordset?.[0]||{});
 }
 if(action==="save"){
 const t=(b.training||{}) as Record<string,unknown>;const title=String(t.Title||"").trim(),category=id(t.Category);
 if(!title||title.length>150||category===null||category>3)return bad("نوع آموزش یا عنوان دوره معتبر نیست.");
 const q=pool.request().input("PersonId",sql.BigInt,personId).input("TrainingId",sql.BigInt,id(t.TrainingId,true)||0).input("UserId",sql.BigInt,userId).input("Category",sql.Int,category).input("Title",sql.NVarChar(150),title).input("HasCertificate",sql.Bit,!!t.HasCertificate);
 const lengths:Record<string,number>={Year:20,Topic:150,Organizer:150,Place:250,Participants:10,LearningDate:20,Duration:20,Method:1500,Address:2000,Notes:2500};
 for(const [k,max] of Object.entries(lengths)){const v=String(t[k]??"").trim();if(v.length>max)return bad(`طول ${k} بیش از حد مجاز است.`);q.input(k,sql.NVarChar(max),v||null);}
 return success((await q.execute("Hamkari.SP_SavePersonTraining")).recordset?.[0]||{});
 }
 if(action==="upload"){
 if(!trainingId)return bad("ابتدا سابقه آموزشی را ذخیره کنید.");const file=b.file;
 if(!(file instanceof File))return bad("فایل ارسال نشده است.");if(file.size>5*1024*1024||file.size===0)return bad("حجم فایل باید بین ۱ بایت و ۵ مگابایت باشد.");
 const name=file.name.replace(/[\\/]/g,"_").slice(0,150);if(!/\.(pdf|jpg|jpeg|png)$/i.test(name))return bad("نوع فایل مجاز نیست.");
 const binary=Buffer.from(await file.arrayBuffer());const sig=binary.subarray(0,8).toString("hex");if(!(sig.startsWith("25504446")||sig.startsWith("ffd8ff")||sig.startsWith("89504e470d0a1a0a")))return bad("محتوای فایل معتبر نیست.");
 return success((await pool.request().input("PersonId",sql.BigInt,personId).input("TrainingId",sql.BigInt,trainingId).input("UserId",sql.BigInt,userId).input("FileName",sql.NVarChar(150),name).input("FileData",sql.VarBinary(sql.MAX),binary).execute("Hamkari.SP_SavePersonTrainingAttachment")).recordset?.[0]||{});
 }
 if(action==="deleteAttachment"){
 const attachmentId=id(b.attachmentId);if(!trainingId||!attachmentId)return bad("شناسه گواهی نامعتبر است.");return success((await pool.request().input("PersonId",sql.BigInt,personId).input("TrainingId",sql.BigInt,trainingId).input("AttachmentId",sql.BigInt,attachmentId).input("UserId",sql.BigInt,userId).execute("Hamkari.SP_DeletePersonTrainingAttachment")).recordset?.[0]||{});
 }
 return bad("عملیات ناشناخته است.");
 }catch(e){return bad(e instanceof Error?e.message:"خطای سرور",500);}
}
