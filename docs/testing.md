# Testing

## Test Mode Query Parameters

**ALWAYS use these query parameters when testing in the browser with Playwright/MCP.**

Default test URL: `http://localhost:3000/?test&only=canvas`

| Parameter | Effect |
|-----------|--------|
| `?test` | Load `/public/test-family.ged` instead of production data |
| `?only=canvas` | Show only tree canvas (hides sidebar, minimap, controls) |
| `?no-sidebar` | Hide sidebar only |
| `?no-minimap` | Hide minimap only |
| `?no-controls` | Hide zoom/pan controls only |
