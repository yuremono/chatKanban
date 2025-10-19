const radioVercel = document.getElementById('radio-vercel');
const radioLocalhost = document.getElementById('radio-localhost');
const apiBaseVercel = document.getElementById('apiBaseVercel');
const apiBaseLocalhost = document.getElementById('apiBaseLocalhost');
const token = document.getElementById('token');
const save = document.getElementById('save');
const groupVercel = document.getElementById('group-vercel');
const groupLocalhost = document.getElementById('group-localhost');

// ラジオボタンのハイライト
function updateActiveGroup() {
  groupVercel.classList.toggle('active', radioVercel.checked);
  groupLocalhost.classList.toggle('active', radioLocalhost.checked);
}

radioVercel.addEventListener('change', updateActiveGroup);
radioLocalhost.addEventListener('change', updateActiveGroup);

// 設定を読み込み
chrome.storage.sync.get([
  'chatKanbanApiTarget',
  'chatKanbanApiBaseVercel',
  'chatKanbanApiBaseLocalhost',
  'chatKanbanToken'
], (res) => {
  console.log('[Options] Loaded settings:', res);
  const target = res.chatKanbanApiTarget || 'vercel';
  if (target === 'vercel') {
    radioVercel.checked = true;
  } else {
    radioLocalhost.checked = true;
  }
  apiBaseVercel.value = res.chatKanbanApiBaseVercel || 'https://chat-kanban.vercel.app';
  apiBaseLocalhost.value = res.chatKanbanApiBaseLocalhost || 'http://localhost:3000';
  token.value = res.chatKanbanToken || '';
  updateActiveGroup();
});

// 保存
save.addEventListener('click', () => {
  const target = radioVercel.checked ? 'vercel' : 'localhost';
  const saveData = {
    chatKanbanApiTarget: target,
    chatKanbanApiBaseVercel: apiBaseVercel.value,
    chatKanbanApiBaseLocalhost: apiBaseLocalhost.value,
    chatKanbanToken: token.value,
  };
  
  console.log('[Options] Saving:', saveData);
  
  chrome.storage.sync.set(saveData, () => {
    if (chrome.runtime.lastError) {
      console.error('[Options] Save error:', chrome.runtime.lastError);
      alert(`保存エラー: ${chrome.runtime.lastError.message}`);
      return;
    }
    
    // 保存後に読み取り確認
    chrome.storage.sync.get(['chatKanbanApiTarget'], (result) => {
      console.log('[Options] Saved and verified:', result);
      alert(`保存しました✓\n使用中: ${target === 'vercel' ? 'Vercel (本番)' : 'Localhost (開発)'}\n\n確認値: ${result.chatKanbanApiTarget}`);
    });
  });
});

