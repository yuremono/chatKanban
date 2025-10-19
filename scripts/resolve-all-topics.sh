#!/usr/bin/env bash
set -euo pipefail

APP_BASE="${APP_BASE_URL:-http://localhost:3000}"

# 1) 全トピック取得
TOPICS=$(curl -s "${APP_BASE}/api/topics" | jq -r '.topics[].id')
if [[ -z "${TOPICS}" ]]; then
  echo "[resolve-all] No topics" 1>&2; exit 0
fi

# 2) DevToolsの画像タブIDがあれば指定（省略可）
TARGET_ID="${1:-}"

for TID in ${TOPICS}; do
  echo "[resolve-all] topic=${TID}" 1>&2
  # 2パス: まずCDP併用、だめなら通常解決
  if [[ -n "${TARGET_ID}" ]]; then
    curl -s -X POST "${APP_BASE}/api/maintenance/migrate-topic-images-cdp" \
      -H 'content-type: application/json' \
      -d "{\"topicId\":\"${TID}\",\"targetId\":\"${TARGET_ID}\"}" | jq
  fi
  curl -s -X POST "${APP_BASE}/api/maintenance/migrate-topic-images" \
    -H 'content-type: application/json' \
    -d "{\"topicId\":\"${TID}\"}" | jq
done

echo "[resolve-all] Done" 1>&2


