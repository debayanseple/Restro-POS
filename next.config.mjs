/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Avoid blocking production builds on missing/optional ESLint configs
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript validity is checked with tsc --noEmit
    ignoreBuildErrors: false,
  },
}

export default nextConfig
