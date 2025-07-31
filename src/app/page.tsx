
import { Badge } from "@/components/ui/badge";
import GameCard from "@/components/game-card";

const games = [
  { 
    slug: "astro-clash", 
    title: "Astro Clash", 
    description: "A 2D space shooter for up to 4 players.", 
    players: "1-4", 
    image: "https://placehold.co/600x400.png",
    hint: "space battle"
  },
  { 
    slug: "goblin-gold-grab", 
    title: "Goblin Gold Grab", 
    description: "A 2.5D platformer where you race to collect gold.", 
    players: "1", 
    image: "https://placehold.co/600x400.png",
    hint: "fantasy race"
  },
  { 
    slug: "build-n-bounce", 
    title: "Build 'n' Bounce", 
    description: "Build your path upwards on a constantly bouncing platform.", 
    players: "1", 
    image: "https://placehold.co/600x400.png",
    hint: "abstract puzzle"
  },
  { 
    slug: "soccer-scramble", 
    title: "Soccer Scramble", 
    description: "A physics-based 2D soccer game for 2 players.", 
    players: "2", 
    image: "https://placehold.co/600x400.png",
    hint: "soccer physics"
  },
];

export default function Home() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Select a Game</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {games.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
    </div>
  );
}
