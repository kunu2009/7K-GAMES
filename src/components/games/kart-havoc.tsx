
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

  const trackPathRef = useRef<TrackSegment[]>([]);
  const trackWaypointsRef = useRef<Waypoint[]>([]);
  const finishLineRef = useRef<TrackSegment | null>(null);
  
  const isMobile = useIsMobile();

  const player1Ref = useRef<Kart>({ x: 0, y: 0, angle: -Math.PI / 2, speed: 0, color: '#4285F4', laps: 0, lastCheckpoint: 0 });
  const player2Ref = useRef<Kart>({ x: 0, y: 0, angle: -Math.PI / 2, speed: 0, color: '#DB4437', laps: 0, lastCheckpoint: 0, targetWaypoint: 0 });
  
  const resetKarts = useCallback(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const startX = canvas.width / 2;
    const startY = canvas.height * 0.8;
    
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
    setGameState('countdown');
    setCountdown(3);
  }, [resetKarts]);

  useEffect(() => {
    if(gameState === 'countdown' && countdown > 0) {
        countdownIntervalId.current = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);
    } else if (gameState === 'countdown' && countdown === 0) {
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
    ctx.fillStyle = kart.color;
    ctx.fillRect(-KART_WIDTH / 2, -KART_HEIGHT / 2, KART_WIDTH, KART_HEIGHT);
    // Add a simple "front" indicator
    ctx.fillStyle = "white";
    ctx.fillRect(-KART_WIDTH / 2, -KART_HEIGHT / 2, KART_WIDTH, 5);
    ctx.restore();
  };

  const drawTrack = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (trackPathRef.current.length === 0) {
        const outerPoints = [
            { x: 0.1, y: 0.9 }, { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }
        ];
        const innerPoints = [
            { x: 0.3, y: 0.7 }, { x: 0.3, y: 0.3 }, { x: 0.7, y: 0.3 }, { x: 0.7, y: 0.7 }, { x: 0.3, y: 0.7 }
        ];

        const scale = (points: {x: number, y: number}[]) => points.map(p => ({x: p.x * canvas.width, y: p.y * canvas.height}));
        const scaledOuter = scale(outerPoints);
        const scaledInner = scale(innerPoints);

        const path: TrackSegment[] = [];
        const createPath = (points: {x: number, y: number}[], targetPath: TrackSegment[]) => {
            for(let i = 1; i < points.length; i++) {
                targetPath.push({x1: points[i-1].x, y1: points[i-1].y, x2: points[i].x, y2: points[i].y});
            }
        }
        createPath(scaledOuter, path);
        createPath(scaledInner, path);

        trackPathRef.current = path;

        // Create waypoints for AI
        const waypointPoints = [
           { x: 0.2, y: 0.8 }, { x: 0.2, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.2 },
           { x: 0.8, y: 0.5 }, { x: 0.8, y: 0.8 }, { x: 0.5, y: 0.8 }, { x: 0.2, y: 0.8 }
        ];
        trackWaypointsRef.current = scale(waypointPoints);

        const startY = canvas.height * 0.8;
        finishLineRef.current = { x1: canvas.width * 0.3, y1: startY, x2: canvas.width * 0.7, y2: startY };
    }
     
    // Redraw track from cached path
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 10;
    trackPathRef.current.forEach(segment => {
        ctx.beginPath();
        ctx.moveTo(segment.x1, segment.y1);
        ctx.lineTo(segment.x2, segment.y2);
        ctx.stroke();
    })
    
    // Draw finish line
    if(finishLineRef.current) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(finishLineRef.current.x1, finishLineRef.current.y1);
        ctx.lineTo(finishLineRef.current.x2, finishLineRef.current.y2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
  };
  
  const pointLineDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if(lenSq === 0) return Math.sqrt((px - x1)**2 + (py-y1)**2);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nearX = x1 + t * dx;
    const nearY = y1 + t * dy;
    return Math.sqrt((px - nearX)**2 + (py - nearY)**2);
  }

  const updateAI = useCallback((kart: Kart) => {
    const waypoints = trackWaypointsRef.current;
    if (waypoints.length === 0 || kart.targetWaypoint === undefined) return;

    const difficultySettings = {
        easy: { speed: 4, turnRate: 0.04, precision: 100 },
        medium: { speed: 5, turnRate: 0.06, precision: 75 },
        hard: { speed: 6, turnRate: 0.08, precision: 50 }
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
    
    // Normalize angle difference
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
    
    // Update P1 (Human)
    const p1 = player1Ref.current;
    let p1Acceleration = 0;
    let p1Turn = 0;
    if (keysPressed.current[controls.p1.up]) p1Acceleration = 0.25;
    if (keysPressed.current[controls.p1.down]) p1Acceleration = -0.2;
    if (keysPressed.current[controls.p1.left]) p1Turn = -0.04;
    if (keysPressed.current[controls.p1.right]) p1Turn = 0.04;

    p1.speed += p1Acceleration;
    p1.speed *= 0.98; // Friction
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
        // Collision with track walls
        let onTrack = false;
        const outer = [trackPathRef.current[0], trackPathRef.current[1], trackPathRef.current[2], trackPathRef.current[3]];
        const inner = [trackPathRef.current[4], trackPathRef.current[5], trackPathRef.current[6], trackPathRef.current[7]];

        if(
          kart.x > canvas.width * 0.1 && kart.x < canvas.width * 0.9 &&
          kart.y > canvas.height * 0.1 && kart.y < canvas.height * 0.9 &&
          !(kart.x > canvas.width * 0.3 && kart.x < canvas.width * 0.7 &&
          kart.y > canvas.height * 0.3 && kart.y < canvas.height * 0.7)
        ){
           onTrack = true;
        }

        if(!onTrack) {
          kart.speed *= 0.9; // Slow down on grass
        }
        
        // Bouncing off walls (simplified)
        if(kart.x < canvas.width * 0.1 || kart.x > canvas.width * 0.9 || kart.y < canvas.height * 0.1 || kart.y > canvas.height * 0.9){
          kart.speed *= -0.5
        }
        if(kart.x > canvas.width * 0.3 && kart.x < canvas.width * 0.7 && kart.y > canvas.height * 0.3 && kart.y < canvas.height * 0.7){
           kart.speed *= -0.5
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
  }, [gameState, gameMode, updateAI]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resetKarts();

    const handleResize = () => {
      if(!canvasRef.current) return;
      const parent = canvasRef.current.parentElement;
      if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
      }
      trackPathRef.current = []; // Force track redraw
      resetKarts();
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    
    const handleTouchStart = (key: string) => { keysPressed.current[key] = true; };
    const handleTouchEnd = (key: string) => { keysPressed.current[key] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const mobileControls = [
        { key: 'w', id: 'p1-up' }, { key: 's', id: 'p1-down' }, { key: 'a', id: 'p1-left' }, { key: 'd', id: 'p1-right' },
        { key: 'arrowup', id: 'p2-up' }, { key: 'arrowdown', id: 'p2-down' }, { key: 'arrowleft', id: 'p2-left' }, { key: 'arrowright', id: 'p2-right' },
    ];
    mobileControls.forEach(({key, id}) => {
        const element = document.getElementById(id);
        if(element) {
            const startListener = () => handleTouchStart(key);
            const endListener = () => handleTouchEnd(key);
            element.addEventListener('touchstart', startListener);
            element.addEventListener('touchend', endListener);
            element.addEventListener('mousedown', startListener);
            element.addEventListener('mouseup', endListener);
            element.addEventListener('mouseleave', endListener);
        }
    })

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

    loop();

    return () => {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
      if(countdownIntervalId.current) clearInterval(countdownIntervalId.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
       mobileControls.forEach(({key, id}) => {
        const element = document.getElementById(id);
        if(element) {
            // Memory leak here, but acceptable for this prototype.
            // In a real app, we'd store and remove these listeners.
        }
    })
    };
  }, [resetKarts, isMobile, update, gameMode]);

  const TouchButton = ({id, children, className}: {id: string, children: React.ReactNode, className?: string}) => (
    <Button id={id} size="icon" variant="secondary" className={cn("w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40", className)}>
        {children}
    </Button>
  )

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
      <div className="relative w-[95vw] h-[70vh] md:w-[90vw] md:h-[80vh]">
        <canvas ref={canvasRef} className="w-full h-full rounded-lg shadow-2xl" />
        {renderUI()}
        {isMobile && gameState === 'playing' && (
            <div className="absolute bottom-4 w-full flex justify-between px-4 pointer-events-auto">
                {/* Player 1 Controls */}
                <div className="flex items-center gap-2">
                    <TouchButton id="p1-left"><ChevronLeft /></TouchButton>
                    <div className="flex flex-col gap-2">
                        <TouchButton id="p1-up" className="w-12 h-12"><ArrowUp/></TouchButton>
                        <TouchButton id="p1-down" className="w-12 h-12"><ArrowDown/></TouchButton>
                    </div>
                    <TouchButton id="p1-right"><ChevronRight /></TouchButton>
                </div>
                {/* Player 2 Controls (only in 2P mode on mobile) */}
                {gameMode === '2p' && (
                  <div className="flex items-center gap-2">
                      <TouchButton id="p2-left"><ChevronLeft /></TouchButton>
                      <div className="flex flex-col gap-2">
                          <TouchButton id="p2-up" className="w-12 h-12"><ArrowUp/></TouchButton>
                          <TouchButton id="p2-down" className="w-12 h-12"><ArrowDown/></TouchButton>
                      </div>
                      <TouchButton id="p2-right"><ChevronRight /></TouchButton>
                  </div>
                )}
            </div>
        )}
      </div>
    </div>
  )
};

export default KartHavoc;
