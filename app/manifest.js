import { APP_NAME, APP_LOGO } from './lib/config';

export default function manifest() {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Épicerie autonome — scannez, payez, repartez.",
    start_url: '/home',
    display: 'standalone',
    background_color: '#f6f8f6',
    theme_color: '#00b503',
    orientation: 'portrait',
    icons: [
      {
        src: APP_LOGO,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
