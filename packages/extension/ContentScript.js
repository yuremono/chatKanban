(() => {
  const BUTTON_ID = 'chat-kanban-send-button';
  const stopAll = (e) => { try{e.preventDefault()}catch{} try{e.stopPropagation()}catch{} try{e.stopImmediatePropagation&&e.stopImmediatePropagation()}catch{} };

  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.textContent = 'Send to Chat Kanban';
    Object.assign(btn.style, {position:'fixed', right:'16px', bottom:'16px', zIndex:'999999', padding:'10px 12px', borderRadius:'8px', background:'#2563eb', color:'#fff', fontSize:'14px', boxShadow:'0 2px 10px rgba(0,0,0,.2)'});
    btn.addEventListener('pointerdown', stopAll, {capture:true});
    btn.addEventListener('mousedown', stopAll, {capture:true});
    btn.addEventListener('mouseup', stopAll, {capture:true});
    btn.addEventListener('click', (e) => { stopAll(e); onClickSend(); }, {capture:true});
    document.body.appendChild(btn);
  }

  function extractThread() {
    const title = document.title || 'Imported Chat';
    const url = location.href;
    const threadId = url.replace(/[^a-zA-Z0-9]/g,'').slice(-24) || 'thread';
    const host = location.host;
    const qa = [];

    // ユーザー名、チャットタイトル、モデル名を取得
    let userName = 'Unknown User';
    let chatTitle = title;
    let model = 'unknown';

    if (host.includes('gemini.google.com')) {
      model = 'Gemini';
      // Geminiのユーザー名を取得（aria-labelから抽出）
      const userNameEl = document.querySelector('[aria-label*="アカウント"], [aria-label*="Account"], .gb_d');
      if (userNameEl) {
        const ariaLabel = userNameEl.getAttribute('aria-label') || '';
        // "Google アカウント: せいじ (example@gmail.com)" → "せいじ" を抽出
        const match = ariaLabel.match(/[:：]\s*([^(@（]+)/);
        userName = match ? match[1].trim() : ariaLabel.trim();
      }
      
      // Geminiのチャットタイトルを取得（最初のuser-queryから推測）
      const firstQuery = document.querySelector('user-query');
      if (firstQuery) {
        const firstText = (firstQuery.innerText || firstQuery.textContent || '').trim();
        if (firstText) chatTitle = firstText.slice(0, 100);
      }

      const queries = Array.from(document.querySelectorAll('user-query'));
      for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        const userText = (q.innerText || q.textContent || '').trim();
        if (userText) qa.push({ role: 'user', content: userText });
        const nextQ = queries[i + 1] || null;
        const assistantText = collectTextBetween(q, nextQ);
        const assistantImages = collectImagesBetween(q, nextQ);
        if (assistantText || assistantImages.length > 0) {
          qa.push({ 
            role: 'assistant', 
            content: assistantText,
            metadata: assistantImages.length > 0 ? { imageUrls: assistantImages } : undefined
          });
        }
      }
    } else {
      model = 'ChatGPT';
      // ChatGPTのユーザー名を取得（複数の方法で試行）
      const selectors = [
        'button[id$="-button"]',  // ヘッダーのユーザーボタン
        '[data-testid="profile-button"]',
        'button img[alt]',
        'nav button',
        'header button',
      ];
      
      for (const sel of selectors) {
        const buttons = document.querySelectorAll(sel);
        for (const el of buttons) {
          // ボタン内のdivやspanからテキストを探す
          const divs = el.querySelectorAll('div, span');
          for (const div of divs) {
            const text = (div.textContent || '').trim();
            if (text && text.length > 0 && text.length < 50 && 
                !text.includes('@') && 
                text !== 'User' && text !== 'ユーザー' &&
                !/^(https?|www\.|\.com)/.test(text)) {
              userName = text;
              break;
            }
          }
          if (userName !== 'Unknown User') break;
          
          // imgのaltも試す
          const img = el.querySelector('img[alt]');
          if (img) {
            const alt = img.getAttribute('alt') || '';
            if (alt && alt.length > 0 && alt.length < 50 && !alt.includes('@')) {
              userName = alt;
              break;
            }
          }
        }
        if (userName !== 'Unknown User') break;
      }

      // ChatGPTのチャットタイトルを取得
      const titleEl = document.querySelector('h1, [data-testid="conversation-title"]');
      if (titleEl) chatTitle = (titleEl.textContent || '').trim();

      // ChatGPTのメッセージと画像を収集
      document.querySelectorAll('[data-message-author-role]')?.forEach(el=>{
        const role = (el.getAttribute('data-message-author-role') || 'assistant');
        const content = (el.textContent || '').trim();
        
        // 画像を収集（ChatGPTの場合も）
        const images = [];
        el.querySelectorAll('img[src]')?.forEach(img => {
          const src = (img.src || '').trim();
          if (src && (src.startsWith('http') || src.startsWith('data:'))) {
            images.push(src);
          }
        });
        
        if (content || images.length > 0) {
          qa.push({ 
            role, 
            content,
            metadata: images.length > 0 ? { imageUrls: images } : undefined
          });
        }
      });
    }

    return { 
      threadId, 
      title, 
      model, 
      messages: qa, 
      createdAt:new Date().toISOString(), 
      sourceUrl:url,
      userName,
      chatTitle
    };
  }

  function collectTextBetween(startEl, endEl) {
    let buf = '';
    let el = startEl.nextElementSibling;
    while (el) {
      if (endEl && (el === endEl || el.contains(endEl))) break;
      const tag = el.tagName.toLowerCase();
      if (!['script', 'style', 'nav', 'header', 'footer', 'user-query'].includes(tag)) {
        const t = (el.innerText || el.textContent || '').trim();
        if (t) buf += (buf ? '\n\n' : '') + t;
      }
      el = el.nextElementSibling;
    }
    return buf.trim();
  }

  function collectImagesBetween(startEl, endEl) {
    const imgs = [];
    const s = new Set();
    let el = startEl.nextElementSibling;
    
    while (el) {
      if (endEl && (el === endEl || el.contains(endEl))) break;
      
      const imgEls = el.querySelectorAll ? el.querySelectorAll('img[src]') : [];
      imgEls.forEach(img => {
        const u = (img.src || '').trim();
        if (!u || !/^https:\/\/lh3\.googleusercontent\.com\//.test(u)) return;
        if (/\/(s\d{2,3}-c)\//.test(u)) return;
        const cls = (img.className || '').toLowerCase();
        if (/icon|avatar|profile|logo/.test(cls)) return;
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if ((w > 0 && w <= 64) || (h > 0 && h <= 64)) return;
        const alt = (img.alt || '').toLowerCase();
        if (/icon|logo|avatar/.test(alt)) return;
        
        if (!s.has(u)) {
          s.add(u);
          imgs.push(u);
        }
      });
      
      el = el.nextElementSibling;
    }
    
    return imgs;
  }

  function collectLh3ImageUrls() {
    const s = new Set();
    const candidates = [];
    
    // まず全候補を収集
    document.querySelectorAll('img[src]')?.forEach(el=>{
      const u = (el.src || '').trim();
      if (!u || !/^https:\/\/lh3\.googleusercontent\.com\//.test(u)) return;
      
      // 除外条件
      // 1) URLに s32-c, s48-c, s64-c, s96-c 等のサイズ指定があるアイコン
      if (/\/(s\d{2,3}-c)\//.test(u)) return;
      // 2) クラス名に icon, avatar, profile 等が含まれる
      const cls = (el.className || '').toLowerCase();
      if (/icon|avatar|profile|logo/.test(cls)) return;
      // 3) 画像の表示サイズが小さい（64px以下）
      const w = el.naturalWidth || el.width || 0;
      const h = el.naturalHeight || el.height || 0;
      if ((w > 0 && w <= 64) || (h > 0 && h <= 64)) return;
      // 4) alt に icon, logo 等が含まれる
      const alt = (el.alt || '').toLowerCase();
      if (/icon|logo|avatar/.test(alt)) return;

      candidates.push({ url: u, w, h });
    });

    // サイズが大きい順にソート（生成画像は通常大きい）
    candidates.sort((a, b) => (b.w * b.h) - (a.w * a.h));
    candidates.forEach(c => s.add(c.url));

    return Array.from(s);
  }

  async function onClickSend() {
    try {
      const data = extractThread();
      const totalImages = (data.messages || []).reduce((sum, m) => sum + ((m.metadata?.imageUrls || []).length), 0);
      const topicIdForName = `topic_${data.threadId}`;
      
      // 画像URLを収集（metadata.imageUrlsから抽出）
      const urls = [];
      for (const m of (data.messages || [])) {
        const imageUrls = m.metadata?.imageUrls || [];
        urls.push(...imageUrls);
      }
      console.log('[ContentScript] Extracted image URLs:', urls);
      
      // 現在の送信先環境を取得
      const settings = await new Promise(resolve => {
        chrome.storage.sync.get(['chatKanbanApiTarget'], result => {
          resolve(result);
        });
      });
      const currentTarget = settings.chatKanbanApiTarget || 'vercel';
      const storageKey = currentTarget === 'vercel' ? 'sentTopicsVercel' : 'sentTopicsLocalhost';
      
      // 既に送信済みかチェック（環境ごとに別管理）
      const sentTopics = await new Promise(resolve => {
        chrome.storage.local.get([storageKey], result => {
          resolve(result[storageKey] || {});
        });
      });
      
      const previousData = sentTopics[topicIdForName];
      let isUpdate = false;
      
      if (previousData) {
        // 同じトピックIDが既に存在する場合
        const prevCount = previousData.messageCount || 0;
        const currentCount = (data.messages || []).length;
        
        if (currentCount > prevCount) {
          isUpdate = true;
          if (!confirm(`このトピックは既に送信済みです。\n新しいメッセージが追加されているため、上書き更新します。\n\n以前: ${prevCount}件のメッセージ\n現在: ${currentCount}件のメッセージ\n\n続行しますか？`)) {
            return;
          }
        } else {
          if (!confirm(`このトピックは既に送信済みです (${currentTarget})。\n\n再送信しますか？`)) {
            return;
          }
        }
      }
      
      const resp = await chrome.runtime.sendMessage({ type:'CK_IMPORT', data, urls, topicIdForName });
      
      if (resp?.ok) {
        // 送信成功したら記録（環境ごとに別管理）
        sentTopics[topicIdForName] = {
          messageCount: (data.messages || []).length,
          sentAt: new Date().toISOString(),
          title: data.title || data.chatTitle
        };
        const updateObj = {};
        updateObj[storageKey] = sentTopics;
        chrome.storage.local.set(updateObj);
        
        const targetLabel = currentTarget === 'vercel' ? 'Vercel' : 'Localhost';
        const msg = isUpdate 
          ? `トピックを更新しました！(${targetLabel})\n${resp.result?.topicId || ''}\n画像: ${totalImages}枚`
          : `送信完了！(${targetLabel})\n${resp.result?.topicId || ''}\n画像: ${totalImages}枚`;
        alert(msg);
      } else {
        alert(`Send failed: ${resp?.error || resp?.status || 'unknown'}`);
      }
    } catch(e){ alert(`Send failed: ${e?.message||e}`); }
  }

  const observer = new MutationObserver(()=>createButton());
  observer.observe(document.documentElement, { childList:true, subtree:true });
  createButton();
})();
