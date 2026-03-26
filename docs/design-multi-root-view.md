# Multi-Root View & View Mode Selector -- Design Document

## Table of Contents

1. [Overview](#overview)
2. [Current State Summary](#current-state-summary)
3. [View Mode Selector](#view-mode-selector)
4. [Multi-Root View Layout](#multi-root-view-layout)
5. [Pin / Unpin UX Flow](#pin--unpin-ux-flow)
6. [Shared Individual Connectors](#shared-individual-connectors)
7. [Mobile Considerations](#mobile-considerations)
8. [State Management Changes](#state-management-changes)
9. [ASCII Wireframes](#ascii-wireframes)

---

## Overview

This document designs two interconnected features:

- **View Mode Selector** -- a minimal control for switching between tree view modes (Standard, Multi-Root, and eventually Dual-Ancestry).
- **Multi-Root View** -- a canvas mode where multiple root ancestors are pinned and their descendant trees render side-by-side with visual connections between shared individuals (married-in spouses).

The design must integrate seamlessly with the existing dark-themed sidebar, RTL layout, RootBackChip, and React Flow controls.

---

## Current State Summary

### Layout Structure

```
.app-layout (flex, row-reverse)
  +-- Sidebar (320px, right side in RTL, dark gradient)
  +-- main-content (flex: 1, contains #tree-container)
        +-- RootBackChip (absolute, top-left of canvas)
        +-- ReactFlow canvas
              +-- Controls (bottom-left)
              +-- MiniMap (bottom-right, currently disabled)
```

### Existing Canvas Overlay Positions

| Position          | Component          | Notes                                 |
|-------------------|--------------------|---------------------------------------|
| Top-right         | (empty)            | Sidebar hamburger on mobile           |
| Top-left          | RootBackChip       | Only visible after re-root            |
| Bottom-left       | React Flow Controls| Zoom +/-, fit view                    |
| Bottom-right      | MiniMap            | Currently disabled                    |

### Key Design Tokens in Use

- Floating controls: `--gradient-toggle` background, `--alpha-white-15` border, `--shadow-xl`
- Chip pill style: `--radius-full`, `--font-size-sm`, `--color-text-inverse`
- Interactive: `--transition-fast` hover, scale(0.97) active press

---

## View Mode Selector

### Design: Floating Segmented Pill

A small floating pill sits at the **top-center** of the canvas. It uses the same dark gradient style as the RootBackChip and sidebar toggle, ensuring visual consistency.

**Why top-center:**
- Top-left is occupied by RootBackChip (conditionally).
- Top-right is occupied by the sidebar hamburger on mobile.
- Bottom-left has React Flow controls.
- Top-center is the only unoccupied position and is naturally prominent without blocking tree content (trees grow downward from the root which is positioned slightly below the top).

**Why a segmented pill (not a dropdown or icon grid):**
- With only 2-3 modes, a segmented control shows all options at once -- no hidden state.
- It is immediately scannable and requires one tap to switch.
- It avoids dropdown complexity on mobile.

### Visual Specification

```
+------------------------------------------------------+
|                                                      |
|              [  شجرة واحدة  |  عدة جذور  ]            |
|                                                      |
|    RootBackChip                                      |
|    (top-left)                                        |
|                                                      |
```

**Dimensions:**
- Height: 36px
- Padding per segment: `--space-5` (12px) horizontal, `--space-2` (6px) vertical
- Border-radius: `--radius-full` (20px) on outer pill
- Inner active segment radius: 16px

**Colors:**
- Pill background: `--gradient-toggle` (matches RootBackChip)
- Pill border: `--alpha-white-15`
- Inactive segment text: `--alpha-white-50`
- Active segment background: `--alpha-white-15`
- Active segment text: `--color-text-inverse` (#fff)
- Hover on inactive: text brightens to `--alpha-white-75`

**Typography:**
- Font size: `--font-size-sm` (12px)
- Font weight: `--font-weight-medium` (500)

**Interaction:**
- Switching is instant (no page reload) -- just swaps the view mode in state
- Active segment slides with a 200ms ease transition (background highlight moves)
- On hover, inactive segments brighten subtly
- On click/tap, the segment activates immediately

**Position:**
- `position: absolute; top: var(--space-7); left: 50%; transform: translateX(-50%);`
- z-index: 10 (same as RootBackChip)

### Segment Labels

| Mode            | Arabic Label  | Icon (optional)              |
|-----------------|---------------|------------------------------|
| Standard        | شجرة واحدة    | Single tree icon (optional)  |
| Multi-Root      | عدة جذور      | Multiple trees icon (opt.)   |
| Dual-Ancestry   | نسب مزدوج     | (future, not shown yet)      |

When only 2 modes exist, the pill has 2 segments. When Dual-Ancestry is added later, a 3rd segment appears. The pill width grows naturally since segments are auto-sized by text.

### Future-Proofing for 3 Segments

With 3 segments, the pill remains compact. Arabic labels are short. Estimated widths:

- "شجرة واحدة" -- ~70px
- "عدة جذور" -- ~55px
- "نسب مزدوج" -- ~60px
- Total with padding: ~280px (well within mobile width)

If this exceeds comfortable width on very small screens (< 360px), segments can switch to icon-only mode with tooltips.

---

## Multi-Root View Layout

### Tree Arrangement

When Multi-Root mode is active, each pinned root renders its own independent subtree. The trees are laid out **horizontally**, left-to-right (in LTR canvas space -- the canvas itself is not RTL, only the app chrome is).

```
  [Root A's Tree]     GAP     [Root B's Tree]     GAP     [Root C's Tree]
```

**Spacing between trees:**
- Horizontal gap: 200px (enough to clearly separate trees without wasting space)
- This gap is distinct from the intra-tree `HORIZONTAL_GAP` (40px between siblings)

### Tree Labels (Root Headers)

Each tree gets a floating label above its root node that identifies the root ancestor. This provides orientation when zoomed out or when trees are large.

**Label Design:**
- Text: Root ancestor's display name
- Background: `--gradient-toggle` (semi-transparent variant, ~80% opacity)
- Border: `--alpha-white-10`
- Border-radius: `--radius-full`
- Font: `--font-size-sm`, `--font-weight-medium`
- Color: `--color-text-inverse`
- Position: Centered above the root node, offset by 40px upward
- Shadow: `--shadow-md`
- Contains a small "x" button to unpin this root

```
          +-- عائلة سعيد بن محمد  [x] --+
          |                              |
          +------------------------------+
                      |
              [Root Person Card]
                   /       \
              [Child]    [Child]
```

### Layout Algorithm Extension

The existing `getLayoutedElements` function handles a single root. For multi-root:

1. Run `buildTreeData` + `getLayoutedElements` independently for each pinned root.
2. Offset each subsequent tree's X coordinates by the previous tree's total width + 200px gap.
3. Merge all nodes and edges into a single nodes/edges array for React Flow.
4. Add cross-tree connector edges for shared individuals (see section below).

This keeps the existing per-tree layout algorithm untouched and composes it at a higher level.

### Visual Separation

Beyond the 200px gap, trees are separated by:

- **Root header labels** that create a clear visual anchor for each tree.
- **Subtle vertical divider line** (optional, can be toggled): A thin dashed line (1px, `--alpha-white-10` color) drawn at the midpoint between adjacent trees. This is a React Flow edge rendered as a straight vertical line with no source/target nodes -- purely decorative.
  - On reflection, this may add visual noise. Start without dividers; the 200px gap + labels should suffice. Add dividers only if user testing reveals confusion.

### MiniMap Behavior in Multi-Root Mode

The MiniMap becomes significantly more useful in Multi-Root mode since the canvas is much wider. When Multi-Root is active, the MiniMap should be enabled regardless of the current setting. Each tree appears as a distinct cluster in the MiniMap, helping users orient themselves.

---

## Pin / Unpin UX Flow

### How Users Pin Roots

There are two entry points for pinning a root:

#### Entry Point 1: The Existing Spouse Family Badge

The `spouse-family-badge` (the blue circle with a branch icon on married-in spouses) currently triggers `onRerootToAncestor` which navigates to that spouse's topmost ancestor. In Multi-Root mode, this behavior changes:

- **Standard mode**: Badge click re-roots (existing behavior, Solution 1).
- **Multi-Root mode**: Badge click **pins** that spouse's topmost ancestor as an additional tree on the canvas. If already pinned, the badge click scrolls/focuses to that tree instead.

The badge icon does not change, but its tooltip updates:
- Standard: "عرض عائلة [الاسم]" (Show [name]'s family)
- Multi-Root: "تثبيت عائلة [الاسم]" (Pin [name]'s family)

#### Entry Point 2: Pinned Roots Panel in Settings

A new section appears in the sidebar's "خيارات متقدمة" (Advanced Settings) area, **only when Multi-Root mode is active**:

```
+-- خيارات متقدمة ----------------------+
|                                        |
|  الجذور المثبتة (Pinned Roots)          |
|                                        |
|  [*] سعيد بن محمد          [unpin x]  |
|  [*] أحمد بن خالد          [unpin x]  |
|                                        |
|  + تثبيت جذر آخر...                    |
|                                        |
|  الجد الأعلى                            |
|  (existing root selector dropdown)     |
|                                        |
+----------------------------------------+
```

"تثبيت جذر آخر" (Pin another root) opens the existing root selector dropdown (already built), and selecting a root from it adds it to the pinned list instead of navigating.

### How Users Unpin Roots

Three ways to unpin:

1. **Root header label "x" button** -- Click the small "x" on the floating label above each tree on the canvas. Removing the last pinned root switches back to Standard mode automatically.
2. **Settings panel** -- Each pinned root has an "x" button in the Pinned Roots list.
3. **Switching to Standard mode** -- The segmented control switching to "شجرة واحدة" discards all pinned roots and returns to single-root view. The root used is the most recently active one (the first pinned root, or the last one interacted with).

### Initial State When Entering Multi-Root Mode

When the user switches from Standard to Multi-Root mode:

- The currently displayed root becomes the first (and only) pinned root.
- The canvas does not change visually -- a single tree remains.
- The root header label appears above it.
- The user can now pin additional roots via the badge or settings panel.

This avoids a jarring "blank canvas" or "pick your roots" modal. The transition is seamless.

### Maximum Pinned Roots

Limit to **5 pinned roots** to prevent performance issues and canvas chaos. If the user tries to pin a 6th, show a toast: "الحد الأقصى 5 جذور مثبتة" (Maximum 5 pinned roots).

---

## Shared Individual Connectors

### The Problem

When Root A's tree contains spouse Y who is a descendant of Root B, Y appears in both trees. The user needs to see that these are the same person.

### Detecting Shared Individuals

After building all per-root trees, scan for node IDs that appear in multiple trees. A person can appear as:
- A primary node (they are a direct descendant of a root)
- A spouse within another person's node (they married into the tree)

Both cases count. The detection produces a `Map<personId, rootId[]>` of individuals appearing in 2+ trees.

### Connector Design

Shared individuals are connected with a **dashed arc** that curves above the trees, linking the two instances of the same person.

**Why a curved arc above (not a straight line through):**
- A straight horizontal line would cut through other nodes and edges, creating visual clutter.
- An arc above the trees is visually clean, reminiscent of how linguistic annotations show co-reference.
- It stays out of the way of the actual tree structure.

**Visual specification:**
- Stroke: dashed (6px dash, 4px gap)
- Color: `--color-accent` (#f6ad55, the orange accent) at 60% opacity
- Stroke width: 2px
- Path: A quadratic bezier curve that arcs upward from person instance A to person instance B. The control point sits above the midpoint, elevated by 30% of the horizontal distance.
- Animation: A subtle pulse on hover (opacity 60% to 100% over 300ms)

**Label on the connector:**
- At the midpoint of the arc, a small pill label shows the shared person's name.
- Background: `--color-accent-light`, text: `--color-accent-dark`
- Font: `--font-size-xs`, `--font-weight-medium`
- This label is optional and only shown when the connector is hovered or when < 3 connectors exist (to avoid clutter with many shared individuals).

```
                    .  "فاطمة بنت أحمد"  .
                 .                          .
              .                                .
           .                                      .
     [Fatima as                              [Fatima as
      spouse in                               descendant
      Root A tree]                            in Root B tree]
```

### Highlighting Behavior

When a shared individual is clicked/selected in one tree:
- Both instances highlight with the lineage-selected style.
- The connector arc becomes fully opaque and thickens to 3px.
- If lineage tracing is active, the lineage highlights cascade correctly within each tree independently.

### When Person Is a Spouse (Not a Primary Node)

If the shared person only appears as a spouse card (within a couple node), the connector targets that specific couple node. The endpoint of the arc attaches to the spouse card's position within the node, not the node center.

---

## Mobile Considerations

### View Mode Selector on Mobile

- The segmented pill remains at top-center.
- On screens <= 480px, segment labels shorten:
  - "شجرة واحدة" becomes "واحدة"
  - "عدة جذور" becomes "عدة"
- Pill height stays 36px (comfortable touch target).
- The pill sits below the mobile hamburger button (which is top-right) -- no overlap.

### Multi-Root View on Mobile

Multi-root on mobile is inherently challenging due to the narrow viewport. The design handles it as follows:

- **Horizontal scrolling**: The canvas pans horizontally as usual (React Flow handles this). Trees extend to the right.
- **MiniMap enabled**: On mobile, when multi-root is active, a compact minimap appears at the bottom to help navigate between trees.
- **Root header labels are sticky at the top**: When a user scrolls within a tree, the root header label for the visible tree remains visible at the top of the canvas (implemented as a separate floating element that updates based on the viewport position, not as a React Flow node).
- **Pinning via badge**: Works the same -- tapping the spouse family badge pins the root. A toast confirms: "تم تثبيت عائلة [الاسم]" (Pinned [name]'s family).
- **Unpinning**: On mobile, the root header "x" button is slightly larger (32px touch target instead of 24px).

### Maximum Pinned Roots on Mobile

On screens <= 768px, limit to **3 pinned roots** instead of 5. Show toast if exceeded: "الحد الأقصى 3 جذور على الجوال" (Maximum 3 roots on mobile).

---

## State Management Changes

### New State in TreeContext

```
viewMode: 'standard' | 'multi-root' | 'dual-ancestry'
pinnedRootIds: string[]   // ordered list of pinned roots (multi-root mode)
```

### Derived State

```
isMultiRoot: viewMode === 'multi-root'
sharedIndividuals: Map<string, string[]>  // personId -> which pinnedRootIds contain them
```

### New Actions

```
setViewMode(mode)
pinRoot(rootId)
unpinRoot(rootId)
```

### Behavior Rules

- Setting `viewMode` to `'standard'` clears `pinnedRootIds` and restores `selectedRootId` to the first (or most recent) pinned root.
- Setting `viewMode` to `'multi-root'` initializes `pinnedRootIds` with `[selectedRootId]`.
- `pinRoot(id)` appends to `pinnedRootIds` if not already present and count < max.
- `unpinRoot(id)` removes from `pinnedRootIds`. If the list becomes empty, automatically switches to Standard mode.
- In Multi-Root mode, `selectedRootId` represents the "focused" tree (the one most recently interacted with). This determines which tree's individuals appear in the sidebar person list.

---

## ASCII Wireframes

### Wireframe 1: Desktop -- Standard Mode with Selector

```
+------------------------------------------------------------------+---320px---+
|                                                                  |           |
|                  [  شجرة واحدة  | *عدة جذور* ]                    | شجرة      |
|                                                                  | العائلة    |
|  +-- العودة لشجرة سعيد --+                                       |           |
|                                                                  | [search]  |
|                         [Root Person]                            |           |
|                        /      |      \                           | 42 فرد    |
|                   [Son1]   [Son2]  [Son3]====[Wife3]             | 18 عائلة   |
|                   /    \      |        |        (badge)          |           |
|              [Gchild] [Gc] [Gchild] [Gchild]                    | Person 1  |
|                                                                  | Person 2  |
|                                                                  | Person 3  |
|                                                                  | ...       |
|  [+][-][fit]                                                     |           |
|                                                                  | خيارات    |
|                                                                  | متقدمة    |
+------------------------------------------------------------------+-----------+
```

### Wireframe 2: Desktop -- Multi-Root Mode with Two Pinned Trees

```
+------------------------------------------------------------------+---320px---+
|                                                                  |           |
|                  [ شجرة واحدة  | *عدة جذور* ]                     | شجرة      |
|                                                                  | العائلة    |
|                                                                  |           |
|  +- عائلة سعيد بن محمد [x] -+        +- عائلة أحمد بن خالد [x] -+| [search]  |
|                               |        |                          |           |
|          [سعيد]               |        |       [أحمد]             | 42 فرد    |
|        /    |   \             |        |     /    |    \          | 18 عائلة   |
|     [ابن] [ابن] [ابن]===[زوجة]|        |  [ابن] [بنت] [ابن]      |           |
|      |     |      |    (badge)|  .  .  |   |           |          | Person 1  |
|    [حفيد] [حفيد] [حفيد]      | .      . [حفيد]       [حفيد]     | Person 2  |
|                               |  "فاطمة" |                       |           |
|                               |        |                          | خيارات    |
|              200px gap ------>|<------>|                          | متقدمة    |
|                                                                  |           |
|  [+][-][fit]                                              [mini] | الجذور    |
|                                                            [map] | المثبتة:   |
|                                                                  | سعيد [x]  |
|                                                                  | أحمد [x]  |
|                                                                  |+ تثبيت..  |
+------------------------------------------------------------------+-----------+
```

The dashed arc between "زوجة" in Tree A and her instance in Tree B is shown
as the dotted curve with the label "فاطمة" at its apex.

### Wireframe 3: Mobile -- Multi-Root Mode

```
+-----------------------------+
|                     [=]     |
|    [ واحدة | *عدة* ]        |
|                             |
| +- عائلة سعيد [x] -+       |
|                      |       |
|      [سعيد]          |       |
|     /    |    \      |       |
|  [ابن] [ابن] [ابن]  |       |
|                      |       |
|   <<< scroll >>>     |       |
|                      |       |
| +- عائلة أحمد [x] -+|       |
|                      |       |
|      [أحمد]          |       |
|     /    |    \      |       |
|  [ابن] [بنت] [ابن]  |       |
|                             |
| [+][-]              [mini]  |
|                      [map]  |
+-----------------------------+
```

### Wireframe 4: View Mode Selector Detail

```
Standard state (شجرة واحدة active):

    +------------------------------------------+
    |  +--------------+  +------------+        |
    |  | *شجرة واحدة* |  |  عدة جذور  |        |
    |  +--------------+  +------------+        |
    +------------------------------------------+
         active (white       inactive (50%
         bg highlight)       opacity text)

Multi-root state (عدة جذور active):

    +------------------------------------------+
    |  +--------------+  +------------+        |
    |  |  شجرة واحدة  |  | *عدة جذور* |        |
    |  +--------------+  +------------+        |
    +------------------------------------------+
```

### Wireframe 5: Pinned Roots Panel in Settings

```
+-- خيارات متقدمة -------- [v] --+
|                                 |
|  الجذور المثبتة                  |
|  +---------+  +---------+      |
|  | سعيد    |  | أحمد    |      |
|  | بن محمد |  | بن خالد |      |
|  |    [x]  |  |    [x]  |      |
|  +---------+  +---------+      |
|                                 |
|  [ + تثبيت جذر آخر...        ] |
|                                 |
|  --------                       |
|                                 |
|  الجد الأعلى                     |
|  [dropdown: اكتب للبحث...     ] |
|                                 |
+---------------------------------+
```

### Wireframe 6: Shared Individual Connector Detail

```
     Tree A                              Tree B

     [محمد]====[فاطمة]                    [فاطمة]
                  \                      /
                   \    . . . . . .    /
                    \ .    فاطمة    . /
                     .   بنت أحمد   .
                      . . . . . . .

                    dashed orange arc
                    at 60% opacity
                    with name label
                    at the apex
```

---

## Implementation Notes (Non-Code)

### Component Hierarchy

```
ViewModeSelector (new) -- floating pill on canvas
  |
FamilyTree
  |-- single root path: existing buildTreeData
  |-- multi-root path: new buildMultiRootTreeData
  |     |-- calls buildTreeData per root
  |     |-- offsets positions
  |     |-- adds cross-tree connectors
  |     |-- adds root header label nodes
  |
RootHeaderLabel (new) -- custom React Flow node type for tree labels
PinnedRootsPanel (new) -- sidebar section for managing pinned roots
```

### Performance Considerations

- Each pinned tree runs the existing layout algorithm independently. With 5 trees of ~100 nodes each, this is 500 nodes total -- well within React Flow's comfortable range.
- Shared individual detection is O(total_nodes) -- scan once after all trees are built.
- Cross-tree connectors add at most O(shared_count) edges, typically < 20.

### Accessibility

- View mode selector uses `role="radiogroup"` with `role="radio"` per segment.
- Each segment is keyboard-navigable with arrow keys.
- Root header labels and unpin buttons are focusable and have descriptive `aria-label` values.
- Cross-tree connectors are decorative and use `aria-hidden="true"`.

---

## Open Questions

1. **Divider lines between trees**: Start without them. Revisit if user testing shows confusion about tree boundaries.
2. **Connector rendering with many shared individuals**: If > 5 shared individuals exist between two trees, should connectors be collapsed into a single "N shared" indicator? Probably yes -- design this if the problem materializes.
3. **Dual-Ancestry segment**: Disabled/hidden until that feature is built, or omit the segment entirely? Recommend omitting it to avoid "coming soon" confusion.
