import React, { useState } from 'react';
import { Word, RelationTag, TAG_METADATA } from '../types';
import { Trash2, Edit2, X, Copy, Check, Link2, VenetianMask, ScanSearch, ShieldAlert } from 'lucide-react';
import { escapeCensoredWord, copyToClipboard } from '../utils/homoglyph';
import { containsNonLatinChars, containsSuspiciousCamouflage } from '../utils/charAnalyzer';

interface WordCardProps {
  word: Word;
  allWordsMap: Map<string, Word>;
  onSelectWord: (term: string) => void;
  onAddRelationToWord: (word: Word) => void;
  onEditWord: (word: Word) => void;
  onDeleteWord: (wordId: string) => void;
  onEditRelationTag: (word: Word, targetWord: Word, currentTag: RelationTag) => void;
  onUnlinkRelation: (wordAId: string, wordBId: string, tag: RelationTag) => void;
  onCopyTerm: (term: string) => void;
  onCopyAntiCensor?: (term: string, transformed: string) => void;
  onOpenAntiCensor?: (term: string, tab?: 'analyze' | 'escape') => void;
  highlightTerm?: string;
}

export const WordCard: React.FC<WordCardProps> = React.memo(({
  word,
  allWordsMap,
  onSelectWord,
  onAddRelationToWord,
  onEditWord,
  onDeleteWord,
  onEditRelationTag,
  onUnlinkRelation,
  onCopyTerm,
  onCopyAntiCensor,
  onOpenAntiCensor,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedAntiCensor, setCopiedAntiCensor] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(word.term);
    onCopyTerm(word.term);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleCopyAntiCensor = async () => {
    const transformed = escapeCensoredWord(word.term, 'cyrillic');
    await copyToClipboard(transformed);
    if (onCopyAntiCensor) {
      onCopyAntiCensor(word.term, transformed);
    } else {
      onCopyTerm(transformed);
    }
    setCopiedAntiCensor(true);
    setTimeout(() => setCopiedAntiCensor(false), 1200);
  };

  const hasCamouflage = containsSuspiciousCamouflage(word.term);
  const hasNonLatin = containsNonLatinChars(word.term);

  return (
    <article
      id={`word-card-${word.id}`}
      className="bg-[#1E293B] rounded-xl border border-[#334155] p-4 flex flex-col justify-between space-y-3.5 transition-colors hover:border-slate-500/60 group"
    >
      {/* Header with Word & Quick Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="text-base font-semibold text-slate-100 tracking-tight">
            {word.term}
          </h3>

          {/* Non-Latin or Camouflage Detection Badge */}
          {hasCamouflage ? (
            <button
              type="button"
              onClick={() => onOpenAntiCensor?.(word.term, 'analyze')}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors cursor-pointer"
              title="Peringatan: Terdeteksi kamuflase homoglif / karakter tersembunyi! Klik untuk analisis karakter."
            >
              <ShieldAlert className="w-3 h-3 text-rose-400 animate-pulse" />
              <span>Homoglif</span>
            </button>
          ) : hasNonLatin ? (
            <button
              type="button"
              onClick={() => onOpenAntiCensor?.(word.term, 'analyze')}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Kata ini mengandung karakter non-Latin. Klik untuk analisis."
            >
              <ScanSearch className="w-3 h-3 text-amber-400" />
              <span>Non-Latin</span>
            </button>
          ) : null}

          {/* Regular Copy */}
          <button
            onClick={handleCopy}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer rounded hover:bg-slate-800"
            title="Salin kata biasa"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Anti-Censor Homoglyph Copy */}
          <button
            id={`btn-anticensor-copy-${word.id}`}
            onClick={handleCopyAntiCensor}
            className={`p-1 transition-colors cursor-pointer rounded hover:bg-slate-800 ${
              copiedAntiCensor
                ? 'text-amber-400 bg-amber-500/15'
                : 'text-slate-500 hover:text-amber-400'
            }`}
            title="Salin Anti-Sensor (Homoglif Sirilik Rusia)"
          >
            {copiedAntiCensor ? (
              <Check className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VenetianMask className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Edit & Delete Actions */}
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            id={`btn-edit-word-${word.id}`}
            onClick={() => onEditWord(word)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded hover:bg-slate-800"
            title="Edit word"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            id={`btn-delete-word-${word.id}`}
            onClick={() => onDeleteWord(word.id)}
            className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded hover:bg-slate-800"
            title="Delete word"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Relations Section */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Relations ({word.relations.length})
          </span>
        </div>

        {word.relations.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-1">No relations linked yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {word.relations.map((rel) => {
              const target = allWordsMap.get(rel.targetWordId);
              const targetTerm = target?.term || '[Deleted]';
              const meta = TAG_METADATA[rel.tag] || TAG_METADATA.others;

              return (
                <div
                  key={rel.targetWordId + '-' + rel.tag}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md bg-[#0F172A] border border-[#334155] text-xs"
                >
                  <button
                    onClick={() => onSelectWord(targetTerm)}
                    className="text-slate-200 hover:text-sky-400 font-medium transition-colors cursor-pointer"
                    title={`View "${targetTerm}"`}
                  >
                    {targetTerm}
                  </button>

                  {/* Tag Type Badge showing shortCode */}
                  <button
                    onClick={() => target && onEditRelationTag(word, target, rel.tag)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder} hover:opacity-80 transition-opacity cursor-pointer`}
                    title={`Tag Type: ${meta.label} (${meta.shortCode}). Click to change.`}
                  >
                    {meta.shortCode}
                  </button>

                  {/* Remove relation */}
                  <button
                    onClick={() => onUnlinkRelation(word.id, rel.targetWordId, rel.tag)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 cursor-pointer ml-0.5"
                    title="Remove relation"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Footer: Actions */}
      <div className="pt-2 border-t border-[#334155]/50 flex items-center justify-between">
        {onOpenAntiCensor ? (
          <div className="flex items-center gap-1">
            <button
              id={`btn-open-anticensor-${word.id}`}
              type="button"
              onClick={() => onOpenAntiCensor(word.term, 'escape')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/80 hover:text-amber-300 transition-colors cursor-pointer py-1 px-1.5 rounded hover:bg-slate-800/50"
              title="Buka kata ini di Alat Anti-Sensor Homoglif"
            >
              <VenetianMask className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Anti-Sensor</span>
            </button>

            <button
              id={`btn-open-analyzer-${word.id}`}
              type="button"
              onClick={() => onOpenAntiCensor(word.term, 'analyze')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400/80 hover:text-sky-300 transition-colors cursor-pointer py-1 px-1.5 rounded hover:bg-slate-800/50"
              title="Analisis karakter non-Latin, homoglif, dan kode Unicode"
            >
              <ScanSearch className="w-3.5 h-3.5 text-sky-400" />
              <span>Analisis</span>
            </button>
          </div>
        ) : <div />}

        <button
          id={`btn-add-rel-${word.id}`}
          onClick={() => onAddRelationToWord(word)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 bg-slate-800/70 hover:bg-slate-800 px-2.5 py-1 rounded-md border border-[#334155] transition-colors cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Add Relation</span>
        </button>
      </div>
    </article>
  );
});
