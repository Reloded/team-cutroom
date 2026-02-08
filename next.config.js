/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  typescript: {
    // Examples are standalone scripts, not part of the Next.js app
    // They have their own execution context and should not be type-checked during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Only lint the src directory during builds
    dirs: ['src'],
  },
}

module.exports = nextConfig
