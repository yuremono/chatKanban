# デプロイメントチェックリスト

## 本番環境デプロイ前の確認事項

### 1. Supabase設定

#### 環境変数（Vercel）
以下の環境変数がVercelに設定されていることを確認：
- [x] `NEXT_PUBLIC_SUPABASE_URL` - SupabaseプロジェクトのURL
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabaseの匿名キー

#### Supabase SQL実行
以下のSQLファイルをSupabaseのSQLエディタで実行：
1. [ ] `supabase-schema.sql` - データベーススキーマ作成
2. [ ] `supabase-migration-add-deletedAt.sql` - deletedAtカラム追加
3. [ ] `supabase-storage-bucket.sql` - Storageバケット作成

### 2. Chrome拡張機能

#### ファイルの一貫性確認
- [ ] `packages/extension/ContentScript.js` - 最新版であること
- [ ] `packages/extension/ServiceWorker.js` - 最新版であること
- [ ] `packages/extension/Options.js` - 最新版であること
- [ ] `packages/extension/Manifest.json` - 正しいバージョン

#### 拡張機能の再読み込み手順
1. `chrome://extensions/` を開く
2. デベロッパーモードをON
3. 「再読み込み」ボタンをクリック
4. Geminiページをリロード

### 3. APIエンドポイント確認

以下のエンドポイントにランタイム設定とエラーハンドリングが追加されていること：
- [x] `/api/import` - nodejs runtime
- [x] `/api/upload-dataurl` - edge runtime
- [x] `/api/messages` - nodejs runtime
- [x] `/api/topics` - nodejs runtime
- [x] `/api/rallies` - nodejs runtime
- [x] `/api/export` - nodejs runtime
- [x] `/api/image-proxy` - edge runtime

### 4. デプロイ後の動作確認

#### 画像なしトピック
1. [ ] Geminiで画像なしのチャットを作成
2. [ ] 「Send to Chat Kanban」ボタンをクリック
3. [ ] 本番ページ（https://chat-kanban.vercel.app）でトピックが表示されることを確認
4. [ ] メッセージが正しく表示されることを確認

#### 画像付きトピック
1. [ ] Geminiで画像付きのチャットを作成
2. [ ] ブラウザのコンソールを開く
3. [ ] 「Send to Chat Kanban」ボタンをクリック
4. [ ] コンソールで以下のログを確認：
   - `[ContentScript] Extracted image URLs:` - 画像URLが抽出されている
   - `[CK_IMPORT] Processing images:` - 画像数が0以上
   - `[CK_IMPORT] Upload response: 200` - アップロード成功
   - `[CK_IMPORT] Successfully uploaded:` - Supabase StorageのURL
5. [ ] 本番ページで画像が表示されることを確認

### 5. トラブルシューティング

#### 画像が表示されない場合
1. Supabase Storageのバケット設定を確認
2. `supabase-storage-bucket.sql` を再実行
3. Vercelの環境変数を確認
4. ブラウザのコンソールでエラーログを確認

#### 送信エラーが発生する場合
1. Vercelのログを確認（Functions タブ）
2. エラーメッセージの内容を確認
3. Supabaseのログを確認

#### 既に送信済みエラーが出る場合
1. Supabaseで `supabase-clear-test-data.sql` を実行
2. 拡張機能のストレージをクリア（オプションページから）

