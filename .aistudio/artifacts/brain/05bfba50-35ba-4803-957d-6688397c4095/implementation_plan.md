# WePlay Game Results Screenshot Pair Importer

An intelligent bulk-intake workflow that extracts Civilian/Villager and Spy/Undercover word pairs directly from post-game WePlay victory screens, classifies them under a new dedicated **SS Verified** (`ss_verified`) tag, and provides an editable review staging queue before persisting to the Firebase Firestore dictionary.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during the Phase 1 clarification interview and govern the design:

- **Confirmed Decision 1 (Review Staging)**: Extracted word pairs will always pass through an interactive review table before saving, allowing users to edit detected terms, swap roles (Civilian ⇄ Spy), or override tags.
- **Confirmed Decision 2 (Dedicated Tagging)**: Extracted pairs will default to a brand new 7th category tag: **`ss_verified`** (ShortCode: `SSV`, Label: "SS Verified", Badge: Cyan/Teal), clearly separating screenshot-verified pairs from raw or unverified imports.
- **Confirmed Decision 3 (Bulk Queue Upload)**: The uploader supports both single and multi-screenshot bulk selection (up to 20 images at once) with drag-and-drop, clipboard pasting (`Ctrl+V`), and individual progress spinners.

---

### 1. Overview & Core Concept

- **What It Does**: Automates manual dictionary entry after finishing WePlay "Who's the Spy" rounds. Players take screenshots of the game over / victory screen showing the two opposing secret words (e.g., *Kata Warga: Singa*, *Kata Spion: Harimau*). Users upload one or more screenshots, Gemini Vision parses the secret terms, checks for existing duplicates in the local/cloud database, and stages them for quick 1-click verification into the dictionary.
- **Target Audience**: Active WePlay players and dictionary moderators who collect pairs from matches and want instant, error-free database entry without typing.
- **Key Value**: Eliminates manual text input and typo errors, handles Indonesian and multilingual game terms, verifies screenshot authenticity, and prevents duplicate pair entries.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Triggering the Importer**:
   - Available via a dedicated action button in the **Floating Action Menu (FAB)** ("Scan Result Screenshots") and an intake banner button on the **Pairs Tab** header ("Import from Screenshot").
   - Gated by `canEditDictionary` permission.
2. **Uploading Screenshots**:
   - Modal drawer with a prominent drop zone supporting file drag-and-drop, native file picker (multi-select enabled), and clipboard pasting.
   - Live thumbnail previews with badges for image count, file size, and remove-individual buttons.
3. **AI Vision Extraction**:
   - A batch processor sends screenshots to the server-side `/api/ai/extract-game-results` endpoint (powered by Gemini Vision `gemini-3.8-flash`).
   - Progress bar tracks batch extraction (e.g., "Analyzing 3 of 6 screenshots...").
4. **Interactive Review & Verification Stage**:
   - Each extracted card displays:
     - Uploaded screenshot thumbnail with click-to-zoom.
     - **Civilian Word** input field.
     - **Spy Word** input field with a quick swap (⇄) button.
     - **Category Tag selector** (defaulted to `ss_verified` "SS Verified", with options to switch to `others`, `cghn`, `aoh`, `ectm`, `mag`, `unknown`).
     - **Duplicate Indicator**: Live comparison against current dictionary.
       - *New Pair*: Green checkmark badge with target link preview.
       - *Duplicate Pair*: Amber warning badge showing existing relation and option to skip.
       - *Partial Match*: Indicates if one of the words already exists in the graph.
     - Discard/delete item button.
5. **Commit & Sync**:
   - Action buttons: "Import Verified Pairs (N)" and "Discard All".
   - Saves all confirmed entries into the local graph and Firebase Firestore, displaying a summary toast (e.g., "Added 4 new pairs under SS Verified").

#### Visual Identity & Theme
- **Backgrounds**: Seamless `#0F172A` overlay backdrop with `#1E293B` container cards and `#334155` subtle hairline dividers.
- **SS Verified Tag Styling**:
  - `shortCode`: `SSV`
  - `label`: `SS Verified`
  - `color`: `cyan`
  - `badgeBg`: `bg-cyan-500/15`
  - `badgeText`: `text-cyan-300`
  - `badgeBorder`: `border-cyan-500/30`
  - `activeBg`: `bg-cyan-400`
  - `activeText`: `text-slate-950`
- **Typography & Inputs**: Tabular numerals for queue counts (`tabular-nums`), clean single-line inputs with autofocus and clear validation borders.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dedicated Tag vs. Inferred Category**
  - *Chosen Approach*: Implement a dedicated `ss_verified` relation tag rather than forcing automated guess categories.
  - *Why*: User explicitly requested separation ("All goes into Separated Tags Called SS Verified or something not just Raw"). This provides proof of origin while allowing users to reclassify later if desired.
  - *Alternatives Considered*: Auto-categorizing with Gemini prompt was rejected per user preference.

- **Decision 2: Staged Review Queue vs. Instant Auto-Commit**
  - *Chosen Approach*: Staged editable queue before database insertion.
  - *Why*: Mobile screenshots often have varying UI elements, overlays, or player chat popups. A 10-second human review prevents garbled or swapped terms from polluting the shared database.

- **Decision 3: Server-Side Gemini Vision vs. Client-Side OCR**
  - *Chosen Approach*: Server-side Gemini 3.8 Flash Vision via `/api/ai/extract-game-results`.
  - *Why*: Client-side Tesseract.js is 30MB+ in bundle size, slow on mobile, and struggles with game graphics and stylized Indonesian fonts. Gemini 3.8 Flash handles game context, cropped roles, and localized text accurately in under 1 second.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                            │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │ FloatingAddButton     │ ──click───> │ ScreenshotResultsModal     │  │
│  └───────────────────────┘             └─────────────┬──────────────┘  │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │
                                   Files / Clipboard (Base64)
                                                       │
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Server API / LLM Vision Pipeline                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ POST /api/ai/extract-game-results                                │  │
│  │ - Gemini 3.8 Flash Vision (@google/genai)                        │  │
│  │ - Extracts: civilianWord, spyWord, roleWinner, confidence        │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
                         Structured JSON Extraction
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Client-Side Review & Duplicate Checking                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Review Queue:                                                    │  │
│  │ - Deduplication check against local wordsMap & existing pairs    │  │
│  │ - Default tag: 'ss_verified' (SSV)                               │  │
│  │ - User inline edits & term validation                            │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
                           Approved Validated Pairs
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Persistence & Bidirectional Graph                      │
│  ┌───────────────────────────────┐     ┌────────────────────────────┐  │
│  │ addOrLinkPair (wordGraph.ts)  │ ──> │ Firestore 'dictionary'     │  │
│  │ Reciprocal A <-> B Links      │     │ + LocalStorage Dual-Cache  │  │
│  └───────────────────────────────┘     └────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Model Updates
1. **Extend `RelationTag` in `src/types.ts`**:
   ```typescript
   export type RelationTag = 'unknown' | 'others' | 'aoh' | 'ectm' | 'mag' | 'cghn' | 'ss_verified';
   ```
2. **Add Metadata to `TAG_METADATA`**:
   Add `ss_verified` entry with cyan accenting, short code `SSV`, label `SS Verified`, and description `Verified from WePlay game over screenshots`.
3. **Game Results Extraction Interface**:
   ```typescript
   export interface ExtractedGameResult {
     id: string;
     fileName: string;
     imagePreviewUrl: string;
     civilianWord: string;
     spyWord: string;
     confidence: number;
     status: 'pending' | 'success' | 'error';
     errorMessage?: string;
     isDuplicate?: boolean;
     selectedTag: RelationTag;
   }
   ```
4. **Server Route (`api/ai/extract-game-results.ts`)**:
   Accepts `images: Array<{ base64: string, mimeType: string, name: string }>` and queries Gemini 3.8 Flash with a strict JSON schema prompt targeting Indonesian/English WePlay game over cards.

---

### 5. Implementation Steps Summary (Execution Preview)
1. **Types & Metadata**: Update `src/types.ts` with `'ss_verified'` tag and `ExtractedGameResult` types. Update `firebase-blueprint.json` schema to include `'ss_verified'` in enum values.
2. **Backend Vision Endpoint**: Implement `/api/ai/extract-game-results.ts` using `@google/genai` to analyze game over screens with structured JSON output.
3. **Extraction Helper**: Create `src/utils/screenshotResultsExtractor.ts` to manage image compression, base64 conversion, batch dispatching, and duplicate cross-referencing.
4. **Review Modal Component**: Build `src/components/ScreenshotResultsModal.tsx` featuring drag-and-drop zone, thumbnail list, term inputs with role-swap, tag selectors, and batch commit.
5. **UI Integration**:
   - Add trigger button to `FloatingAddButton.tsx`.
   - Add trigger button to `TabsNav.tsx` / `Pairs` view header.
   - Mount modal in `App.tsx` and connect to `handleAddRelation` / `handleCreateRelation`.
6. **Testing & Verification**: Compile applet, test extraction flows, verify bidirectional reciprocal graph links, and check Firestore persistence.
