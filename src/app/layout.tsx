import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'RegLynx — Property Compliance Monitoring for Philadelphia',
  description:
    'RegLynx scans live city records for violations, license gaps, and compliance issues — then shows you what to fix. Built for Philadelphia property managers.',
  keywords: [
    'Philadelphia property compliance',
    'L&I violations',
    'rental license check',
    'property management compliance',
    'Philadelphia violations',
    'rental property compliance',
    'lead paint disclosure',
    'fair housing policy',
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
