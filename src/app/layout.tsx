import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import '@fontsource-variable/manrope';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { LaunchScreen } from '@/components/ui';
import { pageMetadata, SITE_DESCRIPTION, SITE_URL } from '@/lib/site-metadata';
export const metadata: Metadata = {
  ...pageMetadata('Patient monitoring dashboard', SITE_DESCRIPTION, '/'),
  metadataBase: new URL(SITE_URL),
  title: { default: 'Immortals | Patient Monitoring Dashboard', template: '%s | Immortals' },
  applicationName: 'Immortals Dashboard',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.png', type: 'image/png', sizes: '32x32' }] },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#0b1321', colorScheme: 'dark' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Immortals Dashboard', url: SITE_URL, description: SITE_DESCRIPTION,
  }).replace(/</g, '\\u003c') }}/><Suspense fallback={<LaunchScreen/>}><WorkspaceProvider>
    <AppShell>{children}</AppShell></WorkspaceProvider></Suspense></body></html>;
}
