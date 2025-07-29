
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

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
  const shootTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const shootSoundRef = useRef<HTMLAudioElement>(null);
  const explosionSoundRef = useRef<HTMLAudioElement>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement>(null);

  const playSound = (soundRef: React.RefObject<HTMLAudioElement>) => {
    if (!isMuted && soundRef.current) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(e => console.error("Error playing sound:", e));
    }
  };

  const createExplosion = (x: number, y: number) => {
    explosions.current.push({ x, y, radius: 30, alpha: 1 });
    playSound(explosionSoundRef);
  };
  
  const resetGame = useCallback(() => {
    if (canvasRef.current) {
      playerPosition.current = { x: canvasRef.current.width / 2, y: canvasRef.current.height - 60 };
    }
    bullets.current = [];
    enemies.current = [];
    explosions.current = [];
    keysPressed.current = {};
    setScore(0);
    setGameOver(false);
  }, []);
  
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
    
    resetGame();
    
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
        playSound(shootSoundRef);
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
                setScore(prevScore => prevScore + 10);
                break; 
            }
        }
        if (!bulletHit) {
            newBullets.push(bullet);
        }
      }
      
      bullets.current = newBullets;
      enemies.current = newEnemies;


      // Collision detection: player and enemies
      for (const enemy of enemies.current) {
        const dx = playerPosition.current.x - enemy.x;
        const dy = playerPosition.current.y - enemy.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20 + 15) { // player radius + enemy radius
            createExplosion(playerPosition.current.x, playerPosition.current.y);
            playSound(gameOverSoundRef);
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
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameOver) return;
        keysPressed.current[e.key] = true;
        if ((e.key === ' ' || e.key === 'Spacebar') && !shootTimeout.current) {
            e.preventDefault();
            shoot();
            shootTimeout.current = setTimeout(() => {
                shootTimeout.current = null;
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

    const enemyInterval = setInterval(spawnEnemy, 800);
    
    gameLoopId.current = requestAnimationFrame(gameLoop);

    return () => {
        if (gameLoopId.current) {
            cancelAnimationFrame(gameLoopId.current);
        }
        if (shootTimeout.current) {
            clearTimeout(shootTimeout.current);
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
  }, [gameOver, score, resetGame]);

  return (
    <>
      <audio ref={shootSoundRef} src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAA//8/f/3/9v/e/6D/wf9g/13/MP8x/zT/Qf9r/2b/Uv9C/zb/Jv8j/yH/Gv8g/yY/LD/H/8f/q/+O/4X/b/9r/17/Yf9t/3r/hf+d/6n/vf/F/8P/uP+t/6D/mv+W/5L/kv+V/5r/oP+l/6j/q/+q/6j/p/+h/6D/n/+d/5r/mf+X/5T/lP+U/5X/mP+b/5//ov+p/6z/uf+9/8H/w/+9/7f/s/+u/6v/qf+m/6T/pP+n/6n/rP+x/7b/uv+8/7//wP/A/8D/v/+7/7n/t/+0/7L/r/+t/6//sP+z/7f/uv+8/8D/xP/G/8X/w//A/7//u/+5/7f/t/+0/7P/sv+x/7H/s/+1/7f/uf+7/7z/vf+9/73/vf+8/7r/uf+2/7P/r/+t/6v/qP+m/6T/pP+n/6k=" preload="auto"></audio>
      <audio ref={explosionSoundRef} src="data:audio/wav;base64,UklGRiIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQwAAAD8/vr+7f71/Pr88vz2/On85vzc/OD82vzV/NL8yvzC+7j5qPg79of0MvH/64frEuj/5O3mMeX/4pnhKeB/2xLaK9cr1S/NKcxsyPjE+sL6t/qg+IL4JfiU+Jr4nfiV+IL4bPhc+Gf4fPiI+Jb4mPim+KX4pPif+J74nvif+Jz4lviJ+IT4hPiD+ID4f/h++Hb4c/hy+G74a/hp+Gn4avht+G/4dPh5+Hz4fviB+If4jfiZ+K74s/i++MH4zvnV+f76gPudaJHUx+u86Mzh9+FW3uTYGtiZyPrC9Kz3mvys/bMAJQEzAS4BHwEaAQ0BCQELAQwBCwELAQwBDQEPAFcBWgGTAX4BjwGRAYoBfwF4AVsBSgE8ASQBDQDx/sX+vf6//qr+mv6U/pf+mv6n/rP+w/7X/uv++/8UAxIDJgMwAzIDNAMqAyYDJQMiAx4DGwMaAxkDGAN4/tr+z/7K/sn+w/6v/qT+n/6d/p3+oP6l/qz+tP7A/sr+2f7s/voA/wHDAdoB5AHoAesB6AHkAd8B1wHPAckBwwG5AbQBpAGZAT4A5v/V/9T/yf/F/8T/wv/C/8L/x//S/9n/4v/n/+z/9f/6AAMBBAEHAAwADwAOAA4ADQAJAAUAAQAEAAwADQAPABIAFgAWABQAEgAQAA0ACwALAA0ADwARABMAFQAXABkAGwAbABsAGgAYABQAEQAPAA4ADQAOAA8AEQATABYAGQAcAB4AIAAhAB8AHQAZABYAFAASABAADgANAA4AEAAQABAAEAAPAA0ACwAKAAoACgAKAAoACQAI" preload="auto"></audio>
      <audio ref={gameOverSoundRef} src="data:audio/wav;base64,UklGRjoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRoAAADD/sL+v/7G/sv+2/7l/v3//QEJAScBMQFEAV4BkgGdAagBsgHMAdEB2wHbAdQBzgHOAc4BzgHOAc4BzgHOAc4BzgHOAc4BzgHOAc4BzgHOAc4BzgHOAc4BzgHOgc+B0IHUgdmB3IHiAeQB6QHqAesB6gHnAeIB2wHRAckBqgGeAR8A7/6r/pj+mf6c/p/+qP7D/uH/BQAfAC8ASQBeAGgAZQBcAEcANgAhABD/8/2M/pD+VPw4+zH6Q/pb+xL8Nf0z/fsBBAIiAyUDRgPl/ff91/2h/bb9z/4b/oX9uP0N/M78zPzO/M78xPzB+777sPuq+qD6k/i39171ovNb8sTzNfQz9Vb3hPoP/JL84f0N/gMCBQMAAP/+/er7zfuK+5f7mvuo+qb6l/mX+Iz4QPdE9U30P/O68ZXxbvFk8U3xQ/F38W3xevGA8ZrycvN39PX1i/eO+Rr8LQDm/tb+pP6J/nUAJgCJAaYB8wIOA0sB1wHoAfwB/AH5AekB0AGzAZQBQwDP/sL+u/6k/pz+o/6l/q/+uP7B/sn+0f7b/uL+8f76/v3//gACAAQABgAHAAYABQADAAEAAQABAAIAAQAAAAEAAAAA" preload="auto"></audio>
      
      <div className="absolute top-2 left-2 z-10">
        <Button onClick={() => setIsMuted(prev => !prev)} variant="ghost" size="icon">
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
      </div>
      
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
