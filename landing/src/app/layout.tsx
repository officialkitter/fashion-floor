import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fashion Floor | Boutique + Lounge',
  description: 'Discover fashion listings, brands and local stylist services with Fashion Floor, built around Tanzanian style and local discovery.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
