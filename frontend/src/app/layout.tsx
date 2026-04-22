import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { Toaster } from 'react-hot-toast';
import { LOYALLIA_LOGO } from '@/lib/loyalliaLogo';

export const metadata: Metadata = {
  title: { template: '%s | Loyallia', default: 'Loyallia — Plataforma de Fidelización' },
  description: 'La plataforma SaaS multi-tenancy para programas de fidelización digitales.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Inline favicon as data URI */}
        <link rel="icon" href={LOYALLIA_LOGO} type="image/png" />
        {/* Google Fonts — preconnect + non-blocking load (replaces render-blocking CSS @import) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" />
        {/* Inline script to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var m = localStorage.getItem('loyallia-theme') || 'system';
              var d = m === 'system' ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : m;
              document.documentElement.classList.add(d);
            } catch(e){}
          })();
        `}} />
      </head>
      <body className="bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors">
        <ThemeProvider>
          <AuthProvider>
            <I18nProvider>
              {children}
              <Toaster position="top-right" toastOptions={{
                className: 'text-sm font-medium',
                duration: 4000,
                style: { borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' },
              }} />
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
