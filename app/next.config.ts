import type { NextConfig } from "next";

// Each deploy gets its own version id, so open copies of the app can tell when a newer one is live.
const BUILD = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || String(Date.now());

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD },
};

export default nextConfig;
