import { Cormorant_Garamond, Outfit, DM_Mono } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'DermoScan — AI Lesion Analysis',
  description: 'AI-assisted skin lesion binary classification using DenseNet121',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${outfit.variable} ${dmMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
