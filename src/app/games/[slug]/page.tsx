import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gamepad2 } from "lucide-react";

const games = [
    { slug: "astro-clash", title: "Astro Clash", description: "A 2D space shooter for up to 4 players.", players: "1-4", image: "https://placehold.co/800x600.png", hint: "space battle", instructions: "Pilots, take control of your starfighters! Use the virtual joystick on your corner of the screen to move. Tap the red button to fire lasers. The last ship standing wins the round. First to 5 wins claims victory!" },
    { slug: "goblin-gold-grab", title: "Goblin Gold Grab", description: "A 2.5D platformer where you race to collect gold.", players: "2-4", image: "https://placehold.co/800x600.png", hint: "fantasy race", instructions: "Goblins, get ready to grab that gold! Tap your side of the screen to jump. Double tap to double jump. Collect as many gold coins as you can before the timer runs out. The goblin with the most gold wins!" },
    { slug: "crystal-maze", title: "Crystal Maze", description: "A 3D puzzle game requiring teamwork.", players: "1-2", image: "https://placehold.co/800x600.png", hint: "abstract puzzle", instructions: "Adventurers, enter the Crystal Maze! One player controls movement with their joystick, while the other controls the camera and interacts with objects. Work together to solve the puzzles and find the exit." },
    { slug: "soccer-scramble", title: "Soccer Scramble", description: "A chaotic, physics-based soccer game.", players: "2-4", image: "https://placehold.co/800x600.png", hint: "sports game", instructions: "Welcome to Soccer Scramble! Each player has a designated color. Tap and drag your players to fling them towards the ball. The first team to score 3 goals wins the match. No rules, just chaos!" },
];

export function generateStaticParams() {
  return games.map((game) => ({
    slug: game.slug,
  }));
}

export default function GamePage({ params }: { params: { slug: string } }) {
  const game = games.find((g) => g.slug === params.slug);

  if (!game) {
    return <div>Game not found</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl animate-fade-in">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-2">{game.title}</h1>
      <div className="mb-6">
        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
          <Users className="h-4 w-4" />
          {game.players} Players
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 relative aspect-video rounded-lg overflow-hidden shadow-lg">
          <Image
            src={game.image}
            alt={game.title}
            fill
            className="object-cover"
            data-ai-hint={game.hint}
          />
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{game.instructions}</p>
                </CardContent>
            </Card>
            <Button size="lg" className="w-full text-lg">
                <Gamepad2 className="mr-2 h-6 w-6" />
                Start Game
            </Button>
        </div>
      </div>
    </div>
  );
}
