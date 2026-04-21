import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Design Preview · جينات',
  description: 'Premium design direction preview',
  robots: { index: false, follow: false },
};

export default function DesignPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <>{children}</>;
}
