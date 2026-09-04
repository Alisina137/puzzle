/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : [],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  output: "standalone",

  compress: true,

  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "bullmq"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      // bullmq optionally imports @valkey/valkey-glide which isn't installed;
      // mark it as external so webpack doesn't try to bundle it
      config.externals.push("@valkey/valkey-glide");
    }
    return config;
  },
};

export default nextConfig;
