import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy WebSocket connections to the game server
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
