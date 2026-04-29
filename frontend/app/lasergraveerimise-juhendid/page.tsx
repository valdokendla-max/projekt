import type { Metadata } from 'next'
import Link from 'next/link'
import { SEO_GUIDE_SUMMARIES } from '../seo-content'

export const metadata: Metadata = {
  title: 'Lasergraveerimise juhendid',
  description: 'Koondleht lasergraveerimise juhenditele: puit, metall, logo, LightBurn eksport, foto ettevalmistus ja seadistused.',
  alternates: {
    canonical: '/lasergraveerimise-juhendid',
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Lasergraveerimise juhendid',
  description: 'Koondleht lasergraveerimise juhenditele ja praktilistele sihtlehtedele.',
}

export default function LasergraveerimiseJuhendidPage() {
  return (
    <main className="relative z-1 min-h-dvh px-3 py-3 md:px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="hud-shell relative mx-auto flex max-w-7xl flex-col gap-5 p-4 md:p-6">
        <section className="hud-panel px-5 py-5 md:px-6 md:py-6">
          <span className="hud-label">Juhendite kogu</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-cyan-50 md:text-5xl">Lasergraveerimise juhendid</h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-300 md:text-base">
            See leht koondab praktilised juhendid lasergraveerimise seadistuste, fotode ettevalmistuse,
            logo graveerimise, LightBurni ekspordi ning puidu ja metalli töövoogude jaoks.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-primary/18 bg-primary/12 px-4 py-2 text-sm font-medium text-cyan-50 transition-colors hover:bg-primary/18"
            >
              Ava avaleht
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SEO_GUIDE_SUMMARIES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/${guide.slug}`}
              className="hud-panel px-5 py-5 md:px-6 md:py-6 transition-colors hover:border-primary/24"
            >
              <h2 className="text-xl font-semibold text-cyan-50">{guide.title.et}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{guide.description.et}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}