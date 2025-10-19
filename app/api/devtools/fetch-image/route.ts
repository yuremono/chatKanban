import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const BRIDGE_PORT = Number(process.env.MCP_PORT || '7779');

export async function POST(req: Request) {
  try {
    const { targetId, url } = await req.json();
    if (!targetId || !url) return NextResponse.json({ error: 'targetId and url required' }, { status: 400 });
    // 1) Network.getResponseBody 経由（fetchResourceBase64）
    const res = await fetch(`http://localhost:${BRIDGE_PORT}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'fetchResourceBase64', params: { targetId, url } }),
      cache: 'no-store',
    });
    const json = await res.json();
    if (json && json.body && json.base64Encoded === true) {
      return NextResponse.json(json);
    }

    // 2) フォールバック: Page.getResourceContent（同一タブで URL が表示されている場合に有効）
    const res2 = await fetch(`http://localhost:${BRIDGE_PORT}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'getResourceContent', params: { targetId, url } }),
      cache: 'no-store',
    });
    const json2 = await res2.json();
    if (json2 && json2.content && (json2.base64Encoded === true || json2.base64Encoded === 'true')) {
      // MIME 推定は簡易化
      const mime = 'image/jpeg';
      return NextResponse.json({ body: json2.content, base64Encoded: true, mime });
    }

    return NextResponse.json({ error: 'no body' }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch-image failed' }, { status: 500 });
  }
}


