import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { generateToken } from "@/lib/auth";


export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("UserName", sql.NVarChar(50), username)
      .input("Password", sql.NVarChar(50), password)
      .execute("SP_CheckUserPassword");

     if (!result.recordset || result.recordset.length === 0) {
      return NextResponse.json({ status: 204, message: "هیچ داده‌ای از سرور بازنگشت" });
      }

     const user = result.recordset?.[0];
    
    if (!user) {
      return NextResponse.json({ status: 500, message: "نتیجه‌ای از پایگاه داده برنگشت" });
    }

    const isValid = user.IsValid;
    const status = user.State;

    if (isValid && status === 200) {
      const token = generateToken({ username });
      return NextResponse.json({ status: 200, data: result.recordset[0],token : token }, {  });
    } else if (status === 201) {
      return NextResponse.json({ status: 201 , message: "❌ کلمه عبور اشتباه است" });
    } 
    else if (status === 202) {
      return NextResponse.json( { status: 202, message: "❌ نام کاربر شما غیرفعال است" });
    }
    else {
      return NextResponse.json({ status: 203,message: "❌ نام کاربری اشتباه است" });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
