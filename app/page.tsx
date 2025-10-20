"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { KanbanCard } from '@/components/KanbanCard';
import { DraggableSidebar } from '@/components/DraggableSidebar';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import type { Topic } from '@/packages/shared/Types';
import { Download, RefreshCw, Loader2, Send, Moon, Home, Filter, BarChart3 } from 'lucide-react';

export default function Page() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/export', { cache: 'no-store' });
      const payload = await res.json();
      if (Array.isArray(payload?.data) && payload.data.length > 0) {
        setTopics(payload.data.map((d: any) => d.topic));
      } else {
        // /api/topicsも試す
        const t = await fetch('/api/topics', { cache: 'no-store' }).then(r => r.json());
        if (Array.isArray(t.topics) && t.topics.length > 0) {
          setTopics(t.topics);
        } else {
          // 両方空の場合、defaultExport.jsonを読み込む
          try {
            const defaultRes = await fetch('/defaultExport.json');
            const defaultPayload = await defaultRes.json();
            if (Array.isArray(defaultPayload?.data) && defaultPayload.data.length > 0) {
              setTopics(defaultPayload.data.map((d: any) => d.topic));
            }
          } catch (defaultErr) {
            console.warn('Failed to load default export:', defaultErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = async () => {
    try {
      const res = await fetch('/api/export', { cache: 'no-store' });
      const payload = await res.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-kanban-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('エクスポートに失敗しました');
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAiChat = async () => {
    if (!aiMessage.trim() || aiLoading) return;

    const userMessage = aiMessage;
    setAiMessage('');
    setAiLoading(true);

    const newHistory = [...aiChatHistory, { role: 'user', content: userMessage }];
    setAiChatHistory(newHistory);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: aiChatHistory })
      });
      const data = await res.json();
      
      if (data.reply) {
        setAiChatHistory([...newHistory, { role: 'assistant', content: data.reply }]);
      } else {
        alert('AIチャットに失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err) {
      console.error('AI chat failed:', err);
      alert('AIチャットに失敗しました');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <DraggableSidebar 
      initialMode="left"
      sidebarContent={
        <>
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--mc)' }}>
              Chat Kanban
            </h2>
            <p className="text-xs mt-1 opacity-70">ナビゲーション</p>
          </div>
          
          <div className="controls flex gap-2">
            <Button
              size="sm"
              onClick={() => document.documentElement.setAttribute('data-theme', 
                document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')}
              className="flex-1 flex items-center justify-center gap-1"
              style={{ backgroundColor: 'var(--bc)', color: 'var(--tx)' }}
            >
              <Moon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={fetchTopics}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1"
              style={{ backgroundColor: 'var(--mc)', color: 'white' }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={exportJSON}
              className="flex-1 flex items-center justify-center gap-1"
              style={{ backgroundColor: 'var(--ac)', color: 'white' }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* 検索ボックス */}
          <div className="search-box mt-2 relative">
            <input
              type="text"
              placeholder="メッセージを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pr-10 rounded-lg text-sm transition"
              style={{
                backgroundColor: 'var(--bc)',
                color: 'var(--tx)',
                border: '1px solid var(--borderColor)',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--mc)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--borderColor)';
              }}
              aria-label="メッセージ検索"
            />
            <i 
              className="las la-search absolute right-3 top-1/2 -translate-y-1/2"
              style={{ 
                color: 'var(--tx)', 
                opacity: 0.5,
                fontSize: '1.2rem'
              }}
            />
          </div>
          
          {/* 検索結果表示 */}
          {searching && (
            <div className="text-xs text-center py-2" style={{ color: 'var(--tx)' }}>
              検索中...
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="text-xs py-2" style={{ color: 'var(--tx)' }}>
              {searchResults.length}件の結果
            </div>
          )}

          <nav className="navigation flex flex-col gap-2 mt-2">
            <a 
              href="#" 
              className="px-4 py-2 rounded-lg transition font-medium no-underline flex items-center gap-2"
              style={{ 
                backgroundColor: 'transparent',
                border: '1px solid var(--borderColor)',
                color: 'var(--tx)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--mc)';
                e.currentTarget.style.color = 'var(--wh)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--tx)';
              }}
            >
              <Home className="w-4 h-4" /> ホーム
            </a>
            <a 
              href="#" 
              className="px-4 py-2 rounded-lg transition font-medium no-underline flex items-center gap-2"
              style={{ 
                backgroundColor: 'transparent',
                border: '1px solid var(--borderColor)',
                color: 'var(--tx)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--mc)';
                e.currentTarget.style.color = 'var(--wh)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--tx)';
              }}
            >
              <Filter className="w-4 h-4" /> フィルター
            </a>
            <a 
              href="#" 
              className="px-4 py-2 rounded-lg transition font-medium no-underline flex items-center gap-2"
              style={{ 
                backgroundColor: 'transparent',
                border: '1px solid var(--borderColor)',
                color: 'var(--tx)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--mc)';
                e.currentTarget.style.color = 'var(--wh)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--tx)';
              }}
            >
              <BarChart3 className="w-4 h-4" /> 統計
            </a>
          </nav>

          {/* AIチャットボックス */}
          <div className="ai-chat-box mt-4 flex-1 flex flex-col">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--tx)' }}>
              AIアシスタント
            </div>
            <div 
              className="chat-history flex-1 overflow-y-auto mb-2 p-2 rounded-lg text-xs"
              style={{
                backgroundColor: 'var(--bc)',
                border: '1px solid var(--borderColor)',
                maxHeight: '200px',
                minHeight: '100px'
              }}
            >
              {aiChatHistory.length === 0 ? (
                <div className="text-center opacity-50" style={{ color: 'var(--tx)' }}>
                  AIに質問してみましょう
                </div>
              ) : (
                aiChatHistory.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className="mb-2"
                    style={{ 
                      color: msg.role === 'user' ? 'var(--mc)' : 'var(--tx)',
                      fontWeight: msg.role === 'user' ? 'bold' : 'normal'
                    }}
                  >
                    <div className="text-xs opacity-70">
                      {msg.role === 'user' ? 'あなた' : 'AI'}:
                    </div>
                    <div>{msg.content}</div>
                  </div>
                ))
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="AIに質問..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAiChat();
                  }
                }}
                disabled={aiLoading}
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm transition"
                style={{
                  backgroundColor: 'var(--bc)',
                  color: 'var(--tx)',
                  border: '1px solid var(--borderColor)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--mc)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--borderColor)';
                }}
              />
              <button
                onClick={handleAiChat}
                disabled={aiLoading || !aiMessage.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition"
                style={{
                  backgroundColor: aiLoading || !aiMessage.trim() ? 'transparent' : 'var(--mc)',
                  color: 'white',
                  opacity: aiLoading || !aiMessage.trim() ? 0.3 : 1
                }}
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t text-xs text-center opacity-60" style={{ borderColor: 'var(--borderColor)' }}>
            <p>💡 このパネルは</p>
            <p>ドラッグで移動できます</p>
          </div>
        </>
      }
    >
      {/* メインコンテンツ */}
      <main className="main_content flex flex-wrap">

        {/* トピック一覧 */}
        {loading && topics.length === 0 ? (
          <section className="content_section w-full flex flex-col items-center justify-center min-h-[50vh]" style={{ color: 'var(--tx)' }}>
            <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: 'var(--mc)' }} />
            <p className="text-sm">Loading...</p>
          </section>
        ) : topics.length === 0 ? (
          <section className="content_section w-full text-center py-12 text-gray-500">
            <p className="text-lg">トピックがありません</p>
            <p className="text-sm mt-2">Chrome拡張機能からチャット履歴を送信してください</p>
          </section>
        ) : (
          topics.map((topic) => (
            <KanbanCard key={topic.id} topic={topic} />
          ))
        )}
      </main>
    </DraggableSidebar>
  );
}
