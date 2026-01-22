# Project Structure

Last updated: 2026-01-22

## Overview

This is a Next.js 15 + React 19 + TypeScript genealogy web application that parses and visualizes GEDCOM files. The project uses the App Router with Turbopack for fast development. It follows modern React conventions with a component-based architecture, Context API for state management, and custom hooks for data fetching and UI logic. The structure emphasizes separation of concerns with dedicated directories for components, business logic, styles, and tests.

## Directory Structure

### Root Level

**Configuration Files:**
- `next.config.ts` - Next.js configuration with Turbopack enabled
- `vitest.config.ts` - Vitest test runner configuration
- `tsconfig.json` - TypeScript compiler configuration with path aliases (`@/` → `/src/`)
- `package.json` - Dependencies and scripts (uses pnpm)
- `pnpm-lock.yaml` - Lock file for pnpm package manager

**Documentation:**
- `README.md` - Project readme
- `CLAUDE.md` - Instructions for Claude Code AI assistant
- `/docs/` - Documentation folder
  - `project-structure.md` - This file
  - `testing.md` - Testing guide and test mode query parameters

**Build Output:**
- `/.next/` - Next.js build output (generated, git-ignored)

### `/public/`

**Role:** Static assets served as-is by Next.js without processing

**Contents:**
- `saeed-family.ged` - Primary GEDCOM genealogy data file (GEDCOM 5.5.1 format)
- `test-family.ged` - Small test GEDCOM file for E2E testing

### `/src/`

**Role:** All application source code

#### `/src/app/`

**Role:** Next.js App Router pages and layouts

**Contents:**
- `layout.tsx` - Root layout with HTML structure, fonts, and metadata
- `page.tsx` - Home page component, handles query params and renders main app
- `providers.tsx` - Client component wrapping app in `<TreeProvider>`
- `globals.css` - Global CSS imports

#### `/src/components/`

**Role:** React components organized by feature and type

**Subdirectories:**

##### `/src/components/tree/`
**Purpose:** Family tree visualization components
- `FamilyTree/FamilyTree.tsx` - Main tree renderer using @xyflow/react
- `index.ts` - Barrel export for tree components

##### `/src/components/ui/`
**Purpose:** UI control and interface components
- `RootSelector.tsx` - Dropdown to select root ancestor
- `SearchBar.tsx` - Search functionality component
- `Stats.tsx` - Display tree statistics
- `Sidebar.tsx` - Sidebar navigation/controls
- `index.ts` - Barrel export for UI components

##### `/src/components/dev/`
**Purpose:** Development and experimental components
- `Playground.tsx` - Experimental component for testing tree layouts

#### `/src/context/`

**Role:** React Context providers for global state management

**Contents:**
- `TreeContext.tsx` - Central state manager containing:
  - Parsed GEDCOM data (`GedcomData`)
  - Selected root ancestor ID
  - Search query and tree configuration
  - Loading and error states
  - `useTree()` hook for consuming components

#### `/src/hooks/`

**Role:** Custom React hooks for reusable logic

**Contents:**
- `useGedcomData.ts` - Fetches and parses GEDCOM files
- `useTreeLines.ts` - Manages SVG line calculations for tree visualization

#### `/src/lib/`

**Role:** Business logic, utilities, and domain-specific libraries

##### `/src/lib/gedcom/`
**Purpose:** GEDCOM file parsing and data manipulation
- `types.ts` - TypeScript types for GEDCOM entities (`Individual`, `Family`, `GedcomData`)
- `parser.ts` - Main GEDCOM parser, converts raw text to structured data
- `display.ts` - Formatting utilities for displaying person information
- `roots.ts` - Functions to identify root ancestors
- `graph.ts` - Graph traversal and tree structure utilities
- `index.ts` - Barrel export for gedcom module

#### `/src/styles/`

**Role:** Global CSS stylesheets and design tokens

**Contents:**
- `index.css` - Global application styles
- `tree.css` - Styles specific to family tree visualization
- `tokens/` - CSS design tokens
  - `colors.css` - Color palette
  - `typography.css` - Font sizes and weights
  - `spacing.css` - Spacing scale
  - `shadows.css` - Box shadows
  - `transitions.css` - Animation timings

#### `/src/test/`

**Role:** Test files and test utilities

**Contents:**
- `setup.ts` - Vitest test environment setup
- `descendants.test.ts` - Tests for descendant calculation logic
- `root-selection.test.ts` - Tests for root ancestor selection
- `private-filtering.test.ts` - Tests for filtering private individuals

##### `/src/test/fixtures/`
**Purpose:** Test data files
- `saeed-family.ged` - Copy of GEDCOM file for testing

## Conventions

### File Naming
- React components: PascalCase (e.g., `FamilyTree.tsx`)
- Utilities/hooks: camelCase (e.g., `useGedcomData.ts`)
- Type definitions: camelCase (e.g., `types.ts`)
- CSS files: kebab-case (e.g., `index.css`, `tree.css`)

### Path Aliases
- `@/` resolves to `/src/` directory (configured in tsconfig.json)

### Component Organization
- Components grouped by domain: `/tree/` for visualization, `/ui/` for controls
- Each component subdirectory has an `index.ts` barrel export
- Related components kept together in the same directory

### Testing
- Test files co-located with source in `/src/test/`
- Test fixtures in `/src/test/fixtures/`
- Naming pattern: `*.test.ts` or `*.test.tsx`

## Structure Issues and Recommendations

### Low Priority

**Observation:** No `/src/utils/` directory
- **Note:** Utility functions are appropriately organized in `/src/lib/gedcom/` for domain-specific logic
- **Recommendation:** If you add generic utilities (non-GEDCOM specific), create `/src/utils/` or `/src/lib/utils/`

**Observation:** No `/src/types/` directory
- **Note:** Types are co-located with their modules (e.g., `/src/lib/gedcom/types.ts`)
- **Recommendation:** Current approach is good for this project size. Consider extracting shared types to `/src/types/` if they're used across multiple domains

## Technology Stack Notes

- **Package Manager:** pnpm 10.28.0
- **Framework:** Next.js 15.x with App Router and Turbopack
- **UI:** React 19.x with TypeScript 5.x
- **Tree Visualization:** @xyflow/react (React Flow) with custom tree layout algorithm
- **Testing:** Vitest 4.x with jsdom and @testing-library/react
- **Styling:** CSS with design tokens (`src/styles/tokens/`)

## Best Practices Followed

✅ Clear separation of concerns (components, logic, state, styles)
✅ TypeScript strict mode enabled
✅ Path aliases configured for cleaner imports
✅ Test infrastructure properly set up
✅ Barrel exports (`index.ts`) for clean public APIs
✅ Component organization by domain/feature
✅ Context API for centralized state management
✅ Custom hooks for reusable logic

## Areas for Potential Improvement

1. **Testing:**
   - Keep test fixtures minimal and distinct from production data
   - Consider adding component-level tests adjacent to components

2. **Documentation:**
   - Add JSDoc comments to complex functions in `/src/lib/gedcom/`
   - See `/docs/testing.md` for test mode query parameters
