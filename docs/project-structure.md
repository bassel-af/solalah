# Project Structure

Last updated: 2026-01-21

## Overview

This is a Vite + React + TypeScript genealogy web application that parses and visualizes GEDCOM files. The project follows modern React conventions with a component-based architecture, Context API for state management, and custom hooks for data fetching and UI logic. The structure emphasizes separation of concerns with dedicated directories for components, business logic, styles, and tests.

## Directory Structure

### Root Level

**Configuration Files:**
- `vite.config.ts` - Vite bundler configuration with path aliases (`@/` → `/src/`)
- `vitest.config.ts` - Vitest test runner configuration
- `tsconfig.json` - TypeScript compiler configuration for source code
- `tsconfig.node.json` - TypeScript configuration for Node.js build scripts
- `package.json` - Dependencies and scripts (uses pnpm)
- `pnpm-lock.yaml` - Lock file for pnpm package manager

**HTML Entry:**
- `index.html` - Main HTML entry point (Vite-style, at root level)
- `index.html.old` - Legacy HTML file (should be removed or archived)

**Documentation:**
- `README.md` - Project readme
- `CLAUDE.md` - Instructions for Claude Code AI assistant
- `/docs/` - Documentation folder (contains this file and other docs)

**Build Output:**
- `/dist/` - Production build output (generated, git-ignored)

### `/public/`

**Role:** Static assets served as-is by Vite without processing

**Contents:**
- `saeed-family.ged` - Primary GEDCOM genealogy data file (GEDCOM 5.5.1 format)

### `/src/`

**Role:** All application source code

**Entry Points:**
- `main.tsx` - React application entry point, wraps app in `<TreeProvider>`
- `App.tsx` - Root component, orchestrates main UI layout
- `vite-env.d.ts` - TypeScript definitions for Vite environment

#### `/src/components/`

**Role:** React components organized by feature and type

**Subdirectories:**

##### `/src/components/tree/`
**Purpose:** Family tree visualization components
- `FamilyTree.tsx` - Main tree renderer component
- `PersonCard.tsx` - Individual person display card
- `CoupleRow.tsx` - Displays married couples in the tree
- `index.ts` - Barrel export for tree components

##### `/src/components/ui/`
**Purpose:** UI control and interface components
- `RootSelector.tsx` - Dropdown to select root ancestor
- `SearchBar.tsx` - Search functionality component
- `Stats.tsx` - Display tree statistics
- `Sidebar.tsx` - Sidebar navigation/controls
- `index.ts` - Barrel export for UI components

**Top-level Components:**
- `Playground.tsx` - Experimental/development component for testing tree layouts

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

**Role:** Global CSS stylesheets

**Contents:**
- `index.css` - Global application styles
- `tree.css` - Styles specific to family tree visualization

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
- `@/` resolves to `/src/` directory (configured in vite.config.ts and tsconfig.json)

### Component Organization
- Components grouped by domain: `/tree/` for visualization, `/ui/` for controls
- Each component subdirectory has an `index.ts` barrel export
- Related components kept together in the same directory

### Testing
- Test files co-located with source in `/src/test/`
- Test fixtures in `/src/test/fixtures/`
- Naming pattern: `*.test.ts` or `*.test.tsx`

## Structure Issues and Recommendations

### High Priority

**Issue:** `Playground.tsx` is at `/src/components/Playground.tsx` (top-level)
- **Expected:** Should be in a dedicated subdirectory or development folder
- **Recommendation:** Move to `/src/components/dev/Playground.tsx` or `/src/playground/` since it's an experimental component, not a production component
- **Impact:** Breaks component organization hierarchy where other components are in categorized subdirectories

**Issue:** `index.html.old` at root level
- **Expected:** Should not be in version control if obsolete
- **Recommendation:** Delete this file or move to an archive folder if needed for reference
- **Impact:** Clutters root directory with legacy files

### Medium Priority

**Issue:** Styles location at `/src/styles/`
- **Expected:** Common convention is `/src/assets/` or `/src/assets/styles/` for static resources
- **Consideration:** Current structure is acceptable but could be moved to match broader conventions
- **Recommendation:** Consider renaming to `/src/assets/styles/` if you plan to add other assets (images, fonts, etc.)
- **Impact:** Minor - current structure is functional but less conventional

**Issue:** Test fixtures duplicate production data
- **Current:** `/src/test/fixtures/saeed-family.ged` duplicates `/public/saeed-family.ged`
- **Consideration:** Tests should have their own controlled fixtures, but duplication creates maintenance burden
- **Recommendation:** Consider if test fixture needs to be a subset or if it should reference the public file
- **Impact:** Data can drift between test and production

### Low Priority

**Observation:** No `/src/utils/` directory
- **Note:** Utility functions are appropriately organized in `/src/lib/gedcom/` for domain-specific logic
- **Recommendation:** If you add generic utilities (non-GEDCOM specific), create `/src/utils/` or `/src/lib/utils/`

**Observation:** No `/src/types/` directory
- **Note:** Types are co-located with their modules (e.g., `/src/lib/gedcom/types.ts`)
- **Recommendation:** Current approach is good for this project size. Consider extracting shared types to `/src/types/` if they're used across multiple domains

**Observation:** No `/src/assets/` directory
- **Note:** Currently only have CSS files in `/src/styles/`
- **Recommendation:** Create `/src/assets/` if you plan to add images, fonts, or other static assets

## Technology Stack Notes

- **Package Manager:** pnpm 10.28.0
- **Build Tool:** Vite 7.x (modern, fast development)
- **Framework:** React 19.x with TypeScript 5.x
- **Testing:** Vitest 4.x with jsdom and @testing-library/react
- **Additional Libraries:** @dagrejs/dagre and @xyflow/react for graph visualization

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

1. **Developer Experience:**
   - Create `/src/components/dev/` for experimental components like `Playground.tsx`
   - Add ESLint and Prettier configuration files if not present

2. **Asset Management:**
   - Create `/src/assets/` directory structure if planning to add images or other static files
   - Consider organizing styles under assets

3. **Testing:**
   - Keep test fixtures minimal and distinct from production data
   - Consider adding `/src/__tests__/` or keeping tests adjacent to components

4. **Documentation:**
   - Add JSDoc comments to complex functions in `/src/lib/gedcom/`
   - Documentation now lives in `/docs/` folder

5. **Cleanup:**
   - Remove or archive `index.html.old`
   - Ensure `/dist/` is properly git-ignored
