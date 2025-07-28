
'use client';

import React, { useState, useEffect, useRef } from 'react';

const AstroClash: React.FC = () => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null; // Or a loading spinner
    }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black text-white touch-none">
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    playerPosition.current = { x: canvas.width / 2, y: canvas.height - 60 };

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
    
    const shoot = () => {
        bullets.current.push({ x: playerPosition.current.x, y: playerPosition.current.y - 20 });
    }

    const gameLoop = () => {
        if (!canvas) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Player movement
        if (keysPressed.current['ArrowLeft'] && playerPosition.current.x > 20) {
            playerPosition.current.x -= 5;
        }
        if (keysPressed.current['ArrowRight'] && playerPosition.current.x < canvas.width - 20) {
            playerPosition.current.x += 5;
        }

        // Update bullets
        bullets.current = bullets.current.map(b => ({ ...b, y: b.y - 5 })).filter(b => b.y > 0);
        
        // Update enemies
        enemies.current.forEach(enemy => {
            enemy.y += 1;
        });

        // Collision detection
        bullets.current.forEach((bullet, bIndex) => {
            enemies.current.forEach((enemy, eIndex) => {
                if (Math.abs(bullet.x - enemy.x) < 15 && Math.abs(bullet.y - enemy.y) < 15) {
                    bullets.current.splice(bIndex, 1);
                    enemies.current.splice(eIndex, 1);
                }
            });
        });

        drawPlayer(context);
        drawBullets(context);
        drawEnemies(context);

        requestAnimationFrame(gameLoop);
    };

    const spawnEnemy = () => {
        const x = Math.random() * canvas.width;
        enemies.current.push({ x, y: 0 });
    };

    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            playerPosition.current.x = touch.clientX - rect.left;
        }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length > 0) {
             shoot();
        }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed.current[e.key] = true;
        if (e.key === ' ') {
            e.preventDefault();
            shoot();
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.key] = false;
    };

    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const enemyInterval = setInterval(spawnEnemy, 2000);
    
    gameLoop();

    return () => {
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        clearInterval(enemyInterval);
    };
  }, []);

  return <canvas ref={canvasRef} className="touch-none" />;
};

export default AstroClash;
