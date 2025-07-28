
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

type Star = {
  x: number;
  y: number;
  size: number;
  speed: number;
};

type Explosion = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
};

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
  const explosions = useRef<Explosion[]>([]);
  const stars = useRef<Star[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopId = useRef<number>();
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const createExplosion = (x: number, y: number) => {
    explosions.current.push({ x, y, radius: 30, alpha: 1 });
  };

  const resetGame = () => {
    if (canvasRef.current) {
      playerPosition.current = { x: canvasRef.current.width / 2, y: canvasRef.current.height - 60 };
    }
    bullets.current = [];
    enemies.current = [];
    explosions.current = [];
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
    
    // Initialize stars
    if (stars.current.length === 0) {
      for (let i = 0; i < 100; i++) {
        stars.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 0.5 + 0.2,
        });
      }
    }
    
    if (!gameOver) {
      if (score !== 0) {
        resetGame();
      } else {
        playerPosition.current = { x: canvas.width / 2, y: canvas.height - 60 };
      }
    }
    
    const drawPlayer = (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(playerPosition.current.x, playerPosition.current.y - 25);
      ctx.lineTo(playerPosition.current.x - 20, playerPosition.current.y + 20);
      ctx.lineTo(playerPosition.current.x + 20, playerPosition.current.y + 20);
      ctx.closePath();
      ctx.fillStyle = '#00FFFF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      
      // Cockpit
      ctx.beginPath();
      ctx.arc(playerPosition.current.x, playerPosition.current.y + 5, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();
      ctx.restore();
    };

    const drawBullets = (ctx: CanvasRenderingContext2D) => {
        bullets.current.forEach(bullet => {
            ctx.fillStyle = '#FFFF00';
            ctx.shadowColor = '#FFFF00';
            ctx.shadowBlur = 10;
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 15);
            ctx.shadowBlur = 0;
        });
    };

    const drawEnemies = (ctx: CanvasRenderingContext2D) => {
        enemies.current.forEach(enemy => {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y - 15);
            ctx.lineTo(enemy.x - 15, enemy.y);
            ctx.lineTo(enemy.x - 10, enemy.y + 10);
            ctx.lineTo(enemy.x + 10, enemy.y + 10);
            ctx.lineTo(enemy.x + 15, enemy.y);
            ctx.closePath();
            ctx.fillStyle = '#FF4136';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
    };

    const drawScore = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'white';
        ctx.font = '24px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${score}`, 20, 40);
    };

    const drawStars = (ctx: CanvasRenderingContext2D) => {
        ctx.save();
        ctx.fillStyle = 'white';
        stars.current.forEach(star => {
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    };
    
    const drawExplosions = (ctx: CanvasRenderingContext2D) => {
        explosions.current.forEach((exp, index) => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 165, 0, ${exp.alpha})`;
            ctx.strokeStyle = `rgba(255, 255, 0, ${exp.alpha})`;
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            
            exp.alpha -= 0.05;
            exp.radius += 0.5;

            if (exp.alpha <= 0) {
                explosions.current.splice(index, 1);
            }
        });
    };
    
    const shoot = () => {
        if(gameOver) return;
        bullets.current.push({ x: playerPosition.current.x, y: playerPosition.current.y - 25 });
    }

    const gameLoop = () => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawStars(ctx);

      if (gameOver) {
        drawScore(ctx);
        drawExplosions(ctx);
        gameLoopId.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      // Player movement
      if (keysPressed.current['ArrowLeft'] && playerPosition.current.x > 20) {
          playerPosition.current.x -= 7;
      }
      if (keysPressed.current['ArrowRight'] && playerPosition.current.x < canvas.width - 20) {
          playerPosition.current.x += 7;
      }

      // Update bullets
      bullets.current = bullets.current.map(b => ({ ...b, y: b.y - 10 })).filter(b => b.y > 0);
      
      // Update enemies
      enemies.current.forEach(enemy => {
          enemy.y += 2.5;
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
            if (Math.sqrt(dx * dx + dy * dy) < 15 + 10) { // enemy radius + bullet radius
                bulletHit = true;
                createExplosion(enemy.x, enemy.y);
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
        if (Math.sqrt(dx * dx + dy * dy) < 20 + 15) { // player radius + enemy radius
            createExplosion(playerPosition.current.x, playerPosition.current.y);
            setGameOver(true);
            break;
        }
      }

      drawPlayer(ctx);
      drawBullets(ctx);
      drawEnemies(ctx);
      drawExplosions(ctx);
      drawScore(ctx);

      gameLoopId.current = requestAnimationFrame(gameLoop);
    };

    const spawnEnemy = () => {
        if (canvas && !gameOver) {
            const x = Math.random() * (canvas.width - 40) + 20;
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
            let newX = touch.clientX - rect.left;
            if (newX < 20) newX = 20;
            if (newX > canvas.width - 20) newX = canvas.width - 20;
            playerPosition.current.x = newX;
        }
    };
    
    let lastTouchTime = 0;
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (gameOver) return;
        const now = new Date().getTime();
        if (now - lastTouchTime < 300) { // Debounce touch shooting
            return;
        }
        lastTouchTime = now;
        if (e.touches.length > 0) {
             shoot();
        }
    };
    
    let shootTimeout: NodeJS.Timeout | null = null;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameOver) return;
        keysPressed.current[e.key] = true;
        if ((e.key === ' ' || e.key === 'Spacebar') && !shootTimeout) {
            e.preventDefault();
            shoot();
            shootTimeout = setTimeout(() => {
                shootTimeout = null;
            }, 150); // Fire rate limit
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

    const enemyInterval = setInterval(spawnEnemy, 900);
    
    gameLoopId.current = requestAnimationFrame(gameLoop);

    return () => {
        if (gameLoopId.current) {
            cancelAnimationFrame(gameLoopId.current);
        }
        if (shootTimeout) {
            clearTimeout(shootTimeout);
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
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white z-10 animate-fade-in">
          <h2 className="text-6xl font-bold mb-4" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Game Over</h2>
          <p className="text-3xl mb-8" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Your Score: {score}</p>
          <Button onClick={resetGame} size="lg" variant="secondary" className="text-lg">
            Play Again
          </Button>
        </div>
      )}
    </>
  )
};

export default AstroClash;

    