# Testing

## Test Mode Query Parameters

Query parameters for Playwright/E2E testing to reduce UI complexity:

| Parameter | Effect |
|-----------|--------|
| `?test` | Load `/public/test-family.ged` instead of production data |
| `?no-sidebar` | Hide sidebar |
| `?no-minimap` | Hide minimap |
| `?no-controls` | Hide zoom/pan controls |
| `?only=canvas` | Show only tree canvas (hides all UI) |

Example: `http://localhost:3000/?test&only=canvas`
