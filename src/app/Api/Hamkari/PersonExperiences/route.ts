import {NextRequest,NextResponse} from "next/server";
import sql from "mssql";
import {getConnection} from "@/lib/db";
import {verifyToken} from "@/lib/auth";
const valid=(v:unknown,zero=false)=>{const n=Number(v);return Number.isSafeInteger(n)&&(zero?n>=0:n>0)?n:null;};
const ok=(data:unknown)=>NextResponse.json({status:200,data});
const fail=(error:string,status=400)=>NextResponse.json({status,error},{status});
export async function POST(req:NextRequest){
 const token=req.cookies.get("token")?.value;if(!token)return fail("Unauthorized",401);
 try{
 verifyToken(token);
 const b=await req.json();const personId=valid(b.personId);if(!personId)return fail("شناسه شخص نامعتبر است.");
 const pool=await getConnection();const action=String(b.action||"list");
 if(action==="list")return ok((await pool.request().input("PersonId",sql.BigInt,personId).execute("Hamkari.SP_GetPersonExperiences")).recordset||[]);
 const userId=valid(b.userId);if(!userId)return fail("شناسه کاربر نامعتبر است.");
 if(action==="delete"){
 const experienceId=valid(b.experienceId);if(!experienceId)return fail("شناسه سابقه نامعتبر است.");
 return ok((await pool.request().input("PersonId",sql.BigInt,personId).input("ExperienceId",sql.BigInt,experienceId).input("UserId",sql.BigInt,userId).execute("Hamkari.SP_DeletePersonExperience")).recordset?.[0]||{});
 }
 if(action==="save"){
 const e=b.experience||{},category=valid(e.Category),experienceId=valid(e.ExperienceId,true);
 if(!category||category>3||experienceId===null)return fail("نوع سابقه معتبر نیست.");
 const title=String(e.Title??"").trim(),organization=String(e.Organization??"").trim();if(category!==2&&!title)return fail("عنوان سابقه الزامی است.");if(category===2&&!organization)return fail("نام سازمان الزامی است.");
 const q=pool.request().input("PersonId",sql.BigInt,personId).input("ExperienceId",sql.BigInt,experienceId).input("UserId",sql.BigInt,userId).input("Category",sql.Int,category);
 for(const [k,max] of Object.entries({Title:250,Organization:150,FromDate:20,ToDate:20,Notes:2500,SpecialtyDescription:250})){
 const value=String(e[k]??"").trim();if(value.length>max)return fail(`طول فیلد ${k} بیش از حد مجاز است.`);q.input(k,sql.NVarChar(max),value||null);
 }
 for(const k of ["RoleCode","CooperationType","ContractType","PlaceCode","LevelCode","PositionCode","SpecialtyCode","StatusCode"]){const n=e[k]===null||e[k]===""||e[k]===undefined?null:valid(e[k],true);if(n===null&&e[k]!==null&&e[k]!==""&&e[k]!==undefined)return fail(`کد ${k} نامعتبر است.`);q.input(k,sql.Int,n);}
 q.input("HasDecree",sql.Bit,!!e.HasDecree).input("IsActive",sql.Bit,e.IsActive!==false);
 return ok((await q.execute("Hamkari.SP_SavePersonExperience")).recordset?.[0]||{});
 }
 return fail("عملیات ناشناخته است.");
 }catch(e){return fail(e instanceof Error?e.message:"خطای سرور",500);}
}
