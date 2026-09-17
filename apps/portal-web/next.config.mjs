/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  agentRules: false,
  async redirects() {
    return [
      {
        source: '/kebijakan-privasi',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/syarat-ketentuan',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/tentang-kami',
        destination: '/about',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
