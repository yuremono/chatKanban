# Chat Kanban 改訂仕様書（MD）

## 1. 概要（Summary）

Chat Kanban（チャット看板）は、ChatGPT/Gemini等のAIチャット履歴をchromeブラウザのプラグインでwebアプリに送信することで、履歴を整理し再利用、共有を容易にする。画像生成の性能向上により需要が高まり、API利用ではコスト増加が予測されるため、公式アプリとのスムーズな連携(エクスポート、インポート)、マルチプラットフォーム、管理UXの向上を目指す。初期版（MVP）は以下の方針で実装する。

- 鍵管理: サーバー管理鍵（Server-managed key）で暗号化保存。将来的にE2E（End-to-End、エンドツーエンド）へ移行可能な設計。
- 履歴取得: Chrome拡張によるDOM抽出（DOM scraping）。将来的に公式エクスポート/共有フロー対応を検討。

## 2. 想定ユーザー（Target Users）

- ナノバナナで生成した画像履歴を見やすくまとめ、再編集をスムーズに行いたいユーザー
- 日常的にChatGPT/Geminiを利用し、履歴を整理・検索・再利用したい個人/チーム。
- チャット成果を資産化（Knowledge Asset化）し、看板UIで管理したいユーザー。

## 3. 機能要件（Functional Requirements）

### 3.1 履歴転送（Chrome拡張、Manifest V3）

- 対象: 現在開いているチャットスレッドの「質問/回答」セット、日時、タイトル、使用モデル。
- UI: chrome拡張機能ボタン、または公式画面右上に「Send to Chat Kanban」ボタン。テキストのドラッグ&ドロップ転送も許容。
- 送信フロー: content script → service worker（拡張SW）→ Web API（Next.js API Routes）。
- 認証: Webアプリでログイン後、拡張を「リンク」して短期アクセストークン（JWT）を取得・保管（`chrome.storage`）。
- 冪等性: `Idempotency-Key` ヘッダを用意。重複送信の防止。
- サイズ/再送: 長文は分割（chunk）送信、413時は自動リトライ。ネットワーク障害時のバックオフ再送。
- 権限: `host_permissions`（chat.openai.com / gemini.google.com等）、`scripting`、`storage`。`identity`は使わずWeb側で発行したトークンを利用。
- DOM脆弱性対策: セレクタを抽象化（バージョン差分に強いロジック＋フォールバック）。定期的な健全性チェックと拡張のスモークテスト。

### 3.2 認証（Google OAuth 2.0）

- Supabase Auth（またはFirebase Auth）を利用。最小情報方針：
- OAuth Scope: `openid` + `profile`（`email`は除外）
- 保存: 一意ID（`user.id`/`sub`）、表示名（displayName）、プロフィール写真URL（avatarUrl、オプショナル）。
- プロフィール写真はGoogle CDNから直接読み込み（自社サーバーには保存しない）。
- 取得しない: メールアドレス（将来的にユーザーが任意で登録する機能を検討）。
- セキュリティ対策: CSPでGoogle画像ドメインのみ許可、画像読み込み失敗時はイニシャルアイコンでフォールバック。
- Web→拡張連携: Webでログイン後、「拡張をリンク」ボタン→短期JWT発行→`postMessage`/ディープリンクで拡張へ受け渡し。

### 3.3 履歴の整理/表示

- 自動分類（トピック化）: MVPは軽量ルール＋要約でトピック命名。将来はEmbedding＋クラスタリング。
- Kanban Board UI: カード（トピック）にタイトル/作成日/使用AI/タグ。ドラッグで並び替え、フィルタ/検索。
- 詳細ビュー: ラリー（Q+Aセット）を時系列で展開。Markdown整形・コードハイライト・コピー。

### 3.4 公開/共有

- 可視性: 非公開 / 限定公開（署名付きURL、TTL可）/ 公開（他ユーザー検索対象）。
- 将来拡張: お気に入り、コメント、複製。

### 3.5 内蔵AIチャット（オプション）

- MVP: 開発者のAPIキーでテキストチャット(同一IPで1日5回まで)。履歴と同様に保存。将来: ユーザー自身のAPIキー登録。
- UI: サイドパネル（独立タブ）。

## 4. 非機能要件（Non-Functional）

- セキュリティ: 
- 保存時暗号化（AES-GCM）：アプリ層でサーバー管理鍵を用いてユーザー単位データ鍵（UDK）を暗号化保管。
- RLS（Row Level Security）でユーザー分離（Supabase）。
- XSS対策: Markdownサニタイズ（許可リスト）、CSP厳格化、`Content-Disposition`と`Content-Type`の検証。
- レート制限・監査ログ（匿名化）。
- 可用性/性能: 
- Vercel Serverlessでp95<800msを目標（MVP）。
- 大きなペイロードはストレージ署名URL（Supabase Storage）＋メタデータDB保存。
- 監査/コンプライアンス: 利用規約/プライバシーポリシーで第三者共有の注意喚起。TOS準拠のDOM抽出運用方針明記。

## 5. 技術スタック（Tech Stack）

- フロント: Next.js 14（App Router）+ React + TypeScript、Tailwind CSS、shadcn/ui。
- バックエンド: Next.js API Routes（Node/Edge選択）、Supabase（PostgreSQL, RLS, Storage）。
- 認証: Google OAuth 2.0（Supabase Auth）。
- 拡張: Chrome Extension（MV3, TypeScript, Fetch API）。
- AI: OpenAI API / Gemini API（要件次第で切替）。
- デプロイ: Vercel、DB: Supabase。

## 6. データモデル（ER 概略）

- User: `id`, `displayName`, `avatarUrl?`, `provider`, `providerUserId`, `createdAt`.
- Topic: `id`, `userId(FK)`, `title`, `tags[]`, `visibility(enum: private|unlisted|public)`, `createdAt`, `updatedAt`, `deletedAt?`.
- Rally: `id`, `topicId(FK)`, `index`, `createdAt`.
- Message: `id`, `rallyId(FK)`, `role(enum: user|assistant|system)`, `content(markdown)`, `model`, `timestamp`, `metadata(jsonb)`.
- ShareLink: `id`, `topicId(FK)`, `token`, `expiresAt?`, `createdAt`.
- Embedding (将来): `messageId(FK)`, `vector`, `dim`（pgvector）。
- CryptoKey: `userId(FK)`, `userDataKeyEnc`（UDKをマスター鍵で暗号化したもの）, `createdAt`, `rotatedAt?`。
- すべてソフトデリート（`deletedAt`）を想定。主要列にインデックス。

## 7. API 設計（要点）

- 認証: Bearer JWT（短期）。CORSは拡張とWebの双方ドメインを許可。
- POST `/api/import`（拡張→サーバー）: 本文（Q/A配列、モデル、日時、スレッド識別子）、`Idempotency-Key`。レスポンスは作成された`topicId`/`rallyIds`。
- GET `/api/topics`、GET `/api/topics/:id`、POST `/api/topics`、PATCH `/api/topics/:id`（タイトル/タグ/可視性更新）。
- GET `/api/rallies/:id`、GET `/api/messages?topicId=...`。
- POST `/api/share/:topicId`（限定公開リンク生成/失効）。
- POST `/api/ai/chat`（オプション、開発者キー使用）。

## 8. Chrome拡張 詳細

- ファイル: `Manifest.json`, `ContentScript.ts`, `ServiceWorker.ts`, `DomSelectors.ts`, `UiInjector.ts`, `AuthLink.ts`。
- 抽出: セレクタ群を一箇所に定義し、サイト差分に応じて分岐。失敗時に簡易テキスト抽出へフォールバック。
- 送信: 10KB～数MBまで対応。大容量は一時ストレージ＋分割アップロード。`Retry-After`尊重の指数バックオフ。
- リンク手順: Webの「拡張をリンク」→一時コード→拡張がAPIでJWT取得→`chrome.storage`保存。

## 9. 自動分類/検索

- MVP: ルール＆LLM要約によるトピック名生成（短文サマリ）。
- 将来: pgvector導入、類似検索、関連トピック候補表示、重複統合。Embedding更新は非同期ジョブ。

## 10. UI/UX（Kanban）

- 画面: トピック一覧（看板）/ 詳細（ラリー時系列）/ サイドAIパネル（任意）。
- 操作: DnDで並び替え、タグ/可視性フィルタ、フリーテキスト検索。
- 表示: Markdown（安全レンダラ）、コードハイライト、コピー、折りたたみ。

## 11. セキュリティ/プライバシー詳細

- 暗号化: アプリ層AES-GCM。`content`等の機微列を暗号化。鍵はサーバー管理（マスター鍵は環境変数 or KMS）。
- 将来E2E移行: ユーザーパスフレーズでUDK再暗号化（マイグレーションAPIで段階的に再暗号）。
- RLS/ACL: `userId`で強制フィルタ。共有リンクは署名トークンで限定アクセス。
- Markdown対策: サニタイズ、リンク`rel="noopener noreferrer"`、CSP `script-src 'self'` 等を厳格化。
- プライバシーポリシー明記事項:
  - 「Googleアカウントから表示名とプロフィール写真URLのみ取得」
  - 「メールアドレスは取得・保存しません」
  - 「プロフィール写真はGoogleのサーバーから直接読み込み、当社では保存しません」
  - 「画像読み込みはGoogle画像CDNドメインのみCSPで許可」

## 12. デプロイ/運用

- Vercel（Web/API）、Supabase（DB/Storage/Auth）。
- 環境: `NEXT_PUBLIC_*` とサーバー専用秘密鍵を分離管理。拡張の送信先は環境に応じて切替。
- 監視: エラートラッキング（Sentry等）、ヘルスチェック、拡張の自己診断ページ。

## 13. リスクと対応

- DOM変更で抽出壊れ: セレクタ抽象化、スモークテスト、迅速な拡張アップデート。
- 大容量/料金: 分割アップロード、クォータ、バックプレッシャー。LLM要約はバッチ/キューでコスト制御。
- 情報漏えい: 既定は非公開。共有時に注意喚起とPIIマスキングオプション。

## 14. MVPスコープ/マイルストーン

- M1: 認証/DBスキーマ/`/api/import`/Kanban一覧（最低限）/詳細ビュー（Markdown）。
- M2: Chrome拡張（送信ボタン・分割送信・冪等性）/共有（限定公開）。
- M3: 検索（まずはPostgres全文検索）/タグ編集/フィルタ。
- M4: Embedding＋類似検索/自動分類強化。
- M5: チーム共有の基礎（閲覧のみ）。

## 15. 主要ディレクトリ/ファイル（PascalCase推奨）

- `apps/web`
- `app/(dashboard)/Topics/Page.tsx`（看板一覧）
- `app/(dashboard)/Topics/[id]/Page.tsx`（詳細）
- `app/api/import/route.ts`（履歴受信）
- `app/api/share/[topicId]/route.ts`（共有リンク）
- `lib/crypto/KeyManager.ts`（鍵/暗号化）
- `lib/db/Repositories.ts`（DB I/F）
- `packages/extension`
- `Manifest.json`, `ContentScript.ts`, `ServiceWorker.ts`, `DomSelectors.ts`, `UiInjector.ts`, `AuthLink.ts`
- `packages/shared`
- `Types.ts`, `ApiSchemas.ts`（zodなど）

## 16. テスト

- ユニット（暗号/パーサ/分類）、API統合、E2E（Playwright）。拡張は`chromium --load-extension`でスモーク。

## 17. 将来変更点

- 鍵管理をユーザーパスフレーズE2Eへ切替（段階的再暗号）。
- 取得方式をエクスポート/共有APIに切替（安定化）。