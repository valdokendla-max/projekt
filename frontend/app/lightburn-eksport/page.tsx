import { SEO_GUIDES } from '../seo-content'
import { SeoPage, buildSeoMetadata } from '../seo-page'

const content = SEO_GUIDES['lightburn-eksport']

export const metadata = buildSeoMetadata(content)

export default function LightburnEksportPage() {
  return <SeoPage content={content} />
}