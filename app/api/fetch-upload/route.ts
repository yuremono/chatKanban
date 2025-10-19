import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { url, referer } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
    }

    const headers: Record<string, string> = {};
    // Referer 未指定でも Gemini に寄せた値を付ける（lh3 へのアクセスで必要になる場合がある）
    headers['referer'] = referer || 'https://gemini.google.com/';
    // 軽い偽装UA
    headers['user-agent'] =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari';
    // 画像系の Accept を明示
    headers['accept'] = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8';
    headers['cache-control'] = 'no-cache';

    const upstream = await fetch(url, { headers, cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'fetch failed', status: upstream.status, statusText: upstream.statusText },
        { status: 502 }
      );
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const ext = guessExtByType(contentType) || guessExtByUrl(url) || '.bin';

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}_${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(uploadDir, fileName), buf);

    const savedUrl = `/uploads/${fileName}`;
    return NextResponse.json({ url: savedUrl, contentType });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch-upload failed' }, { status: 500 });
  }
}

function guessExtByType(type: string): string | null {
  if (type.includes('png')) return '.png';
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg';
  if (type.includes('webp')) return '.webp';
  if (type.includes('gif')) return '.gif';
  return null;
}

function guessExtByUrl(u: string): string | null {
  try {
    const lower = u.split('?')[0].toLowerCase();
    if (lower.endsWith('.png')) return '.png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return '.jpg';
    if (lower.endsWith('.webp')) return '.webp';
    if (lower.endsWith('.gif')) return '.gif';
    return null;
  } catch { return null; }
}


