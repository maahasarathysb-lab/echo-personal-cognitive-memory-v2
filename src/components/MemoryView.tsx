import React, { useState, useMemo } from 'react';
import { Interaction } from '../types';
import {
  Search,
  BookOpen,
  Calendar,
  Trash2,
  Filter,
  Sparkles,
  ArrowUpRight,
  Plus,
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
    <div id="memory-view-container" className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <header className="space-y-2 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-[0.25em] text-teal-400 uppercase font-medium">
            MEMORY ARCHIVE
          </span>
          <button
            onClick={onNewReflection}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Reflection</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-neutral-100">
          Your Connected Memory Field
        </h1>

        <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl font-normal">
          Every thought you record becomes an interconnected node in your cognitive memory. ECHO weaves these entries together to trace how your perspective develops.
        </p>
      </header>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2 border-b border-white/[0.06]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="memory-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search thoughts, reflections, and realizations..."
            className="w-full bg-[#0b0e15] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-teal-500/40 transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
            Sort:
          </span>
          <select
            id="memory-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#0b0e15] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-teal-500/40 cursor-pointer font-mono"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="turns">Most Turns</option>
          </select>
        </div>
      </div>

      {/* Connected Memory Timeline Representation */}
      {filteredInteractions.length === 0 ? (
        /* Empty State */
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-neutral-200">
              Your memories will begin connecting here.
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Your cognitive timeline starts with the first thought you save.
            </p>
          </div>
          <button
            onClick={onNewReflection}
            className="mt-2 px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-mono tracking-wider flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Start Reflecting</span>
          </button>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6">
          {/* Vertical Connecting Filament */}
          <div className="absolute left-[11px] sm:left-[15px] top-4 bottom-4 w-[1px] bg-gradient-to-b from-teal-500/40 via-teal-500/20 to-transparent" />

          {filteredInteractions.map((interaction, idx) => {
            const dateObj = new Date(interaction.updatedAt || interaction.createdAt);
            const dateStr = dateObj.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            // Derive short excerpt from user thoughts
            const userThoughts = interaction.messages?.filter((m) => m.role === 'user') || [];
            const excerpt =
              userThoughts.length > 0
                ? userThoughts[0].content.slice(0, 160) + (userThoughts[0].content.length > 160 ? '...' : '')
                : 'Cognitive reflection session recorded.';

            return (
              <div key={interaction.id} className="relative group">
                {/* Timeline Node Indicator (● with subtle aura) */}
                <div className="absolute -left-[27px] sm:-left-[31px] top-5 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-4 ring-[#07090e] shadow-[0_0_8px_rgba(45,212,191,0.6)] group-hover:scale-125 transition-transform" />
                </div>

                {/* Memory Card */}
                <div
                  id={`memory-card-${interaction.id}`}
                  onClick={() => onSelectInteraction(interaction.id)}
                  className="bg-[#0b0e15]/80 hover:bg-[#0e121c] border border-white/[0.07] hover:border-teal-500/35 rounded-2xl p-5 sm:p-6 transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.3)] group-hover:translate-x-1 text-left relative"
                >
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono tracking-widest text-teal-400 uppercase font-medium">
                        MEMORY
                      </span>
                      <span className="text-neutral-600 font-mono text-xs">·</span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {dateStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-neutral-500">
                        {interaction.messages?.length || 0} turns
                      </span>
                      <button
                        title="Delete memory"
                        onClick={(e) => handleDelete(interaction.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-medium text-neutral-100 group-hover:text-teal-200 transition-colors tracking-tight">
                    {interaction.title || 'Untitled Thought'}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2 font-normal">
                    {excerpt}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-neutral-500">
                    <span>Click to open in Reflect</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-teal-300 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
