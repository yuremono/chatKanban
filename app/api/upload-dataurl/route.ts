import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import crypto from 'node:crypto';

export const runtime = 'edge';

export async function OPTIONS() {
  return withCors(NextResponse.json({ ok: true }));
}

export async function POST(req: Request) {
  try {
    const { dataUrl, filename } = await req.json();
    if (!dataUrl || typeof dataUrl !== 'string') {
      return withCors(NextResponse.json({ error: 'dataUrl required' }, { status: 400 }));
    }

    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return withCors(NextResponse.json({ error: 'invalid dataUrl' }, { status: 400 }));
    const mime = match[1];
    const b64 = match[2];

    const buf = Buffer.from(b64, 'base64');
    const ext = guessExtByMime(mime);

    let base = sanitizeBase(filename || '');
    if (!base) base = `${Date.now()}_${crypto.randomUUID()}`;
    let fileName = `${base}${ext}`;

    // Supabase Storageにアップロード
    if (supabase) {
      // 同名ファイルが存在する場合は連番を付ける
      let finalFileName = fileName;
      let i = 1;
      while (true) {
        const { data: existing } = await supabase.storage
          .from('uploads')
          .list('', { limit: 1, search: finalFileName });
        
        if (!existing || existing.length === 0) break;
        finalFileName = `${base}_${String(i++).padStart(2, '0')}${ext}`;
      }

      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(finalFileName, buf, {
          contentType: mime,
          upsert: false
        });

      if (error) {
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path);

      return withCors(NextResponse.json({ url: publicUrl, contentType: mime }));
    } else {
      // Supabaseが設定されていない場合はエラー
      return withCors(NextResponse.json({ error: 'Storage not configured' }, { status: 500 }));
    }
  } catch (e: any) {
    return withCors(NextResponse.json({ error: e?.message || 'upload-dataurl failed' }, { status: 500 }));
  }
}

function guessExtByMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('png')) return '.png';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  return '.bin';
}

function sanitizeBase(input: string): string {
  const s = String(input || '').trim();
  // 英数/ハイフン/アンダースコア/ピリオド（拡張子は別付与）
  return s.replace(/[^a-zA-Z0-9._-]/g, '').replace(/\.+$/,'');
}

function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}


