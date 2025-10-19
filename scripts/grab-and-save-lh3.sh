#!/usr/bin/env bash
set -euo pipefail

# Config
BRIDGE_PORT="${MCP_PORT:-7779}"
APP_PORT="${APP_PORT:-3000}"

# Usage: ./scripts/grab-and-save-lh3.sh [TARGET_ID]
# If TARGET_ID is not provided, auto-pick Gemini tab id.

TARGET_ID="${1:-}"

if [[ -z "${TARGET_ID}" ]]; then
  echo "[grab-and-save] Auto-detecting Gemini tab id via MCP bridge on :${BRIDGE_PORT} ..." 1>&2
  TARGET_ID=$(curl -s -X POST "http://localhost:${BRIDGE_PORT}" \
    -H 'content-type: application/json' \
    -d '{"method":"targets"}' \
    | jq -r '.tabs[] | select(.url|test("gemini\\.google\\.com/app")) | .id' | head -n1)
  if [[ -z "${TARGET_ID}" ]]; then
    echo "[grab-and-save] Gemini tab not found. Open Gemini in the debug-enabled browser and retry." 1>&2
    exit 1
  fi
fi

echo "[grab-and-save] Using targetId=${TARGET_ID}" 1>&2

# Pull image URLs from the page
IMG_URL=$(curl -s -X POST "http://localhost:${BRIDGE_PORT}" \
  -H 'content-type: application/json' \
  -d "{\"method\":\"evaluate\",\"params\":{\"targetId\":\"${TARGET_ID}\",\"expression\":\"Array.from(document.images).map(i=>i.src)\"}}" \
  | jq -r '.result.result.value[] | select(startswith("https://lh3.googleusercontent.com/"))' | head -n1)

if [[ -z "${IMG_URL}" ]]; then
  echo "[grab-and-save] No lh3.googleusercontent.com image found on the page." 1>&2
  exit 2
fi

echo "[grab-and-save] Fetch-upload => $IMG_URL" 1>&2

JSON=$(jq -nc --arg url "$IMG_URL" '{url:$url}')
RES=$(curl -s -X POST "http://localhost:${APP_PORT}/api/fetch-upload" -H 'content-type: application/json' -d "$JSON")
echo "$RES" | jq .

URL_PATH=$(echo "$RES" | jq -r '.url // empty')
if [[ -n "$URL_PATH" ]]; then
  echo "[grab-and-save] Saved => http://localhost:${APP_PORT}${URL_PATH}" 1>&2
  # Try to open in browser (macOS)
  if command -v open >/dev/null 2>&1; then
    open "http://localhost:${APP_PORT}${URL_PATH}" >/dev/null 2>&1 || true
  fi
else
  echo "[grab-and-save] fetch-upload failed, trying CDP Network.getResponseBody..." 1>&2
  NET=$(curl -s -X POST "http://localhost:${BRIDGE_PORT}" \
    -H 'content-type: application/json' \
    -d "{\"method\":\"fetchResourceBase64\",\"params\":{\"targetId\":\"${TARGET_ID}\",\"url\":\"${IMG_URL}\"}}")
  BODY=$(echo "$NET" | jq -r '.body // empty')
  B64=$(echo "$NET" | jq -r '.base64Encoded // false')
  MIME=$(echo "$NET" | jq -r '.mime // empty')
  if [[ -n "$BODY" && "$B64" == "true" ]]; then
    if [[ -z "$MIME" ]]; then MIME="image/jpeg"; fi
    DATAURL="data:${MIME};base64,${BODY}"
  else
    echo "[grab-and-save] Network.getResponseBody failed, trying page-evaluate dataURL..." 1>&2
    DATAURL=$(curl -s -X POST "http://localhost:${BRIDGE_PORT}" \
      -H 'content-type: application/json' \
      -d "{\"method\":\"evaluate\",\"params\":{\"targetId\":\"${TARGET_ID}\",\"expression\":\"(async()=>{const u='${IMG_URL}'.replace(/\\\\/g,'/');const blob=await fetch(u,{credentials:'include'}).then(r=>r.blob());return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(blob);});})()\"}}" \
      | jq -r '.result.result.value // empty')
  fi

  if [[ -z "$DATAURL" ]]; then
    echo "[grab-and-save] dataURL acquisition failed." 1>&2
    echo "[grab-and-save] Upload failed: $RES" 1>&2
    exit 3
  fi

  echo "[grab-and-save] Uploading dataURL to /api/upload-dataurl ..." 1>&2
  RES2=$(curl -s -X POST "http://localhost:${APP_PORT}/api/upload-dataurl" -H 'content-type: application/json' \
    -d "$(jq -nc --arg dataUrl "$DATAURL" '{dataUrl:$dataUrl}')")
  echo "$RES2" | jq .
  URL_PATH2=$(echo "$RES2" | jq -r '.url // empty')
  if [[ -n "$URL_PATH2" ]]; then
    echo "[grab-and-save] Saved => http://localhost:${APP_PORT}${URL_PATH2}" 1>&2
    if command -v open >/dev/null 2>&1; then
      open "http://localhost:${APP_PORT}${URL_PATH2}" >/dev/null 2>&1 || true
    fi
  else
    echo "[grab-and-save] Upload failed: $RES2" 1>&2
    exit 4
  fi
fi


