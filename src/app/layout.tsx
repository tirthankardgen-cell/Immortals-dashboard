import type { Metadata } from 'next';
import { Suspense } from 'react';
import '@fontsource-variable/manrope';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { LaunchScreen } from '@/components/ui';
export const metadata: Metadata = {
  title: { default: 'Patient directory · Immortals', template: '%s · Immortals' },
  description: 'Patient profiles, live vitals, and speaker-labelled transcripts in the Immortals monitoring workspace.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Suspense fallback={<LaunchScreen/>}><WorkspaceProvider>
    <AppShell>{children}</AppShell></WorkspaceProvider></Suspense></body></html>;
}
