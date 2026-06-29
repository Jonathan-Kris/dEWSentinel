import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pin the workspace root to this app folder. The repo lives in a monorepo-ish
  // layout (vanilla /demo + React /app), and a stray lockfile higher up the tree
  // otherwise makes Next infer the wrong root.
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
