import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'проба',
    template: '%s | проба',
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  description: 'Платформа, где молодые специалисты получают реальный опыт, а малые компании — качественные решения. Бесплатные проекты для портфолио.',
  keywords: ['фриланс', 'портфолио', 'опыт работы', 'специалисты', 'проекты', 'бесплатные услуги'],
  authors: [{ name: 'FreeExperience' }],
  creator: 'FreeExperience',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://freeexperience.ru',
    siteName: 'FreeExperience',
    title: 'FreeExperience - Платформа для опыта и портфолио',
    description: 'Платформа, где молодые специалисты получают реальный опыт, а малые компании — качественные решения',
  },
  twitter: {
    card: 'summary_large_image',
  title: 'FreeExperience - Платформа для опыта и портфолио',
    description: 'Платформа, где молодые специалисты получают реальный опыт, а малые компании — качественные решения',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Добавьте здесь коды верификации для поисковых систем при необходимости
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}

