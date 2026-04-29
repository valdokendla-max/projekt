import { SEO_GUIDES } from '../seo-content'
import { SeoPage, buildSeoMetadata } from '../seo-page'

const content = SEO_GUIDES['foto-lasergraveerimiseks']

export const metadata = buildSeoMetadata(content)

export default function FotoLasergraveerimiseksPage() {
  return <SeoPage content={content} />
}