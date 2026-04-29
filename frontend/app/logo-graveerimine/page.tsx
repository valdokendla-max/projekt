import { SEO_GUIDES } from '../seo-content'
import { SeoPage, buildSeoMetadata } from '../seo-page'

const content = SEO_GUIDES['logo-graveerimine']

export const metadata = buildSeoMetadata(content)

export default function LogoGraveeriminePage() {
  return <SeoPage content={content} />
}