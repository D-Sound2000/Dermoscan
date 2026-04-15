import { Inter, Space_Grotesk, DM_Mono } from 'next/font/google';
import ThemeProvider from '../components/ThemeProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'DermoScan — AI Lesion Analysis',
  description: 'AI-assisted skin lesion binary classification using DenseNet121.',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${dmMono.variable}`}
    >
      <body className="bg-dark-bg text-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
