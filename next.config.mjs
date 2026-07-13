import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true
});

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['flatsplit.meals4heal.in', 'letter-examined-sheffield-brunswick.trycloudflare.com'],
  devIndicators: {
    buildActivity: false,
  },
};

export default withPWA(nextConfig);
