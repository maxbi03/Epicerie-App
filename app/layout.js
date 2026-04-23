import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import { APP_NAME, APP_DESCRIPTION } from './lib/config';

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
      <body className={`${spaceGrotesk.className} bg-app-bg antialiased h-dvh flex justify-center`}>
        <div className="w-full max-w-md flex flex-col h-dvh overflow-hidden bg-app-bg shadow-xl shadow-black/5">
          <Header />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
