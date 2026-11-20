/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client'],
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
