import type { Metadata } from 'next'
import Link from 'next/link'
import { SEO_GUIDE_SUMMARIES, type SeoPageContent } from './seo-content'

const siteUrl = 'https://vkengraveai.eu'

export function buildSeoMetadata(content: SeoPageContent): Metadata {
  const canonicalPath = `/${content.slug}`

  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: `${siteUrl}${canonicalPath}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
    },
  }
}

export function SeoPage({ content }: { content: SeoPageContent }) {
  const relatedGuides = SEO_GUIDE_SUMMARIES.filter((guide) => guide.slug !== content.slug).slice(0, 4)
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: content.title,
      description: content.description,
      url: `${siteUrl}/${content.slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Laser Graveerimine',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Lasergraveerimise juhendid',
          item: `${siteUrl}/lasergraveerimise-juhendid`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: content.title,
          item: `${siteUrl}/${content.slug}`,
        },
      ],
    },
  ]

  return (
    <main className="relative z-1 min-h-dvh px-3 py-3 md:px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="hud-shell relative mx-auto flex max-w-7xl flex-col gap-5 p-4 md:p-6">
        <section className="hud-panel px-5 py-5 md:px-6 md:py-6">
          <span className="hud-label">Laser Graveerimine</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-cyan-50 md:text-5xl">{content.title}</h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-300 md:text-base">{content.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-primary/18 bg-primary/12 px-4 py-2 text-sm font-medium text-cyan-50 transition-colors hover:bg-primary/18"
            >
              Ava tööriist
            </Link>
            <Link
              href="/lasergraveerimise-juhendid"
              className="rounded-full border border-primary/18 bg-black/28 px-4 py-2 text-sm font-medium text-cyan-50 transition-colors hover:border-primary/28 hover:bg-black/36"
            >
              Ava kõik juhendid
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {content.sections.map((section) => (
            <article key={section.title} className="hud-panel px-5 py-5 md:px-6 md:py-6">
              <h2 className="text-xl font-semibold text-cyan-50">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="hud-panel px-5 py-5 md:px-6 md:py-6">
          <h2 className="text-2xl font-semibold text-cyan-50">Korduma kippuvad küsimused</h2>
          <div className="mt-5 grid gap-3">
            {content.faqs.map((faq) => (
              <article key={faq.question} className="rounded-[20px] border border-primary/12 bg-black/24 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <h3 className="text-base font-semibold text-cyan-50">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="hud-panel px-5 py-5 md:px-6 md:py-6">
          <h2 className="text-2xl font-semibold text-cyan-50">Seotud juhendid</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {relatedGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/${guide.slug}`}
                className="rounded-[20px] border border-primary/12 bg-black/24 px-4 py-4 transition-colors hover:border-primary/24 hover:bg-black/32"
              >
                <h3 className="text-base font-semibold text-cyan-50">{guide.title.et}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{guide.description.et}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
