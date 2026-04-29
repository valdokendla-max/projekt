import type { MetadataRoute } from 'next'
import { SEO_GUIDE_SUMMARIES } from './seo-content'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: 'https://vkengraveai.eu',
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://vkengraveai.eu/lasergraveerimise-juhendid',
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...SEO_GUIDE_SUMMARIES.map((guide) => ({
      url: `https://vkengraveai.eu/${guide.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}