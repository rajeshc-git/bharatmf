import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MF NAV Tracker • Daily Mutual Fund EOD Digest',
  description:
    'Ultra-fast Indian Mutual Fund NAV Tracker powered by MFapi.in and automated Gmail SMTP notifications.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
