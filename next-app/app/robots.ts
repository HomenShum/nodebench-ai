import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://next-app-khaki-five.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/test-ssr', '/test-hitl'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
