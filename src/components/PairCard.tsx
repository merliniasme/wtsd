import React, { useState } from 'react';
import { PairItem, RelationTag, TAG_METADATA } from '../types';
import { Copy, Check, Tag, Unlink, VenetianMask } from 'lucide-react';
import { escapeCensoredWord, copyToClipboard } from '../utils/homoglyph';

interface PairCardProps {
  pair: PairItem;
  onSelectWord: (term: string) => void;
  onEditRelationTag: (wordA: PairItem['wordA'], wordB: PairItem['wordB'], currentTag: RelationTag) => void;
  onUnlinkRelation: (wordAId: string, wordBId: string, tag: RelationTag) => void;
  onCopyText: (text: string) => void;
  onCopyAntiCensor?: (text: string, transformed: string) => void;
}

export const PairCard: React.FC<PairCardProps> = React.memo(({
  pair,
  onSelectWord,
  onEditRelationTag,
  onUnlinkRelation,
  onCopyText,
  onCopyAntiCensor,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedAntiCensor, setCopiedAntiCensor] = useState(false);
  
  const meta = TAG_METADATA[pair.tag] || TAG_METADATA.others;

  const handleCopyPair = async () => {
    const text = `${pair.wordA.term} / ${pair.wordB.term}`;
    await copyToClipboard(text);
    onCopyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleCopyPairAntiCensor = async () => {
    const wordAEscaped = escapeCensoredWord(pair.wordA.term);
    const wordBEscaped = escapeCensoredWord(pair.wordB.term);
    const transformed = `${wordAEscaped} / ${wordBEscaped}`;
    const raw = `${pair.wordA.term} / ${pair.wordB.term}`;
    
    await copyToClipboard(transformed);
    
    if (onCopyAntiCensor) {
      onCopyAntiCensor(raw, transformed);
    } else {
      onCopyText(transformed);
    }
    
    setCopiedAntiCensor(true);
    setTimeout(() => setCopiedAntiCensor(false), 1200);
  };

  return (
    <article
      id={`pair-card-${pair.wordA.id}-${pair.wordB.id}-${pair.tag}`}
      className="bg-[#1E293B] rounded-lg border border-[#334155] p-3.5 flex items-center justify-between gap-3 transition-colors hover:border-slate-500/60 group"
    >
      {/* Pair Words & Tag Types */}
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        {/* Word A */}
        <button
          onClick={() => onSelectWord(pair.wordA.term)}
          className="text-sm font-semibold text-slate-100 hover:text-sky-400 transition-colors truncate cursor-pointer"
          title={`Filter by "${pair.wordA.term}"`}
        >
          {pair.wordA.term}
        </button>
        {/* Connection Arrow */}
        <span className="text-slate-500 text-xs font-mono select-none">⇄</span>
        {/* Word B */}
        <button
          onClick={() => onSelectWord(pair.wordB.term)}
          className="text-sm font-semibold text-slate-100 hover:text-sky-400 transition-colors truncate cursor-pointer"
          title={`Filter by "${pair.wordB.term}"`}
        >
          {pair.wordB.term}
        </button>
        
        {/* Tag Type Badge */}
        <button
          onClick={() => onEditRelationTag(pair.wordA, pair.wordB, pair.tag)}
          className={`text-[10px] px-2 py-0.5 rounded font-mono ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder} hover:opacity-80 transition-opacity cursor-pointer inline-flex items-center gap-1`}
          title={`Tag Type: ${meta.label}. Click to edit.`}
        >
          <span className="font-bold">{meta.shortCode}</span>
          <span className="opacity-80 hidden sm:inline">• {meta.label}</span>
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1 shrink-0 opacity-75 group-hover:opacity-100 transition-opacity">
        {/* Quick Copy Pair */}
        <button
          onClick={handleCopyPair}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded hover:bg-slate-800"
          title="Salin pasangan kata (Latin biasa)"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        
        {/* Anti-Censor Copy Pair (Cyrillic) */}
        <button
          onClick={handleCopyPairAntiCensor}
          className={`p-1.5 transition-colors cursor-pointer rounded hover:bg-slate-800 ${
            copiedAntiCensor
              ? 'text-amber-400 bg-amber-500/15'
              : 'text-slate-400 hover:text-amber-400'
          }`}
          title="Salin Anti-Sensor (Sisipkan spasi kosong)"
        >
          {copiedAntiCensor ? (
            <Check className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <VenetianMask className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Change Tag Type */}
        <button
          onClick={() => onEditRelationTag(pair.wordA, pair.wordB, pair.tag)}
          className="p-1.5 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer rounded hover:bg-slate-800"
          title="Change Tag Type"
        >
          <Tag className="w-3.5 h-3.5" />
        </button>
        
        {/* Unlink Pair */}
        <button
          onClick={() => onUnlinkRelation(pair.wordA.id, pair.wordB.id, pair.tag)}
          className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded hover:bg-slate-800"
          title="Unlink pair"
        >
          <Unlink className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
});
