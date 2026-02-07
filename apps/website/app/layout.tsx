import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SenseKit — Strumenti di ricerca per capire come le persone pensano',
  description:
    'Suite di strumenti interattivi per la ricerca qualitativa e quantitativa: stakeholder mapping, differenziale semantico e analisi competitiva.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
