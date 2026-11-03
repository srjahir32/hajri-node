import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is an authenticated, client-driven dashboard (JWT in the browser), so the opt-in
  // cacheComponents / partial-prefetching features of the scaffold are intentionally left off.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
