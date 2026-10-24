import React from 'react';
import { Search } from 'lucide-react';
import { RELATION_TAGS, TAG_METADATA, RelationTag, ActiveTab } from '../types';

interface SearchPromptStateProps {
  activeTab?: ActiveTab;
  onSelectTag?: (tag: RelationTag) => void;
}

export const SearchPromptState: React.FC<SearchPromptStateProps> = ({
  activeTab = 'pairs',
  onSelectTag,
}) => {
  return (
    <div
      id="search-prompt-state-container"
      className="py-20 px-4 text-center max-w-md mx-auto space-y-4 animate-in fade-in duration-150"
    >
      <div className="w-10 h-10 rounded-xl bg-[#112240] border border-[#233554] text-[#94A3B8] mx-auto flex items-center justify-center shadow-sm">
        <Search className="w-4 h-4 text-[#00D2FF]" />
      </div>

      <div className="space-y-1">
        <h2 className="font-bold text-[#F8FAFC] text-base tracking-tight">
          {activeTab === 'pairs' ? 'Search undercover pairs' : 'Search dictionary words'}
        </h2>
        <p className="text-xs text-[#94A3B8]">
          {activeTab === 'pairs'
            ? 'Type in the search bar or select a Tag Type below to explore pairs.'
            : 'Type in the search bar above to look up any word and view its connections.'}
        </p>
      </div>

      {activeTab === 'pairs' && onSelectTag && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 animate-in fade-in duration-100">
          {RELATION_TAGS.map((tag) => {
            const meta = TAG_METADATA[tag];
            return (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                title={meta.label}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#112240] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#233554] hover:border-[#38BDF8]/50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="font-mono text-[10px] text-[#00D2FF]">{meta.shortCode}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

