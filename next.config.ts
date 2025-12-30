/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media-1.api-sports.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media-2.api-sports.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media-3.api-sports.io',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
