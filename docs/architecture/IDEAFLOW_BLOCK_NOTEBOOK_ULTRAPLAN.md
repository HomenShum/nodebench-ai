# Ideaflow / Mew Block Notebook — Ultraplan for NodeBench

**Source studied:** `D:\VSCode Projects\Ideaflow\prod-push-mew\mew` (Ideaflow's Mew — Roam Research–style outliner)

**Why it matters:** Mew is the cleanest open implementation of the Roam / LogSeq / Notion outliner paradigm. Its data model is a graph of nodes and relations, with fractional-indexed positions, and every block is a live Lexical editor. Understanding its architecture lets us design NodeBench's entity page as **one notebook** — not a stack of panels.

---

## Part 1 — How Mew presents information

### 1.1 Everything is a node

There are **no "sections"**. There are only nodes.

```
// src/db/schema.ts — graphNodeTable
graph_node {
  pk                           uuid
  id                           text          // user-visible stable id
  version                      integer
  authorId                     text          // who created this block
  createdAt                    timestamp
  updatedAt                    timestamp
  content                      text          // JSON-serialized Chip[]
  isPublic                     boolean
  isNewRelatedObjectsPublic    boolean
  canonicalRelationId          text          // the primary parent
  isChecked                    boolean       // todo state
  slug                         text
  accessMode                   int           // READ(0) / APPEND(1) / EDIT(2)
  attributes                   json          // flexible metadata
  content_tsvector             tsvector      // full-text search index
}
```

A node is:
- A page title
- A paragraph
- A bullet
- A todo
- A heading
- An image
- A mention target

All the same table. The difference is **how it's connected**.

### 1.2 Relations connect nodes

```
// graph_relation
graph_relation {
  pk          uuid
  id          text
  authorId    text
  fromId      text          // the "parent" in parent→child
  toId        text          // the "child"
  relationTypeId  text      // e.g. "noteContent", "child", "mention"
  isPublic    boolean
  canonicalRelationId  text // circular ref: this relation's own canonical parent-relation
}
```

A relation is **typed** — "noteContent" means "this node is a paragraph within the parent's body", "child" means "this node is a sub-bullet", "mention" means "the parent mentions the child".

### 1.3 Relation types are user-definable

```
// relation_type
relation_type {
  id          text
  authorId    text
  label         text        // "cares about"
  reverseLabel  text        // "is cared about by"
  isPublic    boolean
}
```

A user can create a custom relation type ("authored-by", "inspired-by") and use it to connect nodes. This is how tags, categories, and even schema-like metadata are encoded — without a separate metadata layer.

### 1.4 Position via fractional indexing

```
// relation_lists — orders relations within a parent
relation_lists {
  nodeId         text
  relationId     text
  type           enum('pinned','noteContent','all')
  positionInt    bigint
  positionFrac   text     // e.g. "a0", "a1", "a05"
  isPublic       boolean
}
```

Each relation has a `(positionInt, positionFrac)` pair. When you insert between two items, a new `frac` is generated between them (using the `fractional-indexing` npm package). **No re-indexing ever happens** — inserting between "a0" and "a1" yields "a0V" — always O(1) regardless of list size.

Three position lists per node:
- **pinned** — user-starred children (appear at top)
- **noteContent** — the paragraphs that form the node's "body" (the long-form text)
- **all** — every child bullet

### 1.5 Content is a chip array, not a string

```typescript
// src/app/persistence/SerializedData.ts
type Chip =
  | { type: "text";       value: string; styles?: number }
  | { type: "mention";    value: string; mentionTrigger?: MentionTrigger }
  | { type: "linebreak";  value: string }
  | { type: "link";       value: string; url: string }
  | { type: "image";      url: string };

// Node content is: Chip[]
```

A node's content is an **array of typed chips**. Inline mentions (`@alice`), hashtags (`#todo`), connections (`<>cliffside-ventures`), links, images, and plain text all coexist in the same array. Styles (bold/italic) are a bitmap on text chips.

Mention triggers are special:

```typescript
// src/lib/utils.ts
HASHTAG_SYMBOL         = "#"
MENTION_SYMBOL         = "@"
CONNECTION_SYMBOL      = "<>"
PLUS_SYMBOL            = "+"
TILDE_SYMBOL           = "~"
AI_SYMBOL              = "/ai"
SEARCH_SYMBOL          = "/search"
DEEPRESEARCH_SYMBOL    = "/deepresearch"
DEEPRESEARCHTOT_SYMBOL = "/tot"
MEWAGENT_SYMBOL        = "/mewagent"
```

Typing `@alice` in any editor creates a mention chip. Typing `/ai` triggers inline AI generation. Typing `<>cliffside-ventures` creates a typed connection between the current node and the target.

### 1.6 Tree is a live view, not persisted structure

```typescript
// src/app/tree/nodes.ts
abstract class BaseTreeNode {
  id: string;
  tree: Tree;
  object: GraphObject;          // the underlying node or relation
  lexicalEditor: LexicalEditor | null;   // ← each tree node has its own editor!
  abstract childrenGroups: ChildrenGroups;
  abstract relationWithParent: GraphRelation | null;
  abstract path: string;
}
```

`TreeNode` is an **ephemeral** wrapper around a `GraphNode` plus context (its path, its parent, its children at the moment). The same `GraphNode` can appear in **multiple TreeNodes** if referenced from multiple places (e.g. a bullet that's a child of two different pages).

The tree is recomputed from the graph store on demand. Expansion state (which nodes are collapsed) is persisted separately in `expansion_state` per user per root.

### 1.7 Each block is its own Lexical editor

```typescript
// src/app/editor/NodeContentEditor.tsx
export const NodeEditor = observer(function NodeEditor({ treeNode, ... }) {
  return (
    <LexicalComposer initialConfig={createConfig(treeNode, ...)}>
      <RichTextPlugin ... />
      <ArrowKeyPlugin />              // move between blocks
      <EnterKeyPlugin />              // split into new block
      <BackspaceMergeNodesPlugin />   // merge with previous
      <ContextualGenerationPlugin />  // inline AI generation
      <RelationPlugin />              // @/#/<> triggers
      <LinkPlugin />
      <TodoPlugin />
      <SigilsPlugin />
      ...
    </LexicalComposer>
  );
});
```

**Every block has its own `<LexicalComposer>`.** The editor config is created from the block's current content. When you press Enter, a new block is created (a new `GraphNode` + relation) and focus moves to its editor. When you press Backspace on an empty block, it merges with the previous.

This is the key mental model: **the page is not one editor with many blocks. The page is many editors, one per node, visually stacked.**

### 1.8 Rendering pipeline

```
OutlineView (viewport frame: breadcrumbs, controls, right panel)
   └── OutlineContent (content container)
         ├── Header: title (NodeHeaderEditor — Lexical editor for root title)
         ├── NoteContentSection (long-form paragraphs attached to root)
         └── ChildGroups (all sub-blocks)
               ├── PointerSection (inline references)
               ├── PinnedSection (starred children)
               └── AllSection (all children)
                     └── RelatedObjectView (one per child relation)
                           ├── NodeContentEditor (block's own Lexical editor)
                           ├── NoteContentSection (its long-form paragraphs)
                           └── ChildGroups (recursion: that block's children)
```

Recursion all the way down. Each level renders its own editor.

### 1.9 Authorship & access at every level

- Every node has `authorId` (immutable)
- Every node has `isPublic` (boolean)
- Every node has `accessMode`: READ / APPEND / EDIT
- Every relation has `authorId` and `isPublic` independently

This means: the AI can author a node with `authorId = "agent:gemini"`. A user can author the next node with `authorId = "user:homen"`. A collaborator authors another with `authorId = "user:taylor"`. The page is a multi-author document at the block level.

### 1.10 AI is inline, not sidebar

`ContextualGenerationPlugin.tsx` implements `/ai` — when the user types `/ai` followed by a prompt, the plugin:
1. Captures the tree context as ASCII (parent chain + siblings + children, up to depth 7)
2. Sends to the LLM
3. Streams the result **into the current Lexical editor** as new child blocks
4. The generated blocks are authored with the agent's ID, inherit the parent's access mode

The AI doesn't produce a "brief section". It produces blocks. The blocks live alongside the user's blocks in the same notebook.

---

## Part 2 — Where NodeBench is today

### 2.1 Our current entity page

```
EntityPage (2000+ lines)
├── Header: breadcrumb, H1 title, metadata, action buttons
├── Context strip: "Since last visit" + "Saved because"
├── Activity ribbon: "Recent edits: AI brief ... YO working notes"
├── Section: Current brief
│   └── sub-sections: WHAT IT IS / WHY IT MATTERS / LIKELY QUESTIONS
│                      SOURCE TRAIL / WHAT TO DO NEXT / HOW THIS BRIEF WAS BUILT
├── Section: Working notes        ← ONE Lexical editor (the only real editor)
├── Section: Workspace rail       ← evidence pills, saved/linked badges
├── Section: Connected node       ← force-directed graph
└── Section: Research timeline    ← list of revisions
```

**The problem:** there's only ONE Lexical editor (the working notes). Everything else is statically rendered React components. The AI-generated brief is a read-only rendering of the report object. The user can't edit it. The user can't insert a thought between "What it is" and "Why it matters". The user can't `@` the entity into another page.

### 2.2 Our current data model

```
// convex/domains/product/schema.ts
productEntities     { slug, name, entityType, summary, reportCount, ... }
productReports      { entityId, title, sections[], sources[], revision, ... }
productEntityNotes  { entityId, content, blocks[], updatedAt }    ← one row per entity
productEvidenceItems { entityId, url, title, ... }
```

The brief (`productReports`) is a separate row from the notes (`productEntityNotes`). They render as different sections. They can't be interleaved.

---

## Part 3 — The ultraplan

### 3.1 Goal

Transform the entity page from **5 stacked rendered components** into **one notebook of blocks**, where:
1. The brief sections are blocks the user can edit.
2. The user's notes are blocks alongside.
3. Evidence links are mention chips inline.
4. The AI can insert new blocks via `/ai`, `/search`, `/deepresearch`.
5. Every block is independently authored, versioned, and accessed.
6. The page itself is a node in a graph — it can be mentioned from other pages, it can have parents, it compounds across sessions.

### 3.2 Phases

#### Phase 1 — Block data model (backend + sync)

Add to `convex/domains/product/schema.ts`:

```typescript
productBlocks = defineTable({
  entityId:          v.id("productEntities"),
  parentBlockId:     v.optional(v.id("productBlocks")),   // null = root-level child of the entity
  authorKind:        v.union(v.literal("user"), v.literal("agent"), v.literal("anonymous")),
  authorId:          v.optional(v.string()),                // userId or agent name
  kind:              v.union(                                // block type
    v.literal("text"),
    v.literal("heading"),
    v.literal("bullet"),
    v.literal("todo"),
    v.literal("callout"),
    v.literal("quote"),
    v.literal("code"),
    v.literal("image"),
    v.literal("evidence"),       // ← special: wraps a source URL
    v.literal("mention"),        // ← special: wraps a ref to another entity/block
    v.literal("generated_start"),// ← marker for where AI started
  ),
  content:           v.array(v.object({                      // Chip[] (like Mew)
    type:   v.union(v.literal("text"), v.literal("mention"),
                    v.literal("link"), v.literal("linebreak"), v.literal("image")),
    value:  v.string(),
    url:    v.optional(v.string()),
    styles: v.optional(v.number()),          // bitmap: bold/italic/underline/strike/code
    mentionTrigger: v.optional(v.string()),  // "@" "#" "<>" "/ai" etc.
  })),
  positionInt:       v.number(),
  positionFrac:      v.string(),             // fractional index
  isChecked:         v.optional(v.boolean()),
  accessMode:        v.union(v.literal("read"), v.literal("append"), v.literal("edit")),
  isPublic:          v.boolean(),
  attributes:        v.optional(v.any()),    // flexible metadata per kind
  createdAt:         v.number(),
  updatedAt:         v.number(),
  revision:          v.number(),
  previousBlockId:   v.optional(v.id("productBlocks")),  // for version history
})
  .index("entity_parent_position", ["entityId", "parentBlockId", "positionInt", "positionFrac"])
  .index("author_kind_updated", ["entityId", "authorKind", "updatedAt"])
```

Add a relation table for cross-block links (mentions, tags, evidence attachments):

```typescript
productBlockRelations = defineTable({
  fromBlockId:   v.id("productBlocks"),
  toEntityId:    v.optional(v.id("productEntities")),
  toBlockId:     v.optional(v.id("productBlocks")),
  toUrl:         v.optional(v.string()),
  relationKind:  v.union(v.literal("mention"), v.literal("tag"), v.literal("evidence"),
                          v.literal("derived_from"), v.literal("custom")),
  relationLabel: v.optional(v.string()),    // for custom relations
  authorKind:    v.union(v.literal("user"), v.literal("agent"), v.literal("anonymous")),
  authorId:      v.optional(v.string()),
  createdAt:     v.number(),
})
  .index("from", ["fromBlockId"])
  .index("to_entity", ["toEntityId"])
  .index("to_block", ["toBlockId"])
```

**Migration from current model:**
- Each `productReports.sections[i]` → one or more `productBlocks` with `authorKind: "agent"`, `kind: "heading"` (title) + `kind: "text"` (body), parented to the entity.
- Each `productEntityNotes` → split by markdown structure into `productBlocks` with `authorKind: "user"`.
- Each `productEvidenceItems` → a `productBlocks` of `kind: "evidence"` with url/title in content, plus a `productBlockRelations` of `relationKind: "evidence"` from the block that cites it.
- Each report revision → `previousBlockId` chain per block (Google Docs–style per-block revision history).

#### Phase 2 — Fractional indexing helper

Install `fractional-indexing` (same npm package Mew uses):

```bash
npm install fractional-indexing
```

Add `server/lib/fractionalIndex.ts`:

```typescript
import { generateNKeysBetween, generateKeyBetween } from "fractional-indexing";

export function positionBetween(
  before: { int: number; frac: string } | null,
  after:  { int: number; frac: string } | null,
): { int: number; frac: string } {
  // If same int, interpolate frac. If different int, use after's int.
  if (before && after && before.int === after.int) {
    return { int: before.int, frac: generateKeyBetween(before.frac, after.frac) };
  }
  const int = after?.int ?? Date.now();
  return { int, frac: generateKeyBetween(before?.frac ?? null, after?.frac ?? null) };
}
```

Every insert uses `positionBetween(prevBlock.position, nextBlock.position)` — O(1), no re-indexing.

#### Phase 3 — The Block component (one Lexical editor per block)

Create `src/features/entities/components/notebook/Block.tsx`:

```typescript
function Block({ block, onSplit, onMerge, onAuthorChange }: Props) {
  const initialConfig = useMemo(() => ({
    namespace: `block-${block._id}`,
    editorState: contentToLexicalState(block.content),
    nodes: [MentionNode, LinkNode, ImageNode, ...],
    onError: console.error,
  }), [block._id]);

  return (
    <div className={blockClassFor(block.kind)} data-author={block.authorKind}>
      <AuthorGutter block={block} />    {/* tiny AI/YO chip on left, like Google Docs comment bubble */}
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin contentEditable={<ContentEditable />} />
        <HistoryPlugin />
        <EnterKeyPlugin onSplit={onSplit} />          {/* Enter creates next block */}
        <BackspaceMergePlugin onMerge={onMerge} />    {/* Backspace at start merges with prev */}
        <MentionTriggerPlugin />                       {/* @/#/<> triggers */}
        <SlashCommandPlugin />                         {/* /ai, /search, /deepresearch */}
        <SyncToConvexPlugin blockId={block._id} />
      </LexicalComposer>
    </div>
  );
}
```

Each block has its own editor. The parent notebook component orchestrates focus, selection, keyboard navigation between blocks.

#### Phase 4 — The Notebook component

Create `src/features/entities/components/notebook/EntityNotebook.tsx`:

```typescript
function EntityNotebook({ entityId }: Props) {
  const blocks = useQuery(api.domains.product.blocks.listForEntity, { entityId });
  // Sort by (positionInt, positionFrac) already done server-side via index

  return (
    <div className="entity-notebook">
      <EntityHeader entityId={entityId} />   {/* title, metadata, actions */}
      <div className="blocks">
        {blocks?.map((block, idx) => (
          <Block
            key={block._id}
            block={block}
            prevBlock={blocks[idx - 1]}
            nextBlock={blocks[idx + 1]}
          />
        ))}
        <ClickToAppend onClick={appendBlock} />
      </div>
    </div>
  );
}
```

That's it. One list of blocks. No sections. No cards. No dividers. Structure emerges from heading blocks (kind: "heading") and spacing rules.

#### Phase 5 — Inline AI (`/ai`, `/search`, `/deepresearch`)

Port Mew's `ContextualGenerationPlugin` pattern. When the user types `/ai refresh what it is`:

1. Capture tree context: the current block's parent chain + siblings (the whole entity page as nested outline).
2. Send to the agent harness (our existing `server/agentHarness.ts`).
3. Stream the result as **new blocks inserted after the current one**.
4. Each streamed block gets `authorKind: "agent"`, inherits the entity's access mode.
5. User can edit the generated blocks immediately. The block's `previousBlockId` points to the agent-authored original, so we retain the unedited version for eval/distillation.

For `/search`, `/deepresearch` — same pattern, different tool chain behind the scenes.

#### Phase 6 — Mention & connection chips

Port Mew's `RelationPlugin` pattern. When the user types `@` or `<>`:

1. Dropdown appears with fuzzy search over `productEntities` + nearby blocks.
2. Selection inserts a mention chip (`{ type: "mention", value: "<entityId>", mentionTrigger: "@" }`) into the Lexical state.
3. On block save, a `productBlockRelations` row is created: `{ fromBlockId, toEntityId, relationKind: "mention", authorKind }`.

Now mentions are bidirectional. The mentioned entity's page shows a backlinks section: "3 blocks mention this entity." Clicking opens the source block.

#### Phase 7 — Evidence as blocks

Instead of a separate "Workspace rail" with evidence pills:

1. When the agent cites a source in a generated block, it inserts a link chip inline: `{ type: "link", value: "Dirk R. — Care.com | LinkedIn", url: "https://..." }`.
2. Clicking the link chip opens a hover card: preview + "promote to block" button.
3. Promoting creates a new `productBlocks` of `kind: "evidence"` as a child of the citing block (indented, like a footnote).
4. The block relation `relationKind: "evidence"` connects citing block to evidence block.

Evidence lives in the flow. Users can edit the label. Users can add their own evidence blocks by typing `/source` or pasting a URL.

#### Phase 8 — Timeline as a collapsed subtree

Instead of a "Research timeline" section at the bottom:

1. Each time the agent refreshes, it creates new blocks with `authorKind: "agent"`, and sets `previousBlockId` on the blocks it replaces.
2. The default view shows the current version (no `previousBlockId` pointer to this block from a newer one).
3. A "Show history" toggle on each block reveals its previous revisions as a collapsed subtree (Google Docs–style).
4. The old "timeline" section becomes a **view mode**: "Sort blocks by authorKind" or "Show only edits by agent in the last 24h".

No separate panel. Same data, different lens.

#### Phase 9 — Views

Same notebook, different renderings:

- **Outline view** (default) — blocks rendered as nested bullets with indentation
- **Document view** — heading blocks render as H1/H2/H3, text blocks as paragraphs, removes bullet markers. Reads like a Notion page.
- **Graph view** — nodes + mention/connection edges laid out force-directed. Same as our current `EntityMemoryGraph` but sourced from `productBlockRelations`.
- **Review view** — only blocks with `authorKind: "agent"` from the last run, side-by-side with blocks they replaced. For user to approve/reject/edit.

#### Phase 10 — Access modes at the block level

Block-level `accessMode` unlocks:

- **READ** — block is locked to authors. Collaborators see but can't edit.
- **APPEND** — collaborators can add children but can't modify the block itself. Good for comment threads on agent-generated content.
- **EDIT** — collaborators with access can modify anything.

For anonymous users (share links), the entity page's blocks default to READ unless explicitly bumped.

---

## Part 4 — Information presentation mapping

How NodeBench's current concepts map to Mew-style blocks:

| NodeBench today | Mew-style block representation |
|---|---|
| Entity (top-level page) | Root node, with slug, title, accessMode. Metadata (entityType, savedBecause) as `attributes` JSON. |
| "Since last visit" context strip | Callout block at top of notebook, auto-authored by the visit tracker. |
| "Current brief" H2 section | Heading block (kind: "heading"). Its noteContent children are the "WHAT IT IS" etc. sub-sections. |
| "WHAT IT IS" / "WHY IT MATTERS" sub-sections | Each is a heading block + text block, authored by agent. |
| Working notes (Lexical) | User-authored blocks, appended after the brief blocks. No separate container. |
| Evidence pills / workspace rail | Inline link chips in text + standalone evidence blocks (kind: "evidence") as children of their citing blocks. |
| Connected node (graph) | A view mode over `productBlockRelations` of kind: "mention" and "custom". |
| Research timeline | View mode that reveals `previousBlockId` chains. |
| Activity ribbon (AI/YO attribution) | Rendered from per-block `authorKind` + `updatedAt`. Becomes more granular. |
| "Refresh in chat" button | `/ai refresh` slash command inside any block. |
| "Prep brief" button | `/deepresearch prep` slash command — inserts a "Prep brief" heading + blocks. |
| "Open in chat" button | Still useful for long-form conversation, but most edits happen inline. |
| Entity ↔ Entity relations | `productBlockRelations` rows generated by `@entity-slug` mentions. |

---

## Part 5 — Implementation risk & sequencing

### What makes this tractable
- Lexical is already our editor — we're not swapping frameworks.
- Convex is ideal for this (reactive queries mean blocks update live across tabs).
- Mew is MIT-licensed and the algorithms we need (fractional indexing, relation lists, tree materialization) are well-documented in the codebase we just read.
- We already have authorship semantics (user/agent distinction) — we just need to surface them.

### What makes this risky
- **Per-block editor instances are expensive.** A page with 200 blocks = 200 Lexical composers. Mew uses `react-virtual` for virtualization — we should too.
- **Migration from existing `productReports.sections[]` + `productEntityNotes` to `productBlocks[]`** requires a careful one-way transform. Keep the old tables as read-only archives during transition.
- **Slash commands that call the agent harness** need streaming, cancellation, error UX. We have most of this plumbing already in `useStreamingSearch` — adapt, don't rebuild.
- **Fractional indexing edge cases** — when two users insert at the exact same position simultaneously, the `(int, frac)` tiebreaker needs careful handling. Mew's `FractionalPositionedList.ts` has this solved; port their logic directly.
- **Scope creep.** This plan lists 10 phases. We should ship Phase 1–5 first and demo. Phases 6–10 are iterative.

### Proposed sequencing

1. **Phase 1–2 (backend):** Ship `productBlocks` + `productBlockRelations` tables, fractional indexing helper, migration from old model. No UI change yet. **2–3 days.**
2. **Phase 3–4 (UI swap):** Build `EntityNotebook` + `Block`, wire to new tables. Entity page now renders as a flat block list. The user can edit any block. Split/merge/reorder work. **3–4 days.**
3. **Phase 5 (inline AI):** Port `ContextualGenerationPlugin`, wire to existing `server/agentHarness.ts`. Users can `/ai` to refresh any block. **2 days.**
4. **Phase 6 (mentions):** `@`/`<>`/`#` triggers + dropdown + `productBlockRelations` on save. Backlinks view. **2 days.**
5. **Phase 7 (evidence blocks):** Link chips + hover card + promote-to-block. Evidence as children of citing blocks. **1–2 days.**
6. **Phases 8–10:** Timeline as collapsed subtree, multiple view modes, block-level access. Iterate on real usage. **Ongoing.**

Total first-cut: **~2 weeks** for Phase 1–7. After that we'll know enough to prioritize 8–10 by what users actually reach for.

---

## Part 6 — The interview story

> "We looked at Roam, Notion, and especially Ideaflow's Mew. Mew is the cleanest implementation of the paradigm: everything is a node in a graph, relations connect nodes, positions are fractionally indexed, and every block is its own Lexical editor.
>
> Our entity page used to be 5 stacked sections — a brief, working notes, evidence rail, connected graph, timeline. They couldn't interleave. The user couldn't edit the brief. The AI couldn't insert a thought between two user notes.
>
> We rebuilt it as one notebook. Every section is gone. The page is a list of blocks. Some are authored by the agent (brief content), some by the user (notes), some are evidence with inline link chips. The user can edit anything, insert anything, mention other entities with `@`, trigger AI generation with `/ai`. Blocks carry `authorKind` so we show Google Docs–style attribution at the block level. Revisions are per-block via `previousBlockId`.
>
> Data model: two tables — `productBlocks` and `productBlockRelations`. Fractional indexing for O(1) reordering. Same pattern Mew uses in production at scale."

---

## Part 7 — References

- Mew's repo at `D:\VSCode Projects\Ideaflow\prod-push-mew\mew`
- Key files we studied:
  - `src/db/schema.ts` — graph_node, graph_relation, relation_lists, relation_type
  - `src/app/persistence/SerializedData.ts` — Chip type, SerializedNode, SerializedRelation
  - `src/app/components/OutlineView.tsx` — viewport orchestration
  - `src/app/components/OutlineContent.tsx` — block rendering pipeline
  - `src/app/components/RelatedObject/ChildGroups.tsx` — nested block rendering
  - `src/app/editor/NodeContentEditor.tsx` — per-block Lexical instance
  - `src/app/editor/plugins/ContextualGenerationPlugin.tsx` — inline AI generation
  - `src/app/graph/GraphNode.ts` — node class
  - `src/app/graph/FractionalPositionedList.ts` — fractional indexing
  - `src/app/tree/nodes.ts`, `src/app/tree/Tree.ts` — tree materialization over graph
  - `src/lib/utils.ts` — mention trigger symbols

- `fractional-indexing` npm package — https://www.npmjs.com/package/fractional-indexing

- Roam Research design principles — https://roamresearch.com/#/app/help
- LogSeq architecture — https://github.com/logseq/logseq
- Notion's data model (blocks + pages as nested tree) — public reverse-engineering at https://blog.prototypr.io/how-we-built-notion

---

*Document created 2026-04-16. Next step: review with user, then pick which phases to ship in the first sprint.*
