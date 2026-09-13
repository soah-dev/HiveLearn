import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HiveExcel - Learning Collaboration for Families',
  description: 'Homework assignments for grades 6-12 with gamification and analytics',
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
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
