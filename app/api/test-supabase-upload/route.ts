import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export const runtime = 'nodejs';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({
        ok: false,
        error: 'Supabase not configured',
        env: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        }
      });
    }
    
    // バケット一覧を取得
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json({
        ok: false,
        error: 'Failed to list buckets',
        details: listError,
      });
    }
    
    // uploadsバケットが存在するか確認
    const uploadsBucket = buckets?.find(b => b.id === 'uploads');
    
    if (!uploadsBucket) {
      return NextResponse.json({
        ok: false,
        error: 'uploads bucket not found',
        buckets: buckets?.map(b => b.id),
        message: 'Please run supabase-storage-bucket.sql in Supabase SQL Editor',
      });
    }
    
    // テスト用の小さな画像をアップロード
    const testData = 'test-image-data';
    const testFileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(testFileName, testData, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (uploadError) {
      return NextResponse.json({
        ok: false,
        error: 'Failed to upload test file',
        details: uploadError,
        bucket: uploadsBucket,
      });
    }
    
    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(uploadData.path);
    
    // テストファイルを削除
    await supabase.storage
      .from('uploads')
      .remove([testFileName]);
    
    return NextResponse.json({
      ok: true,
      message: 'Supabase Storage is working correctly!',
      bucket: uploadsBucket,
      testUrl: publicUrl,
    });
    
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Test failed',
      stack: e?.stack,
    }, { status: 500 });
  }
}

