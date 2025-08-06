
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
  isJumping: boolean;
};

type Platform = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Coin = {
  x: number;
  y: number;
  size: number;
};

type Cloud = {
  x: number;
  y: number;
  size: number;
  speed: number;
};

type SpriteInfo = {
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
    return null;
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600 text-white touch-none relative overflow-hidden">
      <GameCanvas />
    </div>
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'over'>('waiting');
  const [score, setScore] = useState(0);

  const playerRef = useRef<Player>({ x: 150, y: 300, width: 40, height: 40, vx: 0, vy: 0, onGround: false, isJumping: false });
  const platformsRef = useRef<Platform[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const worldX = useRef(0);
  const gameSpeed = useRef(2.5);
  const lastPlatformX = useRef(0);
  
  const gameLoopId = useRef<number>();
  const spritesheetRef = useRef<HTMLImageElement | null>(null);
  const playerSpriteInfo = useRef<SpriteInfo>({ x: 448, y: 208, width: 48, height: 55 });


  const GRAVITY = 0.5;
  const JUMP_POWER = -11;
  const PLAYER_SPEED = 5;

  const generateNewPlatform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const minGap = 80;
    const maxGap = 180;
    const minWidth = 120;
    const maxWidth = 300;

    const gap = minGap + Math.random() * (maxGap - minGap);
    const newX = lastPlatformX.current + gap;
    const newWidth = minWidth + Math.random() * (maxWidth - minWidth);
    
    const yVariation = 80;
    const lastPlatform = platformsRef.current[platformsRef.current.length - 1];
    let newY = lastPlatform.y + (Math.random() - 0.5) * yVariation * 2;
    
    newY = Math.max(200, Math.min(canvas.height - 150, newY));

    const newPlatform: Platform = { x: newX, y: newY, width: newWidth, height: 40 };
    platformsRef.current.push(newPlatform);
    lastPlatformX.current = newX + newWidth;

    const numCoins = Math.floor(Math.random() * 3) + 1;
    for(let i = 0; i < numCoins; i++) {
        const coin: Coin = {
            x: newPlatform.x + (i + 1) * (newPlatform.width / (numCoins + 2)),
            y: newPlatform.y - 40,
            size: 15,
        };
        coinsRef.current.push(coin);
    }
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setScore(0);
    worldX.current = 0;
    gameSpeed.current = 2.5;
    
    playerRef.current = {
        x: 150,
        y: 100,
        width: 48, // Match sprite width
        height: 55, // Match sprite height
        vx: 0,
        vy: 0,
        onGround: false,
        isJumping: false
    };

    platformsRef.current = [];
    coinsRef.current = [];
    
    const startPlatform: Platform = { x: 50, y: canvas.height - 100, width: 300, height: 40 };
    platformsRef.current.push(startPlatform);
    lastPlatformX.current = startPlatform.x + startPlatform.width;

    for (let i = 0; i < 10; i++) {
        generateNewPlatform();
    }
    
    if (cloudsRef.current.length === 0) {
      for (let i = 0; i < 15; i++) {
        cloudsRef.current.push({
          x: Math.random() * canvas.width * 2,
          y: Math.random() * (canvas.height / 2),
          size: Math.random() * 50 + 20,
          speed: Math.random() * 0.3 + 0.1,
        });
      }
    }

    setGameState('playing');
  }, [generateNewPlatform]);
  
  useEffect(() => {
    const sprite = new Image();
    sprite.src = "/Graphics/Graphics/Spritesheet/sprites.png";
    sprite.onload = () => {
        spritesheetRef.current = sprite;
    };
  }, []);

  const handlePlayerAction = useCallback(() => {
    if (gameState === 'playing') {
      const player = playerRef.current;
      if (player.onGround && !player.isJumping) {
        player.vy = JUMP_POWER;
        player.onGround = false;
        player.isJumping = true;
      }
    } else {
      startGame();
    }
  }, [gameState, startGame]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.key === ' ' || e.key.toLowerCase() === 'enter' || e.key.toLowerCase() === 'arrowup' || e.key.toLowerCase() === 'w')) {
        e.preventDefault();
        handlePlayerAction();
    }
    keysPressed.current[e.key.toLowerCase()] = true;
  }, [handlePlayerAction]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current[e.key.toLowerCase()] = false;
    if ((e.key === ' ' || e.key.toLowerCase() === 'arrowup' || e.key.toLowerCase() === 'w')) {
        if(playerRef.current) {
            playerRef.current.isJumping = false;
        }
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handlePlayerAction();
  }, [handlePlayerAction]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if(playerRef.current) {
        playerRef.current.isJumping = false;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart as unknown as EventListener);
    canvas.addEventListener('touchend', handleTouchEnd as unknown as EventListener);

    const update = () => {
        if (gameState !== 'playing') return;
        const player = playerRef.current;
        const canvas = canvasRef.current;
        if (!canvas) return;

        worldX.current += gameSpeed.current;
        gameSpeed.current = Math.min(5, gameSpeed.current + 0.001);

        player.vx = 0;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
            player.vx = -PLAYER_SPEED;
        }
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
            player.vx = PLAYER_SPEED;
        }
        player.x += player.vx;
        
        player.vy += GRAVITY;
        player.y += player.vy;
        
        player.onGround = false;
        platformsRef.current.forEach(platform => {
            const platX = platform.x - worldX.current;
            if (
                player.x < platX + platform.width &&
                player.x + player.width > platX &&
                player.y + player.height > platform.y &&
                player.y + player.height < platform.y + 20 + player.vy
            ) {
                player.vy = 0;
                player.y = platform.y - player.height;
                player.onGround = true;
            }
        });
        
        const newCoins = coinsRef.current.filter(coin => {
            const coinX = coin.x - worldX.current;
            const dx = coinX - (player.x + player.width / 2);
            const dy = coin.y - (player.y + player.height / 2);
            if (Math.sqrt(dx*dx + dy*dy) < coin.size + player.width / 2) {
                setScore(prev => prev + 10);
                return false; 
            }
            return true;
        });
        coinsRef.current = newCoins;


        if(player.x < 0) player.x = 0;
        if(player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        
        if(player.y > canvas.height + 100) {
            setGameState('over');
        }

        if (lastPlatformX.current - worldX.current < canvas.width + 200) {
            generateNewPlatform();
        }

        platformsRef.current = platformsRef.current.filter(p => p.x + p.width - worldX.current > -50);
        coinsRef.current = coinsRef.current.filter(c => c.x + c.size - worldX.current > -50);
    }
    
    const draw = () => {
        if (!canvasRef.current || !ctx) return;
        const player = playerRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
        ctx.fillStyle = '#639BFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw background mountains
        ctx.fillStyle = '#a0a0b0';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for(let i = 0; i < canvas.width * 2; i+= 50) {
          const x = i - (worldX.current * 0.1) % (canvas.width * 2);
          const y = canvas.height - 150 - Math.sin(i * 0.01) * 50;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();

        // Draw clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        cloudsRef.current.forEach(cloud => {
          cloud.x -= cloud.speed;
          if (cloud.x + cloud.size * 2 < 0) {
            cloud.x = canvas.width + cloud.size;
          }
          ctx.beginPath();
          ctx.ellipse(cloud.x, cloud.y, cloud.size, cloud.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        
        // Draw platforms
        platformsRef.current.forEach(p => {
            const platX = p.x - worldX.current;
            const grad = ctx.createLinearGradient(platX, p.y, platX, p.y + p.height);
            grad.addColorStop(0, '#6A8A3B');
            grad.addColorStop(1, '#4A2E20');

            ctx.fillStyle = grad;
            ctx.fillRect(platX, p.y, p.width, p.height);

            ctx.fillStyle = '#5A7A2B';
            ctx.fillRect(platX, p.y, p.width, 10);
        });
      
        // Draw coins
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 3;
        coinsRef.current.forEach(c => {
            const coinX = c.x - worldX.current;
            ctx.beginPath();
            ctx.arc(coinX, c.y, c.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 12px "Space Grotesk"';
            ctx.fillStyle = '#DAA520';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', coinX, c.y + 1);
        });
      
        // Draw player
        if ((gameState === 'playing' || gameState === 'over') && spritesheetRef.current) {
            const sprite = playerSpriteInfo.current;
            ctx.drawImage(
                spritesheetRef.current,
                sprite.x,
                sprite.y,
                sprite.width,
                sprite.height,
                player.x,
                player.y,
                player.width,
                player.height
            );
        }
      
        // Draw score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 5;
        ctx.strokeText(`Score: ${score}`, 20, 50);
        ctx.fillText(`Score: ${score}`, 20, 50);

        // Draw UI text
        if (gameState !== 'playing') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = 'bold 60px "Space Grotesk", sans-serif';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 10;
            ctx.fillText(gameState === 'over' ? "Game Over" : "Goblin Gold Grab", canvas.width / 2, canvas.height / 2 - 80);
            
            ctx.font = '30px "Space Grotesk", sans-serif';
            if (gameState === 'over') {
                 ctx.fillText(`Your Score: ${score}`, canvas.width / 2, canvas.height / 2);
                 ctx.font = '24px "Space Grotesk", sans-serif';
                 ctx.fillText("Tap or Press Space to Play Again", canvas.width / 2, canvas.height / 2 + 50);
            } else {
                 ctx.fillText("Tap or Press Space to Start", canvas.width / 2, canvas.height / 2);
            }
            ctx.shadowBlur = 0;
        }
    }

    const gameLoop = () => {
        update();
        draw();
        gameLoopId.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopId.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if(canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart as unknown as EventListener);
        canvas.removeEventListener('touchend', handleTouchEnd as unknown as EventListener);
      }
      if (gameLoopId.current) {
        cancelAnimationFrame(gameLoopId.current);
      }
    };
  }, [gameState, score, startGame, generateNewPlatform, handleKeyDown, handleKeyUp, handleTouchStart, handleTouchEnd]);

  return <canvas ref={canvasRef} className="touch-none w-full h-full" />;
};

export default GoblinGoldGrab;
