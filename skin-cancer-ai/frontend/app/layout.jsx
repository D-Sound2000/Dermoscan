import { Josefin_Sans, Figtree, Fira_Mono } from 'next/font/google';
import './globals.css';

const josefin = Josefin_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
});

const firaMono = Fira_Mono({
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
      data-theme="dark"
      className={`${josefin.variable} ${figtree.variable} ${firaMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
