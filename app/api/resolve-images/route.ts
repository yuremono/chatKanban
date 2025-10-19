import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';
import { resolveImageUrls } from '@/lib/images/ImageResolver';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { rallyId, messageIds } = await req.json();
    if (!rallyId && !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'rallyId or messageIds required' }, { status: 400 });
    }

    const messages = rallyId
      ? await Repositories.listMessagesByRallyId(rallyId)
      : (await Promise.all((messageIds as string[]).map(id => Repositories.listMessagesByRallyId(id)))).flat();

    let updated = 0;
    for (const m of messages) {
      const meta = m?.metadata || {};
      const dataUrls: string[] = Array.isArray(meta.imageDataUrls) ? meta.imageDataUrls : [];
      const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
      if (dataUrls.length > 0 || urls.length === 0) continue;
      const resolved = await resolveImageUrls(urls, { referer: 'https://gemini.google.com/' });
      if (resolved.length > 0) {
        const next = { ...m, metadata: { ...meta, imageUrls: resolved, resolvedImageUrls: resolved } };
        await Repositories.updateMessage(next as any);
        updated += 1;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'resolve-images failed' }, { status: 500 });
  }
}


