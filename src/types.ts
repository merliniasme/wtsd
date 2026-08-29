export type RelationTag = 'others' | 'aoh' | 'ectm' | 'mag' | 'cghn';

export const RELATION_TAGS: readonly RelationTag[] = [
  'others',
  'aoh',
  'ectm',
  'mag',
  'cghn',
] as const;

export interface Relation {
  targetWordId: string;
  tag: RelationTag;
}

export interface Word {
  id: string;
  term: string;
  relations: Relation[];
  createdAt?: number;
  updatedAt?: number;
}

export interface TagInfo {
  tag: RelationTag;
  label: string;
  shortCode: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  activeBg: string;
  activeText: string;
}

export const TAG_METADATA: Record<RelationTag, TagInfo> = {
  others: {
    tag: 'others',
    label: 'Others',
    shortCode: 'OTH',
    description: 'Everyday items, miscellaneous, objects & uncategorized',
    color: 'slate',
    badgeBg: 'bg-slate-700/50',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-600/60',
    activeBg: 'bg-slate-300',
    activeText: 'text-slate-950',
  },
  aoh: {
    tag: 'aoh',
    label: 'Adult Only/Hardcore',
    shortCode: 'AOH',
    description: 'Adult-only themes, hardcore concepts, and mature topics',
    color: 'rose',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/30',
    activeBg: 'bg-rose-500',
    activeText: 'text-slate-950',
  },
  ectm: {
    tag: 'ectm',
    label: 'Entertainment/Celebrities/TV/Movies',
    shortCode: 'ECTM',
    description: 'Celebrities, TV series, movies, music & pop entertainment',
    color: 'purple',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/30',
    activeBg: 'bg-purple-500',
    activeText: 'text-slate-950',
  },
  mag: {
    tag: 'mag',
    label: 'Meme/Anime/Games',
    shortCode: 'MAG',
    description: 'Internet memes, anime, manga, video games & gaming lore',
    color: 'amber',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30',
    activeBg: 'bg-amber-400',
    activeText: 'text-slate-950',
  },
  cghn: {
    tag: 'cghn',
    label: 'Culture/Geography/History/Nature',
    shortCode: 'CGHN',
    description: 'Culture, geography, world history, monuments & nature',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    activeBg: 'bg-emerald-400',
    activeText: 'text-slate-950',
  },
};

export interface PairItem {
  id: string;
  wordA: Word;
  wordB: Word;
  tag: RelationTag;
}

export type ActiveTab = 'pairs' | 'words' | 'settings';

export interface SpyGamePair {
  wordA: Word;
  wordB: Word;
  tag: RelationTag;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
}
