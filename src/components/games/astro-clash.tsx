
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

const AstroClash: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black text-white touch-none relative">
      <GameCanvas />
    </div>
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerPosition = useRef({ x: 0, y: 0 });
  const bullets = useRef<any[]>([]);
  const enemies = useRef<any[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopId = useRef<number>();
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const resetGame = () => {
    if (canvasRef.current) {
      playerPosition.current = { x: canvasRef.current.width / 2, y: canvasRef.current.height - 60 };
    }
    bullets.current = [];
    enemies.current = [];
    keysPressed.current = {};
    setScore(0);
    setGameOver(false);
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let canvasWidth = window.innerWidth;
    let canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext('2d');
    if (!context) return;
    
    if (!gameOver) {
      if (score !== 0) { // Only reset if it's a restart, not initial load
        resetGame();
      } else {
        playerPosition.current = { x: canvas.width / 2, y: canvas.height - 60 };
      }
    }
    

    const drawPlayer = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.moveTo(playerPosition.current.x, playerPosition.current.y - 20);
      ctx.lineTo(playerPosition.current.x - 20, playerPosition.current.y + 20);
      ctx.lineTo(playerPosition.current.x + 20, playerPosition.current.y + 20);
      ctx.closePath();
      ctx.fillStyle = 'cyan';
      ctx.fill();
    };

    const drawBullets = (ctx: CanvasRenderingContext2D) => {
        bullets.current.forEach(bullet => {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
        });
    };

    const drawEnemies = (ctx: CanvasRenderingContext2D) => {
        enemies.current.forEach(enemy => {
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x - 15, enemy.y - 15, 30, 30);
        });
    };

    const drawScore = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 20, 40);
    };
    
    const shoot = () => {
        if(gameOver) return;
        bullets.current.push({ x: playerPosition.current.x, y: playerPosition.current.y - 20 });
    }

    const gameLoop = () => {
      if (!canvas || gameOver) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Player movement
      if (keysPressed.current['ArrowLeft'] && playerPosition.current.x > 20) {
          playerPosition.current.x -= 5;
      }
      if (keysPressed.current['ArrowRight'] && playerPosition.current.x < canvas.width - 20) {
          playerPosition.current.x += 5;
      }

      // Update bullets
      bullets.current = bullets.current.map(b => ({ ...b, y: b.y - 7 })).filter(b => b.y > 0);
      
      // Update enemies
      enemies.current.forEach(enemy => {
          enemy.y += 2;
      });
      enemies.current = enemies.current.filter(e => e.y < canvas.height);


      // Collision detection: bullets and enemies
      const newBullets = [];
      let newEnemies = [...enemies.current];
      let scoreToAdd = 0;

      for(const bullet of bullets.current) {
        let bulletHit = false;
        for (let i = newEnemies.length - 1; i >= 0; i--) {
            const enemy = newEnemies[i];
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            if (Math.sqrt(dx * dx + dy * dy) < 15 + 5) { // 15 is enemy radius, 5 is bullet radius
                bulletHit = true;
                newEnemies.splice(i, 1);
                scoreToAdd += 10;
                break; 
            }
        }
        if (!bulletHit) {
            newBullets.push(bullet);
        }
      }
      
      bullets.current = newBullets;
      enemies.current = newEnemies;
      if (scoreToAdd > 0) {
        setScore(prevScore => prevScore + scoreToAdd);
      }


      // Collision detection: player and enemies
      for (const enemy of enemies.current) {
        const dx = playerPosition.current.x - enemy.x;
        const dy = playerPosition.current.y - enemy.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20 + 15) { // 20 is player radius, 15 is enemy radius
            setGameOver(true);
            break;
        }
      }

      drawPlayer(ctx);
      drawBullets(ctx);
      drawEnemies(ctx);
      drawScore(ctx);

      gameLoopId.current = requestAnimationFrame(gameLoop);
    };

    const spawnEnemy = () => {
        if (canvas && !gameOver) {
            const x = Math.random() * canvas.width;
            enemies.current.push({ x, y: 0 });
        }
    };

    const handleResize = () => {
        if(canvas) {
            canvasWidth = window.innerWidth;
            canvasHeight = window.innerHeight;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            if (!gameOver) {
                playerPosition.current = { x: canvas.width / 2, y: canvas.height - 60 };
            }
        }
    }

    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (gameOver) return;
        if (e.touches.length > 0 && canvas) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            playerPosition.current.x = touch.clientX - rect.left;
        }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (gameOver) return;
        if (e.touches.length > 0) {
             shoot();
        }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameOver) return;
        keysPressed.current[e.key] = true;
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            shoot();
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.key] = false;
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const enemyInterval = setInterval(spawnEnemy, 1000);
    
    gameLoopId.current = requestAnimationFrame(gameLoop);

    return () => {
        if (gameLoopId.current) {
            cancelAnimationFrame(gameLoopId.current);
        }
        window.removeEventListener('resize', handleResize);
        if (canvas) {
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchstart', handleTouchStart);
        }
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        clearInterval(enemyInterval);
    };
  }, [gameOver]);

  return (
    <>
      <canvas ref={canvasRef} className="touch-none w-full h-full" />
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white z-10">
          <h2 className="text-5xl font-bold mb-4">Game Over</h2>
          <p className="text-2xl mb-8">Your Score: {score}</p>
          <Button onClick={resetGame} size="lg">
            Play Again
          </Button>
        </div>
      )}
    </>
  )
};

export default AstroClash;
