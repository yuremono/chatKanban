"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { KanbanCard } from '@/components/KanbanCard';
import { DraggableSidebar } from '@/components/DraggableSidebar';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import type { Topic } from '@/packages/shared/Types';
import { Download, RefreshCw, Loader2 } from 'lucide-react';

export default function Page() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchTopics();
  }, []);

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
            <DarkModeToggle />
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
          <div className="search-box mt-2">
            <input
              type="text"
              placeholder="🔍 メッセージを検索..."
              className="w-full px-3 py-2 rounded-lg text-sm transition"
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
              onChange={(e) => {
                // TODO: 検索機能の実装
                console.log('Search query:', e.target.value);
              }}
              aria-label="メッセージ検索"
            />
          </div>

          <nav className="navigation flex flex-col gap-2 mt-4">
            <a 
              href="#" 
              className="px-4 py-2 rounded-lg transition font-medium no-underline"
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
              🏠 ホーム
            </a>
            <a 
              href="#" 
              className="px-4 py-2 rounded-lg transition font-medium no-underline"
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
              🔍 フィルター
            </a>
            <a 
              href="#" 
              className="px-4 py-2 rounded-lg transition font-medium no-underline"
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
              📊 統計
            </a>
          </nav>

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
