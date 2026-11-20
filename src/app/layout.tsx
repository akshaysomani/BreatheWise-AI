import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'BreatheWise AI — Breathe Better. Live Healthier.',
  description:
    'Your intelligent companion for cleaner air, healthier everyday choices and a greener tomorrow. Real-time air quality intelligence, family action plans, and science-backed indoor purification.',
  keywords: [
    'Air Quality',
    'Winter Smog',
    'PM2.5',
    'HEPA Filtration',
    'Clean Air Delivery Rate',
    'Urban Air Quality Assistant',
    'Low-Emission Living',
  ],
  authors: [{ name: 'BreatheWise AI Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[#F7F8F3] text-[#27352D]">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
