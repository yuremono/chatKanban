(() => {
  const BUTTON_ID = 'chat-kanban-send-button';

  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.textContent = 'Send to Chat Kanban';
    btn.type = 'button';
    btn.style.position = 'fixed';
    btn.style.right = '16px';
    btn.style.bottom = '16px';
    btn.style.zIndex = '999999';
    btn.style.padding = '10px 12px';
    btn.style.borderRadius = '8px';
    btn.style.background = '#2563eb';
    btn.style.color = 'white';
    btn.style.fontSize = '14px';
    btn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    const stopAll = (e: Event) => {
      try { e.preventDefault(); } catch {}
      try { e.stopPropagation(); } catch {}
      try { (e as any).stopImmediatePropagation?.(); } catch {}
    };
    btn.addEventListener('pointerdown', stopAll, { capture: true });
    btn.addEventListener('mousedown', stopAll, { capture: true });
    btn.addEventListener('mouseup', stopAll, { capture: true });
    btn.addEventListener('click', (e) => { stopAll(e); onClickSend(); }, { capture: true });
    document.body.appendChild(btn);
  }

  async function onClickSend() {
    try {
      const data = extractThread();
      const urls = collectLh3ImageUrls();
      const totalImages = urls.length;
      const topicIdForName = `topic_${data.threadId}`;
      console.log('[ContentScript] Extracted data:', data);
      console.log('[ContentScript] Image URLs:', urls);
      const resp = await chrome.runtime.sendMessage({ type: 'CK_IMPORT', data, urls, topicIdForName });
      if (resp?.ok) alert(`Imported: ${resp.result?.topicId || ''}\n画像: ${totalImages}枚`);
      else alert(`Send failed: ${resp?.error || resp?.status || 'unknown'}`);
    } catch (e: any) {
      alert(`Send failed: ${e?.message || e}`);
    }
  }

  function extractThread() {
    // MVP: ページタイトルと単純なDOM抽出（サイトごとに分岐する想定）
    const title = document.title || 'Imported Chat';
    const url = location.href;
    const threadId = url.replace(/[^a-zA-Z0-9]/g, '').slice(-24) || 'thread';

    // ChatGPTのシンプル抽出例（サイト変更で壊れる可能性あり）
    const qa: { role: 'user'|'assistant'; content: string }[] = [];
    document.querySelectorAll('[data-message-author-role]')?.forEach((el) => {
      const role = (el.getAttribute('data-message-author-role') || 'assistant') as 'user'|'assistant';
      const content = el.textContent || '';
      if (content.trim()) qa.push({ role, content });
    });

    return {
      threadId,
      title,
      model: 'unknown',
      messages: qa.map(m => ({ ...m })),
      createdAt: new Date().toISOString(),
      sourceUrl: url,
    };
  }

  function collectLh3ImageUrls(): string[] {
    const urls = new Set<string>();
    document.querySelectorAll('img, source[srcset]')?.forEach((el) => {
      let u = '';
      if (el instanceof HTMLImageElement) u = el.src || '';
      // @ts-ignore
      if (!u && el?.srcset) u = String((el as any).srcset).split(',').map((s: string) => s.trim().split(' ')[0])[0] || '';
      if (!u) return;
      u = u.trim();
      if (/^https:\/\/lh3\.googleusercontent\.com\//.test(u)) urls.add(u);
    });
    return Array.from(urls);
  }

  function fetchInPageAsDataUrl(url: string): Promise<string | null> {
    const MSG = 'CK_FETCH_DATAURL_RESULT';
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      const onMsg = (ev: MessageEvent) => {
        try {
          const d = ev.data || {};
          if (d && d.type === MSG && d.id === id) {
            window.removeEventListener('message', onMsg);
            resolve(typeof d.dataUrl === 'string' ? d.dataUrl : null);
          }
        } catch { resolve(null); }
      };
      window.addEventListener('message', onMsg);
      const s = document.createElement('script');
      s.textContent = `(() => {
        const id = ${JSON.stringify(id)};
        const url = ${JSON.stringify(url)};
        fetch(url, { credentials: 'include' })
          .then(r => r.blob())
          .then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result||'')); fr.readAsDataURL(b); }))
          .then(dataUrl => window.postMessage({ type: '${MSG}', id, dataUrl }, '*'))
          .catch(() => window.postMessage({ type: '${MSG}', id, dataUrl: null }, '*'));
      })();`;
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    });
  }

  function getToken(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['chatKanbanToken'], (res) => {
        resolve(res.chatKanbanToken || null);
      });
    });
  }

  function getApiBase(): Promise<string> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['chatKanbanApiBase'], (res) => {
        resolve(res.chatKanbanApiBase || 'http://localhost:3000');
      });
    });
  }

  // 起動
  const observer = new MutationObserver(() => createButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  createButton();
})();


