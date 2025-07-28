
'use client';

import { useParams } from 'next/navigation';
import AstroClash from '@/components/games/astro-clash';
import { useScreen } from '@/hooks/use-screen';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from 'lucide-react';

const games = [
  {
    slug: 'astro-clash',
    title: 'Astro Clash',
    component: <AstroClash />,
  },
  {
    slug: 'goblin-gold-grab',
    title: 'Goblin Gold Grab',
    component: <div>Goblin Gold Grab coming soon!</div>,
  },
  {
    slug: 'crystal-maze',
    title: 'Crystal Maze',
    component: <div>Crystal Maze coming soon!</div>,
  },
  {
    slug: 'soccer-scramble',
    title: 'Soccer Scramble',
    component: <div>Soccer Scramble coming soon!</div>,
  },
];

export default function GamePage() {
  const params = useParams();
  const slug = params.slug;
  const game = games.find((g) => g.slug === slug);
  const { isFullScreen, toggleFullScreen, isMobile } = useScreen();

  if (!game) {
    return <div>Game not found</div>;
  }

  if (!isMobile) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold mb-4">Mobiles Only</h2>
            <p className="text-muted-foreground">This game is designed to be played on mobile devices.</p>
        </div>
    )
  }

  return (
    <div className={`w-full h-full ${isFullScreen ? 'fixed inset-0 z-50 bg-background' : 'relative'}`}>
      <div className="absolute top-2 right-2 z-50">
        <Button onClick={toggleFullScreen} variant="ghost" size="icon">
          {isFullScreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
        </Button>
      </div>
      {game.component}
    </div>
  );
}
