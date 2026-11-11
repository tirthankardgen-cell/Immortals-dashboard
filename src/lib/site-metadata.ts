import type { Metadata } from 'next';

export const SITE_URL = 'https://immortals-dashboard.vercel.app';
export const SITE_DESCRIPTION = 'A connected patient dashboard for vitals, environmental measurements, patient profiles, and recorded monitoring history.';
export function pageMetadata(title: string, description: string, path: string): Metadata {
  const socialTitle = `${title} | Immortals`;
  const image = { url: '/social-preview.png', width: 1200, height: 630,
    alt: 'Immortals patient monitoring dashboard with vitals and waveform displays' };
  return { title, description, alternates: { canonical: path },
    openGraph: { type: 'website', locale: 'en_IN', siteName: 'Immortals', title: socialTitle,
      description, url: path, images: [image] },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [image] } };
}
