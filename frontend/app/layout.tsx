import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const siteUrl = 'https://vkengraveai.eu'
const siteDescription = 'AI-põhine lasergraveerimise assistent puidu, metalli ja märgistuse jaoks. Saa masinapõhised seadistused, fotode ettevalmistus, LightBurni ekspordi soovitused ja praktiline töövoog ühest kohast.'
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Laser Graveerimine',
    template: '%s | Laser Graveerimine',
  },
  description: siteDescription,
  applicationName: 'Laser Graveerimine',
  keywords: [
    'laser graveerimine',
    'lasergraveerimine',
    'lasergraveerimise seadistused',
    'lasergraveerimise tarkvara',
    'lasergraveerimise soovitused',
    'laser engraving',
    'engraving settings',
    'laser cutter settings',
    'LightBurn export',
    'photo engraving prep',
    'wood engraving',
    'metal engraving',
    'logo engraving',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Laser Graveerimine',
    title: 'Laser Graveerimine',
    description: siteDescription,
    locale: 'et_EE',
    images: [
      {
        url: '/apple-icon.png',
        width: 512,
        height: 512,
        alt: 'Laser Graveerimine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Laser Graveerimine',
    description: siteDescription,
    images: ['/apple-icon.png'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="et">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
