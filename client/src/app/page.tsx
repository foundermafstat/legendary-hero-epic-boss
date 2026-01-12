'use client';

import dynamic from 'next/dynamic';

// Dynamically import Game component to avoid SSR issues with PixiJS
const Game = dynamic(() => import('@/components/GameMultiplayer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl font-mono animate-pulse">
        Initializing game engine...
      </div>
    </div>
  ),
});

export default function Home() {
  return <Game />;
}
