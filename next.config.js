/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: ["*"],
    },
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), "socket.io-client"];
    return config;
  },
};

module.exports = config;
