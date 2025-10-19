'use client';

import { useEffect, useState } from 'react';
import { KanbanBoard } from '@/components/KanbanBoard';
import { DraggableSidebar } from '@/components/DraggableSidebar';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import type { Topic } from '@/packages/shared/Types';

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/topics', { cache: 'no-store' });
        const json = await res.json();
        setTopics(json.topics ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleReorder = (newTopics: Topic[]) => setTopics(newTopics);
  const handleEdit = (topic: Topic) => console.log('Edit topic:', topic);
  const handleDelete = (topic: Topic) => setTopics((prev) => prev.filter((t) => t.id !== topic.id));

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Topics</h1>
            <p className="text-muted-foreground mt-2">インポート済みのトピック一覧</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowSidebar(!showSidebar)}>
              {showSidebar ? 'サイドバーを隠す' : 'サイドバーを表示'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 mb-3 animate-spin" style={{ color: 'var(--mc)' }} />
            <p className="text-sm" style={{ color: 'var(--tx)' }}>Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <KanbanBoard
                topics={topics}
                onReorder={handleReorder}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>

            {showSidebar && (
              <div className="lg:col-span-1">
                <DraggableSidebar>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">フィルター</h3>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          すべて ({topics.length})
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          公開 ({topics.filter(t => t.visibility === 'public').length})
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          非公開 ({topics.filter(t => t.visibility === 'private').length})
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">タグ</h3>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(topics.flatMap(t => t.tags))).map(tag => (
                          <Button key={tag} variant="outline" size="sm">
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </DraggableSidebar>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { KanbanBoard } from '@/components/KanbanBoard';
import { DraggableSidebar } from '@/components/DraggableSidebar';
import { Button } from '@/components/ui/Button';
import type { Topic } from '@/packages/shared/Types';

// モックデータ
const mockTopics: Topic[] = [
  {
    id: '1',
    userId: 'user1',
    title: 'React アプリケーションの設計について',
    tags: ['React', 'TypeScript', '設計'],
    visibility: 'private',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    userId: 'user1',
    title: 'Next.js の最適化手法',
    tags: ['Next.js', 'パフォーマンス', 'SEO'],
    visibility: 'public',
    createdAt: '2024-01-14T15:30:00Z',
    updatedAt: '2024-01-14T15:30:00Z',
  },
  {
    id: '3',
    userId: 'user1',
    title: 'AI チャットボットの実装',
    tags: ['AI', 'ChatGPT', 'API'],
    visibility: 'unlisted',
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-13T09:15:00Z',
  },
];

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>(mockTopics);
  const [showSidebar, setShowSidebar] = useState(true);

  const handleReorder = (newTopics: Topic[]) => {
    setTopics(newTopics);
  };

  const handleEdit = (topic: Topic) => {
    console.log('Edit topic:', topic);
  };

  const handleDelete = (topic: Topic) => {
    setTopics(topics.filter(t => t.id !== topic.id));
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Topics</h1>
            <p className="text-muted-foreground mt-2">
              チャット履歴を整理・管理する看板ビュー
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowSidebar(!showSidebar)}>
              {showSidebar ? 'サイドバーを隠す' : 'サイドバーを表示'}
            </Button>
            <Button>新しいトピック</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <KanbanBoard
              topics={topics}
              onReorder={handleReorder}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
          
          {showSidebar && (
            <div className="lg:col-span-1">
              <DraggableSidebar>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">フィルター</h3>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        すべて ({topics.length})
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        公開 ({topics.filter(t => t.visibility === 'public').length})
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        非公開 ({topics.filter(t => t.visibility === 'private').length})
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">タグ</h3>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(topics.flatMap(t => t.tags))).map(tag => (
                        <Button key={tag} variant="outline" size="sm">
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </DraggableSidebar>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


