import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js", "sqlite3", "sqlite"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
