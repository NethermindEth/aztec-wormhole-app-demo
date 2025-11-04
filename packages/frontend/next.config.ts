import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Don't polyfill on server side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
        crypto: false,
        stream: false,
        assert: false,
        http: false,
        https: false,
        os: false,
        url: false,
        zlib: false,
      };
      
      // Automatically inject Buffer and process where they're used
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }
    return config;
  },
  // Configure Turbopack (Next.js 16 default) with the same polyfills
  turbopack: {
    resolveAlias: {
      buffer: 'buffer/',
      process: 'process/browser',
    },
  },
};

export default nextConfig;
