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
        const t = await fetch('/api/topics', { cache: 'no-store' }).then(r => r.json());
        setTopics(t.topics ?? []);
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
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--mc)' }}>
              Chat Kanban
            </h2>
            <p className="text-xs mt-1 opacity-70">ナビゲーション</p>
          </div>
          
          <div className="controls">
            <button className="control_btn txwh">設定</button>
            <DarkModeToggle />
          </div>

          <div className="controls">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchTopics}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              更新
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportJSON}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              JSONエクスポート
            </Button>
          </div>

          <nav className="navigation flex lg:flex-col">
            <a href="#" className="no-underline font-medium hover:translate-x-1">
              ホーム
            </a>
            <a href="#" className="no-underline font-medium hover:translate-x-1">
              フィルター
            </a>
            <a href="#" className="no-underline font-medium hover:translate-x-1">
              統計
            </a>
          </nav>
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
