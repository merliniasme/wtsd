import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { RelationTag, RELATION_TAGS, TAG_METADATA, ActiveTab } from '../types';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedTag: RelationTag | 'all';
  onTagSelect: (tag: RelationTag | 'all') => void;
  activeTab?: ActiveTab;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedTag,
  onTagSelect,
  activeTab = 'pairs',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholderText =
    activeTab === 'pairs'
      ? 'Search pairs (e.g. Iron Man)...'
      : 'Search words (e.g. Batman)...';

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/' when not in input
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !(document.activeElement instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <section id="search-and-filter-section" className="space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          id="search-input-field"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onSearchChange('');
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholderText}
          className="w-full pl-10 pr-16 py-2 bg-[#1E293B] text-slate-100 placeholder-slate-500 text-sm rounded-lg border border-[#334155] focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 transition-all font-sans"
          autoComplete="off"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm ? (
            <button
              id="btn-clear-search"
              onClick={() => {
                onSearchChange('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer p-1"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-500 bg-[#0F172A] px-1.5 py-0.5 rounded border border-[#334155]">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Filter Category Pills - ONLY shown for Pairs tab */}
      {activeTab === 'pairs' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs animate-in fade-in duration-100">
          <button
            id="tag-filter-all"
            onClick={() => onTagSelect('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selectedTag === 'all'
                ? 'bg-sky-400 text-slate-950 font-semibold shadow-xs'
                : 'bg-[#1E293B] text-slate-400 hover:text-slate-200 border border-[#334155]/80'
            }`}
          >
            All
          </button>

          {RELATION_TAGS.map((tag) => {
            const meta = TAG_METADATA[tag];
            const isSelected = selectedTag === tag;

            return (
              <button
                key={tag}
                id={`tag-filter-${tag}`}
                onClick={() => onTagSelect(isSelected ? 'all' : tag)}
                title={meta.label}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-400 text-slate-950 font-semibold shadow-xs'
                    : 'bg-[#1E293B] text-slate-400 hover:text-slate-200 border border-[#334155]/80'
                }`}
              >
                <span className="font-mono text-[10px] opacity-80">{meta.shortCode}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
