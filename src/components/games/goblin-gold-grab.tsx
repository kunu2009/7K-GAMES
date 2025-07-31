
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
  isCollected: boolean;
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
  const worldX = useRef(0);
  const gameSpeed = useRef(2.5);
  const lastPlatformX = useRef(0);
  
  const gameLoopId = useRef<number>();
  const goblinSpriteRef = useRef<HTMLImageElement | null>(null);

  const GRAVITY = 0.6;
  const JUMP_POWER = -12;
  const PLAYER_SPEED = 5;

  const generateNewPlatform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const minGap = 80;
    const maxGap = 150;
    const minWidth = 120;
    const maxWidth = 300;

    const gap = minGap + Math.random() * (maxGap - minGap);
    const newX = lastPlatformX.current + gap;
    const newWidth = minWidth + Math.random() * (maxWidth - minWidth);
    
    const yVariation = 150;
    const lastPlatform = platformsRef.current[platformsRef.current.length - 1];
    let newY = lastPlatform.y + (Math.random() - 0.5) * yVariation * 2;
    
    newY = Math.max(200, Math.min(canvas.height - 100, newY));

    const newPlatform: Platform = { x: newX, y: newY, width: newWidth, height: 100 };
    platformsRef.current.push(newPlatform);
    lastPlatformX.current = newX + newWidth;

    const numCoins = Math.floor(Math.random() * 3) + 1;
    for(let i = 0; i < numCoins; i++) {
        const coin: Coin = {
            x: newPlatform.x + (i + 1) * (newPlatform.width / (numCoins + 2)),
            y: newPlatform.y - 40,
            size: 15,
            isCollected: false,
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
        width: 40,
        height: 40,
        vx: 0,
        vy: 0,
        onGround: false,
        isJumping: false
    };

    platformsRef.current = [];
    coinsRef.current = [];
    
    const startPlatform: Platform = { x: 50, y: canvas.height - 100, width: 300, height: 100 };
    platformsRef.current.push(startPlatform);
    lastPlatformX.current = startPlatform.x + startPlatform.width;

    for (let i = 0; i < 10; i++) {
        generateNewPlatform();
    }
    
    setGameState('playing');
  }, [generateNewPlatform]);
  
  useEffect(() => {
    const sprite = new Image();
    sprite.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgPGNpcmNsZSBmaWxsPSIjNENBNjUxIiBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiLz4KICAgIDxwYXRoIGQ9Ik0xMiAyM2E0IDQgMCAwIDEtNCA0IDQgNCAwIDAgMS00LTQgNCA0IDAgMCAxIDQtNCA0IDQgMCAwIDEgNCA0em0yMCwwYTQgNCAwIDAgMS00IDQgNCA0IDAgMCAxLTQtNCA0IDQgMCAwIDEgNC00IDQgNCAwIDAgMSg0IDR6IiBmaWxsPSIjRkZGIi8+CiAgICA8cGF0aCBkPSJtMTYgMjYgOCAwIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8cGF0aCBkPSJNMTIgMTRoM2ExIDEgMCAwIDEgMSAxdjJoLTZ2LTJhMSAxIDAgMCAxIDEtMWgxeiIgZmlsbD0iI0ZGQzczMyIvPgogICAgPHBhdGggZD0iTTI1IDMxaDNhMSAxIDAgMCAxIDEgMXYyaC02di0yYTEgMSAwIDAgMSAxLTFoMXoiIGZpbGw9IiNGRkM3MzMiIHRyYW5zZm9ybT0ibWF0cml4KC0xIDAgMCAxIDM3IDApIi8+CiAgICA8cGF0aCBkPSJNMTYgMjdjMC0yLjIxIDEuNzkyLTQgNC00czQgMS43OSA0IDQiIHN0cm9rZT0iI0ZGRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik0xOCAyMGEyIDIgMCAxIDEgMCA0IDIgMiAwIDAgMSAwLTR6bTYgMGEyIDIgMCAxIDEgMCA0IDIgMiAwIDAgMSAwLTR6Ii8+CiAgPC9nPgo8L3N2Zz4=";
    sprite.onload = () => {
        goblinSpriteRef.current = sprite;
    };
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

    const handleInput = () => {
        if (gameState === 'waiting' || gameState === 'over') {
            startGame();
        } else if (gameState === 'playing') {
            keysPressed.current[' '] = true; // Treat tap as jump
        }
    };
     const handleInputRelease = () => {
        keysPressed.current[' '] = false;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
        if(gameState !== 'playing') {
            if (e.key === ' ' || e.key.toLowerCase() === 'enter') startGame();
            return;
        }
        keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleInput);
    canvas.addEventListener('touchend', handleInputRelease);


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
        
        if ((keysPressed.current[' '] || keysPressed.current['w'] || keysPressed.current['arrowup']) && player.onGround && !player.isJumping) {
            player.vy = JUMP_POWER;
            player.onGround = false;
            player.isJumping = true;
        }
        if (!(keysPressed.current[' '] || keysPressed.current['w'] || keysPressed.current['arrowup'])) {
            player.isJumping = false;
        }

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
        
        coinsRef.current.forEach(coin => {
            if (!coin.isCollected) {
                const coinX = coin.x - worldX.current;
                const dx = coinX - (player.x + player.width / 2);
                const dy = coin.y - (player.y + player.height / 2);
                if (Math.sqrt(dx*dx + dy*dy) < coin.size + player.width / 2) {
                    coin.isCollected = true;
                    setScore(prev => prev + 10);
                }
            }
        });

        if(player.x < 0) player.x = 0;
        if(player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        
        if(player.y > canvas.height + 100) {
            setGameState('over');
        }

        if (lastPlatformX.current - worldX.current < canvas.width + 200) {
            generateNewPlatform();
        }

        platformsRef.current = platformsRef.current.filter(p => p.x + p.width - worldX.current > -50);
        coinsRef.current = coinsRef.current.filter(c => c.x + c.size - worldX.current > -50 && !c.isCollected);
    }
    
    const draw = () => {
        if (!canvasRef.current || !ctx) return;
        const player = playerRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
        ctx.fillStyle = '#639BFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      
        ctx.fillStyle = '#4A2E20';
        ctx.strokeStyle = '#2d1b13';
        ctx.lineWidth = 4;
        platformsRef.current.forEach(p => {
            ctx.fillRect(p.x - worldX.current, p.y, p.width, p.height);
            ctx.strokeRect(p.x - worldX.current, p.y, p.width, p.height);
        });
      
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 3;
        coinsRef.current.forEach(c => {
            if (!c.isCollected) {
                ctx.beginPath();
                ctx.arc(c.x - worldX.current, c.y, c.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.font = 'bold 12px "Space Grotesk"';
                ctx.fillStyle = '#DAA520';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', c.x - worldX.current, c.y+1);
            }
        });
      
        if (goblinSpriteRef.current) {
            ctx.drawImage(goblinSpriteRef.current, player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
      
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 5;
        ctx.strokeText(`Score: ${score}`, 20, 50);
        ctx.fillText(`Score: ${score}`, 20, 50);

        if (gameState === 'waiting' || gameState === 'over') {
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
      canvas.removeEventListener('touchstart', handleInput);
      canvas.removeEventListener('touchend', handleInputRelease);
      if (gameLoopId.current) {
        cancelAnimationFrame(gameLoopId.current);
      }
    };
  }, [gameState, score, startGame, generateNewPlatform]);

  return <canvas ref={canvasRef} className="touch-none w-full h-full" />;
};

export default GoblinGoldGrab;
