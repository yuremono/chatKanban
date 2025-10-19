chrome.runtime.onInstalled.addListener(() => {
  console.log('Chat Kanban Importer installed');
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'PING' });
});

// ContentScript からのインポート要求を処理
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'CK_IMPORT') {
    (async () => {
      try {
        const { data, urls, topicIdForName } = msg as { data: any; urls: string[]; topicIdForName: string };
        const { apiBase, token } = await getSettings();

        // 1) 画像を順次アップロード（/uploads 化）
        const uploaded: string[] = [];
        let index = 1;
        const downloaded: chrome.downloads.DownloadItem[] = [] as any;
        console.log('[CK_IMPORT] Processing images:', urls?.length || 0);
        for (const src of (urls || [])) {
          try {
            console.log('[CK_IMPORT] Fetching image:', src);
            const dataUrl = await fetchInPageAsDataUrlFromSW(src);
            if (!dataUrl) {
              console.warn('[CK_IMPORT] Failed to fetch dataUrl for:', src);
              continue;
            }
            console.log('[CK_IMPORT] Uploading to:', `${apiBase}/api/upload-dataurl`);
            const r = await fetch(`${apiBase}/api/upload-dataurl`, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ dataUrl, filename: `${topicIdForName}_${String(index++).padStart(3,'0')}` })
            });
            const j = await r.json();
            console.log('[CK_IMPORT] Upload response:', r.status, j);
            if (r.ok && j?.url) {
              uploaded.push(j.url);
              console.log('[CK_IMPORT] Successfully uploaded:', j.url);
            } else {
              console.error('[CK_IMPORT] Upload failed:', j);
            }
            // 追加: ユーザ環境にも自動ダウンロード（ZIP化のため任意）
            try {
              const dlId = await chrome.downloads.download({ url: j.url, filename: `${topicIdForName}/${j.url.split('/').pop()}` });
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const _ = dlId;
            } catch {}
          } catch (e) {
            console.error('[CK_IMPORT] Image processing error:', e);
          }
        }
        console.log('[CK_IMPORT] Total uploaded:', uploaded.length, uploaded);

        // 2) ペイロードへ反映（最初のassistantへ付与。なければ追加）
        if (uploaded.length > 0) {
          const firstAssistant = data.messages.find((m: any) => m.role === 'assistant');
          if (firstAssistant) {
            firstAssistant.metadata = Object.assign({}, firstAssistant.metadata || {}, { imageUrls: uploaded });
          } else {
            data.messages.push({ role: 'assistant', content: '', model: 'unknown', timestamp: new Date().toISOString(), metadata: { imageUrls: uploaded } });
          }
        }

        // 3) インポート
        const idempotencyKey = `${data.threadId}-${Date.now()}`;
        const res = await fetch(`${apiBase}/api/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, result: json, status: res.status });
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    })();
    return true; // async response
  }
});

async function getSettings(): Promise<{ apiBase: string; token: string | null }> {
  const apiBase = await new Promise<string>((resolve) => chrome.storage.sync.get(['chatKanbanApiBase'], (r) => resolve(r.chatKanbanApiBase || 'http://localhost:3000')));
  const token = await new Promise<string | null>((resolve) => chrome.storage.sync.get(['chatKanbanToken'], (r) => resolve(r.chatKanbanToken || null)));
  return { apiBase, token };
}

// ページ文脈でしか取得できない画像を、SWから tabs.executeScript 相当で評価してDataURL取得
async function fetchInPageAsDataUrlFromSW(url: string): Promise<string | null> {
  try {
    // 直近アクティブタブで評価
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs?.[0]?.id;
    if (!tabId) return null;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (u: string) => new Promise<string | null>((resolve) => {
        fetch(u, { credentials: 'include' })
          .then(r => r.blob())
          .then(b => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result||'')); fr.readAsDataURL(b); })
          .catch(() => resolve(null));
      }),
      args: [url]
    }) as any;
    return (result as string) || null;
  } catch {
    return null;
  }
}

