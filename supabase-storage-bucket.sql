-- Supabase Storageに画像アップロード用のバケットを作成
-- このSQLはSupabaseのSQLエディタで実行してください

-- uploadsバケットを作成（public=trueで誰でも読み取り可能）
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- uploadsバケットへのアップロードポリシー（誰でもアップロード可能）
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'uploads');

-- uploadsバケットからの読み取りポリシー（誰でも読み取り可能）
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

