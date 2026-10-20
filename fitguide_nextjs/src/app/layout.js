import './globals.css';
import { Providers } from './providers';
import { getLocale, getT } from '../i18n/server';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FitGuide - Your Personal Fitness Companion',
    template: '%s | FitGuide',
  },
  description: 'Guided workouts, personal plans, nutrition and progress tracking.',
  applicationName: 'FitGuide',
  appleWebApp: { capable: true, title: 'FitGuide', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/apple-touch-icon.png' },
};

export const viewport = { themeColor: '#0A0C10' };

export default async function RootLayout({ children }) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main" className="skip-link">{t('skip.toContent')}</a>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
