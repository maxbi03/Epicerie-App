import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import Header from './components/Header';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export const metadata = {
  title: "L'Épicerie du Village",
  description: 'Épicerie autonome de Semsales',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="light">
      <body className={`${spaceGrotesk.className} bg-background-light antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}