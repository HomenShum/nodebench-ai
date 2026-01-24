import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://next-app-khaki-five.vercel.app';

  const routes = [
    '',
    '/research',
    '/documents',
    '/agents',
    '/calendar',
    '/roadmap',
    '/spreadsheets',
    '/email',
    '/settings',
    '/analytics/hitl',
    '/analytics/components',
    '/analytics/recommendations',
    '/onboarding',
    '/profile',
    '/login',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/research' ? 0.9 : 0.8,
  }));
}
