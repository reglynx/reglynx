import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f8fafc]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
