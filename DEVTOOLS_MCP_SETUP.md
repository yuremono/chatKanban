# Chrome DevTools MCP セットアップ手順

## ⚠️ 注意
この機能は**現在不要**です。画像リンク表示方式に変更したため、通常のブラウザで `localhost:3000` を開いて開発を続けられます。

---

## 📝 この機能について
Chrome DevTools Protocol (CDP) を使って、ブラウザ内の画像を自動取得するための開発用ツールです。現在は使用していません。

---

## 🚀 セットアップ手順（参考用）

### 手順1: リモートデバッグモードでブラウザを起動

**操作場所**: macOSのターミナルアプリ（Cursor以外）

**何をするか**: ChromeまたはBraveを特別なモードで起動します

**入力するコマンド**:

**Chromeの場合:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-profile
```

**Braveの場合:**
```bash
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222 --user-data-dir=/tmp/brave-debug-profile
```

**確認方法**: ブラウザが新しいウィンドウで起動し、ターミナルにログが表示されます

---

### 手順2: 依存パッケージをインストール

**操作場所**: Cursorエディタ内のターミナル

**何をするか**: WebSocket通信用のパッケージをインストールします

**入力するコマンド**:
```bash
npm install ws --save-dev
```

**確認方法**: `package.json` に `ws` が追加されます

---

### 手順3: MCPブリッジを起動

**操作場所**: Cursorエディタ内のターミナル

**何をするか**: エディタとブラウザを繋ぐ橋渡しサーバーを起動します

**入力するコマンド**:
```bash
node scripts/devtools-mcp-bridge.js
```

**確認方法**: 以下のメッセージが表示されます
```
DevTools MCP bridge listening on :7777
```

このターミナルは**そのまま開いたまま**にしておきます。

---

### 手順4: 動作確認（任意）

**操作場所**: Cursorエディタ内の別のターミナル（新しいタブを開く）

**何をするか**: ブリッジが正常に動いているか確認します

**入力するコマンド**:
```bash
curl -X POST http://localhost:7777 -H 'Content-Type: application/json' -d '{"method":"targets"}' | jq
```

**確認方法**: 開いているブラウザのタブ一覧がJSON形式で表示されます

---

## 🛑 終了手順

### 1. MCPブリッジの停止

**操作場所**: Cursorエディタ内のターミナル（`node scripts/devtools-mcp-bridge.js` を実行したターミナル）

**操作方法**:
1. ターミナルをクリックしてアクティブにする
2. キーボードで `Ctrl + C` を押す

**確認方法**: プロンプトが戻ります（例: `yanoseiji@MacBookAir chatKanban %`）

---

### 2. リモートデバッグブラウザの終了

**操作場所**: リモートデバッグで起動したブラウザウィンドウ

**操作方法**:
1. ブラウザウィンドウを普通に閉じる（`⌘ + Q` または右上の×ボタン）

**確認方法**: ブラウザが完全に終了します

---

### 3. プロセスの確認と完全終了（念のため）

**操作場所**: Cursorエディタ内のターミナル

**何をするか**: リモートデバッグプロセスが残っていないか確認して、残っていれば終了します

**入力するコマンド**:

```bash
# 1. リモートデバッグプロセスを検索
ps aux | grep remote-debugging-port
```

**何か表示された場合**: プロセスが残っています

**終了コマンド**:
```bash
# 2. Chromeのリモートデバッグを終了
pkill -f "Google Chrome.*remote-debugging-port"

# または Braveの場合
pkill -f "Brave Browser.*remote-debugging-port"
```

**確認方法**:
```bash
# 3. もう一度検索して何も表示されないことを確認
ps aux | grep remote-debugging-port
```
`grep` 自身のプロセスだけが表示されればOKです。

---

### 4. 通常のブラウザで開発を再開

**操作場所**: 通常のChromeまたはBrave（新しく起動）

**操作方法**:
1. 普通にブラウザを起動（リモートデバッグなし）
2. `http://localhost:3000` を開く
3. Chrome拡張機能から通常通りデータを送信

**これで完了です！** 通常の開発環境に戻りました。

---

## 📌 よくある質問

**Q: リモートデバッグブラウザと通常のブラウザを同時に使えますか？**
A: はい、使えます。ただし同じプロファイルは共有できません。

**Q: MCPを使わないと画像は表示できませんか？**
A: いいえ、現在は`lh3` URLをリンクとして表示する方式なので、MCPは不要です。

**Q: もう一度MCPを使いたい場合は？**
A: 上記の「セットアップ手順」を最初から実行してください。

---

## 🔧 トラブルシューティング

### ポート7777が既に使用中
```bash
# 既存のプロセスを探す
lsof -i :7777

# PIDを確認して終了
kill -9 <PID>
```

### ポート9222が既に使用中
```bash
# 既存のChromeプロセスを探す
ps aux | grep remote-debugging-port

# 全て終了
pkill -f "remote-debugging-port"
```

### ブリッジが起動しない
- `ws` パッケージがインストールされているか確認: `npm list ws`
- Node.jsのバージョンを確認: `node -v`（18以上が必要）
