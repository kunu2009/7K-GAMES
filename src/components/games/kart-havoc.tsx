
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';


type Kart = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  color: string;
  laps: number;
  lastCheckpoint: number;
  // For AI
  targetWaypoint?: number;
};

type TrackSegment = {
  x1: number, y1: number, x2: number, y2: number
}

type Waypoint = {
  x: number, y: number
}

type TouchControls = {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const KART_WIDTH = 20;
const KART_HEIGHT = 40;
const TOTAL_LAPS = 3;

const KartHavoc: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return null;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white touch-none relative overflow-hidden">
      <GameCanvas />
    </div>
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'difficulty' | 'countdown' | 'playing' | 'over'>('menu');
  const [gameMode, setGameMode] = useState<'2p' | 'ai'>('2p');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<string | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopId = useRef<number>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();

  const trackPathRef = useRef<Path2D | null>(null);
  const trackWaypointsRef = useRef<Waypoint[]>([]);
  const finishLineRef = useRef<TrackSegment | null>(null);
  
  const isMobile = useIsMobile();
  const touchControlsRef = useRef<TouchControls>({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });

  const player1Ref = useRef<Kart>({ x: 0, y: 0, angle: -Math.PI / 2, speed: 0, color: '#4285F4', laps: 0, lastCheckpoint: 0 });
  const player2Ref = useRef<Kart>({ x: 0, y: 0, angle: -Math.PI / 2, speed: 0, color: '#DB4437', laps: 0, lastCheckpoint: 0, targetWaypoint: 0 });
  
  const resetKarts = useCallback(() => {
    const canvas = canvasRef.current;
    if(!canvas || !finishLineRef.current) return;
    const startX = (finishLineRef.current.x1 + finishLineRef.current.x2) / 2;
    const startY = finishLineRef.current.y1 + 60;
    
    player1Ref.current = { x: startX - 40, y: startY, angle: -Math.PI / 2, speed: 0, color: '#4285F4', laps: 0, lastCheckpoint: 0 };
    player2Ref.current = { x: startX + 40, y: startY, angle: -Math.PI / 2, speed: 0, color: '#DB4437', laps: 0, lastCheckpoint: 0, targetWaypoint: 0 };

  }, []);

  const selectGameMode = (mode: '2p' | 'ai') => {
    setGameMode(mode);
    if (mode === '2p') {
      startGame();
    } else {
      setGameState('difficulty');
    }
  }

  const selectDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    setAiDifficulty(difficulty);
    startGame();
  }

  const startGame = useCallback(() => {
    setWinner(null);
    resetKarts();
    player1Ref.current.laps = 0;
    player1Ref.current.lastCheckpoint = 0;
    player2Ref.current.laps = 0;
    player2Ref.current.lastCheckpoint = 0;
    setGameState('countdown');
    setCountdown(3);
  }, [resetKarts]);

  useEffect(() => {
    if(gameState === 'countdown' && countdown > 0) {
        countdownIntervalId.current = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);
    } else if (gameState === 'countdown' && countdown <= 0) {
        if(countdownIntervalId.current) clearInterval(countdownIntervalId.current);
        setGameState('playing');
    }
    return () => {
        if(countdownIntervalId.current) clearInterval(countdownIntervalId.current)
    }
  }, [gameState, countdown])

  const drawKart = (ctx: CanvasRenderingContext2D, kart: Kart) => {
    ctx.save();
    ctx.translate(kart.x, kart.y);
    ctx.rotate(kart.angle);
    
    const w = KART_WIDTH;
    const h = KART_HEIGHT;
    
    // Kart Body
    ctx.fillStyle = kart.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w/2, -h/2, w, h);

    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(-w/2 - 4, -h/2 + 5, 4, 10); // Left front
    ctx.fillRect(-w/2 - 4, h/2 - 15, 4, 10); // Left rear
    ctx.fillRect(w/2, -h/2 + 5, 4, 10); // Right front
    ctx.fillRect(w/2, h/2 - 15, 4, 10); // Right rear

    // Spoiler / Front Bumper
    ctx.fillStyle = kart.color === '#4285F4' ? '#fbbc05' : '#4CAF50';
    ctx.fillRect(-w/2, -h/2 - 2, w, 4);

    ctx.restore();
  };

  const drawTrack = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!trackPathRef.current) {
        const path = new Path2D();
        const innerRectX = canvas.width * 0.3;
        const innerRectY = canvas.height * 0.3;
        const innerRectW = canvas.width * 0.4;
        const innerRectH = canvas.height * 0.4;

        // Outer boundary
        path.rect(canvas.width * 0.1, canvas.height * 0.1, canvas.width * 0.8, canvas.height * 0.8);
        // Inner boundary (creates the hole)
        path.rect(innerRectX, innerRectY, innerRectW, innerRectH);
        
        trackPathRef.current = path;

        const scale = (points: {x: number, y: number}[]) => points.map(p => ({x: p.x * canvas.width, y: p.y * canvas.height}));
        const waypointPoints = [
           { x: 0.2, y: 0.8 }, { x: 0.2, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.2 },
           { x: 0.8, y: 0.5 }, { x: 0.8, y: 0.8 }, { x: 0.5, y: 0.8 },
        ];
        trackWaypointsRef.current = scale([...waypointPoints, waypointPoints[0]]); // Loop back

        const startY = canvas.height * 0.8;
        finishLineRef.current = { x1: canvas.width * 0.3, y1: startY, x2: canvas.width * 0.7, y2: startY };
    }
     
    // Draw asphalt
    ctx.fillStyle = '#4A4A4A';
    ctx.fill(trackPathRef.current, 'evenodd');

    // Draw track borders
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 10;
    const innerRectX = canvas.width * 0.3;
    const innerRectY = canvas.height * 0.3;
    const innerRectW = canvas.width * 0.4;
    const innerRectH = canvas.height * 0.4;
    ctx.strokeRect(canvas.width * 0.1, canvas.height * 0.1, canvas.width * 0.8, canvas.height * 0.8);
    ctx.strokeRect(innerRectX, innerRectY, innerRectW, innerRectH);
    
    // Draw finish line
    if(finishLineRef.current) {
        const line = finishLineRef.current;
        const squareSize = 10;
        for(let x = line.x1; x < line.x2; x += squareSize * 2) {
             ctx.fillStyle = 'white';
             ctx.fillRect(x, line.y1 - squareSize, squareSize, squareSize);
             ctx.fillRect(x + squareSize, line.y1, squareSize, squareSize);
             ctx.fillStyle = 'black';
             ctx.fillRect(x, line.y1, squareSize, squareSize);
             ctx.fillRect(x + squareSize, line.y1 - squareSize, squareSize, squareSize);
        }
    }
  };
  
  const updateAI = useCallback((kart: Kart) => {
    const waypoints = trackWaypointsRef.current;
    if (waypoints.length === 0 || kart.targetWaypoint === undefined) return;

    const difficultySettings = {
        easy: { speed: 4.5, turnRate: 0.04, precision: 100 },
        medium: { speed: 5.5, turnRate: 0.06, precision: 75 },
        hard: { speed: 6.5, turnRate: 0.08, precision: 50 }
    };
    const settings = difficultySettings[aiDifficulty];
    
    let target = waypoints[kart.targetWaypoint];
    const dx = target.x - kart.x;
    const dy = target.y - kart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < settings.precision) {
        kart.targetWaypoint = (kart.targetWaypoint + 1) % waypoints.length;
        target = waypoints[kart.targetWaypoint];
    }

    const targetAngle = Math.atan2(target.y - kart.y, target.x - kart.x) + Math.PI / 2;
    let angleDiff = targetAngle - kart.angle;
    
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    if (angleDiff > 0.1) {
        kart.angle += settings.turnRate;
    } else if (angleDiff < -0.1) {
        kart.angle -= settings.turnRate;
    }
    
    kart.speed = settings.speed;

  }, [aiDifficulty]);

  const update = useCallback(() => {
    if(gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if(!canvas) return;

    const karts = [player1Ref.current, player2Ref.current];
    const controls = {
      p1: { up: 'w', down: 's', left: 'a', right: 'd' },
      p2: { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' },
    };
    
    // --- Update Controls ---
    let p1Acceleration = 0;
    let p1Turn = 0;
    if (isMobile) {
        const touch = touchControlsRef.current;
        if(touch.active) {
            const dx = touch.currentX - touch.startX;
            const dy = touch.currentY - touch.startY;
            p1Acceleration = -dy / 50;
            p1Turn = dx / 1500;
        }
    } else {
        if (keysPressed.current[controls.p1.up]) p1Acceleration = 0.25;
        if (keysPressed.current[controls.p1.down]) p1Acceleration = -0.2;
        if (keysPressed.current[controls.p1.left]) p1Turn = -0.04;
        if (keysPressed.current[controls.p1.right]) p1Turn = 0.04;
    }

    const p1 = player1Ref.current;
    p1.speed += p1Acceleration;
    p1.speed *= 0.98; // Increased friction
    p1.speed = Math.max(-3, Math.min(6, p1.speed));
    if (Math.abs(p1.speed) > 0.1) {
        p1.angle += p1Turn * (p1.speed / 5);
    }

    // Update P2 (Human or AI)
    const p2 = player2Ref.current;
    if (gameMode === 'ai') {
        updateAI(p2);
    } else {
        let p2Acceleration = 0;
        let p2Turn = 0;
        if (keysPressed.current[controls.p2.up]) p2Acceleration = 0.25;
        if (keysPressed.current[controls.p2.down]) p2Acceleration = -0.2;
        if (keysPressed.current[controls.p2.left]) p2Turn = -0.04;
        if (keysPressed.current[controls.p2.right]) p2Turn = 0.04;

        p2.speed += p2Acceleration;
        p2.speed *= 0.98;
        p2.speed = Math.max(-3, Math.min(6, p2.speed));
        if (Math.abs(p2.speed) > 0.1) {
            p2.angle += p2Turn * (p2.speed / 5);
        }
    }

    karts.forEach((kart) => {
        const prevY = kart.y;
        kart.x += Math.sin(kart.angle) * kart.speed;
        kart.y -= Math.cos(kart.angle) * kart.speed;

        // --- Physics & Rules ---
        let onTrack = false;
        
        const ctx = canvas.getContext('2d');
        if(ctx && trackPathRef.current) {
          const innerRectX = canvas.width * 0.3;
          const innerRectY = canvas.height * 0.3;
          const innerRectW = canvas.width * 0.4;
          const innerRectH = canvas.height * 0.4;
          const outerRectX = canvas.width * 0.1;
          const outerRectY = canvas.height * 0.1;
          const outerRectW = canvas.width * 0.8;
          const outerRectH = canvas.height * 0.8;

          const isInInner = kart.x > innerRectX && kart.x < innerRectX + innerRectW && kart.y > innerRectY && kart.y < innerRectY + innerRectH;
          const isInOuter = kart.x > outerRectX && kart.x < outerRectX + outerRectW && kart.y > outerRectY && kart.y < outerRectY + outerRectH;
          onTrack = isInOuter && !isInInner;
        }

        if(!onTrack) {
          kart.speed *= 0.9;
          kart.x -= Math.sin(kart.angle) * kart.speed;
          kart.y += Math.cos(kart.angle) * kart.speed;
          kart.speed *= -0.5; // Bounce effect
        }

        // Collision with other kart
        const otherKart = kart === p1 ? p2 : p1;
        const dx = kart.x - otherKart.x;
        const dy = kart.y - otherKart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < KART_HEIGHT) {
            kart.speed *= 0.8;
            otherKart.speed *= 0.8;
            const overlap = (KART_HEIGHT - dist) / 2;
            kart.x += (dx / dist) * overlap;
            kart.y += (dy / dist) * overlap;
            otherKart.x -= (dx / dist) * overlap;
            otherKart.y -= (dy / dist) * overlap;
        }
        
        // Lap counting
        const finishLine = finishLineRef.current;
        if(finishLine) {
            const isCrossing = kart.x > finishLine.x1 && kart.x < finishLine.x2;
            const wasAbove = prevY < finishLine.y1;
            const isBelow = kart.y >= finishLine.y1;

            if (isCrossing && wasAbove && isBelow && kart.lastCheckpoint === 1) {
                kart.laps++;
                kart.lastCheckpoint = 0;
                if(kart.laps >= TOTAL_LAPS) {
                    setWinner(kart.color === player1Ref.current.color ? 'Player 1' : gameMode === 'ai' ? 'The AI' : 'Player 2');
                    setGameState('over');
                }
            }
             // Simple checkpoint system to enforce direction
            if (kart.y < canvas.height * 0.4) {
                 kart.lastCheckpoint = 1;
            }
        }
    });
  }, [gameState, gameMode, updateAI, isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      if(!canvasRef.current) return;
      const parent = canvasRef.current.parentElement;
      if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
      }
      trackPathRef.current = null; // Force track redraw
      resetKarts();
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchControlsRef.current = { active: true, startX: touch.clientX, startY: touch.clientY, currentX: touch.clientX, currentY: touch.clientY };
    };
    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if(touchControlsRef.current.active) {
            const touch = e.touches[0];
            touchControlsRef.current.currentX = touch.clientX;
            touchControlsRef.current.currentY = touch.clientY;
        }
    };
    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        touchControlsRef.current.active = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    

    const loop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#228B22'; // Grassy green
      ctx.fillRect(0,0, canvas.width, canvas.height);

      drawTrack(ctx, canvas);
      drawKart(ctx, player1Ref.current);
      drawKart(ctx, player2Ref.current);
      
      // Draw UI
      ctx.fillStyle = "white";
      ctx.font = "bold 24px 'Space Grotesk', sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText(`P1 Laps: ${player1Ref.current.laps}/${TOTAL_LAPS}`, 20, 40);
      
      const p2Label = gameMode === 'ai' ? 'AI' : 'P2';
      ctx.textAlign = 'right';
      ctx.fillText(`${p2Label} Laps: ${player2Ref.current.laps}/${TOTAL_LAPS}`, canvas.width - 20, 40);

      update();
      gameLoopId.current = requestAnimationFrame(loop);
    };
    
    resetKarts();
    loop();

    return () => {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
      if(countdownIntervalId.current) clearInterval(countdownIntervalId.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [resetKarts, isMobile, update, gameMode]);

  const renderUI = () => {
    if (gameState !== 'playing' && gameState !== 'countdown') {
       return (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4">
            {gameState === 'menu' && (
                <div className="animate-fade-in flex flex-col gap-4">
                    <h1 className="text-6xl font-bold">Kart Havoc</h1>
                    <p className="text-xl text-muted-foreground">Select a game mode</p>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <Button onClick={() => selectGameMode('2p')} size="lg" variant="secondary">Two Player Race</Button>
                        <Button onClick={() => selectGameMode('ai')} size="lg" variant="secondary">Single Player vs. AI</Button>
                    </div>
                </div>
            )}
            {gameState === 'difficulty' && (
                 <div className="animate-fade-in flex flex-col gap-4">
                    <h1 className="text-5xl font-bold">Select Difficulty</h1>
                     <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <Button onClick={() => selectDifficulty('easy')} size="lg" className="bg-green-500 hover:bg-green-600">Easy</Button>
                        <Button onClick={() => selectDifficulty('medium')} size="lg" className="bg-yellow-500 hover:bg-yellow-600">Medium</Button>
                        <Button onClick={() => selectDifficulty('hard')} size="lg" className="bg-red-500 hover:bg-red-600">Hard</Button>
                    </div>
                 </div>
            )}
            {gameState === 'over' && winner && (
                <div className="animate-fade-in flex flex-col gap-4">
                    <h1 className="text-6xl font-bold">{winner} Wins!</h1>
                     <Button onClick={() => setGameState('menu')} size="lg" variant="secondary" className="mt-4">Play Again</Button>
                </div>
            )}
        </div>
       )
    }

    if (gameState === 'countdown') {
        return (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-none">
                 <p className="text-9xl font-bold animate-fade-in">{countdown > 0 ? countdown : "GO!"}</p>
            </div>
        )
    }
    
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="w-full h-full" />
        {renderUI()}
      </div>
    </div>
  )
};

export default KartHavoc;
