import {NextRequest,NextResponse} from "next/server";
import sql from "mssql";
import {getConnection} from "@/lib/db";
import {verifyToken} from "@/lib/auth";
const ok=(data:unknown)=>NextResponse.json({status:200,data});
const fail=(error:string,status=400)=>NextResponse.json({status,error},{status});
const id=(v:unknown)=>{const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:null};
const text=(v:unknown,max:number)=>String(v??"").trim().slice(0,max);
export async function POST(req:NextRequest){
 const token=req.cookies.get("token")?.value;if(!token)return fail("Unauthorized",401);
 try{verifyToken(token);const body=await req.json();const pool=await getConnection();const action=String(body.action||"");
 if(action==="searchCollaborators"){
   const search=text(body.search,100);
   if(search.length<2)return ok([]);
   const result=await pool.request().input("Search",sql.NVarChar(100),search).execute("Taamol.SP_SearchContactCollaborators");
   return ok(result.recordset||[]);
 }
 if(action==="lookup"){
   const r=await pool.request().execute("Taamol.SP_ContactLookups");const sets=r.recordsets as sql.IRecordSet<any>[];
   return ok({locations:sets[0]||[],topics:sets[1]||[],assessments:sets[2]||[],members:sets[3]||[]});
 }
 if(action==="list"){
   const page=Math.max(1,Math.min(100000,Number(body.page)||1));const size=Math.max(1,Math.min(50,Number(body.size)||15));
   const r=await pool.request().input("Search",sql.NVarChar(150),text(body.search,150)).input("Page",sql.Int,page).input("PageSize",sql.Int,size).execute("Taamol.SP_ContactList");
   return ok({rows:r.recordset||[],total:Number(r.recordset?.[0]?.TotalRows||0)});
 }
 if(action==="get"){
   const contactId=id(body.id);if(!contactId)return fail("شناسه تماس نامعتبر است.");const r=await pool.request().input("ContactId",sql.BigInt,contactId).execute("Taamol.SP_GetContact");const sets=r.recordsets as sql.IRecordSet<any>[];
   if(!sets[0]?.[0])return fail("تماس پیدا نشد.",404);return ok({contact:sets[0][0],people:sets[1]||[]});
 }
 if(action==="save"){
   const userId=id(body.userId);if(!userId)return fail("شناسه کاربر نامعتبر است.");const f=body.form||{};const people=Array.isArray(body.people)?body.people:[];
   if(people.length>200)return fail("تعداد افراد بیش از حد مجاز است.");
   if(!/^\d{4}\/\d{2}\/\d{2}$/.test(String(f.ContactDate||"")))return fail("تاریخ شمسی نامعتبر است.");
   const payload=JSON.stringify(people.map((p:any)=>({Kind:Number(p.Kind)||0,FullName:text(p.FullName,150),PositionTitle:text(p.PositionTitle,150),RankTitle:text(p.RankTitle,150),PersonId:id(p.PersonId),Notes:text(p.Notes,1500)})));
   const r=await pool.request().input("ContactId",sql.BigInt,id(f.ContactId)||0).input("ContactType",sql.Int,Number(f.ContactType)||0)
     .input("ContactDate",sql.NVarChar(10),String(f.ContactDate)).input("FromTime",sql.NVarChar(5),text(f.FromTime,5)||null).input("ToTime",sql.NVarChar(5),text(f.ToTime,5)||null)
     .input("LocationId",sql.Int,id(f.LocationId)).input("LocationNotes",sql.NVarChar(500),text(f.LocationNotes,500)).input("TopicId",sql.Int,id(f.TopicId))
     .input("Summary",sql.NVarChar(sql.MAX),text(f.Summary,8000)).input("InformantSubjects",sql.NVarChar(sql.MAX),text(f.InformantSubjects,8000))
     .input("HasQualifyingNews",sql.Bit,!!f.HasQualifyingNews).input("AssessmentId",sql.Int,id(f.AssessmentId)).input("AssessmentNotes",sql.NVarChar(4000),text(f.AssessmentNotes,4000))
     .input("PeopleJson",sql.NVarChar(sql.MAX),payload).input("UserId",sql.BigInt,userId).execute("Taamol.SP_SaveContact");return ok(r.recordset?.[0]||{});
 }
 if(action==="delete"){
   const contactId=id(body.id),userId=id(body.userId);if(!contactId||!userId)return fail("شناسه نامعتبر است.");const r=await pool.request().input("ContactId",sql.BigInt,contactId).input("UserId",sql.BigInt,userId).execute("Taamol.SP_DeleteContact");return ok(r.recordset?.[0]||{});
 }
 return fail("عملیات نامعتبر است.");
 }catch(e){return fail(e instanceof Error?e.message:"خطای سرور",500)}
}
