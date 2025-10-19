import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';

export const runtime = 'nodejs';

const APP_BASE = process.env.APP_BASE_URL || 'http://localhost:3000';

async function devtoolsFetchBase64(targetId: string, url: string) {
  const res = await fetch(`${APP_BASE}/api/devtools/fetch-image`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ targetId, url }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json || !json.body || json.base64Encoded !== true) return null;
  const mime = json.mime || 'image/jpeg';
  return { mime, body: json.body as string };
}

async function uploadDataUrl(dataUrl: string) {
  const r = await fetch(`${APP_BASE}/api/upload-dataurl`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
    cache: 'no-store',
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.url as string | null;
}

export async function POST(req: Request) {
  try {
    const { topicId, targetId } = await req.json();
    if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });

    const rallies = await Repositories.listRalliesByTopicId(topicId);
    const rallyIds = rallies.map(r => r.id);
    const messages = (await Promise.all(rallyIds.map(id => Repositories.listMessagesByRallyId(id)))).flat();

    let updated = 0;
    for (const m of messages) {
      const meta = (m as any)?.metadata || {};
      const dataUrls: string[] = Array.isArray(meta.imageDataUrls) ? meta.imageDataUrls : [];
      const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
      if (dataUrls.length > 0 || urls.length === 0) continue;

      const savedUrls: string[] = [];
      for (const u of urls) {
        let saved: string | null = null;
        // 1) まずCDP経由で取得（認証付CDN向け）
        if (targetId) {
          const grc = await devtoolsFetchBase64(targetId, u);
          if (grc?.body) {
            const dataUrl = `data:${grc.mime};base64,${grc.body}`;
            saved = await uploadDataUrl(dataUrl);
          }
        }
        // 2) 失敗時はサーバ直fetch（公開CDN向け）
        if (!saved) {
          const r = await fetch(`${APP_BASE}/api/fetch-upload`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url: u, referer: 'https://gemini.google.com/' }), cache: 'no-store'
          });
          if (r.ok) {
            const j = await r.json();
            saved = j?.url || null;
          }
        }
        if (saved) savedUrls.push(saved);
      }

      if (savedUrls.length > 0) {
        const next = { ...m, metadata: { ...meta, imageUrls: savedUrls, resolvedImageUrls: savedUrls } };
        await Repositories.updateMessage(next as any);
        updated += 1;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'migrate-topic-images-cdp failed' }, { status: 500 });
  }
}


