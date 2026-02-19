# Testing

## Test Mode for Browser/Playwright Testing

**ALWAYS use the test family route when testing in the browser with Playwright/MCP.**

Default test URL: `http://localhost:3000/test?only=canvas`

The `/test` route loads `/public/test-family.ged` (a small test dataset) instead of production data. This is configured as a family entry in `src/config/families.ts`.

### Query Parameters

These query parameters can be appended to any family route to control UI visibility:

| Parameter | Effect |
|-----------|--------|
| `?only=canvas` | Show only tree canvas (hides sidebar, minimap, controls) |
| `?no-sidebar` | Hide sidebar only |
| `?no-minimap` | Hide minimap only |
| `?no-controls` | Hide zoom/pan controls only |
| `?playground` | Load the dev playground component |
