# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository ("solalah") is a family genealogy web application built with Vite + React + TypeScript. It parses and visualizes GEDCOM genealogy files in the browser. The primary data source is `saeed-family.ged` (stored in `/public/`), a GEDCOM 5.5.1 file containing family tree data. The project supports multiple languages, primarily Arabic and English.

## Package Management

This project uses **pnpm** as the package manager (version 10.28.0).

## Common Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server (Vite)
- `pnpm build` - Build for production (TypeScript compilation + Vite build)
- `pnpm preview` - Preview production build locally
- `pnpm test` - Run tests

## Technology Stack

- **Build Tool**: Vite 7.x
- **Framework**: React 19.x with TypeScript 5.x
- **Styling**: CSS (index.css, tree.css)
- **Dev Tools**: Vite's HMR for fast development

## Code Architecture

### Path Aliases

The project uses `@/` as an alias for the `/src/` directory, configured in both `vite.config.ts` and `tsconfig.json`.

### State Management

**TreeContext** (`src/context/TreeContext.tsx`) is the central state manager using React Context:
- Stores the parsed GEDCOM data (`GedcomData`)
- Tracks selected root ancestor (`selectedRootId`)
- Manages search query, tree configuration (max depth), loading state, and errors
- Provides `useTree()` hook for consuming components

The app wraps the entire application in `<TreeProvider>` at `src/main.tsx`.

### GEDCOM Parsing

**Parser** (`src/lib/gedcom/parser.ts`):
- `parseGedcom(text: string)` - Parses raw GEDCOM text into structured data
- `findRootAncestors(data)` - Identifies individuals with no parents who have families
- `getDisplayName(person)` - Formats person names for display

**Types** (`src/lib/gedcom/types.ts`):
- `Individual` - Person record with name, birth/death dates, sex, family references
- `Family` - Family unit with husband, wife, and children references
- `GedcomData` - Container for individuals and families records (keyed by ID)

### Data Flow

1. `App.tsx` uses `useGedcomData('/saeed-family.ged')` hook
2. `useGedcomData` hook fetches the GEDCOM file from `/public/` and calls `parseGedcom()`
3. Parsed data is stored in TreeContext via `setData()`
4. TreeContext auto-selects the first root ancestor
5. UI components (`FamilyTree`, `RootSelector`, `SearchBar`, `Stats`) consume data via `useTree()`

### Component Structure

- **tree/** - Family tree visualization components
  - `FamilyTree.tsx` - Main tree renderer
  - `PersonCard.tsx` - Individual person display card
  - `CoupleRow.tsx` - Displays married couples
- **ui/** - UI control components
  - `RootSelector.tsx` - Dropdown to choose root ancestor
  - `SearchBar.tsx` - Search functionality
  - `Stats.tsx` - Display tree statistics

### GEDCOM File

The GEDCOM file (`public/saeed-family.ged`):
- GEDCOM 5.5.1 format (UTF-8 encoding)
- Hierarchical structure with level numbers (0, 1, 2)
- Individual records: `0 @ID@ INDI` with `NAME`, `SEX`, `BIRT`, `DEAT`, `FAMS`, `FAMC` tags
- Family records: `0 @ID@ FAM` with `HUSB`, `WIFE`, `CHIL` tags
- Cross-references use `@ID@` format

**IMPORTANT**: Do not read `.ged` files directly (per project instructions).

## TypeScript Configuration

- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Target: ES2020
- JSX: `react-jsx` (automatic runtime)
- Module resolution: `bundler` mode

## After editing files
Do not run pnpm commands unless I ask to. pnpm dev will be already running by me in the terminal.

Run `pnpm test` after logic changes (skip for trivial changes like print statements or comments).

Check the browser when you have a done a work related to the frontend. It's better to use the default browser. Do not specify a browser.