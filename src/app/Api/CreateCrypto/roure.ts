import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

    const secret = process.env.JWT_SECRET;
    if (!secret) return NextResponse.json({ error: 'server secret not configured' }, { status: 500 });

    const encrypted = CryptoJS.AES.encrypt(id, secret).toString();
    return NextResponse.json({ encrypted });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
