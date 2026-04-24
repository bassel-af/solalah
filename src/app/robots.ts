import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/workspaces/',
        '/profile',
        '/admin',
        '/invite/',
        '/auth/callback',
        '/auth/confirm',
        '/auth/reset-password',
        '/test',
        '/design-preview',
      ],
    },
    sitemap: 'https://gynat.com/sitemap.xml',
  };
}
