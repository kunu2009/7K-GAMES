
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

type Coin = {
  x: number;
  y: number;
  size: number;
};

type Obstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const GoblinGoldGrab: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#87CEEB] text-white touch-none relative">
      <GameCanvas />
    </div>
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({ x: 100, y: 0, width: 50, height: 50, vy: 0, onGround: false });
  const coins = useRef<Coin[]>([]);
  const obstacles = useRef<Obstacle[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopId = useRef<number>();
  const [gameOver, setGameOver] = useState(true);
  const [score, setScore] = useState(0);
  const gameSpeed = useRef(5);
  const worldX = useRef(0);
  const lastObjectX = useRef(0);

  const generateCoin = useCallback(() => {
    const canvas = canvasRef.current;
    if(canvas) {
        lastObjectX.current += 200 + Math.random() * 300;
        coins.current.push({
            x: lastObjectX.current,
            y: canvas.height - 100 - Math.random() * 250,
            size: 15
        });
    }
  }, []);

  const generateObstacle = useCallback(() => {
    const canvas = canvasRef.current;
    if(canvas) {
        lastObjectX.current += 400 + Math.random() * 400;
        const height = Math.random() * 60 + 20;
        obstacles.current.push({
            x: lastObjectX.current,
            y: canvas.height - 50 - height,
            width: 30,
            height: height
        });
    }
  }, []);


  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      playerRef.current = { x: 100, y: canvas.height - 100, width: 50, height: 50, vy: 0, onGround: false };
      lastObjectX.current = canvas.width;
    }
    coins.current = [];
    obstacles.current = [];
    keysPressed.current = {};
    worldX.current = 0;
    gameSpeed.current = 5;
    setScore(0);
    setGameOver(false);

    // Initial object generation
    for (let i = 0; i < 5; i++) {
        generateCoin();
    }
    for (let i = 0; i < 3; i++) {
        generateObstacle();
    }
  }, [generateCoin, generateObstacle]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    let canvasWidth = window.innerWidth;
    let canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const gravity = 0.7;
    const jumpPower = -18;
    const groundY = canvas.height - 50;

    const drawPlayer = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'green';
        ctx.fillRect(playerRef.current.x, playerRef.current.y, playerRef.current.width, playerRef.current.height);
    };

    const drawCoins = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'gold';
        coins.current.forEach(coin => {
            ctx.beginPath();
            ctx.arc(coin.x - worldX.current, coin.y, coin.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const drawObstacles = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'brown';
        obstacles.current.forEach(obstacle => {
            ctx.fillRect(obstacle.x - worldX.current, obstacle.y, obstacle.width, obstacle.height);
        });
    };
    
    const drawGround = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, groundY, canvas.width, 50);
    };

    const drawScore = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'black';
        ctx.font = '24px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Gold: ${score}`, 20, 40);
    };


    const gameLoop = () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      drawGround(ctx);
      
      if (gameOver) {
        drawCoins(ctx);
        drawObstacles(ctx);
        drawPlayer(ctx);
        drawScore(ctx);
        gameLoopId.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      worldX.current += gameSpeed.current;
      gameSpeed.current += 0.001; // Gradually increase speed

      // --- Player Logic ---
      playerRef.current.vy += gravity;
      playerRef.current.y += playerRef.current.vy;
      
      if (playerRef.current.y + playerRef.current.height > groundY) {
        playerRef.current.y = groundY - playerRef.current.height;
        playerRef.current.vy = 0;
        playerRef.current.onGround = true;
      } else {
        playerRef.current.onGround = false;
      }

      if ((keysPressed.current[' '] || keysPressed.current['ArrowUp']) && playerRef.current.onGround) {
        playerRef.current.vy = jumpPower;
      }
      
      // Clamp player position
      if(playerRef.current.x < 0) playerRef.current.x = 0;
      if(playerRef.current.x + playerRef.current.width > canvas.width) playerRef.current.x = canvas.width - playerRef.current.width;

      // --- Collision Detection ---
      // Coins
      coins.current.forEach((coin, index) => {
        const dx = (coin.x - worldX.current) - (playerRef.current.x + playerRef.current.width / 2);
        const dy = coin.y - (playerRef.current.y + playerRef.current.height / 2);
        if (Math.sqrt(dx*dx + dy*dy) < coin.size + playerRef.current.width / 2) {
          coins.current.splice(index, 1);
          setScore(prev => prev + 1);
        }
      });
      
      // Obstacles
      obstacles.current.forEach((obstacle) => {
        if (
          playerRef.current.x < obstacle.x - worldX.current + obstacle.width &&
          playerRef.current.x + playerRef.current.width > obstacle.x - worldX.current &&
          playerRef.current.y < obstacle.y + obstacle.height &&
          playerRef.current.y + playerRef.current.height > obstacle.y
        ) {
          setGameOver(true);
        }
      });
      
      // Clean up off-screen objects and generate new ones
      coins.current = coins.current.filter(c => c.x - worldX.current + c.size > 0);
      while(coins.current.length < 10) {
        generateCoin();
      }

      obstacles.current = obstacles.current.filter(o => o.x - worldX.current + o.width > 0);
      while(obstacles.current.length < 5) {
        generateObstacle();
      }

      // --- Drawing ---
      drawCoins(ctx);
      drawObstacles(ctx);
      drawPlayer(ctx);
      drawScore(ctx);

      gameLoopId.current = requestAnimationFrame(gameLoop);
    };

    const handleResize = () => {
        const canvas = canvasRef.current;
        if(canvas) {
            canvasWidth = window.innerWidth;
            canvasHeight = window.innerHeight;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
        }
    }
    
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (gameOver) {
            if(e.touches.length > 0) {
              startGame();
            }
            return;
        }

        if (playerRef.current.onGround) {
            playerRef.current.vy = jumpPower;
        }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameOver && e.key !== 'Enter' && e.key !== ' ') return;
        if ((e.key === 'Enter' || e.key === ' ') && gameOver) {
            startGame();
            return;
        }
        keysPressed.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.key] = false;
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    gameLoopId.current = requestAnimationFrame(gameLoop);

    return () => {
        if (gameLoopId.current) {
            cancelAnimationFrame(gameLoopId.current);
        }
        window.removeEventListener('resize', handleResize);
        if (canvasRef.current) {
            canvasRef.current.removeEventListener('touchstart', handleTouchStart);
        }
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver, score, startGame, generateCoin, generateObstacle]);

  return (
    <>
      <canvas ref={canvasRef} className="touch-none w-full h-full" />
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white z-10 animate-fade-in">
          <h2 className="text-6xl font-bold mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{score > 0 ? "Game Over" : "Goblin Gold Grab"}</h2>
          <p className="text-3xl mb-8" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{score > 0 ? `Your Score: ${score}` : "Tap or Press Space to Jump"}</p>
          <Button onClick={startGame} size="lg" variant="secondary" className="text-lg">
            {score > 0 ? "Play Again" : "Start Game"}
          </Button>
        </div>
      )}
    </>
  )
};

export default GoblinGoldGrab;
