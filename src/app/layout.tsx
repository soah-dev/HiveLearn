import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';

// Display face for headings, a friendly geometric sans for everything else,
// and a mono for timers so ticking digits never shift.
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = localFont({ src: './fonts/GeistMonoVF.woff', variable: '--font-mono', weight: '100 900' });

export const metadata: Metadata = {
  title: 'HiveExcel - Learning Collaboration for Families',
  description: 'Homework assignments for grades 6-12 with gamification and analytics',
};

// viewport-fit=cover lets the mobile tab bar pad itself above the home indicator
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so dark mode doesn't flash light */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('homework-hub-dark-mode')==='true')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans antialiased bg-canvas text-ink min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
