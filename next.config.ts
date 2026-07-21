import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@multiversx/sdk-dapp-ui"],
  // MultiversX SDK pulls Node built-ins into client bundles;
  // webpack stubs them — prefer `next dev --webpack` / `next build --webpack`.
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push("pino-pretty", "lokijs", "encoding", {
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
      });
    }
    return config;
  },
};

export default nextConfig;
