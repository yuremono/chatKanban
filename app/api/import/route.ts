import { NextResponse } from 'next/server';
import { ImportBodySchema } from '@/packages/shared/ApiSchemas';
import { Repositories } from '@/lib/db/Repositories';
import { resolveImageUrls } from '@/lib/images/ImageResolver';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export async function OPTIONS() {
  return withCors(NextResponse.json({ ok: true }));
}

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return withCors(NextResponse.json({ error: 'Idempotency-Key header required' }, { status: 400 }));
  }

  // 冪等チェック
  const cached = await Repositories.getIdempotency(idempotencyKey);
  if (cached) {
    return withCors(NextResponse.json(cached));
  }

  const json = await req.json().catch(() => null);
  const parse = ImportBodySchema.safeParse(json);
  if (!parse.success) {
    return withCors(NextResponse.json({ error: 'Invalid body', issues: parse.error.issues }, { status: 400 }));
  }
  const body = parse.data;

  // 画像自動解決を無効化（元URLをそのまま保存）
  // await forceSelfHostAllImages(body).catch(() => {});

  // 保存（インメモリ実装）
  const topicId = `topic_${body.threadId}`;
  await Repositories.createTopic({
    id: topicId,
    userId: 'anonymous',
    title: body.title,
    tags: [],
    visibility: 'private',
    deletedAt: null,
    userName: body.userName,
    chatTitle: body.chatTitle,
    model: body.model,
  });
  // ユーザー発話でラリーを分割
  const rallyIds: string[] = [];
  let currentRallyId: string | null = null;
  let rallyIndex = 0;
  for (const m of body.messages) {
    const shouldStartNewRally = currentRallyId === null || m.role === 'user';
    if (shouldStartNewRally) {
      currentRallyId = `rally_${body.threadId}_${rallyIndex++}`;
      rallyIds.push(currentRallyId);
      await Repositories.createRally({ id: currentRallyId, topicId, index: rallyIndex - 1 });
    }
    await Repositories.createMessage({
      id: `${currentRallyId}_${Math.random().toString(36).slice(2)}`,
      rallyId: currentRallyId,
      role: m.role,
      content: m.content,
      model: m.model ?? body.model ?? 'unknown',
      timestamp: m.timestamp ?? new Date().toISOString(),
      metadata: m.metadata,
    });
  }

  const result = { topicId, rallyIds };
  await Repositories.setIdempotency(idempotencyKey, result);
  return withCors(NextResponse.json(result));
}

function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
  return res;
}

// --- helpers ---
const APP_BASE = process.env.APP_BASE_URL || 'http://localhost:3000';

async function forceSelfHostAllImages(body: any) {
  if (!Array.isArray(body?.messages)) return;
  // 1) dataURLを先に保存
  for (const m of body.messages) {
    const meta = m.metadata || {};
    const dataUrls: string[] = Array.isArray(meta.imageDataUrls) ? meta.imageDataUrls : [];
    if (dataUrls.length > 0) {
      const saved: string[] = [];
      for (const d of dataUrls) {
        const u = await saveDataUrlToUploads(d).catch(() => null);
        if (u) saved.push(u);
      }
      if (saved.length > 0) {
        meta.imageUrls = saved;
        meta.resolvedImageUrls = saved;
        m.metadata = meta;
      }
    }
  }

  // 2) 外部URLをサーバ側fetchで保存
  for (const m of body.messages) {
    const meta = m.metadata || {};
    const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
    if (urls.length === 0) continue;
    // すでに /uploads のみならスキップ
    const need = urls.filter(u => typeof u === 'string' && !u.startsWith('/uploads/'));
    if (need.length === 0) continue;
    const resolved = await resolveImageUrls(need, { referer: 'https://gemini.google.com/' }).catch(() => [] as string[]);
    if (resolved && resolved.length > 0) {
      const merged = urls.map(u => (u.startsWith('/uploads/') ? u : (resolved.shift() || u)));
      meta.imageUrls = merged;
      meta.resolvedImageUrls = merged;
      m.metadata = meta;
    }
  }

  // 3) まだ外部URLが残っていれば、CDPで画像本体取得→保存
  //    （MCPブリッジが動いていない環境ではスキップされるが、他経路で大半は解決済みのはず）
  const targetId = await guessDevtoolsTargetId(body.sourceUrl).catch(() => null);
  if (targetId) {
    for (const m of body.messages) {
      const meta = m.metadata || {};
      const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
      const need = urls.filter(u => typeof u === 'string' && !u.startsWith('/uploads/'));
      if (need.length === 0) continue;
      const saved: string[] = [];
      for (const u of need) {
        const dataUrl = await fetchImageViaDevtools(targetId, u).catch(() => null);
        if (!dataUrl) continue;
        const loc = await saveDataUrlToUploads(dataUrl).catch(() => null);
        if (loc) saved.push(loc);
      }
      if (saved.length > 0) {
        const merged = urls.map(u => (u.startsWith('/uploads/') ? u : (saved.shift() || u)));
        meta.imageUrls = merged;
        meta.resolvedImageUrls = merged;
        m.metadata = meta;
      }
    }
  }
}

async function saveDataUrlToUploads(dataUrl: string): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('invalid dataUrl');
  const mime = match[1];
  const b64 = match[2];
  const buf = Buffer.from(b64, 'base64');
  const ext = guessExtByMime(mime);
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${Date.now()}_${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(uploadDir, fileName), buf);
  return `/uploads/${fileName}`;
}

function guessExtByMime(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('png')) return '.png';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  return '.bin';
}

async function guessDevtoolsTargetId(sourceUrl?: string | null): Promise<string | null> {
  try {
    const r = await fetch(`${APP_BASE}/api/devtools/targets`, { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store' });
    const j = await r.json();
    const tabs: any[] = Array.isArray(j?.tabs) ? j.tabs : [];
    if (!tabs.length) return null;
    if (sourceUrl) {
      const t = tabs.find(t => typeof t.url === 'string' && t.url && sourceUrl && t.url.startsWith(String(sourceUrl).split('?')[0]));
      if (t?.id) return t.id as string;
    }
    const g = tabs.find(t => (t.url || '').includes('gemini.google.com')) || tabs[0];
    return g?.id || null;
  } catch { return null; }
}

async function fetchImageViaDevtools(targetId: string, url: string): Promise<string | null> {
  try {
    const r = await fetch(`${APP_BASE}/api/devtools/fetch-image`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetId, url }), cache: 'no-store'
    });
    if (!r.ok) return null;
    const j = await r.json();
    const body = j?.body; const mime = j?.mime || 'image/jpeg'; const b64 = j?.base64Encoded === true;
    if (!body || !b64) return null;
    return `data:${mime};base64,${body}`;
  } catch { return null; }
}



