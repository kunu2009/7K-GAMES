
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
};

type Tile = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const TILE_WIDTH = 80;
const TILE_HEIGHT = 20;

const BuildNBounce: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white touch-none relative overflow-hidden">
      <GameCanvas />
    </div>
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'over'>('waiting');
  const [score, setScore] = useState(0);
  const [tileLimit, setTileLimit] = useState(3);

  const playerRef = useRef<Player>({ x: 0, y: 0, width: 30, height: 30, vx: 0, vy: 0 });
  const tilesRef = useRef<Tile[]>([]);
  const cameraY = useRef(0);
  const lavaY = useRef(0);
  
  const gameLoopId = useRef<number>();

  const GRAVITY = 0.4;
  const JUMP_POWER = -10;
  const PLAYER_HORIZONTAL_SPEED = 2;

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setScore(0);
    setTileLimit(3);
    cameraY.current = 0;

    playerRef.current = {
      x: canvas.width / 2 - 15,
      y: canvas.height - 100,
      width: 30,
      height: 30,
      vx: PLAYER_HORIZONTAL_SPEED,
      vy: 0,
    };
    
    lavaY.current = canvas.height + 200;

    tilesRef.current = [];
    // Starting platform
    const startPlatformWidth = Math.max(100, canvas.width * 0.6);
    const numStartTiles = Math.ceil(startPlatformWidth / TILE_WIDTH);
    const startX = (canvas.width - numStartTiles * TILE_WIDTH) / 2;
    for(let i=0; i< numStartTiles; i++) {
        tilesRef.current.push({
            x: startX + i * TILE_WIDTH,
            y: canvas.height - 40,
            width: TILE_WIDTH,
            height: TILE_HEIGHT
        })
    }

    setGameState('playing');
  }, []);

  const placeTile = useCallback((e: MouseEvent | TouchEvent) => {
    if (gameState !== 'playing' || tileLimit <= 0) return;
    const canvas = canvasRef.current;
    if(!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        if(e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const gridX = Math.floor(x / TILE_WIDTH) * TILE_WIDTH;
    const gridY = Math.floor((y + cameraY.current) / TILE_HEIGHT) * TILE_HEIGHT;

    // Prevent placing on existing tiles or too close to player
    const player = playerRef.current;
    const playerRect = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height
    };
    const newTileRect = {x: gridX, y: gridY, width: TILE_WIDTH, height: TILE_HEIGHT};
    
    const isOverlappingPlayer = 
        playerRect.x < newTileRect.x + newTileRect.width &&
        playerRect.x + playerRect.width > newTileRect.x &&
        playerRect.y < newTileRect.y + newTileRect.height &&
        playerRect.y + playerRect.height > newTileRect.y;


    if(!tilesRef.current.some(t => t.x === gridX && t.y === gridY) && !isOverlappingPlayer) {
        tilesRef.current.push({
            x: gridX,
            y: gridY,
            width: TILE_WIDTH,
            height: TILE_HEIGHT
        });
        setTileLimit(prev => prev - 1);
    }
  }, [gameState, tileLimit]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if(gameState === 'waiting' || gameState === 'over') {
        startGame();
        setGameState(gameState);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const handleAction = (e: MouseEvent | TouchEvent) => {
        if (gameState === 'playing') {
            placeTile(e);
        } else {
            startGame();
        }
    }
    
    canvas.addEventListener('mousedown', handleAction as EventListener);
    canvas.addEventListener('touchstart', handleAction as EventListener);

    const update = () => {
      if (gameState !== 'playing') return;
      const player = playerRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Player physics
      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;
      
      // Wall bounce
      if (player.x < 0 || player.x + player.width > canvas.width) {
        player.vx *= -1;
      }


      // Collision with tiles
      let onPlatform = false;
      tilesRef.current.forEach(tile => {
        if (
          player.x + player.width > tile.x &&
          player.x < tile.x + tile.width &&
          player.y + player.height > tile.y &&
          player.y + player.height < tile.y + TILE_HEIGHT + player.vy &&
          player.vy > 0
        ) {
          player.vy = JUMP_POWER;
          player.y = tile.y - player.height;
          onPlatform = true;
          setTileLimit(prev => prev + 3); 
        }
      });
      
      // Update camera
      if (player.y - cameraY.current < canvas.height / 3) {
          const delta = player.y - cameraY.current - canvas.height/3;
          cameraY.current += delta * 0.1;
      }
      
      // Update score
      const currentScore = Math.floor(-cameraY.current / 10);
      if(currentScore > score) {
        setScore(currentScore);
      }

      // Lava rises faster
      lavaY.current -= 1;

      // Game over condition
      if (player.y - cameraY.current > canvas.height || player.y > lavaY.current - player.height) {
        setGameState('over');
      }

      // Remove off-screen tiles
      tilesRef.current = tilesRef.current.filter(t => t.y > cameraY.current - TILE_HEIGHT * 2);
    };

    const draw = () => {
      if (!canvasRef.current || !ctx) return;
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Translate camera
      ctx.translate(0, -cameraY.current);

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, cameraY.current, 0, cameraY.current + canvas.height);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#475569');
      ctx.fillStyle = grad;
      ctx.fillRect(0, cameraY.current, canvas.width, canvas.height);


      // Draw tiles
      tilesRef.current.forEach(tile => {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
      });

      // Draw player
      const player = playerRef.current;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw lava
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fillRect(0, lavaY.current, canvas.width, canvas.height * 2);

      ctx.restore(); // Restore context to draw UI

      // Draw UI
      ctx.fillStyle = 'white';
      ctx.font = 'bold 30px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5;
      
      ctx.strokeText(`Score: ${score}`, 20, 50);
      ctx.fillText(`Score: ${score}`, 20, 50);
      
      ctx.strokeText(`Slabs: ${tileLimit}`, 20, 90);
      ctx.fillText(`Slabs: ${tileLimit}`, 20, 90);

      // Draw UI text for game state
      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 60px "Space Grotesk", sans-serif';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 10;
        ctx.fillText(gameState === 'over' ? "Game Over" : "Build 'n' Bounce", canvas.width / 2, canvas.height / 2 - 80);

        ctx.font = '30px "Space Grotesk", sans-serif';
        if (gameState === 'over') {
          ctx.fillText(`Your Score: ${score}`, canvas.width / 2, canvas.height / 2);
          ctx.font = '24px "Space Grotesk", sans-serif';
          ctx.fillText("Click or Tap to Play Again", canvas.width / 2, canvas.height / 2 + 50);
        } else {
          ctx.fillText("Click or Tap to Start Building!", canvas.width / 2, canvas.height / 2);
        }
        ctx.shadowBlur = 0;
      }
    };

    const gameLoop = () => {
      update();
      draw();
      gameLoopId.current = requestAnimationFrame(gameLoop);
    };

    gameLoopId.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleAction as EventListener);
      canvas.removeEventListener('touchstart', handleAction as EventListener);
      if (gameLoopId.current) {
        cancelAnimationFrame(gameLoopId.current);
      }
    };
  }, [gameState, score, startGame, placeTile, tileLimit]);

  return <canvas ref={canvasRef} className="touch-none w-full h-full cursor-pointer" />;
};

export default BuildNBounce;
