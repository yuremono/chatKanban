"use client";

import { useEffect, useState, useMemo } from 'react';
import { KanbanCard } from '@/components/KanbanCard';
import { DraggableSidebar } from '@/components/DraggableSidebar';
import type { Topic } from '@/packages/shared/Types';
import { Download, RefreshCw, Loader2, Send, Moon, Sun, MessageCircleMore } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

type ViewMode = 'default' | 'preview';

export default function Page() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [previewTopicId, setPreviewTopicId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [previewPanelSizes, setPreviewPanelSizes] = useState<number[]>([30, 70]);
  const [sidebarMode, setSidebarMode] = useState<'left' | 'center' | 'right'>('left');
  
  // モーダル状態
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
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
        const t = await fetch('/api/topics', { cache: 'no-store' }).then(r => r.json());
        if (Array.isArray(t.topics) && t.topics.length > 0) {
          setTopics(t.topics);
        } else {
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

  const toggleDarkMode = () => {
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    setIsDark(!isDark);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
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

  const openPreview = (topicId: string) => {
    setPreviewTopicId(topicId);
    setViewMode('preview');
  };

  const closePreview = () => {
    setViewMode('default');
    setPreviewTopicId(null);
  };

  // 2カラム配置（左右交互）
  const { leftColumn, rightColumn } = useMemo(() => {
    const left: Topic[] = [];
    const right: Topic[] = [];
    
    topics.forEach((topic, index) => {
      if (index % 2 === 0) {
        left.push(topic);
      } else {
        right.push(topic);
      }
    });
    
    return { leftColumn: left, rightColumn: right };
  }, [topics]);

  // プレビューモード時の一覧（プレビュー中のトピックを除く）
  const listTopics = useMemo(() => {
    if (viewMode === 'preview' && previewTopicId) {
      return topics.filter(t => t.id !== previewTopicId);
    }
    return topics;
  }, [topics, viewMode, previewTopicId]);

  const previewTopic = useMemo(() => {
    if (viewMode === 'preview' && previewTopicId) {
      return topics.find(t => t.id === previewTopicId);
    }
    return null;
  }, [topics, viewMode, previewTopicId]);

  useEffect(() => {
    fetchTopics();
    // リサイザー位置をlocalStorageから読み込み
    const saved = localStorage.getItem('previewPanelSizes');
    if (saved) {
      try {
        const sizes = JSON.parse(saved);
        if (Array.isArray(sizes) && sizes.length === 2) {
          setPreviewPanelSizes(sizes);
        }
      } catch (e) {
        console.error('Failed to parse saved panel sizes:', e);
      }
    }
  }, []);

  const handlePanelResize = (sizes: number[]) => {
    setPreviewPanelSizes(sizes);
    localStorage.setItem('previewPanelSizes', JSON.stringify(sizes));
  };

  return (
    <DraggableSidebar 
      initialMode="left"
      compact={true}
      onModeChange={setSidebarMode}
      hideSidebar={viewMode === 'preview' && sidebarMode === 'center'}
      sidebarContent={
        <div className="sidebar_compact">
          {/* タイトル */}
          <div style={{ 
            textAlign: 'center', 
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: 'var(--mc)',
            lineHeight: '1.2',
            marginBottom: '0.5rem'
          }}>
            chat<br />kanban
          </div>

          {/* ダークモードトグル */}
          <button
            onClick={toggleDarkMode}
            className="icon_button"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* 更新ボタン */}
          <button
            onClick={fetchTopics}
            disabled={loading}
            className="icon_button"
            style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* JSONエクスポートボタン */}
          <button
            onClick={exportJSON}
            className="icon_button"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* 区切り線 */}
          <div className="divider" />

          {/* 検索ボタン */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="icon_button"
          >
            <i className="las la-search" style={{ fontSize: '1.5rem' }} />
          </button>

          {/* AIチャットボタン */}
          <button
            onClick={() => setIsAiChatOpen(true)}
            className="icon_button"
          >
            <MessageCircleMore className="w-5 h-5" />
          </button>
        </div>
      }
    >
      {/* メインコンテンツ */}
      <main className="main_content">
        {loading && topics.length === 0 ? (
          <section className="content_section w-full flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: 'var(--mc)' }} />
            <p className="text-sm">Loading...</p>
          </section>
        ) : topics.length === 0 ? (
          <section className="content_section w-full text-center py-12">
            <p className="text-lg">トピックがありません</p>
            <p className="text-sm mt-2" style={{ opacity: 0.7 }}>Chrome拡張機能からチャット履歴を送信してください</p>
          </section>
        ) : viewMode === 'default' ? (
          // デフォルトモード：2カラム固定
          <div className="two_column_grid">
            {/* 左カラム */}
            <div className="column">
              {leftColumn.map((topic) => (
                <KanbanCard key={topic.id} topic={topic} onPreview={openPreview} />
              ))}
            </div>

            {/* 右カラム */}
            <div className="column">
              {rightColumn.map((topic) => (
                <KanbanCard key={topic.id} topic={topic} onPreview={openPreview} />
              ))}
            </div>
          </div>
        ) : sidebarMode === 'center' ? (
          // センターモード：プレビュー（3ペイン）
          <div className="preview_layout">
            <PanelGroup 
              direction="horizontal" 
              style={{ height: '100vh' }}
              onLayout={handlePanelResize}
            >
              {/* 左エリア（一覧） */}
              <Panel defaultSize={previewPanelSizes[0]} minSize={20}>
                <div className="preview_panel_container">
                  <div className="preview_list_scroll">
                    <div className="preview_list_inner">
                      {listTopics.map((topic) => (
                        <KanbanCard 
                          key={topic.id} 
                          topic={topic} 
                          onPreview={(id) => setPreviewTopicId(id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>

              {/* リサイザー（サイドバー幅） */}
              <PanelResizeHandle>
                <div className="resizer_sidebar_container">
                  <div className="nav_window resizer_nav_window">
                    <div className="nav_content flex flex-col gap-4 h-full">
                      <div className="sidebar_compact">
                        {/* タイトル */}
                        <div style={{ 
                          textAlign: 'center', 
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: 'var(--mc)',
                          lineHeight: '1.2',
                          marginBottom: '0.5rem'
                        }}>
                          chat<br />kanban
                        </div>

                        {/* ダークモードトグル */}
                        <button
                          onClick={toggleDarkMode}
                          className="icon_button"
                        >
                          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* 更新ボタン */}
                        <button
                          onClick={fetchTopics}
                          disabled={loading}
                          className="icon_button"
                          style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {/* JSONエクスポートボタン */}
                        <button
                          onClick={exportJSON}
                          className="icon_button"
                        >
                          <Download className="w-5 h-5" />
                        </button>

                        {/* 区切り線 */}
                        <div className="divider" />

                        {/* 検索ボタン */}
                        <button
                          onClick={() => setIsSearchOpen(true)}
                          className="icon_button"
                        >
                          <i className="las la-search" style={{ fontSize: '1.5rem' }} />
                        </button>

                        {/* AIチャットボタン */}
                        <button
                          onClick={() => setIsAiChatOpen(true)}
                          className="icon_button"
                        >
                          <MessageCircleMore className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </PanelResizeHandle>

              {/* 右エリア（プレビュー） */}
              <Panel defaultSize={previewPanelSizes[1]} minSize={40}>
                <div className="preview_panel_container">
                  <div className="preview_header">
                    <button onClick={closePreview} className="preview_close_button">
                      ✕ 閉じる
                    </button>
                  </div>
                  <div className="preview_content_scroll">
                    {previewTopic ? (
                      <KanbanCard topic={previewTopic} />
                    ) : (
                      <div className="preview_empty">
                        トピックが見つかりません
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </div>
        ) : (
          // 左/右モード：プレビュー（2ペイン）
          <div className="preview_layout">
            <PanelGroup 
              direction="horizontal" 
              style={{ height: '100vh' }}
              onLayout={handlePanelResize}
            >
              {/* 一覧ペイン */}
              <Panel defaultSize={previewPanelSizes[0]} minSize={20}>
                <div className="preview_panel_container" style={{ borderRight: 'var(--line)' }}>
                  <div className="preview_list_scroll">
                    <div className="preview_list_inner">
                      {listTopics.map((topic) => (
                        <KanbanCard 
                          key={topic.id} 
                          topic={topic} 
                          onPreview={(id) => setPreviewTopicId(id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle style={{
                width: '4px',
                backgroundColor: 'var(--borderColor)',
                cursor: 'col-resize',
                transition: 'background-color 0.2s'
              }} />

              {/* プレビューペイン */}
              <Panel defaultSize={previewPanelSizes[1]} minSize={40}>
                <div className="preview_panel_container">
                  <div className="preview_header">
                    <button onClick={closePreview} className="preview_close_button">
                      ✕ 閉じる
                    </button>
                  </div>
                  <div className="preview_content_scroll">
                    {previewTopic ? (
                      <KanbanCard topic={previewTopic} />
                    ) : (
                      <div className="preview_empty">
                        トピックが見つかりません
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </div>
        )}
      </main>

      {/* 検索モーダル */}
      {isSearchOpen && (
        <div 
          className="modal_overlay"
          onClick={() => setIsSearchOpen(false)}
        >
          <div 
            className="modal_content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal_header">検索</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="メッセージを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: 'var(--rad)',
                  border: '1px solid var(--borderColor)',
                  backgroundColor: 'var(--bc)',
                  color: 'var(--tx)',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--rad)',
                  border: 'none',
                  backgroundColor: 'var(--mc)',
                  color: 'white',
                  cursor: searching ? 'not-allowed' : 'pointer',
                  opacity: searching ? 0.5 : 1
                }}
              >
                {searching ? '検索中...' : '検索'}
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ color: 'var(--tx)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {searchResults.length}件の結果
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--rad)',
                        backgroundColor: 'var(--bc)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        openPreview(result.topicId);
                        setIsSearchOpen(false);
                      }}
                    >
                      <div style={{ color: 'var(--mc)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        {result.topicTitle}
                      </div>
                      <div style={{ color: 'var(--tx)', fontSize: '0.875rem' }}>
                        {result.content.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AIチャットモーダル */}
      {isAiChatOpen && (
        <div 
          className="modal_overlay"
          onClick={() => setIsAiChatOpen(false)}
        >
          <div 
            className="modal_content"
            style={{ display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal_header">AIアシスタント</h2>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: '1rem',
              padding: '1rem',
              borderRadius: 'var(--rad)',
              backgroundColor: 'var(--bc)',
              minHeight: '300px'
            }}>
              {aiChatHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--tx)', opacity: 0.5 }}>
                  AIに質問してみましょう
                </div>
              ) : (
                aiChatHistory.map((msg, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--rad)',
                      backgroundColor: msg.role === 'user' ? 'var(--mc)' : 'var(--bgColor)',
                      color: msg.role === 'user' ? 'white' : 'var(--tx)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--borderColor)'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.25rem' }}>
                      {msg.role === 'user' ? 'あなた' : 'AI'}
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>{msg.content}</div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: 'var(--rad)',
                  border: '1px solid var(--borderColor)',
                  backgroundColor: 'var(--bc)',
                  color: 'var(--tx)',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleAiChat}
                disabled={aiLoading || !aiMessage.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--rad)',
                  border: 'none',
                  backgroundColor: 'var(--mc)',
                  color: 'white',
                  cursor: aiLoading || !aiMessage.trim() ? 'not-allowed' : 'pointer',
                  opacity: aiLoading || !aiMessage.trim() ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </DraggableSidebar>
  );
}
