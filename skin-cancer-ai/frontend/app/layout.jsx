import { Cormorant_Garamond, DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'DermoScan — AI Skin Analysis',
  description: 'Dermoscopic binary classification using DenseNet-121, trained on ISIC 2020 at Val AUC 0.9869.',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
