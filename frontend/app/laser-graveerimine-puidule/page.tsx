import { SEO_GUIDES } from '../seo-content'
import { SeoPage, buildSeoMetadata } from '../seo-page'

const content = SEO_GUIDES['laser-graveerimine-puidule']

export const metadata = buildSeoMetadata(content)

export default function LaserGraveeriminePuidulePage() {
  return <SeoPage content={content} />
}