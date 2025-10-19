#!/bin/bash
# Chrome拡張機能のビルドスクリプト

echo "Building Chrome Extension..."

# 必要なファイルをチェック
if [ ! -f "Manifest.json" ]; then
  echo "Error: Manifest.json not found"
  exit 1
fi

if [ ! -f "ContentScript.js" ]; then
  echo "Error: ContentScript.js not found"
  exit 1
fi

if [ ! -f "ServiceWorker.js" ]; then
  echo "Error: ServiceWorker.js not found"
  exit 1
fi

# zipファイルを作成
ZIP_NAME="chat-kanban-extension-$(date +%Y%m%d-%H%M%S).zip"
zip -r "$ZIP_NAME" \
  Manifest.json \
  ContentScript.js \
  ServiceWorker.js \
  Options.html \
  Options.js \
  -x "*.ts" "*.sh" "*.backup.*"

echo "Extension packaged: $ZIP_NAME"
echo "Ready to upload to Chrome Web Store or load as unpacked extension"

