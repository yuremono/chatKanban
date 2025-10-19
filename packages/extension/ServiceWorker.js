chrome.runtime.onInstalled.addListener(()=>{ console.log('Chat Kanban Importer installed'); });
chrome.action.onClicked.addListener(async (tab)=>{ if (tab.id) chrome.tabs.sendMessage(tab.id, {type:'PING'}); });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'CK_IMPORT') return;
  (async () => {
    try {
      const { data } = msg;
      console.log('[CK_IMPORT] Received data:', data);
      const { apiBase, token } = await getSettings();

      // 各メッセージに既に imageUrls が埋め込まれているのでそのまま送信
      console.log('[CK_IMPORT] Sending data with embedded images:', data);
      const idempotencyKey = `${data.threadId}-${Date.now()}`;
      const res = await fetch(`${apiBase}/api/import`, {
        method:'POST',
        headers:{ 'content-type':'application/json', 'authorization': token?`Bearer ${token}`:'', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(()=>({}));
      console.log('[CK_IMPORT] Import result:', json);
      sendResponse({ ok: res.ok, result: json, status: res.status });
    } catch(e){ console.error('[CK_IMPORT] Error:', e); sendResponse({ ok:false, error: e?.message||String(e) }); }
  })();
  return true;
});

async function getSettings(){
  const apiBase = await new Promise(r=>chrome.storage.sync.get(['chatKanbanApiBase'],v=>r(v.chatKanbanApiBase||'http://localhost:3000')));
  const token   = await new Promise(r=>chrome.storage.sync.get(['chatKanbanToken'],v=>r(v.chatKanbanToken||null)));
  return { apiBase, token };
}
