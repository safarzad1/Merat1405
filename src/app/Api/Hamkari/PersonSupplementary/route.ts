import {NextRequest,NextResponse} from "next/server";
import sql from "mssql";
import {getConnection} from "@/lib/db";
import {verifyToken} from "@/lib/auth";
const invalid=(message:string,status=400)=>NextResponse.json({status,error:message},{status});
const fields=["IsHefazat","IsRayane","OlaviyatBandi","Amalkard","IsDoreAmozeshi"] as const;
export async function POST(req:NextRequest){
 const token=req.cookies.get("token")?.value;if(!token)return invalid("Unauthorized",401);
 try{
  const verified=verifyToken(token);if(!verified)return invalid("Unauthorized",401);
  const body=await req.json(),personId=Number(body.personId);
  if(!Number.isSafeInteger(personId)||personId<=0)return invalid("شناسه شخص معتبر نیست.");
  const pool=await getConnection();
  if(body.action==="get"){
   const result=await pool.request().input("PersonId",sql.BigInt,personId).execute("Hamkari.SP_GetPersonSupplementary");
   return NextResponse.json({status:200,data:result.recordset?.[0]||null});
  }
  if(body.action!=="save")return invalid("عملیات معتبر نیست.");
  const userId=Number(body.userId);
  if(!Number.isSafeInteger(userId)||userId<=0)return invalid("شناسه کاربر معتبر نیست.");
  const values=body.values||{};const q=pool.request().input("PersonId",sql.BigInt,personId).input("UserId",sql.BigInt,userId);
  for(const field of fields){const raw=values[field];const n=raw===null||raw===""||raw===undefined?null:Number(raw);if(n!==null&&(!Number.isSafeInteger(n)||n<0||n>100000))return invalid("مقدار نامعتبر: "+field);q.input(field,sql.Int,n);}
  const notes=String(values.Tozihat||"");if(notes.length>4000)return invalid("توضیحات بیش از حد مجاز است.");
  q.input("Tozihat",sql.NVarChar(4000),notes);
  const result=await q.execute("Hamkari.SP_SavePersonSupplementary");
  return NextResponse.json({status:200,data:result.recordset?.[0]||{}});
 }catch(e){return invalid(e instanceof Error?e.message:"خطای سرور",500);}
}
