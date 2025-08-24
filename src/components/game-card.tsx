'use client';

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useState, useEffect } from "react";

type Game = {
  slug: string;
  title: string;
  description: string;
  players: string;
  image: string;
  hint: string;
};

type GameCardProps = {
  game: Game;
};

export default function GameCard({ game }: GameCardProps) {
  const [imageUrl, setImageUrl] = useState(game.image);

  useEffect(() => {
    try {
      const storedImage = localStorage.getItem(`game-image-${game.slug}`);
      if (storedImage) {
        setImageUrl(storedImage);
      }
    } catch (e) {
        console.error("Could not access localStorage", e);
    }
  }, [game.slug]);

  return (
    <Link href={`/games/${game.slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:border-primary">
        <CardHeader className="p-0">
          <div className="relative h-48 w-full">
            <Image
              src={imageUrl}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
              data-ai-hint={game.hint}
              unoptimized={imageUrl.startsWith('data:image')} // Next.js needs this for data URIs
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-xl font-bold">{game.title}</CardTitle>
          <CardDescription className="mt-2 text-sm">{game.description}</CardDescription>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {game.players} Players
          </Badge>
        </CardFooter>
      </Card>
    </Link>
  );
}
