import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import Header from './components/Header';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export const metadata = {
  title: "Épico",
  description: "L'épicerie ouverte 24/7",
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="light">
      <body className={`${spaceGrotesk.className} bg-background-light antialiased h-dvh flex flex-col overflow-hidden`}>
        <Header />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}