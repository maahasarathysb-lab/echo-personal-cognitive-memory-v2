import React, { useState, useMemo } from 'react';
import { Interaction } from '../types';
import {
  Search,
  BookOpen,
  Calendar,
  MessageSquare,
  ArrowRight,
  Trash2,
  Filter,
  Sparkles,
  Tag,
} from 'lucide-react';

interface MemoryViewProps {
  interactions: Interaction[];
  onSelectInteraction: (id: string) => void;
  onDeleteInteraction: (id: string) => Promise<void>;
  onNewReflection: () => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({
  interactions,
  onSelectInteraction,
  onDeleteInteraction,
  onNewReflection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'turns'>('newest');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Derive common theme tags from titles and content
  const commonTags = useMemo(() => {
    return ['all', 'Career', 'Learning', 'Decisions', 'Goals', 'Mindset', 'Creative'];
  }, []);

  const filteredInteractions = useMemo(() => {
    return interactions
      .filter((item) => {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (item.title || '').toLowerCase().includes(query);
        const textMatch = (item.messages || []).some((m) =>
          (m.content || '').toLowerCase().includes(query)
        );
        const matchesSearch = !query || titleMatch || textMatch;

        if (!matchesSearch) return false;

        if (selectedTag !== 'all') {
          const tag = selectedTag.toLowerCase();
          const matchesTag =
            (item.title || '').toLowerCase().includes(tag) ||
            (item.messages || []).some((m) => (m.content || '').toLowerCase().includes(tag));
          return matchesTag;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || a.updatedAt).getTime() - new Date(b.createdAt || b.updatedAt).getTime();
        }
        if (sortBy === 'turns') {
          return (b.messages?.length || 0) - (a.messages?.length || 0);
        }
        return 0;
      });
  }, [interactions, searchQuery, selectedTag, sortBy]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDeleting(true);
      await onDeleteInteraction(id);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="memory-view-container" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c202d] pb-6">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs uppercase tracking-wider font-semibold mb-1">
            <BookOpen className="w-3.5 h-3.5" /> Personal Memory Archive
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Your Cognitive Memories</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Every reflection you record is securely encrypted and isolated to your account. ECHO draws upon these memories to trace your growth and answer when you ask your past self.
          </p>
        </div>
        <button
          id="memory-new-reflection-btn"
          onClick={onNewReflection}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-[#0a0f16] text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Reflection</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="memory-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, thoughts, and reflections..."
            className="w-full bg-[#11141e] border border-[#202534] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Sort by:
          </span>
          <select
            id="memory-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#11141e] border border-[#202534] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-teal-500/50 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="turns">Most Turns</option>
          </select>
        </div>
      </div>

      {/* Theme Filter Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
          <Tag className="w-3 h-3" /> Topics:
        </span>
        {commonTags.map((tag) => {
          const isSelected = selectedTag === tag;
          return (
            <button
              key={tag}
              id={`memory-tag-${tag.toLowerCase()}`}
              onClick={() => setSelectedTag(tag)}
              className={`text-xs px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-medium'
                  : 'bg-[#11141e] text-slate-400 hover:text-slate-200 border border-[#1f2433]'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Memory Cards Grid */}
      {filteredInteractions.length === 0 ? (
        <div id="memory-empty-state" className="bg-[#11141e] border border-[#1d2230] rounded-xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-300 mb-1">No memories found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery || selectedTag !== 'all'
              ? 'Try adjusting your search query or topic filter.'
              : 'You have not recorded any cognitive reflections yet. Start your first reflection to build your memory archive.'}
          </p>
          <button
            onClick={onNewReflection}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Begin a Reflection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInteractions.map((item) => {
            const dateStr = new Date(item.createdAt || item.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const firstUserMessage = (item.messages || []).find((m) => m.role === 'user');
            const firstModelMessage = (item.messages || []).find((m) => m.role === 'model');
            const userExcerpt = firstUserMessage?.content || 'Empty reflection';
            const modelExcerpt = firstModelMessage?.content || '';

            return (
              <div
                key={item.id}
                id={`memory-card-${item.id}`}
                onClick={() => onSelectInteraction(item.id)}
                className="group relative bg-[#11141e] border border-[#1e2332] hover:border-teal-500/40 rounded-xl p-5 transition-all duration-150 hover:bg-[#131724] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors line-clamp-1">
                      {item.title || 'Untitled Reflection'}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                      </span>
                      <button
                        title="Delete reflection"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Excerpts */}
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 italic">
                      &ldquo;{userExcerpt}&rdquo;
                    </p>
                    {modelExcerpt && (
                      <div className="bg-[#0c0e15] border border-[#1a1e2b] rounded-lg p-2.5">
                        <div className="flex items-center gap-1 text-[10px] text-teal-400 font-medium mb-1">
                          <Sparkles className="w-2.5 h-2.5" /> ECHO Synthesis:
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                          {modelExcerpt}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[#181d2a] text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{item.messages?.length || 0} turn{item.messages?.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-teal-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Open in Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Inline Delete Confirmation Dialog */}
                {confirmDeleteId === item.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 bg-[#0c0e16]/95 backdrop-blur-xs rounded-xl p-5 flex flex-col justify-center items-center text-center z-10"
                  >
                    <p className="text-xs text-slate-200 font-medium mb-1">Delete this reflection?</p>
                    <p className="text-[11px] text-slate-400 mb-4 max-w-xs">
                      This will permanently remove this reflection from your isolated memory archive.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium cursor-pointer"
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="px-3 py-1.5 bg-[#1e2332] hover:bg-[#282e42] text-slate-300 rounded text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
