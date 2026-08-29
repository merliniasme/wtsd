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
      <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-[#334155] text-slate-400 mx-auto flex items-center justify-center">
        <Search className="w-4 h-4 text-sky-400" />
      </div>

      <div className="space-y-1">
        <h2 className="font-semibold text-slate-100 text-base">
          {activeTab === 'pairs' ? 'Search undercover pairs' : 'Search dictionary words'}
        </h2>
        <p className="text-xs text-slate-400">
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
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1E293B] text-slate-400 hover:text-slate-200 border border-[#334155] hover:border-slate-500 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="font-mono text-[10px] text-sky-400">{meta.shortCode}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
