# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository ("solalah") is a family genealogy web application built with Next.js 15 (App Router) + React 19 + TypeScript. It parses and visualizes GEDCOM genealogy files in the browser. The primary data source is `saeed-family.ged` (stored in `/public/`), a GEDCOM 5.5.1 file containing family tree data. The app is RTL (right-to-left) with Arabic as the primary language.

## Package Management

This project uses **pnpm** as the package manager (version 10.28.0).

## Common Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server (Next.js with Turbopack)
- `pnpm build` - Build for production
- `pnpm start` - Run production build
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests once
- `pnpm test:watch` - Run tests in watch mode

## Technology Stack

- **Framework**: Next.js 15.x with App Router and Turbopack
- **UI**: React 19.x with TypeScript 5.x
- **Tree Visualization**: @xyflow/react (React Flow) with custom tree layout algorithm
- **Styling**: CSS with design tokens (`src/styles/tokens/`)
- **Testing**: Vitest with @testing-library/react and jsdom (see `docs/testing.md` for E2E query params)

## Code Architecture

### Path Aliases

The project uses `@/` as an alias for the `/src/` directory, configured in `tsconfig.json`.

### State Management

**TreeContext** (`src/context/TreeContext.tsx`) is the central state manager using React Context:
- Stores the parsed GEDCOM data (`GedcomData`)
- Tracks selected root ancestor (`selectedRootId`)
- Manages search query, tree configuration (max depth), loading state, and errors
- Provides `useTree()` hook for consuming components

The app wraps the entire application in `<TreeProvider>` via `src/app/providers.tsx` (client component).

### GEDCOM Parsing

**Parser** (`src/lib/gedcom/parser.ts`):
- `parseGedcom(text: string)` - Parses raw GEDCOM text into structured data
- `findRootAncestors(data)` - Identifies individuals with no parents who have families
- `getDisplayName(person)` - Formats person names for display

**Types** (`src/lib/gedcom/types.ts`):
- `Individual` - Person record with name, birth/death dates, sex, family references, `isPrivate` flag
- `Family` - Family unit with husband, wife, and children references
- `GedcomData` - Container for individuals and families records (keyed by ID)

**Graph utilities** (`src/lib/gedcom/graph.ts`):
- `getAllDescendants()` - Get all descendants of a person
- `getTreeVisibleIndividuals()` - Get individuals visible in the tree (with optional privacy filtering)
- `calculateDescendantCounts()` - Uses Kahn's algorithm (topological sort) for efficient O(V+E) counting

### Data Flow

1. `src/app/page.tsx` (client component) uses `useGedcomData('/saeed-family.ged')` hook
2. `useGedcomData` hook fetches the GEDCOM file from `/public/` and calls `parseGedcom()`
3. Parsed data is stored in TreeContext via `setData()`
4. TreeContext auto-selects the first root ancestor
5. UI components (`FamilyTree`, `RootSelector`, `SearchBar`, `Stats`) consume data via `useTree()`

### Tree Visualization

The `FamilyTree` component (`src/components/tree/FamilyTree/FamilyTree.tsx`) uses @xyflow/react with a **custom tree layout algorithm**:
- **Bottom-up pass**: Calculates subtree widths (post-order traversal)
- **Top-down pass**: Assigns positions keeping siblings together (pre-order traversal)
- Supports polygamous families with color-coded edges per spouse
- Privacy filtering: individuals with `isPrivate: true` are excluded from rendering

### GEDCOM File

The GEDCOM file (`public/saeed-family.ged`):
- GEDCOM 5.5.1 format (UTF-8 encoding)
- Individual records: `0 @ID@ INDI` with `NAME`, `SEX`, `BIRT`, `DEAT`, `FAMS`, `FAMC` tags
- Family records: `0 @ID@ FAM` with `HUSB`, `WIFE`, `CHIL` tags
- Cross-references use `@ID@` format

**IMPORTANT**: Do not read `.ged` files directly (per project instructions).

### CSS Architecture

Design tokens are defined in `src/styles/tokens/`:
- `colors.css` - Color palette
- `typography.css` - Font sizes and weights
- `spacing.css` - Spacing scale
- `shadows.css` - Box shadows
- `transitions.css` - Animation timings

## TypeScript Configuration

- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Target: ES2020
- JSX: `preserve` (Next.js handles transformation)
- Module resolution: `bundler` mode
- Next.js plugin enabled for enhanced type checking

## After editing files
Do not run pnpm commands unless I ask to. pnpm dev will be already running by me in the terminal.

Run `pnpm test` after logic changes (skip for trivial changes like print statements or comments).

Check the browser when you have done work related to the frontend. It's better to use the default browser. Do not specify a browser.

**IMPORTANT: For browser/Playwright testing, ALWAYS use test mode URL. See `docs/testing.md` for required query parameters.**