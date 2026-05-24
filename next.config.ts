import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: require("path").join(__dirname, "./"),
  async redirects() {
    return [
      {
        source: '/',
        destination: 'https://bhurasa.reneva.in',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
