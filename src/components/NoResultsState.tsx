import React from 'react';
import { SearchX, Plus, RefreshCw } from 'lucide-react';
import { RelationTag, TAG_METADATA, ActiveTab } from '../types';

interface NoResultsStateProps {
  searchTerm: string;
  selectedTag: RelationTag | 'all';
  activeTab?: ActiveTab;
  onClearFilters: () => void;
  onAddWithTerm: (term: string) => void;
}

export const NoResultsState: React.FC<NoResultsStateProps> = ({
  searchTerm,
  selectedTag,
  activeTab = 'pairs',
  onClearFilters,
  onAddWithTerm,
}) => {
  const itemTypeLabel = activeTab === 'pairs' ? 'pairs' : 'words';

  return (
    <div
      id="no-results-state-container"
      className="py-12 px-4 text-center max-w-md mx-auto space-y-3.5 animate-in fade-in duration-150"
    >
      <div className="w-10 h-10 rounded-xl bg-[#112240] border border-[#233554] text-[#94A3B8] mx-auto flex items-center justify-center">
        <SearchX className="w-4 h-4 text-[#94A3B8]" />
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold text-[#F8FAFC] text-sm sm:text-base">
          No matching {itemTypeLabel} found
        </h3>
        <p className="text-xs text-[#94A3B8]">
          {activeTab === 'pairs' ? (
            searchTerm && selectedTag !== 'all' ? (
              <>
                No pairs for <span className="font-medium text-[#F8FAFC]">"{searchTerm}"</span> in{' '}
                <span className="font-medium text-[#00D2FF]">"{TAG_METADATA[selectedTag].label}"</span>.
              </>
            ) : searchTerm ? (
              <>
                No pairs matched <span className="font-medium text-[#F8FAFC]">"{searchTerm}"</span>.
              </>
            ) : (
              <>
                No pairs found under{' '}
                <span className="font-medium text-[#00D2FF]">"{TAG_METADATA[selectedTag as RelationTag].label}"</span>.
              </>
            )
          ) : (
            <>
              No words matched <span className="font-medium text-[#F8FAFC]">"{searchTerm}"</span>.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
        {searchTerm && (
          <button
            id="btn-add-searched-term"
            onClick={() => onAddWithTerm(searchTerm)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#00D2FF] hover:bg-[#38BDF8] text-[#0A192F] text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add "{searchTerm}"</span>
          </button>
        )}

        <button
          id="btn-clear-all-filters"
          onClick={onClearFilters}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#112240] hover:bg-[#1E293B] text-[#F8FAFC] border border-[#233554] text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{activeTab === 'pairs' ? 'Reset Filters' : 'Reset Search'}</span>
        </button>
      </div>
    </div>
  );
};
