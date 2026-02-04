import type { NextConfig } from "next";
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

const nextConfig: NextConfig = {
  webpack: (config) => {
    return config;
  },
};

export default withPWA(nextConfig);