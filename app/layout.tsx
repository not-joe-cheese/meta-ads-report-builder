import type { Metadata } from 'next'
import { Open_Sans } from 'next/font/google'
import './globals.css'

const openSans = Open_Sans({ 
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: 'Meta Ads Reporter | Generate Professional PDF Reports',
  description: 'Transform your Meta Ads CSV data into beautiful PDF reports for clients',
  generator: 'v0.app',
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
    <html lang="en">
      <body className={`${openSans.className} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
