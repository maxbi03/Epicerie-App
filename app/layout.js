import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import Header from './components/Header';
import { APP_NAME, APP_DESCRIPTION, APP_LOGO } from './lib/config';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="light">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="public/icons/logo.png"/>
      </head>
      <body className={`${spaceGrotesk.className} bg-background-light antialiased h-dvh flex flex-col overflow-hidden`}>
        <Header />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}