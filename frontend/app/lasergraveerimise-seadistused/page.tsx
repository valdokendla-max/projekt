import { SEO_GUIDES } from '../seo-content'
import { SeoPage, buildSeoMetadata } from '../seo-page'

const content = SEO_GUIDES['lasergraveerimise-seadistused']

export const metadata = buildSeoMetadata(content)

export default function LasergraveerimiseSeadistusedPage() {
  return <SeoPage content={content} />
}