import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

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
    <html lang="ar" dir="rtl">
      <body>
        {children}
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
