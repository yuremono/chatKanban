import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export const runtime = 'nodejs';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({
        ok: false,
        error: 'Supabase not configured',
      });
    }
    
    console.log('[test-direct-upload] Starting test...');
    
    // テスト用の小さな画像データ（1x1 PNG）
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageBase64, 'base64');
    const testFileName = `test-${Date.now()}.png`;
    
    console.log('[test-direct-upload] Uploading to uploads bucket...');
    
    // 直接uploadsバケットにアップロード
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(testFileName, testBuffer, {
        contentType: 'image/png',
        upsert: false
      });
    
    if (error) {
      console.error('[test-direct-upload] Upload error:', error);
      return NextResponse.json({
        ok: false,
        error: 'Upload failed',
        details: error,
        message: 'アップロードに失敗しました。Supabaseのポリシーを確認してください。',
      });
    }
    
    console.log('[test-direct-upload] Upload successful:', data);
    
    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(data.path);
    
    console.log('[test-direct-upload] Public URL:', publicUrl);
    
    // テストファイルを削除
    await supabase.storage
      .from('uploads')
      .remove([testFileName]);
    
    console.log('[test-direct-upload] Test file deleted');
    
    return NextResponse.json({
      ok: true,
      message: '✅ Supabase Storage は正常に動作しています！',
      uploadedPath: data.path,
      publicUrl: publicUrl,
      note: 'テストファイルは自動的に削除されました',
    });
    
  } catch (e: any) {
    console.error('[test-direct-upload] Exception:', e);
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Test failed',
      stack: e?.stack,
    }, { status: 500 });
  }
}

