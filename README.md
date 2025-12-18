# Chat Kanban

ChatGPTやGoogle Geminiのチャット履歴を管理するカンバンボードアプリケーションです。

## 機能

- **チャット履歴の可視化**: ChatGPTやGeminiのチャット履歴をカード形式で表示
- **Chrome拡張機能**: ワンクリックでチャットをインポート
- **検索機能**: メッセージ内容を全文検索
- **AIアシスタント**: チャット履歴に関する質問に回答
- **データエクスポート**: JSON形式でバックアップ
- **画像サポート**: チャット内の画像を保存・表示
- **ダークモード**: 目に優しいテーマ切り替え

## 必要な環境

- Node.js 18.x以上
- Supabase アカウント（データベース用）
- Vercel KV（オプション: キャッシュ用）
- OpenAI API キー（AIチャット機能用）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd chatKanban
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (AIチャット機能用)
OPENAI_API_KEY=your_openai_api_key

# Vercel KV (オプション)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

### 3. データベースのセットアップ

Supabaseダッシュボードで以下のSQLファイルを実行：

```bash
# スキーマの作成
supabase-schema.sql

# ストレージバケットの作成
supabase-storage-bucket.sql
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## Chrome拡張機能のインストール

### 開発モード（デベロッパーモード）でインストール

1. Brave/Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. 以下のフォルダを選択：
   ```
   /Users/yanoseiji/Desktop/chatKanban/packages/extension
   ```

### 拡張機能の設定

1. 拡張機能アイコンを右クリック → 「オプション」
2. Chat Kanban のURLを設定（例: `http://localhost:3000` または本番URL）
3. 保存

### 使い方

1. ChatGPT（https://chatgpt.com）またはGemini（https://gemini.google.com）を開く
2. チャットページで拡張機能アイコンをクリック
3. 「Send to Chat Kanban」を選択
4. Chat Kanbanアプリでチャット履歴を確認

## デプロイ

### Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
vercel
```

または、GitHubと連携して自動デプロイを設定できます。

### 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `KV_REST_API_URL` (オプション)
- `KV_REST_API_TOKEN` (オプション)

## プロジェクト構成

```
chatKanban/
├── app/                    # Next.js App Router
│   ├── api/               # APIルート
│   ├── (dashboard)/       # ダッシュボードページ
│   └── page.tsx           # メインページ
├── components/            # Reactコンポーネント
│   ├── KanbanCard.tsx    # カードコンポーネント
│   ├── DraggableSidebar.tsx
│   └── ui/               # UIコンポーネント
├── lib/                  # ユーティリティ
│   ├── db/              # データベースリポジトリ
│   ├── images/          # 画像処理
│   └── crypto/          # 暗号化
├── packages/
│   ├── extension/       # Chrome拡張機能
│   └── shared/         # 共有型定義
└── public/             # 静的ファイル
```

## 技術スタック

- **フレームワーク**: Next.js 15.5
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Supabase (PostgreSQL)
- **ストレージ**: Supabase Storage
- **デプロイ**: Vercel
- **AI**: OpenAI API

## トラブルシューティング

### 初期表示が遅い場合

- Supabaseの接続を確認
- 環境変数が正しく設定されているか確認
- ネットワーク接続を確認

### 拡張機能が動作しない場合

- デベロッパーモードがONになっているか確認
- 拡張機能のオプションでURLが正しく設定されているか確認
- ブラウザのコンソールでエラーメッセージを確認

### 画像が表示されない場合

- Supabase Storageのバケットが作成されているか確認
- バケットのアクセス権限を確認

## ライセンス

MIT

## 作者

Yano Seiji

