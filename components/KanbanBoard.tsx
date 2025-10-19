'use client';

import { KanbanCard } from './KanbanCard';
import type { Topic } from '@/packages/shared/Types';

interface KanbanBoardProps {
  topics: Topic[];
  onReorder?: (topics: Topic[]) => void;
  onEdit?: (topic: Topic) => void;
  onDelete?: (topic: Topic) => void;
}

export function KanbanBoard({ topics, onEdit, onDelete }: KanbanBoardProps) {
  return (
    <div className="w-full space-y-4">
      {topics.map((topic) => (
        <KanbanCard key={topic.id} topic={topic} onEdit={onEdit} onDelete={onDelete} />)
      )}
    </div>
  );
}
