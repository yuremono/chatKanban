import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Copy, Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { Topic, Rally, Message } from '@/packages/shared/Types';

interface KanbanCardProps {
  topic: Topic;
  onEdit?: (topic: Topic) => void;
  onDelete?: (topic: Topic) => void;
}

// ---- helpers (module-scope) ----
function sanitizeUrl(src: string): { primary: string; fallback: string } {
  try {
    const trimmed = (src || '').trim();
    const encoded = encodeURI(trimmed);
    const fallback = encoded.replace('/rd-gg/', '/gg/');
    return { primary: encoded, fallback };
  } catch {
    return { primary: src, fallback: src };
  }
}

function LinkRow({ href }: { href: string }) {
  const { primary, fallback } = sanitizeUrl(href);
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          try {
            const w = window.open(primary, '_blank', 'noopener');
            if (!w || w.closed) window.open(fallback, '_blank', 'noopener');
          } catch {
            window.open(fallback, '_blank', 'noopener');
          }
        }}
        className="flex items-center gap-1 text-xs"
      >
        Open Image <ExternalLink className="w-3 h-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(primary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        className="flex items-center gap-1"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export function KanbanCard({ topic }: KanbanCardProps) {
  const [open, setOpen] = useState(true);
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [ralliesOpen, setRalliesOpen] = useState<Record<string, boolean>>({});
  const [messagesByRally, setMessagesByRally] = useState<Record<string, Message[]>>({});
  const [loadingRallies, setLoadingRallies] = useState<Record<string, boolean>>({});

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleRally = (rallyId: string) => {
    const isOpen = ralliesOpen[rallyId];
    setRalliesOpen((prev) => ({ ...prev, [rallyId]: !isOpen }));
    if (!isOpen && !messagesByRally[rallyId]) {
      setLoadingRallies((prev) => ({ ...prev, [rallyId]: true }));
      fetch(`/api/messages?rallyId=${encodeURIComponent(rallyId)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => {
          setMessagesByRally((prev) => ({ ...prev, [rallyId]: json.messages || [] }));
          setLoadingRallies((prev) => ({ ...prev, [rallyId]: false }));
        })
        .catch(() => {
          setLoadingRallies((prev) => ({ ...prev, [rallyId]: false }));
        });
    }
  };

  useEffect(() => {
    if (open && rallies.length === 0) {
      fetch(`/api/rallies?topicId=${encodeURIComponent(topic.id)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => {
          setRallies(json.rallies || []);
        });
    }
  }, [open, topic.id, rallies.length]);

  return (
    <section className="content_section  shadow-sm overflow-hidden">
      {/* トピックヘッダー */}
      <div
        className="topic_header cursor-pointer transition-colors p-6 flex items-start justify-between gap-6"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">
          <h2 className="topic_title  font-medium leading-tight mb-0">
            {topic.chatTitle || topic.title}
          </h2>
          <div className="topic_meta mt-3 flex items-center gap-4  flex-wrap">
            {topic.userName && <span className="user_name font-medium">{topic.userName}</span>}
            {topic.model && <span className="px-2.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--sc)', color: 'var(--wh)' }}>{topic.model}</span>}
            <span>{formatDate(topic.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="outline" className="text-xs px-2 py-0.5" style={{ backgroundColor: 'var(--bc)', color: 'var(--tx)', borderColor: 'var(--borderColor)' }}>
            {topic.visibility === 'public' ? '公開' : topic.visibility === 'unlisted' ? '限定公開' : '非公開'}
          </Badge>
          {open ? <ChevronDown className="w-5 h-5" style={{ color: 'var(--tx)' }} /> : <ChevronRight className="w-5 h-5" style={{ color: 'var(--tx)' }} />}
        </div>
      </div>

      {/* ラリー一覧 */}
      {open && (
        <div className="rally_list_bg">
          {rallies.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-8" style={{ height: '3.6em' }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--mc)' }} />
              <p className="text-sm" style={{ color: 'var(--tx)' }}>Loading...</p>
            </div>
          ) : (
            <div style={{ borderColor: 'var(--borderColor)' }} className="divide-y">
              {rallies.map((rally) => (
                <div key={rally.id} className="rally_header">
                  {/* ラリーヘッダー */}
                  <div
                    className="rally_header_text px-8 py-4 cursor-pointer transition-colors flex items-center gap-3 font-medium"
                    onClick={() => toggleRally(rally.id)}
                  >
                    {ralliesOpen[rally.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    Rally #{rally.index + 1}
                  </div>

                  {/* メッセージ一覧 */}
                  {ralliesOpen[rally.id] && (
                    <div className="px-8 pb-10 pt-4">
                      {loadingRallies[rally.id] ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 mb-3 animate-spin" style={{ color: 'var(--mc)' }} />
                          <p className="text-sm" style={{ color: 'var(--tx)' }}>Loading...</p>
                        </div>
                      ) : (messagesByRally[rally.id] || []).map((m, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-4 mb-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`w-full sm:max-w-[75%] px-4 py-3 break-words ${
                              m.role === 'user'
                                ? 'message_user rounded-[1em_0_1em_1em]'
                                : 'message_assistant rounded-[0_1em_1em_1em]'
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words leading-[1.6]">
                              {m.content}
                            </div>

                            {/* 画像リンク */}
                            {Array.isArray(m.metadata?.imageDataUrls) &&
                              m.metadata.imageDataUrls.length > 0 && (
                                <div className="flex flex-col gap-2 mt-2">
                                  {m.metadata.imageDataUrls.map((src: string, i: number) => (
                                    <LinkRow key={i} href={src} />
                                  ))}
                                </div>
                              )}
                            {(!m.metadata?.imageDataUrls || (m.metadata.imageDataUrls as any[]).length === 0) &&
                              Array.isArray(m.metadata?.resolvedImageUrls) &&
                              (m.metadata.resolvedImageUrls as any[]).length > 0 && (
                                <div className="flex flex-col gap-2 mt-2">
                                  {m.metadata.resolvedImageUrls.map((src: string, i: number) => (
                                    <LinkRow key={i} href={src} />
                                  ))}
                                </div>
                              )}
                            {(!m.metadata?.imageDataUrls || (m.metadata.imageDataUrls as any[]).length === 0) &&
                              (!m.metadata?.resolvedImageUrls || (m.metadata.resolvedImageUrls as any[]).length === 0) &&
                              Array.isArray(m.metadata?.imageUrls) &&
                              (m.metadata.imageUrls as any[]).length > 0 && (
                                <div className="flex flex-col gap-2 mt-2">
                                  {m.metadata.imageUrls
                                    .filter((src: string) => typeof src === 'string')
                                    .map((src: string, i: number) => (
                                      <LinkRow key={i} href={src} />
                                    ))}
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
