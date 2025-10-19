-- Chat Kanban用のテーブル作成スクリプト
-- Supabase SQLエディターで実行してください

-- 1. Topics テーブル
CREATE TABLE IF NOT EXISTS chatkanban_topics (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private', 'unlisted')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ,
  "userName" TEXT,
  "chatTitle" TEXT,
  model TEXT
);

-- Topics テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_chatkanban_topics_userId ON chatkanban_topics("userId");
CREATE INDEX IF NOT EXISTS idx_chatkanban_topics_updatedAt ON chatkanban_topics("updatedAt" DESC);

-- 2. Rallies テーブル
CREATE TABLE IF NOT EXISTS chatkanban_rallies (
  id TEXT PRIMARY KEY,
  "topicId" TEXT NOT NULL REFERENCES chatkanban_topics(id) ON DELETE CASCADE,
  index INTEGER NOT NULL
);

-- Rallies テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_chatkanban_rallies_topicId ON chatkanban_rallies("topicId");
CREATE INDEX IF NOT EXISTS idx_chatkanban_rallies_topicId_index ON chatkanban_rallies("topicId", index);

-- 3. Messages テーブル
CREATE TABLE IF NOT EXISTS chatkanban_messages (
  id TEXT PRIMARY KEY,
  "rallyId" TEXT NOT NULL REFERENCES chatkanban_rallies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Messages テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_chatkanban_messages_rallyId ON chatkanban_messages("rallyId");
CREATE INDEX IF NOT EXISTS idx_chatkanban_messages_timestamp ON chatkanban_messages(timestamp);

-- 4. Idempotency テーブル（重複送信防止）
CREATE TABLE IF NOT EXISTS chatkanban_idempotency (
  key TEXT PRIMARY KEY,
  result JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency テーブルのインデックス（古いデータの削除用）
CREATE INDEX IF NOT EXISTS idx_chatkanban_idempotency_createdAt ON chatkanban_idempotency("createdAt");

-- 5. RLS (Row Level Security) を有効化
ALTER TABLE chatkanban_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatkanban_rallies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatkanban_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatkanban_idempotency ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシー：全員が読み書き可能（MVP用、後で認証を追加）
-- Topics
DROP POLICY IF EXISTS "Anyone can read topics" ON chatkanban_topics;
CREATE POLICY "Anyone can read topics" ON chatkanban_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert topics" ON chatkanban_topics;
CREATE POLICY "Anyone can insert topics" ON chatkanban_topics FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update topics" ON chatkanban_topics;
CREATE POLICY "Anyone can update topics" ON chatkanban_topics FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete topics" ON chatkanban_topics;
CREATE POLICY "Anyone can delete topics" ON chatkanban_topics FOR DELETE USING (true);

-- Rallies
DROP POLICY IF EXISTS "Anyone can read rallies" ON chatkanban_rallies;
CREATE POLICY "Anyone can read rallies" ON chatkanban_rallies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert rallies" ON chatkanban_rallies;
CREATE POLICY "Anyone can insert rallies" ON chatkanban_rallies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update rallies" ON chatkanban_rallies;
CREATE POLICY "Anyone can update rallies" ON chatkanban_rallies FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete rallies" ON chatkanban_rallies;
CREATE POLICY "Anyone can delete rallies" ON chatkanban_rallies FOR DELETE USING (true);

-- Messages
DROP POLICY IF EXISTS "Anyone can read messages" ON chatkanban_messages;
CREATE POLICY "Anyone can read messages" ON chatkanban_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert messages" ON chatkanban_messages;
CREATE POLICY "Anyone can insert messages" ON chatkanban_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update messages" ON chatkanban_messages;
CREATE POLICY "Anyone can update messages" ON chatkanban_messages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete messages" ON chatkanban_messages;
CREATE POLICY "Anyone can delete messages" ON chatkanban_messages FOR DELETE USING (true);

-- Idempotency
DROP POLICY IF EXISTS "Anyone can read idempotency" ON chatkanban_idempotency;
CREATE POLICY "Anyone can read idempotency" ON chatkanban_idempotency FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert idempotency" ON chatkanban_idempotency;
CREATE POLICY "Anyone can insert idempotency" ON chatkanban_idempotency FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update idempotency" ON chatkanban_idempotency;
CREATE POLICY "Anyone can update idempotency" ON chatkanban_idempotency FOR UPDATE USING (true);

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'Chat Kanban tables created successfully!';
  RAISE NOTICE 'Tables: chatkanban_topics, chatkanban_rallies, chatkanban_messages, chatkanban_idempotency';
END $$;

