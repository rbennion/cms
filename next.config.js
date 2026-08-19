/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a self-contained server bundle for the container image.
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ["pdf-lib"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("pdf-lib");
    }
    return config;
  },
}

module.exports = nextConfig
