-- 既存のchatkanban_topicsテーブルにdeletedAtカラムを追加

ALTER TABLE chatkanban_topics 
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

