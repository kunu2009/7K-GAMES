
'use client';

import { useParams } from 'next/navigation';
import AstroClash from '@/components/games/astro-clash';
import GoblinGoldGrab from '@/components/games/goblin-gold-grab';
import BuildNBounce from '@/components/games/build-n-bounce';
import RiftRacers from '@/components/games/rift-racers';
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
    component: <GoblinGoldGrab />,
  },
  {
    slug: 'build-n-bounce',
    title: 'Build \'n\' Bounce',
    component: <BuildNBounce />,
  },
  {
    slug: 'rift-racers',
    title: 'Rift Racers',
    component: <RiftRacers />,
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
