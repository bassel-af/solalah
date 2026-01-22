# Testing

Last updated: 2026-01-22

## Overview

This document covers testing strategies, tools, and conventions for the solalah genealogy application.

## Unit Testing with Vitest

Unit tests are located in `/src/test/` and use Vitest with jsdom and @testing-library/react.

### Running Tests

```bash
pnpm test        # Run tests once
pnpm test:watch  # Run tests in watch mode
```

### Test Files

- `descendants.test.ts` - Tests for descendant calculation logic
- `root-selection.test.ts` - Tests for root ancestor selection
- `private-filtering.test.ts` - Tests for filtering private individuals

### Test Fixtures

Test fixtures are located in `/src/test/fixtures/`:
- `test-family.ged` - Small GEDCOM file for testing (also copied to `/public/` for E2E tests)

## Test Mode Query Parameters

The application supports special query parameters for testing and E2E automation. These reduce UI complexity for smaller Playwright snapshots and faster visual regression tests.

### Available Parameters

| Parameter | Effect |
|-----------|--------|
| `?test` | Load test GEDCOM file (`/public/test-family.ged`) instead of production data |
| `?no-sidebar` | Hide the sidebar |
| `?no-minimap` | Hide the minimap overlay |
| `?no-controls` | Hide zoom/pan controls |
| `?only=canvas` | Show only the tree canvas (hides sidebar, minimap, and controls) |

### Combining Parameters

Parameters can be combined using `&`:

```
# Full UI with test data
http://localhost:3000/?test

# Test data with no sidebar
http://localhost:3000/?test&no-sidebar

# Test data with no minimap or controls
http://localhost:3000/?test&no-minimap&no-controls

# Canvas only (minimal snapshot)
http://localhost:3000/?test&only=canvas
```

### Use Cases

- **Visual regression testing**: Use `?only=canvas` for minimal, consistent snapshots
- **Component isolation**: Use `?no-sidebar` to test tree interactions without sidebar
- **Performance testing**: Use `?test` with the smaller test dataset
- **Debugging**: Combine parameters to isolate specific UI elements

### Implementation Details

Query parameters are parsed in `src/app/page.tsx`:
- `showSidebar`, `showMinimap`, `showControls` flags control visibility
- `?only=canvas` sets all flags to false
- Individual `no-*` params override specific flags

The `FamilyTree` component accepts `hideMiniMap` and `hideControls` props to conditionally render those elements.

## End-to-End Testing with Playwright

### Test Data

The test GEDCOM file (`/public/test-family.ged`) contains a small family tree suitable for E2E testing:
- 13 individuals
- 5 families
- Multi-generational with polygamous families for edge case coverage

### Writing Playwright Tests

When writing Playwright tests, use the test mode parameters to:
1. Load predictable test data with `?test`
2. Reduce snapshot size with `?only=canvas` or individual `no-*` params
3. Focus on specific UI elements by hiding others

Example:
```typescript
// Navigate to canvas-only view for visual regression
await page.goto('http://localhost:3000/?test&only=canvas');
await page.waitForSelector('[data-testid="tree-container"]');
await expect(page).toHaveScreenshot('family-tree-canvas.png');
```
