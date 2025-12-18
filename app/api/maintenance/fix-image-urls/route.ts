import { NextResponse } from 'next/server';
import { Repositories } from '@/lib/db/Repositories';
import { supabase } from '@/lib/db/supabase';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分

export async function POST(req: Request) {
  try {
    console.log('[fix-image-urls] Starting...');
    
    // 全トピックを取得
    const topics = await Repositories.listTopics();
    console.log('[fix-image-urls] Found', topics.length, 'topics');
    
    let updatedCount = 0;
    let totalImages = 0;
    let fixedImages = 0;
    
    for (const topic of topics) {
      const rallies = await Repositories.listRalliesByTopicId(topic.id);
      
      for (const rally of rallies) {
        const messages = await Repositories.listMessagesByRallyId(rally.id);
        
        for (const message of messages) {
          const meta = message.metadata || {};
          const imageUrls: string[] = Array.isArray(meta.imageUrls) ? meta.imageUrls : [];
          
          if (imageUrls.length === 0) continue;
          
          // lh3などの外部URLを検出
          const needsFix = imageUrls.filter(url => {
            if (!url || typeof url !== 'string') return false;
            // 既にSupabase StorageのURLなら不要
            if (url.includes('supabase.co') && url.includes('/storage/v1/object/public/uploads/')) return false;
            // ローカルの/uploads/も不要
            if (url.startsWith('/uploads/')) return false;
            // lh3など外部URLは修正が必要
            return true;
          });
          
          if (needsFix.length === 0) continue;
          
          totalImages += needsFix.length;
          console.log(`[fix-image-urls] Message ${message.id} has ${needsFix.length} URLs to fix:`, needsFix);
          
          const fixedUrls: string[] = [];
          for (const url of needsFix) {
            try {
              const newUrl = await fetchAndSaveToSupabase(url);
              if (newUrl) {
                fixedUrls.push(newUrl);
                fixedImages++;
                console.log(`[fix-image-urls] Fixed: ${url} -> ${newUrl}`);
              } else {
                fixedUrls.push(url); // 失敗した場合は元のURLを保持
                console.warn(`[fix-image-urls] Failed to fix: ${url}`);
              }
            } catch (err) {
              console.error(`[fix-image-urls] Error fixing ${url}:`, err);
              fixedUrls.push(url); // エラーの場合も元のURLを保持
            }
          }
          
          // URLを更新
          const updatedUrls = imageUrls.map(url => {
            const idx = needsFix.indexOf(url);
            return idx >= 0 && fixedUrls[idx] ? fixedUrls[idx] : url;
          });
          
          // メタデータを更新
          const updatedMessage = {
            ...message,
            metadata: {
              ...meta,
              imageUrls: updatedUrls,
              resolvedImageUrls: updatedUrls,
            }
          };
          
          await Repositories.updateMessage(updatedMessage as any);
          updatedCount++;
          
          console.log(`[fix-image-urls] Updated message ${message.id} with new URLs:`, updatedUrls);
        }
      }
    }
    
    console.log('[fix-image-urls] Completed:', {
      updatedMessages: updatedCount,
      totalImages,
      fixedImages,
    });
    
    return NextResponse.json({
      ok: true,
      updatedMessages: updatedCount,
      totalImages,
      fixedImages,
      message: `Fixed ${fixedImages}/${totalImages} images in ${updatedCount} messages`,
    });
  } catch (e: any) {
    console.error('[fix-image-urls] Error:', e);
    return NextResponse.json({
      error: e?.message || 'Failed to fix image URLs',
      stack: e?.stack,
    }, { status: 500 });
  }
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

function guessExtByMime(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('png')) return '.png';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  return '.jpg';
}

