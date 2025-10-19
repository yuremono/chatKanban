-- テストデータをクリアするSQL
-- 注意: 本番環境で実行する場合は、必要なデータを削除しないよう注意してください

-- 特定のトピックIDのデータを削除する場合
-- DELETE FROM chatkanban_messages WHERE rally_id IN (SELECT id FROM chatkanban_rallies WHERE topic_id = 'topic_mapp3f7f682f9f1dc8f8hlja');
-- DELETE FROM chatkanban_rallies WHERE topic_id = 'topic_mapp3f7f682f9f1dc8f8hlja';
-- DELETE FROM chatkanban_topics WHERE id = 'topic_mapp3f7f682f9f1dc8f8hlja';

-- 全てのテストデータをクリアする場合（注意！）
DELETE FROM chatkanban_messages;
DELETE FROM chatkanban_rallies;
DELETE FROM chatkanban_topics;
DELETE FROM chatkanban_idempotency;

