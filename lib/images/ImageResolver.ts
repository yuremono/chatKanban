import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// 画像URLの解決（外部→/uploads/...）を行う小さなサービス
// - 既に /uploads の場合はそのまま返す
// - キャッシュ（.data/image-map.json）を用いて冪等化
// - fetch時は Referer/UA/Accept を付与
// - タイムアウト/失敗時はスキップ（次回に再試行）

const DATA_DIR = path.join(process.cwd(), '.data');
const MAP_FILE = path.join(DATA_DIR, 'image-map.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

type ImageMap = Record<string, string>; // src -> /uploads/xxx.ext

async function readMap(): Promise<ImageMap> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(MAP_FILE, 'utf8').catch(() => '');
    return raw ? (JSON.parse(raw) as ImageMap) : {};
  } catch { return {}; }
}

async function writeMap(map: ImageMap): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(MAP_FILE, JSON.stringify(map));
  } catch {}
}

function guessExtByType(type: string): string | null {
  const t = (type || '').toLowerCase();
  if (t.includes('png')) return '.png';
  if (t.includes('jpeg') || t.includes('jpg')) return '.jpg';
  if (t.includes('webp')) return '.webp';
  if (t.includes('gif')) return '.gif';
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

function isLocalUpload(u: string): boolean {
  return typeof u === 'string' && (u.startsWith('/uploads/') || u.startsWith('http://localhost') && u.includes('/uploads/'));
}

export async function resolveImageUrls(urls: string[], opts?: { referer?: string; timeoutMs?: number }): Promise<string[]> {
  const results: string[] = [];
  if (!Array.isArray(urls) || urls.length === 0) return results;

  const map = await readMap();
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(3000, opts?.timeoutMs || 5000));

  try {
    const jobs = urls.map(async (u) => {
      if (!u || typeof u !== 'string') return null;
      if (isLocalUpload(u)) return u;
      if (map[u]) return map[u];

      // 外部画像を取得
      try {
        const headers: Record<string, string> = {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
          'accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'cache-control': 'no-cache',
        };
        if (opts?.referer) headers['referer'] = opts.referer;

        const res = await fetch(u, { headers, cache: 'no-store', signal: controller.signal });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        const ext = guessExtByType(contentType) || guessExtByUrl(u) || '.bin';
        const fileName = `${Date.now()}_${crypto.randomUUID()}${ext}`;
        await fs.writeFile(path.join(UPLOAD_DIR, fileName), buf);
        const saved = `/uploads/${fileName}`;
        map[u] = saved;
        return saved;
      } catch {
        return null;
      }
    });

    const resolved = await Promise.all(jobs);
    for (const r of resolved) if (r) results.push(r);
  } finally {
    clearTimeout(timeout);
    await writeMap(map);
  }

  return results;
}


