import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RegLynx — Compliance Document Templates for Property Managers',
  description:
    'RegLynx generates jurisdiction-specific compliance document templates for property management companies. Monitor regulatory changes. Always current. Ready for your review.',
  keywords: [
    'compliance',
    'property management',
    'fair housing',
    'regulatory',
    'document templates',
    'OSHA',
    'lead paint disclosure',
    'ADA',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8fafc]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
