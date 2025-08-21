
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
  animFrame: number;
  animState: 'idle' | 'run' | 'jump';
};

type Platform = {
  x: number;
  y: number;
  width: number;
  type: 'left' | 'mid' | 'right' | 'single';
};

type Coin = {
  x: number;
  y: number;
  width: number;
  height: number;
  animFrame: number;
};

type Cloud = {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  spriteKey: string;
};

// Sprite coordinates from XML files
const SPRITES: { [key: string]: { x: number; y: number; width: number; height: number } } = {
  player_stand: { x: 448, y: 208, width: 48, height: 55 },
  player_jump: { x: 440, y: 0, width: 50, height: 55 },
  player_walk1: { x: 440, y: 57, width: 50, height: 56 },
  player_walk2: { x: 440, y: 115, width: 50, height: 56 },
  
  grass_left: { x: 0, y: 360, width: 70, height: 70 },
  grass_mid: { x: 72, y: 360, width: 70, height: 70 },
  grass_right: { x: 144, y: 360, width: 70, height: 70 },
  grass_single: { x: 432, y: 504, width: 70, height: 70 },

  coin_1: { x: 492, y: 0, width: 30, height: 30 },
  coin_2: { x: 492, y: 32, width: 30, height: 30 },
  coin_3: { x: 492, y: 64, width: 30, height: 30 },
  coin_4: { x: 492, y: 96, width: 30, height: 30 },

  cloud1: { x: 0, y: 576, width: 128, height: 71 },
  cloud2: { x: 130, y: 576, width: 128, height: 71 },
  cloud3: { x: 260, y: 576, width: 128, height: 71 },
};
const TILE_SIZE = 70;

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
  
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'over'>('waiting');
  const [score, setScore] = useState(0);

  const playerRef = useRef<Player>({ x: 150, y: 300, width: 48, height: 55, vx: 0, vy: 0, onGround: false, isJumping: false, animFrame: 0, animState: 'idle' });
  const platformsRef = useRef<Platform[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const backgroundsRef = useRef<{img: HTMLImageElement, x: number, speed: number}[]>([]);
  const worldX = useRef(0);
  const gameSpeed = useRef(3);
  const lastPlatformX = useRef(0);
  const frameCount = useRef(0);
  
  const gameLoopId = useRef<number>();
  const spritesheetRef = useRef<HTMLImageElement | null>(null);


  const GRAVITY = 0.5;
  const JUMP_POWER = -12;

  const generateNewPlatform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const minGap = 100;
    const maxGap = 220;
    const minWidthBlocks = 2;
    const maxWidthBlocks = 5;

    const gap = minGap + Math.random() * (maxGap - minGap);
    const newX = lastPlatformX.current + gap;
    const numBlocks = minWidthBlocks + Math.floor(Math.random() * (maxWidthBlocks - minWidthBlocks));
    
    const yVariation = 100;
    const lastPlatform = platformsRef.current[platformsRef.current.length - 1];
    let newY = lastPlatform.y + (Math.random() - 0.5) * yVariation * 2;
    
    newY = Math.max(250, Math.min(canvas.height - 150, newY));

    for (let i = 0; i < numBlocks; i++) {
        let type: Platform['type'] = 'mid';
        if (numBlocks === 1) type = 'single';
        else if (i === 0) type = 'left';
        else if (i === numBlocks - 1) type = 'right';

        platformsRef.current.push({ x: newX + i * TILE_SIZE, y: newY, width: TILE_SIZE, type });
    }
    lastPlatformX.current = newX + numBlocks * TILE_SIZE;

    const shouldPlaceCoins = Math.random() > 0.3;
    if(shouldPlaceCoins) {
        const numCoins = Math.floor(Math.random() * 3) + 1;
        for(let i = 0; i < numCoins; i++) {
            const coin: Coin = {
                x: newX + (i + 1) * ((numBlocks * TILE_SIZE) / (numCoins + 2)),
                y: newY - 60,
                width: 30,
                height: 30,
                animFrame: Math.floor(Math.random() * 4)
            };
            coinsRef.current.push(coin);
        }
    }
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setScore(0);
    worldX.current = 0;
    gameSpeed.current = 3;
    frameCount.current = 0;
    
    playerRef.current = {
        x: 150,
        y: 100,
        width: 48,
        height: 55,
        vx: 0,
        vy: 0,
        onGround: false,
        isJumping: false,
        animFrame: 0,
        animState: 'idle'
    };

    platformsRef.current = [];
    coinsRef.current = [];
    
    const startPlatformWidth = 4 * TILE_SIZE;
    for(let i=0; i<4; i++) {
        let type: Platform['type'] = i === 0 ? 'left' : i === 3 ? 'right' : 'mid';
        platformsRef.current.push({ x: 50 + i * TILE_SIZE, y: canvas.height - 100, width: TILE_SIZE, type });
    }
    lastPlatformX.current = 50 + startPlatformWidth;

    for (let i = 0; i < 15; i++) {
        generateNewPlatform();
    }
    
    if (cloudsRef.current.length === 0) {
      for (let i = 0; i < 15; i++) {
        cloudsRef.current.push({
          x: Math.random() * canvas.width * 2,
          y: Math.random() * (canvas.height / 2.5),
          width: 128,
          height: 71,
          speed: Math.random() * 0.4 + 0.1,
          spriteKey: `cloud${Math.ceil(Math.random()*3)}`
        });
      }
    }

    setGameState('playing');
  }, [generateNewPlatform]);

  const handlePlayerAction = useCallback(() => {
    if (gameState === 'playing') {
      const player = playerRef.current;
      if (player.onGround && !player.isJumping) {
        player.vy = JUMP_POWER;
        player.onGround = false;
        player.isJumping = true;
        player.animState = 'jump';
        player.animFrame = 0;
      }
    } else {
      startGame();
    }
  }, [gameState, startGame]);
  
  useEffect(() => {
    const sprite = new Image();
    sprite.src = "/Graphics/Graphics/Spritesheet/sprites.png";

    const bg1 = new Image();
    bg1.src = "/Graphics/Graphics/backgrounds/colored_grass.png";
    const bg2 = new Image();
    bg2.src = "/Graphics/Graphics/backgrounds/colored_hills.png";
    const bg3 = new Image();
    bg3.src = "/Graphics/Graphics/backgrounds/colored_mountains.png";

    const loadPromise = Promise.all([
        new Promise(res => sprite.onload = res),
        new Promise(res => bg1.onload = res),
        new Promise(res => bg2.onload = res),
        new Promise(res => bg3.onload = res),
    ]);

    loadPromise.then(() => {
        spritesheetRef.current = sprite;
        backgroundsRef.current = [
            { img: bg3, x: 0, speed: 0.1 },
            { img: bg2, x: 0, speed: 0.2 },
            { img: bg1, x: 0, speed: 0.4 },
        ];
        
        if (canvasRef.current) {
            // Start the game loop only after all assets are loaded
            const gameLoop = () => {
                update();
                draw();
                gameLoopId.current = requestAnimationFrame(gameLoop);
            };
            gameLoopId.current = requestAnimationFrame(gameLoop);
        }
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        if ((e.key === ' ' || e.key.toLowerCase() === 'arrowup' || e.key.toLowerCase() === 'w')) {
            handlePlayerAction();
        }
    };
  
    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      if(playerRef.current) {
          playerRef.current.isJumping = false;
      }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        handlePlayerAction();
    };
  
    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        if(playerRef.current) {
            playerRef.current.isJumping = false;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    const update = () => {
        if (gameState !== 'playing') return;
        const player = playerRef.current;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        frameCount.current++;

        worldX.current += gameSpeed.current;
        gameSpeed.current = Math.min(6, gameSpeed.current + 0.001);

        player.vx = 0; // Player runs automatically
        
        player.vy += GRAVITY;
        player.y += player.vy;
        
        player.onGround = false;
        platformsRef.current.forEach(platform => {
            const platX = platform.x - worldX.current;
            if (
                player.x < platX + platform.width &&
                player.x + player.width > platX &&
                player.y + player.height >= platform.y &&
                player.y + player.height <= platform.y + 20 + player.vy
            ) {
                if (player.vy > 0) {
                    player.vy = 0;
                    player.y = platform.y - player.height;
                    player.onGround = true;
                    if(player.animState === 'jump') player.animState = 'idle';
                }
            }
        });
        
        coinsRef.current = coinsRef.current.filter(coin => {
            const coinX = coin.x - worldX.current;
            const dx = coinX + coin.width / 2 - (player.x + player.width / 2);
            const dy = coin.y + coin.height / 2 - (player.y + player.height / 2);
            if (Math.sqrt(dx*dx + dy*dy) < coin.width / 2 + player.width / 2) {
                setScore(prev => prev + 10);
                return false; 
            }
            return true;
        });

        // Player animation
        if(player.onGround){
            player.animState = 'run';
             if(frameCount.current % 8 === 0) {
                player.animFrame = (player.animFrame + 1) % 2;
            }
        } else {
             player.animState = 'jump';
        }
        
        // Coin animation
        if(frameCount.current % 10 === 0) {
            coinsRef.current.forEach(c => c.animFrame = (c.animFrame + 1) % 4);
        }

        if(player.x < 150) player.x = 150; // Keep player centered
        if(player.x > 150) player.x = 150;
        
        if(player.y > canvas.height + 150) {
            setGameState('over');
        }

        if (lastPlatformX.current - worldX.current < canvas.width + 200) {
            generateNewPlatform();
        }

        platformsRef.current = platformsRef.current.filter(p => p.x + p.width - worldX.current > -50);
        coinsRef.current = coinsRef.current.filter(c => c.x + c.width - worldX.current > -50);
    }
    
    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!canvasRef.current || !ctx || !spritesheetRef.current || backgroundsRef.current.length === 0) {
            ctx?.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
            ctx?.fillRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
            return;
        }

        const player = playerRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
        ctx.fillStyle = '#639BFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw parallax background
        backgroundsRef.current.forEach(bg => {
            let x = -(worldX.current * bg.speed % bg.img.width);
            ctx.drawImage(bg.img, x, canvas.height - bg.img.height);
            ctx.drawImage(bg.img, x + bg.img.width, canvas.height - bg.img.height);
        });

        // Draw clouds
        cloudsRef.current.forEach(cloud => {
          cloud.x -= cloud.speed;
          if (cloud.x + cloud.width < 0) {
            cloud.x = canvas.width + Math.random() * 200;
            cloud.y = Math.random() * (canvas.height / 2.5);
          }
          const sprite = SPRITES[cloud.spriteKey];
          if(sprite) {
            ctx.drawImage(spritesheetRef.current!, sprite.x, sprite.y, sprite.width, sprite.height, cloud.x, cloud.y, sprite.width, sprite.height);
          }
        });
        
        // Draw platforms
        platformsRef.current.forEach(p => {
            const platX = p.x - worldX.current;
            const spriteKey = `grass_${p.type}`;
            const sprite = SPRITES[spriteKey];
            if (sprite) {
                ctx.drawImage(spritesheetRef.current!, sprite.x, sprite.y, sprite.width, sprite.height, platX, p.y, TILE_SIZE, TILE_SIZE);
            }
        });
      
        // Draw coins
        coinsRef.current.forEach(c => {
            const coinX = c.x - worldX.current;
            const sprite = SPRITES[`coin_${c.animFrame + 1}`];
            if(sprite) {
              ctx.drawImage(spritesheetRef.current!, sprite.x, sprite.y, sprite.width, sprite.height, coinX, c.y, c.width, c.height);
            }
        });
      
        // Draw player
        if (gameState === 'playing' || gameState === 'over') {
            let sprite;
            if(player.animState === 'jump') {
                sprite = SPRITES.player_jump;
            } else { // run
                sprite = SPRITES[`player_walk${player.animFrame + 1}`];
            }
            if(sprite){
                 ctx.drawImage(spritesheetRef.current, sprite.x, sprite.y, sprite.width, sprite.height, player.x, player.y, sprite.width, sprite.height);
            }
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

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if(canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
      if (gameLoopId.current) {
        cancelAnimationFrame(gameLoopId.current);
      }
    };
  }, [gameState, score, startGame, generateNewPlatform, handlePlayerAction]);

  return <canvas ref={canvasRef} className="touch-none w-full h-full" />;
};

export default GoblinGoldGrab;
