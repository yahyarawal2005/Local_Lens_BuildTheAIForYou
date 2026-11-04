import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ItineraryProvider } from '@/context/ItineraryContext';
import { RideProvider } from '@/context/RideContext';

export const metadata: Metadata = {
  title: 'LocalLens | Intelligent Local Discovery & Travel Itineraries',
  description:
    'Travel like a cultured local with LocalLens. AI curated day-by-day itineraries, swipe-to-discover hidden gems, and seamless local rides.',
  keywords: ['travel', 'itinerary', 'local experiences', 'India', 'Mumbai', 'AI travel', 'rides', 'hidden gems'],
  authors: [{ name: 'LocalLens Team' }],
  icons: {
    icon: '/assets/images/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#FAF9F6] text-[#1A1A1A] selection:bg-primary-soft selection:text-primary">
        <ThemeProvider>
          <AuthProvider>
            <ItineraryProvider>
              <RideProvider>{children}</RideProvider>
            </ItineraryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
