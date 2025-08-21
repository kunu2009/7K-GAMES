
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, ArrowLeft, ArrowRight, Crosshair } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';


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

type Player = {
    x: number;
    y: number;
    color: string;
    lives: number;
    id: number;
}

type Bullet = {
    x: number;
    y: number;
    ownerId: number;
    vy: number;
}

type Asteroid = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: 'large' | 'medium' | 'small';
    radius: number;
}

// For mobile touch controls
type TouchState = {
    touching: boolean;
    x: number;
    y: number;
    isShooting: boolean;
};

const AstroClash: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; 
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black text-white touch-none relative">
      <GameCanvas />
    </div>
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  
  const player1Ref = useRef<Player>({ id: 1, x: 0, y: 0, color: '#00FFFF', lives: 3 });
  const player2Ref = useRef<Player | null>(null);
  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<any[]>([]);
  const asteroids = useRef<Asteroid[]>([]);
  const explosions = useRef<Explosion[]>([]);
  const stars = useRef<Star[]>([]);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopId = useRef<number>();
  
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'over'>('menu');
  const [gameMode, setGameMode] = useState<'solo' | 'versus' | null>(null);
  const [score, setScore] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const shootTimeoutP1 = useRef<NodeJS.Timeout | null>(null);
  const shootTimeoutP2 = useRef<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const shootSoundRef = useRef<HTMLAudioElement | null>(null);
  const explosionSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);

  const touchStateP1 = useRef<TouchState>({ touching: false, x: 0, y: 0, isShooting: false });
  const touchStateP2 = useRef<TouchState>({ touching: false, x: 0, y: 0, isShooting: false });


  const playSound = useCallback((soundRef: React.RefObject<HTMLAudioElement>) => {
    if (soundRef.current && !isMuted) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(e => console.error("Error playing sound:", e));
    }
  }, [isMuted]);

  const createExplosion = useCallback((x: number, y: number) => {
    explosions.current.push({ x, y, radius: 30, alpha: 1 });
    playSound(explosionSoundRef);
  }, [playSound]);
  
  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    player1Ref.current = { id: 1, x: canvas.width / 3, y: canvas.height - 60, color: '#00FFFF', lives: 3 };

    if (gameMode === 'versus') {
        player2Ref.current = { id: 2, x: (canvas.width / 3) * 2, y: canvas.height - 60, color: '#FF4136', lives: 3 };
    } else {
        player2Ref.current = null;
    }

    bullets.current = [];
    enemies.current = [];
    asteroids.current = [];
    explosions.current = [];
    keysPressed.current = {};
    setScore(0);
    setWinner(null);
  }, [gameMode]);

  const startGame = useCallback((mode: 'solo' | 'versus') => {
    setGameMode(mode);
    setGameState('playing');
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      resetGame();
    }
  }, [gameState, gameMode, resetGame]);

  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    let canvasWidth = window.innerWidth;
    let canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

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
    
    const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
      if (player.lives <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 25);
      ctx.lineTo(player.x - 20, player.y + 20);
      ctx.lineTo(player.x + 20, player.y + 20);
      ctx.closePath();
      ctx.fillStyle = player.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(player.x, player.y + 5, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();
      ctx.restore();
    };

    const drawBullets = (ctx: CanvasRenderingContext2D) => {
        bullets.current.forEach(bullet => {
            ctx.fillStyle = bullet.ownerId === 1 ? player1Ref.current.color : player2Ref.current?.color || '#FFFF00';
            ctx.shadowColor = bullet.ownerId === 1 ? player1Ref.current.color : player2Ref.current?.color || '#FFFF00';
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

    const drawAsteroids = (ctx: CanvasRenderingContext2D) => {
        asteroids.current.forEach(asteroid => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        });
    };

    const drawUI = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'white';
        ctx.font = '24px "Space Grotesk", sans-serif';
        if(gameMode === 'solo') {
            ctx.textAlign = 'left';
            ctx.fillText(`Score: ${score}`, 20, 40);
            ctx.fillText(`Lives: ${player1Ref.current.lives}`, 20, 70);
        } else if (gameMode === 'versus') {
            ctx.textAlign = 'left';
            ctx.fillStyle = player1Ref.current.color;
            ctx.fillText(`P1 Lives: ${player1Ref.current.lives}`, 20, 40);
            
            ctx.textAlign = 'right';
            if (player2Ref.current) {
                ctx.fillStyle = player2Ref.current.color;
                ctx.fillText(`P2 Lives: ${player2Ref.current.lives}`, canvas.width - 20, 40);
            }
        }
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
            exp.alpha -= 0.05;
            exp.radius += 0.5;
            if (exp.alpha <= 0) {
                explosions.current.splice(index, 1);
            } else {
                ctx.save();
                ctx.beginPath();
                ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 165, 0, ${exp.alpha})`;
                ctx.strokeStyle = `rgba(255, 255, 0, ${exp.alpha})`;
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        });
    };
    
    const shoot = (playerId: number) => {
        if(gameState !== 'playing') return;
        const player = playerId === 1 ? player1Ref.current : player2Ref.current;
        if (!player || player.lives <= 0) return;

        const timeoutRef = playerId === 1 ? shootTimeoutP1 : shootTimeoutP2;
        if(timeoutRef.current) return;

        bullets.current.push({ x: player.x, y: player.y - 25, ownerId: playerId, vy: -10 });
        playSound(shootSoundRef);

        timeoutRef.current = setTimeout(() => { timeoutRef.current = null; }, 200);
    }

    const gameLoop = () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      drawStars(ctx);

      if (gameState !== 'playing') {
        drawExplosions(ctx);
        gameLoopId.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      // Update player positions
      if (isMobile) {
        if (touchStateP1.current.touching) {
            const dx = touchStateP1.current.x - player1Ref.current.x;
            if (Math.abs(dx) > 5) player1Ref.current.x += Math.sign(dx) * 7;
        }
        if (touchStateP1.current.isShooting) shoot(1);

        if (player2Ref.current && touchStateP2.current.touching) {
            const dx = touchStateP2.current.x - player2Ref.current.x;
            if (Math.abs(dx) > 5) player2Ref.current.x += Math.sign(dx) * 7;
        }
        if (player2Ref.current && touchStateP2.current.isShooting) shoot(2);

      } else { // Keyboard controls
          if (keysPressed.current['arrowleft'] && player1Ref.current.x > 20) player1Ref.current.x -= 7;
          if (keysPressed.current['arrowright'] && player1Ref.current.x < canvasRef.current.width - 20) player1Ref.current.x += 7;
          if (keysPressed.current[' '] || keysPressed.current['arrowup']) shoot(1);

          if(player2Ref.current) {
              if (keysPressed.current['a'] && player2Ref.current.x > 20) player2Ref.current.x -= 7;
              if (keysPressed.current['d'] && player2Ref.current.x < canvasRef.current.width - 20) player2Ref.current.x += 7;
              if (keysPressed.current['shift'] || keysPressed.current['w']) shoot(2);
          }
      }

      // Update bullet positions
      for(let i = bullets.current.length - 1; i >= 0; i--) {
        const bullet = bullets.current[i];
        bullet.y += bullet.vy;
        if(bullet.y < 0 || bullet.y > canvas.height) {
            bullets.current.splice(i, 1);
        }
      }
      
      // Update enemy positions (solo mode)
      if (gameMode === 'solo') {
        for(let i = enemies.current.length - 1; i >= 0; i--) {
          const enemy = enemies.current[i];
          enemy.y += 2.5;
          if(enemy.y > canvasRef.current.height) {
              enemies.current.splice(i, 1);
          }
        }
      }
      
      // Update asteroid positions
      for (let i = asteroids.current.length - 1; i >= 0; i--) {
        const ast = asteroids.current[i];
        ast.x += ast.vx;
        ast.y += ast.vy;
        if (ast.x < -ast.radius || ast.x > canvas.width + ast.radius || ast.y > canvas.height + ast.radius) {
            asteroids.current.splice(i, 1);
        }
      }


      // --- Collision Detection ---
      for (let i = bullets.current.length - 1; i >= 0; i--) {
          const bullet = bullets.current[i];
          if(!bullet) continue;
          
          if(gameMode === 'solo') {
             for (let j = enemies.current.length - 1; j >= 0; j--) {
                const enemy = enemies.current[j];
                 if(enemy) {
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 20 + 15) { 
                      createExplosion(enemy.x, enemy.y);
                      enemies.current.splice(j, 1);
                      bullets.current.splice(i, 1);
                      setScore(prev => prev + 10);
                      break; 
                    }
                 }
            }
          } else { // versus mode
            const targetPlayer = bullet.ownerId === 1 ? player2Ref.current : player1Ref.current;
            if(targetPlayer && targetPlayer.lives > 0) {
                const dx = bullet.x - targetPlayer.x;
                const dy = bullet.y - targetPlayer.y;
                if (Math.sqrt(dx * dx + dy * dy) < 20 + 15) {
                    createExplosion(targetPlayer.x, targetPlayer.y);
                    targetPlayer.lives--;
                    bullets.current.splice(i, 1);
                    if(targetPlayer.lives <= 0) {
                        setWinner(bullet.ownerId === 1 ? 'Player 1' : 'Player 2');
                        playSound(gameOverSoundRef);
                        setGameState('over');
                    }
                    break;
                }
            }
          }
          // Bullet-asteroid collision
          for (let k = asteroids.current.length - 1; k >= 0; k--) {
              const ast = asteroids.current[k];
              if(!ast) continue;
              const dx = bullet.x - ast.x;
              const dy = bullet.y - ast.y;
              if (Math.sqrt(dx*dx + dy*dy) < ast.radius) {
                  createExplosion(ast.x, ast.y);
                  // Break asteroid
                  if(ast.size === 'large' || ast.size === 'medium') {
                    const newSize = ast.size === 'large' ? 'medium' : 'small';
                    const newRadius = newSize === 'medium' ? 25 : 15;
                    for(let j=0; j<2; j++) {
                        asteroids.current.push({
                            x: ast.x, y: ast.y,
                            vx: Math.random() * 4 - 2, vy: Math.random() * 4 - 2,
                            size: newSize, radius: newRadius
                        });
                    }
                  }
                  asteroids.current.splice(k, 1);
                  bullets.current.splice(i, 1);
                  if (gameMode === 'solo' && bullet.ownerId === 1) {
                      setScore(prev => prev + 5);
                  }
                  break;
              }
          }
      }
      
      const checkPlayerAsteroidCollision = (player: Player) => {
        if (player.lives <= 0) return;
        for (let i = asteroids.current.length - 1; i >= 0; i--) {
            const ast = asteroids.current[i];
            const dx = player.x - ast.x;
            const dy = player.y - ast.y;
            if (Math.sqrt(dx*dx + dy*dy) < ast.radius + 20) {
                createExplosion(player.x, player.y);
                createExplosion(ast.x, ast.y);
                asteroids.current.splice(i, 1);
                player.lives--;
                 if (gameMode === 'versus' && player.lives <= 0) {
                     const p1L = player.id === 1 ? 0 : player1Ref.current.lives;
                     const p2L = player.id === 2 ? 0 : player2Ref.current?.lives || 0;
                     if(p1L <= 0 && p2L <= 0) setWinner("It's a Draw!");
                     else if (p1L > 0) setWinner('Player 2'); // Player 1 is ID 1, so if P1 lives, P2 lost
                     else setWinner('Player 1');
                     playSound(gameOverSoundRef);
                     setGameState('over');
                 } else if (gameMode === 'solo' && player.lives <= 0) {
                     playSound(gameOverSoundRef);
                     setGameState('over');
                 }
                return;
            }
        }
      }
      
      checkPlayerAsteroidCollision(player1Ref.current);
      if(player2Ref.current) checkPlayerAsteroidCollision(player2Ref.current);

      if(gameMode === 'solo') {
        if(player1Ref.current.lives > 0) {
            for (let j = enemies.current.length - 1; j >= 0; j--) {
                const enemy = enemies.current[j];
                const dx = player1Ref.current.x - enemy.x;
                const dy = player1Ref.current.y - enemy.y;
                if (Math.sqrt(dx * dx + dy * dy) < 20 + 15) {
                    createExplosion(player1Ref.current.x, player1Ref.current.y);
                    enemies.current.splice(j,1);
                    player1Ref.current.lives--;
                    if(player1Ref.current.lives <= 0){
                        playSound(gameOverSoundRef);
                        setGameState('over');
                    }
                    break;
                }
            }
        }
      }

      // --- Drawing ---
      drawPlayer(ctx, player1Ref.current);
      if(player2Ref.current) drawPlayer(ctx, player2Ref.current);
      drawBullets(ctx);
      if(gameMode === 'solo') drawEnemies(ctx);
      else drawAsteroids(ctx);
      drawExplosions(ctx);
      drawUI(ctx);

      gameLoopId.current = requestAnimationFrame(gameLoop);
    };

    const spawnEnemy = () => {
        if (canvasRef.current && gameState === 'playing' && gameMode === 'solo') {
            const x = Math.random() * (canvasRef.current.width - 40) + 20;
            enemies.current.push({ x, y: 0 });
        }
    };
    
    const spawnAsteroid = () => {
        if (canvasRef.current && gameState === 'playing') { // Spawn for both modes now
            const edge = Math.floor(Math.random() * 4);
            let x, y, vx, vy;
            const radius = 40;
            if (edge === 0) { // Top
                x = Math.random() * canvas.width; y = -radius;
                vx = Math.random() * 4 - 2; vy = Math.random() * 2 + 1;
            } else if (edge === 1) { // Right
                x = canvas.width + radius; y = Math.random() * canvas.height;
                vx = -(Math.random() * 2 + 1); vy = Math.random() * 4 - 2;
            } else if (edge === 2) { // Bottom
                x = Math.random() * canvas.width; y = canvas.height + radius;
                vx = Math.random() * 4 - 2; vy = -(Math.random() * 2 + 1);
            } else { // Left
                x = -radius; y = Math.random() * canvas.height;
                vx = Math.random() * 2 + 1; vy = Math.random() * 4 - 2;
            }
            asteroids.current.push({x, y, vx, vy, size: 'large', radius});
        }
    }

    const handleResize = () => {
        const canvas = canvasRef.current;
        if(canvas) {
            canvasWidth = window.innerWidth;
            canvasHeight = window.innerHeight;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            if(gameState === 'playing') {
                resetGame();
            }
        }
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState !== 'playing') return;
        const key = e.key.toLowerCase();
        keysPressed.current[key] = true;
        
        if (gameMode === 'versus') {
            // P1 shoot is `space` or `arrowup`
            if (key === ' ' || key === 'arrowup') {
                 e.preventDefault();
                 shoot(1);
            }
             // P2 shoot is `shift` or `w`
            if(key === 'shift' || key === 'w') {
                 e.preventDefault();
                 shoot(2);
            }
        } else {
            // Solo mode shoot
             if (key === ' ' || key === 'arrowup') {
                 e.preventDefault();
                 shoot(1);
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.key.toLowerCase()] = false;
    };
    
    const handleTouchEvent = (e: TouchEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        
        // Reset states
        touchStateP1.current = { ...touchStateP1.current, touching: false, isShooting: false };
        if(player2Ref.current) {
            touchStateP2.current = { ...touchStateP2.current, touching: false, isShooting: false };
        }

        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            const shootZoneHeight = canvas.height * 0.2; // Top 20% is for shooting

            if (gameMode === 'solo') {
                 if (y < shootZoneHeight) {
                    touchStateP1.current.isShooting = true;
                } else {
                    touchStateP1.current.touching = true;
                    touchStateP1.current.x = x;
                }
            } else { // Versus mode
                if (x < canvas.width / 2) { // Left side of screen for P1
                     if (y < shootZoneHeight) {
                        touchStateP1.current.isShooting = true;
                    } else {
                        touchStateP1.current.touching = true;
                        touchStateP1.current.x = x;
                    }
                } else { // Right side for P2
                    if (y < shootZoneHeight) {
                        touchStateP2.current.isShooting = true;
                    } else {
                        touchStateP2.current.touching = true;
                        touchStateP2.current.x = x;
                    }
                }
            }
        }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Touch listeners for mobile
    canvas.addEventListener('touchstart', handleTouchEvent);
    canvas.addEventListener('touchmove', handleTouchEvent);
    canvas.addEventListener('touchend', handleTouchEvent);

    const enemyInterval = setInterval(spawnEnemy, 1200);
    const asteroidInterval = setInterval(spawnAsteroid, 2500);
    
    gameLoopId.current = requestAnimationFrame(gameLoop);

    return () => {
        if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
        if (shootTimeoutP1.current) clearTimeout(shootTimeoutP1.current);
        if (shootTimeoutP2.current) clearTimeout(shootTimeoutP2.current);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        clearInterval(enemyInterval);
        clearInterval(asteroidInterval);
        if(canvas) {
            canvas.removeEventListener('touchstart', handleTouchEvent);
            canvas.removeEventListener('touchmove', handleTouchEvent);
            canvas.removeEventListener('touchend', handleTouchEvent);
        }
    };
  }, [gameState, score, playSound, createExplosion, resetGame, gameMode, isMobile]);

  const renderMenu = () => (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white z-10 animate-fade-in">
        <h2 className="text-6xl font-bold mb-8 text-center" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Astro Clash</h2>
        <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => startGame('solo')} size="lg" variant="secondary" className="text-lg">
                Solo Mission
            </Button>
            <Button onClick={() => startGame('versus')} size="lg" variant="secondary" className="text-lg">
                Versus Mode
            </Button>
        </div>
        { isMobile && (
            <div className="mt-8 text-center text-muted-foreground p-4 rounded-md bg-background/20 max-w-sm">
                <h3 className="font-bold text-lg mb-2 text-white">Mobile Controls</h3>
                <p><span className="font-bold text-cyan-400">P1 (Solo/Versus):</span> Left side of screen.</p>
                 <p><span className="font-bold text-red-500">P2 (Versus):</span> Right side of screen.</p>
                <p className="mt-2">Drag bottom 80% to move. Tap top 20% to shoot.</p>
            </div>
        )}
         { !isMobile && (
            <div className="mt-8 text-left text-muted-foreground p-4 rounded-md bg-background/20 max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <h3 className="font-bold text-lg text-white">Player 1 Controls</h3>
                    <p><span className="font-bold text-cyan-400">Move:</span> Left/Right Arrows</p>
                    <p><span className="font-bold text-cyan-400">Shoot:</span> Spacebar / Up Arrow</p>
                </div>
                 <div>
                    <h3 className="font-bold text-lg text-white">Player 2 Controls (Versus)</h3>
                    <p><span className="font-bold text-red-500">Move:</span> A / D Keys</p>
                    <p><span className="font-bold text-red-500">Shoot:</span> W Key / Left Shift</p>
                </div>
            </div>
        )}
    </div>
  );

  const renderGameOver = () => {
    let title = "Game Over";
    let subTitle = `Your Score: ${score}`;

    if (gameMode === 'versus') {
        title = winner ? `${winner} Wins!` : "It's a Draw!";
        subTitle = `P1 Lives: ${player1Ref.current.lives} | P2 Lives: ${player2Ref.current?.lives || 0}`;
    }

    return (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white z-10 animate-fade-in">
            <h2 className="text-6xl font-bold mb-4 text-center" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{title}</h2>
            <p className="text-3xl mb-8" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{subTitle}</p>
            <Button onClick={() => setGameState('menu')} size="lg" variant="secondary" className="text-lg">
                Main Menu
            </Button>
        </div>
    );
  }
  
  return (
    <>
      <audio ref={shootSoundRef} src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAA//8/f/3/9v/e/6D/wf9g/13/MP8x/zT/Qf9r/2b/Uv9C/zb/Jv8j/yH/Gv8g/yY/LD/H/8f/q/+O/4X/b/9r/17/Yf9t/3r/hf+d/6n/vf/F/8P/uP+t/6D/mv+W/5L/kv+V/5r/oP+l/6j/q/+q/6j/p/+h/6D/n/+d/5r/mf+X/5T/lP+U/5X/mP+b/5//ov+p/6z/uf+9/8H/w/+9/7f/s/+u/6v/qf+m/6T/pP+n/6n/rP+x/7b/uv+8/7//wP/A/8D/v/+7/7n/t/+0/7L/r/+t/6//sP+z/7f/uv+8/8D/xP/G/8X/w//A/7//u/+5/7f/t/+0/7P/sv+x/7H/s/+1/7f/uf+7/7z/vf+9/73/vf+8/7r/uf+2/7P/r/+t/6v/qP+m/6T/pP+n/6k=" preload="auto"></audio>
      <audio ref={explosionSoundRef} src="data:audio/wav;base64,UklGRiIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQwAAAD8/vr+7f71/Pr88vz2/On85vzc/OD82vzV/NL8yvzC+7j5qPg79of0MvH/64frEuj/5O3mMeX/4pnhKeB/2xLaK9cr1S/NKcxsyPjE+sL6t/qg+IL4JfiU+Jr4nfiV+IL4bPhc+Gf4fPiI+Jb4mPim+KX4pPif+J74nvif+Jz4lviJ+IT4hPiD+ID4f/h++Hb4c/hy+G74a/hp+Gn4avht+G/4dPh5+Hz4fviB+If4jfiZ+K74s/i++MH4zvnV+f76gPudaJHUx+u86Mzh9+FW3uTYGtiZyPrC9Kz3mvys/bMAJQEzAS4BHwEaAQ0BCQELAQwBCwELAQwBDQEPAFcBWgGTAX4BjwGRAYoBfwF4AVsBSgE8ASQBDQDx/sX+vf6//qr+mv6U/pf+mv6n/rP+w/7X/uv++/8UAxIDJgMwAzIDNAMqAyYDJQMiAx4DGwMaAxkDGAN4/tr+z/7K/sn+w/6v/qT+n/p3+oP6l/qz+tP7A/sr+2f7s/voA/wHDAdoB5AHoAesB6AHkAd8B1wHPAckBwwG5AbQBpAGZAT4A5v/V/9T/yf/F/8T/wv/C/8L/x//S/9n/4v/n/+z/9f/6AAMBBAEHAAwADwAOAA4ADQAJAAUAAQAEAAwADQAPABIAFgAWABQAEgAQAA0ACwALAA0ADwARABMAFQAXABkAGwAbABsAGgAYABQAEQAPAA4ADQAOAA8AEQATABYAGQAcAB4AIAAhAB8AHQAZABYAFAASABAADgANAA4AEAAQABAAEAAPAA0ACwAKAAoACgAKAAoACQAI" preload="auto"></audio>
      <audio ref={gameOverSoundRef} src="data:audio/wav;base64,UklGRjoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRoAAADD/sL+v/7G/sv+2/7l/v3//QEJAScBMQFEAV4BkgGdAagBsgHMAdEB2wHbAdQBzgHOAc4BzgHOAc4BzgHOAc4BzgHOAc4BzgHOAc4BzgHOgc+B0IHUgdmB3IHiAeQB6QHqAesB6gHnAeIB2wHRAckBqgGeAR8A7/6r/pj+mf6c/p/+qP7D/uH/BQAfAC8ASQBeAGgAZQBcAEcANgAhABD/8/2M/pD+VPw4+zH6Q/pb+xL8Nf0z/fsBBAIiAyUDRgPl/ff91/2h/bb9z/4b/oX9uP0N/M78zPzO/M78xPzB+777sPuq+qD6k/i39171ovNb8sTzNfQz9Vb3hPoP/JL84f0N/gMCBQMAAP/+/er7zfuK+5f7mvuo+qb6l/mX+Iz4QPdE9U30P/O68ZXxbvFk8U3xQ/F38W3xevGA8ZrycvN39PX1i/eO+Rr8LQDm/tb+pP6J/nUAJgCJAaYB8wIOA0sB1wHoAfwB/AH5AekB0AGzAZQBQwDP/sL+u/6k/pz+o/6l/q/+uP7B/sn+0f7b/uL+8f76/v3//gACAAQABgAHAAYABQADAAEAAQABAAIAAQAAAAEAAAAA" preload="auto"></audio>
      
      <div className="absolute top-2 left-2 z-10">
        <Button onClick={() => setIsMuted(prev => !prev)} variant="ghost" size="icon">
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
      </div>
      
      <canvas ref={canvasRef} className="touch-none w-full h-full" />
      
      {gameState === 'menu' && renderMenu()}
      {gameState === 'over' && renderGameOver()}
    </>
  )
};

export default AstroClash;

    