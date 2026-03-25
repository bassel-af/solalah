import { describe, it, expect } from 'vitest'

describe('Security headers in next.config', () => {
  it('defines security headers for all routes', async () => {
    // Import the config — the default export is the NextConfig object
    const mod = await import('../../next.config')
    const config = mod.default

    expect(config.headers).toBeDefined()
    expect(typeof config.headers).toBe('function')

    const headerEntries = await config.headers!()

    // Should have at least one entry matching all routes
    const catchAll = headerEntries.find(
      (entry: { source: string }) => entry.source === '/(.*)'
    )
    expect(catchAll).toBeDefined()

    const headerMap = new Map(
      catchAll!.headers.map((h: { key: string; value: string }) => [h.key, h.value])
    )

    // Verify each required security header is present with correct value
    expect(headerMap.get('X-Frame-Options')).toBe('DENY')
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headerMap.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
    expect(headerMap.get('X-DNS-Prefetch-Control')).toBe('on')
    expect(headerMap.get('Strict-Transport-Security')).toBe(
      'max-age=31536000; includeSubDomains'
    )
  })

  it('sets X-Robots-Tag noindex nofollow on API routes', async () => {
    const mod = await import('../../next.config')
    const config = mod.default
    const headerEntries = await config.headers!()

    const apiEntry = headerEntries.find(
      (entry: { source: string }) => entry.source === '/api/:path*'
    )
    expect(apiEntry).toBeDefined()

    const headerMap = new Map(
      apiEntry!.headers.map((h: { key: string; value: string }) => [h.key, h.value])
    )
    expect(headerMap.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })
})
