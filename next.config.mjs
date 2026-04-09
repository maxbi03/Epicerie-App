import withPWA from '@ducanh2912/next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['argon2'],
};

export default pwaConfig(nextConfig);