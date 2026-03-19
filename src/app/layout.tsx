import type { Metadata } from 'next';
import { Noto_Sans_Arabic } from 'next/font/google';
import Script from 'next/script';
import { GlobalProviders } from './global-providers';
import './globals.css';

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-arabic',
});

export const metadata: Metadata = {
  title: 'شجرة العائلة',
  description: 'Family genealogy web application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={notoSansArabic.variable}>
      <body>
        <GlobalProviders>
          {children}
        </GlobalProviders>
        <Script
          src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://analytics.autoflowa.com/script.js"
          data-website-id="3797d417-f3f8-45cb-b925-6e915a3e8ef9"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
