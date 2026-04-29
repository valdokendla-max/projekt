import { SEO_GUIDES } from '../seo-content'
import { SeoPage, buildSeoMetadata } from '../seo-page'

const content = SEO_GUIDES['laser-graveerimine-metallile']

export const metadata = buildSeoMetadata(content)

export default function LaserGraveerimineMetallilePage() {
  return <SeoPage content={content} />
}