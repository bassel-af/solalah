# Design Spec: Spouse Family Sidebar (Solution 2)

## Overview

This document specifies the UX design for Solution 2 from `docs/in-law-visibility.md`. The goal is to provide a secondary, left-side panel that displays a married-in spouse's immediate family (parents, siblings) without navigating away from the current tree view. It complements Solution 1 (re-root) by offering a quick-glance preview of the in-law family, with a bridge to Solution 1 for deeper exploration.

Three elements are defined:

1. **Trigger mechanism** -- how the sidebar is opened
2. **Sidebar content and layout** -- what information is displayed and how
3. **Interaction with existing UI** -- coexistence with the right sidebar, mobile behavior, and connection to Solution 1

---

## Terminology

- **Spouse Family Sidebar** (or "left sidebar", "in-law panel"): The new secondary panel described in this document.
- **Right sidebar** (or "main sidebar"): The existing `<Sidebar>` component on the right side, containing search, stats, people list, and PersonDetail.
- **Married-in spouse**: A spouse who is not a descendant of the current `selectedRootId` and who has relatives (parents/siblings) in the database. Identical definition to Solution 1.
- **External family**: The married-in spouse's birth family -- their parents and siblings.

---

## 1. Trigger Mechanism

### How it opens

The Spouse Family Sidebar opens when the user **clicks the existing spouse-family-badge** (the blue circle badge from Solution 1) while **holding Shift**, or through a **dedicated second action** on the badge. However, adding modifier keys is poor UX on mobile and adds cognitive load. Instead, the design uses a simpler approach:

**Primary trigger: A button in the right sidebar's PersonDetail view.**

When a married-in spouse with `hasExternalFamily === true` is selected in the right sidebar, the PersonDetail hero actions row already shows a "view family tree" button (the git-branch icon, implemented in Solution 1). We add a **second button** next to it -- a "people/users" icon button -- that opens the Spouse Family Sidebar instead of re-rooting.

This button:
- Uses the same `focusButton` style (36x36px circular icon button) from `PersonDetail.module.css`
- Contains a "users" icon (two people silhouette) to communicate "show this person's family members"
- Has `aria-label` of **"عرض أقارب [name]"** (e.g., "عرض أقارب فاطمة")
- Title tooltip matches the aria-label

**Secondary trigger: Long-press / right-click on the spouse-family-badge on the canvas.**

This is a progressive enhancement. Tapping the badge still triggers Solution 1 (re-root) as designed. But for users who want a lighter preview, long-pressing (mobile) or right-clicking (desktop) the badge opens the Spouse Family Sidebar instead. This secondary trigger is discoverable through the PersonDetail button; the badge behavior is a shortcut for power users.

**Rationale for using PersonDetail as primary trigger:**

1. The PersonDetail view is already where users go to learn about a person -- adding "show their family" there is natural.
2. It avoids overloading the small canvas badge with multiple actions.
3. On mobile, the PersonDetail button provides a comfortable 36x36px tap target.
4. It creates a clear two-action mental model: badge = navigate to their tree (Solution 1), sidebar button = peek at their family (Solution 2).

### State management

A new piece of state is needed:

```
spouseFamilySidebarPersonId: string | null
```

When set to a person ID, the Spouse Family Sidebar opens showing that person's family. When set to `null`, the sidebar is closed. This state lives in `TreeContext` so both the canvas and sidebar components can read/write it.

---

## 2. Sidebar Content and Layout

### Overall structure

The Spouse Family Sidebar is a panel on the **left side** of the screen (the "far" side in RTL layout -- opposite to the right sidebar). It uses the same dark gradient background as the right sidebar (`--gradient-sidebar`) but is **narrower** (280px vs 320px) to signal that it is a secondary, supplementary view.

The panel has a thin `border-right` (in RTL, the border on the side facing the canvas) of `1px solid var(--alpha-white-08)`, matching the right sidebar's `border-left`.

### Visual hierarchy (top to bottom)

```
+----------------------------------+
|  [X]            عائلة فاطمة      |   <-- Header
|----------------------------------|
|                                  |
|  [avatar area]                   |
|  فاطمة بنت محمد                  |   <-- Spouse identity card
|  الميلاد: ١٤٠٥هـ                |
|                                  |
|----------------------------------|
|  الوالدان                        |   <-- Parents section
|  ┃ محمد بن علي              [>]  |
|  ┃ عائشة بنت سالم           [>]  |
|                                  |
|----------------------------------|
|  الإخوة والأخوات                 |   <-- Siblings section
|  ┃ أحمد بن محمد             [>]  |
|  ┃ سارة بنت محمد            [>]  |
|  ┃ خالد بن محمد             [>]  |
|                                  |
|----------------------------------|
|                                  |
|  [عرض الشجرة الكاملة]           |   <-- Full tree button (Solution 1)
|                                  |
+----------------------------------+
```

### Header

A compact header row containing:

- **Title**: "عائلة [spouse name]" (e.g., "عائلة فاطمة") -- the spouse's first name only (not full nasab) to keep it short. Uses `--font-size-xl` (16px), `--font-weight-semibold`, `--color-text-inverse`.
- **Close button**: A 32x32px circular button with an X icon, positioned at the inline-start of the header (left in RTL = left side visually). Uses the same styling as the right sidebar's close button (`.close` class pattern). Always visible (unlike the right sidebar where close is mobile-only), because this sidebar can always be dismissed.
- The header has `padding: var(--space-7) var(--space-7)` and `border-bottom: 1px solid var(--alpha-white-08)`.

### Spouse identity card

A compact summary of the spouse whose family is being shown. This anchors the user -- "whose family am I looking at?"

- **Name**: The spouse's display name (using `getDisplayName`), `--font-size-lg`, `--font-weight-semibold`, `--color-text-inverse`.
- **Dates**: Birth/death in compact format (same as `DateInfo` with `compact={true}`) in `--alpha-white-50`.
- **Sex badge**: Same `heroSexBadge` styling as PersonDetail -- a small pill showing "ذكر" or "أنثى".
- The card has `padding: var(--space-7)` and a subtle bottom border.
- The background uses `--gradient-search-hero` (same subtle blue gradient used in the right sidebar's search hero and PersonDetail hero) to visually distinguish this section as the "subject" of the panel.

### Parents section

Section header "الوالدان" using the same `sectionTitle` style from PersonDetail (small caps, inline-start border accent in `--color-primary-light`).

Each parent is displayed as a row:
- **Name**: `--font-size-base`, `--font-weight-medium`, `--color-text-inverse`.
- **Dates**: Compact, below the name, in `--alpha-white-40`, `--font-size-xs`.
- **Gender dot**: Small 7px dot on the inline-end side (right in RTL), blue for male, pink for female. Same pattern as `PersonDetail`'s relationship rows.
- **Deceased styling**: If `isDeceased`, apply `opacity: 0.6` and muted colors. Same pattern as PersonDetail.
- **Chevron**: A left-pointing chevron (in RTL, left = "forward/into") on the far side, indicating the row is clickable.

If the parent exists in the current tree's visible individuals (`visiblePersonIds`), clicking the row navigates to that person in the right sidebar (sets `selectedPersonId` and `focusPersonId`). If not visible, the row is still shown but without the chevron and with a non-interactive style. The name is still displayed (the data exists in the database) but the user cannot navigate to them in the current tree.

If no parents exist in the database, the section is omitted entirely.

### Siblings section

Section header "الإخوة والأخوات" using the same `sectionTitle` style.

Each sibling is displayed identically to parents (name, compact dates, gender dot, deceased styling, clickable if visible). Siblings are sorted by birth year ascending, matching the tree's child ordering.

The married-in spouse themselves is **not** shown in the siblings list (they are already displayed in the identity card at the top).

If no siblings exist, the section is omitted.

### "View full tree" footer button

At the bottom of the sidebar, a prominent button that triggers Solution 1 (re-root):

- **Label**: "عرض الشجرة الكاملة" (Show the full tree)
- **Style**: Pill-shaped, full-width within padding, using `--gradient-primary` background, `--color-text-inverse` text, `--font-size-base`, `--font-weight-medium`.
- **Icon**: The same git-branch/sitemap icon used in the canvas badge and PersonDetail button, positioned before the text (in RTL, that means to the right of the text).
- **Behavior**: Triggers `setSelectedRootId(topAncestorId)`, closes the Spouse Family Sidebar, closes the right sidebar on mobile, and clears `selectedPersonId`. Identical to Solution 1's re-root action.
- The button sits in a footer area with `padding: var(--space-7)`, `border-top: 1px solid var(--alpha-white-08)`, and `margin-top: auto` to push it to the bottom.

This button is the bridge between Solution 2 (quick preview) and Solution 1 (full navigation). It answers the question: "I've seen the immediate family -- now I want to explore the full tree."

### Scrolling

The parents and siblings sections are wrapped in a scrollable container (same `composes: thin from scrollbar.module.css` pattern). The header and identity card are pinned; the footer button is pinned at the bottom. Only the relationship sections scroll.

---

## 3. Interaction with the Right Sidebar

### Can both sidebars be open simultaneously?

**Yes, on desktop. No, on mobile.**

**Desktop (above 768px):** Both sidebars can be open at the same time. The app layout uses `display: flex; flex-direction: row-reverse`. The right sidebar is a static 320px panel. The Spouse Family Sidebar is added as another panel on the opposite side. The canvas (`main-content`) sits between them and shrinks to accommodate both. With a 320px right sidebar and a 280px left sidebar, the canvas retains at least `viewport - 600px` of width -- on a 1280px screen, that is 680px, which is comfortable for the tree.

**Mobile (768px and below):** Only one sidebar can be visible at a time. Opening the Spouse Family Sidebar while the right sidebar is open will close the right sidebar first (and vice versa). This prevents the sidebars from competing for screen space and avoids confusing overlay stacking.

### Layout integration

On desktop, the Spouse Family Sidebar is part of the flex layout flow:

```
+----------------------------------------------------------------------+
| [Spouse Family   |         Canvas / Tree           |   Right Sidebar  |
|  Sidebar 280px]  |        (flex: 1)                |     320px        |
|                  |                                  |                  |
+----------------------------------------------------------------------+
```

In RTL with `flex-direction: row-reverse`, the rendering order is: right sidebar first (rightmost), then canvas (middle), then left sidebar (leftmost). The Spouse Family Sidebar component is placed after `<main>` in the JSX (which, due to `row-reverse`, renders it on the left).

The Spouse Family Sidebar does NOT use `position: fixed` on desktop. It is part of the document flow, so the canvas naturally resizes. This prevents the sidebar from overlapping tree nodes.

### Transition when opening/closing

The sidebar should animate in a way that feels lightweight and non-disruptive:

**Desktop entrance:**
- The sidebar slides in from the left edge with the canvas smoothly shrinking. Duration: `var(--transition-drawer)` (400ms, `cubic-bezier(0.4, 0, 0.2, 1)`).
- To achieve the slide effect without layout jumps, the sidebar starts with `width: 0; overflow: hidden` and transitions to `width: 280px`. The inner content has a fixed width of 280px so it does not reflow during the animation.
- Alternatively: the sidebar uses `margin-left: -280px` (collapsed, off-screen) and transitions to `margin-left: 0` (visible). This approach keeps the element in the DOM with its full width, and the negative margin pulls it out of view. The canvas adjusts as the margin changes. This is the preferred approach because it avoids width transitions which can be janky.

**Desktop exit:**
- Reverse of entrance: `margin-left` transitions from `0` to `-280px`. Duration: `var(--transition-slow)` (300ms). Slightly faster than entrance for a snappy dismissal.

**Mobile entrance:**
- The sidebar is `position: fixed; left: 0; top: 0; bottom: 0` and slides in with `transform: translateX(-100%)` (hidden) to `translateX(0)` (visible). Duration: `var(--transition-drawer)` (400ms).
- A dark overlay (`--alpha-black-60`, `backdrop-filter: blur(4px)`) appears behind it, identical to the right sidebar's mobile overlay.

**Mobile exit:**
- `translateX(0)` to `translateX(-100%)`. Duration: 300ms.
- Overlay fades out.

---

## 4. How It Closes

The Spouse Family Sidebar closes (`spouseFamilySidebarPersonId` is set to `null`) when:

1. **The user clicks the X button** in the sidebar header.
2. **The user clicks the overlay** (mobile only).
3. **The user presses Escape** -- keyboard shortcut, works on both desktop and mobile. If both sidebars are open, Escape closes the Spouse Family Sidebar first (it is the secondary/auxiliary panel).
4. **The user re-roots** (Solution 1) -- either from within the Spouse Family Sidebar's footer button or from the canvas badge. The sidebar closes because the tree context has changed and the previous spouse may no longer be relevant.
5. **The user changes `selectedRootId`** via the root dropdown in the right sidebar's settings. Same rationale as re-rooting.
6. **The user opens the Spouse Family Sidebar for a different person** -- the sidebar updates in-place (the person ID changes, content re-renders). It does not close and reopen.

The sidebar does **not** close when:
- The user selects a different person in the right sidebar (unless it is a different married-in spouse with a different family sidebar request).
- The user clicks on the canvas (pans, zooms, or clicks a node). The left sidebar stays open as a reference panel.

---

## 5. Mobile Considerations

### Mobile layout (below 768px)

On mobile, the Spouse Family Sidebar behaves as a **full-height drawer from the left edge**, mirroring the right sidebar's drawer behavior from the right edge.

- **Width**: `var(--sidebar-width-mobile)` which is `min(320px, 85vw)`. On very small screens (below 480px), it uses `100vw` (full width), same as the right sidebar.
- **Z-index**: `var(--z-sidebar)` (1000), same as the right sidebar. Since only one can be open at a time, there is no stacking conflict.
- **Overlay**: `var(--z-overlay)` (900), same as the right sidebar.

### How mobile users open it

On mobile, the primary trigger is the same PersonDetail button in the right sidebar. The flow is:

1. User taps a married-in spouse on the canvas.
2. The mobile "details" FAB appears below the spouse card.
3. User taps the FAB, which opens the right sidebar showing PersonDetail.
4. In PersonDetail's hero actions, the user taps the "show family" button (people icon).
5. The right sidebar closes. The Spouse Family Sidebar opens from the left.

This is a two-step flow, but each step is a single tap on a clear affordance. The alternative -- a separate FAB for the Spouse Family Sidebar -- would clutter the canvas with multiple floating buttons and confuse the user about which does what.

### Mobile close behavior

- Tap the X button.
- Tap the overlay.
- Swipe left (optional gesture enhancement, not required for v1).

### Body scroll lock

When the Spouse Family Sidebar is open on mobile, `document.body.style.overflow = 'hidden'` is set, matching the right sidebar's behavior. The cleanup function in `useEffect` restores it on close.

### No separate toggle button

The Spouse Family Sidebar does **not** have a mobile toggle button (hamburger icon) equivalent to the right sidebar's toggle. It is an on-demand panel that opens only in response to a specific action (viewing a spouse's family). Adding a persistent toggle would suggest it is a primary navigation element, which it is not. It is contextual.

---

## 6. Connection with Solution 1

The Spouse Family Sidebar is designed as a **preview layer** that feeds into Solution 1. The relationship is:

```
Badge click (canvas) -----> Solution 1: Full re-root
PersonDetail button ------> Solution 2: Sidebar preview
Sidebar footer button ----> Solution 1: Full re-root (from within sidebar)
```

### "View full tree" button behavior

The footer button in the Spouse Family Sidebar triggers Solution 1:

1. Sets `selectedRootId` to the spouse's `topAncestorId`.
2. Sets `spouseFamilySidebarPersonId` to `null` (closes the sidebar).
3. Sets `selectedPersonId` to `null`.
4. On mobile, also calls `setMobileSidebarOpen(false)`.
5. The tree re-renders from the spouse's ancestor. The RootBackChip appears at the top-left of the canvas.

### Clicking a person in the Spouse Family Sidebar

When a parent or sibling row is clicked in the Spouse Family Sidebar:

- **If the person is visible in the current tree** (`visiblePersonIds.has(id)`): The right sidebar opens their PersonDetail (sets `selectedPersonId` and `focusPersonId`). The Spouse Family Sidebar **stays open**. This lets users explore the in-law family members who happen to also be in the current tree, while keeping the family context visible on the left.

- **If the person is NOT in the current tree**: The row is displayed in a static (non-clickable) style, same as PersonDetail's `relPersonStatic` pattern. No chevron, no hover effect. The person exists in the database but is not part of the current root's tree. To see them, the user would need to re-root via the footer button.

### When re-root happens, sidebar data remains valid

Since all tree data (`GedcomData`) is loaded into memory at once, the Spouse Family Sidebar can display any person's family regardless of which root is currently selected. The sidebar reads from `data.individuals` and `data.families` directly, not from the tree-visible subset. The `visiblePersonIds` set determines clickability, not visibility within the sidebar.

---

## 7. Accessibility

### Keyboard

- **Focus management**: When the sidebar opens, focus moves to the close button (first focusable element). This follows the dialog/panel accessibility pattern.
- **Tab order**: Close button, then identity card (not focusable -- it is informational), then parent rows (if clickable), then sibling rows (if clickable), then the footer button.
- **Escape**: Closes the sidebar and returns focus to the element that triggered it (the PersonDetail button or the canvas badge).
- **Arrow keys**: Not needed for v1. The list of parents/siblings is short enough that Tab navigation suffices.

### ARIA

- The sidebar container has `role="complementary"` and `aria-label="عائلة [spouse name]"`.
- The overlay (mobile) has `aria-hidden="true"` since it is purely decorative/functional.
- Each clickable person row has `role="button"` (it is already a `<button>` element in the current pattern).
- The close button has `aria-label="إغلاق لوحة العائلة"`.

### Screen reader announcements

When the sidebar opens, the `aria-label` on the container announces the context: "عائلة فاطمة" (Fatima's family). The section headings ("الوالدان", "الإخوة والأخوات") provide structure via `<h3>` elements.

---

## 8. State Management Summary

### New state in TreeContext

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `spouseFamilySidebarPersonId` | `string \| null` | `null` | ID of the person whose family is shown in the left sidebar. `null` = closed. |

### New setter in TreeContext

```
setSpouseFamilySidebarPersonId: (id: string | null) => void
```

### Derived data (computed in the component)

The sidebar component computes these from `data` and the person ID:

- `spousePerson`: `data.individuals[spouseFamilySidebarPersonId]`
- `spouseRelationships`: `getPersonRelationships(data, spouseFamilySidebarPersonId)` -- reuses the existing function to get parents, siblings, etc.
- `topAncestorId`: `findTopmostAncestor(data, spouseFamilySidebarPersonId)` -- for the footer re-root button.

No new data fetching is needed. Everything comes from the already-loaded `GedcomData`.

---

## 9. Component Changes Summary

| Component | Change |
|-----------|--------|
| `TreeContext.tsx` | Add `spouseFamilySidebarPersonId` state and setter. |
| New: `SpouseFamilySidebar.tsx` | New component in `src/components/ui/SpouseFamilySidebar/`. Renders the left-side panel with header, identity card, parents, siblings, and footer button. |
| New: `SpouseFamilySidebar.module.css` | Styles for the new sidebar. Reuses design tokens and patterns from `Sidebar.module.css` and `PersonDetail.module.css`. |
| `PersonDetail.tsx` | Add a second icon button in `heroActions` for opening the Spouse Family Sidebar (alongside the existing re-root button). Only shown when `hasExternalFamily`. |
| `PersonDetail.module.css` | No new styles needed -- the button reuses `focusButton`. |
| `WorkspaceTreeClient.tsx` | Add `<SpouseFamilySidebar />` to the `app-layout` div, placed after `<main>` in JSX. |
| `FamilyTreeClient.tsx` | Same -- add `<SpouseFamilySidebar />` to the layout. |
| `layout.css` | No changes needed. The flex layout with `row-reverse` already handles a third child element correctly (it appears on the left). |
| `Sidebar.tsx` | On mobile, add logic to close the Spouse Family Sidebar if it is open when the right sidebar opens (mutual exclusion on mobile). |

---

## 10. Visual Reference (ASCII Wireframes)

### Desktop -- both sidebars open

```
+------------------------------------------------------------------------+
| عائلة فاطمة  [X] |                                        [sidebar]   |
|                   |    Canvas                              |           |
| فاطمة بنت محمد    |                                        |  [person  |
| الميلاد: ١٤٠٥هـ  |                                        |  detail]  |
|                   |         +--------+    ----  +--------+ |           |
| الوالدان          |         | Ahmad  |----line--|  Fatma | |  فاطمة    |
| ┃ محمد بن علي [>] |         |        |          |        | |  بنت محمد |
| ┃ عائشة      [>] |         +--------+          +--------+ |  ...      |
|                   |              |                          |           |
| الإخوة والأخوات   |         +---------+                    |           |
| ┃ أحمد        [>] |         | Child 1 |                    |           |
| ┃ سارة        [>] |         +---------+                    |           |
| ┃ خالد        [>] |                                        |           |
|                   |                                        |           |
| [عرض الشجرة      |                                        |           |
|  الكاملة]         |                                        |           |
+------------------------------------------------------------------------+
  280px                      flex: 1                           320px
```

### Desktop -- only Spouse Family Sidebar open (right sidebar showing list, not detail)

```
+------------------------------------------------------------------------+
| عائلة فاطمة  [X] |                                    [sidebar]       |
|                   |    Canvas                          |               |
| فاطمة بنت محمد    |                                    |  بحث...       |
| ١٤٠٥هـ           |                                    |  ٤٣ فرد       |
|                   |                                    |  ١٢ عائلة     |
| الوالدان          |                                    |               |
| ┃ محمد بن علي [>] |                                    |  محمد بن سعيد |
| ┃ عائشة      [>] |                                    |  أحمد بن سعيد |
|                   |                                    |  ...          |
| الإخوة والأخوات   |                                    |               |
| ┃ أحمد        [>] |                                    |               |
| ┃ سارة        [>] |                                    |               |
|                   |                                    |               |
| [عرض الشجرة      |                                    |               |
|  الكاملة]         |                                    |               |
+------------------------------------------------------------------------+
```

### Mobile -- Spouse Family Sidebar open

```
+-------------------------+
|                         |  <-- canvas (behind overlay)
|  [dark overlay]         |
|                         |
+------------+            |
| [X] عائلة  |            |
|     فاطمة  |            |
|------------|            |
| فاطمة      |            |
| بنت محمد   |            |
| ١٤٠٥هـ     |            |
|------------|            |
| الوالدان   |            |
| ┃ محمد [>] |            |
| ┃ عائشة   |            |
|            |            |
| الإخوة     |            |
| ┃ أحمد [>] |            |
| ┃ سارة [>] |            |
|            |            |
| [عرض       |            |
|  الشجرة]   |            |
+------------+            |
|            |            |
+-------------------------+
    85vw / 320px max
```

### Mobile -- flow to open

```
Step 1: Tap spouse on canvas
+-------------------------+
|                   [ham] |
|                         |
|   +------+  --  +------+
|   |Ahmad |  --  |Fatma |
|   |      |      |[fab] |  <-- "التفاصيل" FAB appears
|   +------+      +------+
+-------------------------+

Step 2: Tap FAB -> right sidebar opens with PersonDetail
+-------------------------+
|              +---------+|
|              | فاطمة   ||
|              | بنت محمد ||
|              | [tree]  ||
|              | [people]|| <-- new "people" button
|              | [focus] ||
|              | [edit]  ||
|              |         ||
|              | ...     ||
+-------------------------+

Step 3: Tap [people] button -> right sidebar closes, left sidebar opens
+-------------------------+
| [X] عائلة  |            |
|     فاطمة  |            |
|------------|            |
| ...        |            |
+-------------------------+
```

---

## 11. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Spouse has parents but no siblings | Show parents section only. Siblings section is omitted. Footer button still appears. |
| Spouse has siblings but no parents | Show siblings section only. Parents section is omitted. |
| Spouse has no parents AND no siblings in DB | This should not happen -- `hasExternalFamily` would be `false`, so the trigger button would not appear. Guard: if the sidebar opens for such a person, show a message "لا توجد بيانات عن عائلة هذا الشخص" and the close button. |
| User opens sidebar for spouse A, then opens it for spouse B | The sidebar content updates in-place. A brief crossfade animation (150ms opacity transition) smooths the content swap. The sidebar does not close and reopen. |
| The spouse themselves is in visiblePersonIds | This is expected (spouses are always visible in the tree). The identity card at the top is not clickable (the user already selected this person). |
| A parent or sibling of the spouse is also the current selectedRootId | Clicking that person's row navigates to them in the right sidebar and focuses the tree on them. No special handling needed. |
| The user re-roots while the sidebar is open | The sidebar closes (see section 4). The tree navigates to the new root. |
| The spouse is private (`isPrivate`) | Private individuals do not render on the canvas, so they cannot be selected and the sidebar cannot be triggered for them. No guard needed. |
| Multiple marriages -- same person has families in multiple branches | Each spouse's family is independent. The sidebar shows whichever spouse was selected. |
| Screen width too narrow for both sidebars (e.g., 768px-900px) | At these widths, the canvas between two sidebars would be only 100-300px. This is the mobile breakpoint range where only one sidebar is open at a time. The 768px breakpoint naturally handles this. For an extra safety margin, consider a wider breakpoint (e.g., 960px) for the "mutual exclusion" behavior, but 768px is sufficient since tablet users can scroll/pinch the tree. |
| User navigates away from the tree page | All state resets. The sidebar closes naturally when the component unmounts. |

---

## 12. Design Token Usage

The Spouse Family Sidebar reuses existing tokens throughout. No new tokens are needed.

| Element | Tokens Used |
|---------|-------------|
| Sidebar background | `--gradient-sidebar` |
| Sidebar border | `--alpha-white-08` |
| Sidebar width | `280px` (new constant, not tokenized -- it is component-specific) |
| Header text | `--font-size-xl`, `--font-weight-semibold`, `--color-text-inverse` |
| Close button | `--alpha-white-08` bg, `--alpha-white-10` border, `--radius-xl` |
| Identity card bg | `--gradient-search-hero` |
| Section titles | `--font-size-xs`, `--font-weight-semibold`, `--color-primary-light`, inline-start border accent |
| Person rows | `--font-size-base` name, `--font-size-xs` dates, `--alpha-white-40` dates color |
| Gender dots | `rgba(99, 179, 237, 0.5)` male, `rgba(237, 100, 166, 0.5)` female |
| Footer button | `--gradient-primary`, `--color-text-inverse`, `--radius-full` |
| Transitions | `--transition-drawer` for open/close, `--transition-fast` for hover states |
| Shadow | `--shadow-sidebar` (desktop), `--shadow-sidebar-mobile` (mobile) |
| Z-index | `--z-sidebar` (mobile), no z-index needed on desktop (flow layout) |
| Mobile overlay | `--alpha-black-60`, `backdrop-filter: blur(4px)`, `--z-overlay` |
| Scrollbar | `composes: thin from scrollbar.module.css` |

---

## 13. Summary of Interactions

```
                    +-------------------+
                    |                   |
                    |   Canvas (tree)   |
                    |                   |
                    |  [badge] on       |
                    |  spouse card      |
                    |    |              |
                    |    | tap          |
                    |    v              |
                    |  Solution 1      |-----> Re-root (existing)
                    |  (re-root)       |
                    +-------------------+

           Right Sidebar (PersonDetail)
           +---------------------------+
           |  heroActions:             |
           |   [tree icon] -> Sol. 1   |
           |   [people icon] -> Sol. 2 |-----> Opens Spouse Family Sidebar
           +---------------------------+

           Spouse Family Sidebar
           +---------------------------+
           |  Parents                  |
           |  Siblings                 |
           |  [عرض الشجرة الكاملة]    |-----> Sol. 1 (re-root + close sidebar)
           +---------------------------+
```

The user's journey: **See badge on spouse card** -> **Open PersonDetail** -> **Choose: full tree (Solution 1) or quick family view (Solution 2)** -> **From family view, optionally jump to full tree (Solution 1)**.
