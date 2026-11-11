import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION } from '@/lib/site-metadata';

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Immortals Patient Dashboard', short_name: 'Immortals', description: SITE_DESCRIPTION,
    start_url: '/', display: 'standalone', background_color: '#0b1321', theme_color: '#0b1321',
    icons: [{ src: '/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/app-icon-512.png', sizes: '512x512', type: 'image/png' }] };
}
