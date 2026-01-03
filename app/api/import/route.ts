import { NextResponse } from 'next/server';
import { ImportBodySchema } from '@/packages/shared/ApiSchemas';
import { Repositories } from '@/lib/db/Repositories';
import { resolveImageUrls } from '@/lib/images/ImageResolver';
import { supabase } from '@/lib/db/supabase';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return withCors(NextResponse.json({ ok: true }));
}

export async function POST(req: Request) {
  try {
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

  // 画像自動解決を有効化（lh3のURLをSupabase Storageに保存）
  await forceSelfHostAllImages(body).catch((err) => {
    console.error('[Import] Image resolution failed:', err);
  });

  // 保存（インメモリ実装）
  const topicId = `topic_${body.threadId}`;
  await Repositories.createTopic({
		id: topicId,
		userId: "anonymous",
		title: body.title,
		tags: [],
		visibility: "private",
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
    
    // currentRallyId は必ず定義されている
    if (!currentRallyId) continue;
    
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
  } catch (e: any) {
    console.error('Import error:', e);
    return withCors(NextResponse.json({ error: e?.message || 'Import failed', stack: e?.stack }, { status: 500 }));
  }
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
  
  console.log('[forceSelfHostAllImages] Starting image resolution for', body.messages.length, 'messages');
  
  // 1) dataURLを先に保存（Chrome拡張機能から送られた画像）
  for (const m of body.messages) {
    const meta = m.metadata || {};
    const dataUrls: string[] = Array.isArray(meta.imageDataUrls) ? meta.imageDataUrls : [];
    if (dataUrls.length > 0) {
      console.log('[forceSelfHostAllImages] Processing', dataUrls.length, 'data URLs');
      const saved: string[] = [];
      for (const d of dataUrls) {
        const u = await saveDataUrlToUploads(d).catch((err) => {
          console.error('[forceSelfHostAllImages] Failed to save dataUrl:', err);
          return null;
        });
        if (u) saved.push(u);
      }
      if (saved.length > 0) {
        meta.imageUrls = saved;
        meta.resolvedImageUrls = saved;
        m.metadata = meta;
        console.log('[forceSelfHostAllImages] Saved', saved.length, 'images from data URLs');
      }
    }
  }

  // 2) 外部URL（lh3.googleusercontent.comなど）をSupabase Storageに保存
  for (const m of body.messages) {
    const meta = m.metadata || {};
    const urls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
    if (urls.length === 0) continue;
    
    // lh3などの外部URLをフィルタ（Supabase StorageのURLは除外）
    const needFetch = urls.filter(u => {
      if (!u || typeof u !== 'string') return false;
      // 既にSupabase StorageのURLなら不要
      if (u.includes('supabase.co') && u.includes('/storage/v1/object/public/uploads/')) return false;
      // ローカルの/uploads/も不要（後方互換性）
      if (u.startsWith('/uploads/')) return false;
      // lh3など外部URLは保存が必要
      return true;
    });
    
    if (needFetch.length === 0) continue;
    
    console.log('[forceSelfHostAllImages] Fetching', needFetch.length, 'external URLs:', needFetch);
    
    const saved: string[] = [];
    for (const url of needFetch) {
      try {
        const supabaseUrl = await fetchAndSaveToSupabase(url);
        if (supabaseUrl) {
          saved.push(supabaseUrl);
          console.log('[forceSelfHostAllImages] Saved external URL to Supabase:', supabaseUrl);
        }
      } catch (err) {
        console.error('[forceSelfHostAllImages] Failed to fetch/save URL:', url, err);
      }
    }
    
    if (saved.length > 0) {
      // 元のURLを保存したURLに置き換え
      const updatedUrls = urls.map(u => {
        const idx = needFetch.indexOf(u);
        return idx >= 0 && saved[idx] ? saved[idx] : u;
      });
      meta.imageUrls = updatedUrls;
      meta.resolvedImageUrls = updatedUrls;
      m.metadata = meta;
      console.log('[forceSelfHostAllImages] Updated URLs:', updatedUrls);
    }
  }
  
  console.log('[forceSelfHostAllImages] Image resolution completed');
}

// 外部URLをフェッチしてSupabase Storageに保存
async function fetchAndSaveToSupabase(url: string): Promise<string | null> {
  try {
    console.log('[fetchAndSaveToSupabase] Fetching:', url);
    
    const headers: Record<string, string> = {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
      'accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'cache-control': 'no-cache',
      'referer': 'https://gemini.google.com/',
    };
    
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) {
      console.error('[fetchAndSaveToSupabase] Fetch failed:', res.status, res.statusText);
      return null;
    }
    
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = guessExtByMime(contentType);
    
    if (!supabase) {
      console.error('[fetchAndSaveToSupabase] Supabase not configured');
      return null;
    }
    
    const fileName = `${Date.now()}_${crypto.randomUUID()}${ext}`;
    
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, buf, {
        contentType: contentType,
        upsert: false
      });
    
    if (error) {
      console.error('[fetchAndSaveToSupabase] Upload error:', error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(data.path);
    
    console.log('[fetchAndSaveToSupabase] Success:', publicUrl);
    return publicUrl;
  } catch (err) {
    console.error('[fetchAndSaveToSupabase] Exception:', err);
    return null;
  }
}

async function saveDataUrlToUploads(dataUrl: string): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('invalid dataUrl');
  const mime = match[1];
  const b64 = match[2];
  const buf = Buffer.from(b64, 'base64');
  const ext = guessExtByMime(mime);
  
  // Supabase Storageに保存
  if (!supabase) {
    console.error('[saveDataUrlToUploads] Supabase not configured');
    throw new Error('Supabase not configured');
  }
  
  const fileName = `${Date.now()}_${crypto.randomUUID()}${ext}`;
  
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, buf, {
      contentType: mime,
      upsert: false
    });
  
  if (error) {
    console.error('[saveDataUrlToUploads] Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(data.path);
  
  console.log('[saveDataUrlToUploads] Saved to Supabase Storage:', publicUrl);
  return publicUrl;
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



