import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const src = searchParams.get('src');
    if (!src) return NextResponse.json({ error: 'src required' }, { status: 400 });

    const upstream = await fetch(src, {
      cache: 'no-store',
      // 一部CDN対策用にUA/Refererを付与
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        referer: 'https://gemini.google.com/',
      },
    });
    if (!upstream.ok) return NextResponse.json({ error: 'upstream error' }, { status: 502 });

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'proxy failed' }, { status: 500 });
  }
}


