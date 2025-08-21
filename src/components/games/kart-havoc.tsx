
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

type Kart = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  color: string;
  laps: number;
  lastCheckpoint: number;
};

type TrackSegment = {
  x1: number, y1: number, x2: number, y2: number
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
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'playing' | 'over'>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<string | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopId = useRef<number>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();

  const trackPathRef = useRef<TrackSegment[]>([]);
  const finishLineRef = useRef<TrackSegment | null>(null);
  
  const isMobile = useIsMobile();

  const player1Ref = useRef<Kart>({ x: 0, y: 0, angle: -Math.PI / 2, speed: 0, color: '#4285F4', laps: 0, lastCheckpoint: 0 });
  const player2Ref = useRef<Kart>({ x: 0, y: 0, angle: -Math.PI / 2, speed: 0, color: '#DB4437', laps: 0, lastCheckpoint: 0 });
  const player1PrevY = useRef(0);
  const player2PrevY = useRef(0);

  const resetKarts = useCallback(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const startY = canvas.height * 0.8;
    player1Ref.current = { x: canvas.width / 2 - 40, y: startY, angle: -Math.PI / 2, speed: 0, color: '#4285F4', laps: 0, lastCheckpoint: 0 };
    player2Ref.current = { x: canvas.width / 2 + 40, y: startY, angle: -Math.PI / 2, speed: 0, color: '#DB4437', laps: 0, lastCheckpoint: 0 };
    player1PrevY.current = startY;
    player2PrevY.current = startY;
  }, []);

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
        const path: TrackSegment[] = [];
        const outer = [
            { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, 
            { x: 0.1, y: 0.9 }, { x: 0.1, y: 0.1 }
        ];
        const inner = [
            { x: 0.3, y: 0.3 }, { x: 0.7, y: 0.3 }, { x: 0.7, y: 0.7 },
            { x: 0.3, y: 0.7 }, { x: 0.3, y: 0.3 }
        ];

        const scale = (points: {x: number, y: number}[]) => points.map(p => ({x: p.x * canvas.width, y: p.y * canvas.height}));
        const scaledOuter = scale(outer);
        const scaledInner = scale(inner);

        ctx.strokeStyle = "gray";
        ctx.lineWidth = 10;
        
        const createPath = (points: {x: number, y: number}[]) => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for(let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
                path.push({x1: points[i-1].x, y1: points[i-1].y, x2: points[i].x, y2: points[i].y});
            }
            ctx.stroke();
        }
        createPath(scaledOuter);
        createPath(scaledInner);

        trackPathRef.current = path;

        const startY = canvas.height * 0.8;
        finishLineRef.current = { x1: canvas.width * 0.3, y1: startY, x2: canvas.width * 0.7, y2: startY };
    }
     
    // Redraw from cached path
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

  const update = () => {
    if(gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if(!canvas) return;

    const karts = [player1Ref.current, player2Ref.current];
    const prevYs = [player1PrevY, player2PrevY];
    const controls = [
      { up: 'w', down: 's', left: 'a', right: 'd' },
      { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' },
    ];
    
    karts.forEach((kart, index) => {
        const control = controls[index];
        let acceleration = 0;
        let turn = 0;
        
        prevYs[index].current = kart.y;

        if (keysPressed.current[control.up]) acceleration = 0.3;
        if (keysPressed.current[control.down]) acceleration = -0.2;
        if (keysPressed.current[control.left]) turn = -0.05;
        if (keysPressed.current[control.right]) turn = 0.05;
        
        kart.speed += acceleration;
        kart.speed *= 0.97; // Friction
        kart.speed = Math.max(-3, Math.min(6, kart.speed));
        
        if (Math.abs(kart.speed) > 0.1) {
            kart.angle += turn * (kart.speed / 5);
        }

        kart.x += Math.sin(kart.angle) * kart.speed;
        kart.y -= Math.cos(kart.angle) * kart.speed;

        // Collision with track
        trackPathRef.current.forEach(wall => {
            if(pointLineDist(kart.x, kart.y, wall.x1, wall.y1, wall.x2, wall.y2) < KART_WIDTH / 2) {
                kart.speed *= -0.5; // Bounce off
            }
        });

        // Collision with other karts
        karts.forEach((other, otherIndex) => {
            if (index === otherIndex) return;
            const dx = kart.x - other.x;
            const dy = kart.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < KART_HEIGHT) {
                kart.speed *= 0.8;
                other.speed *= 0.8;
                const overlap = (KART_HEIGHT - dist) / 2;
                kart.x += (dx / dist) * overlap;
                kart.y += (dy / dist) * overlap;
                other.x -= (dx / dist) * overlap;
                other.y -= (dy / dist) * overlap;
            }
        });
        
        // Lap counting
        const finishLine = finishLineRef.current;
        if(finishLine) {
            const isCrossing = kart.x > finishLine.x1 && kart.x < finishLine.x2;
            const wasAbove = prevYs[index].current < finishLine.y1;
            const isBelow = kart.y >= finishLine.y1;

            if (isCrossing && wasAbove && isBelow && kart.lastCheckpoint === 1) {
                kart.laps++;
                kart.lastCheckpoint = 0;
                if(kart.laps >= TOTAL_LAPS) {
                    setWinner(kart.color === player1Ref.current.color ? 'Player 1' : 'Player 2');
                    setGameState('over');
                }
            }
             // Simple checkpoint system to enforce direction
            if (kart.y < canvas.height * 0.4) {
                 kart.lastCheckpoint = 1;
            }
        }
    });
  };

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
    
    // Attach keyboard listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Touch listeners setup
    const mobileControls = [
        { key: 'w', id: 'p1-up' }, { key: 's', id: 'p1-down' }, { key: 'a', id: 'p1-left' }, { key: 'd', id: 'p1-right' },
        { key: 'arrowup', id: 'p2-up' }, { key: 'arrowdown', id: 'p2-down' }, { key: 'arrowleft', id: 'p2-left' }, { key: 'arrowright', id: 'p2-right' },
    ];
    mobileControls.forEach(({key, id}) => {
        const element = document.getElementById(id);
        if(element) {
            element.addEventListener('touchstart', () => handleTouchStart(key));
            element.addEventListener('touchend', () => handleTouchEnd(key));
            element.addEventListener('mousedown', () => handleTouchStart(key));
            element.addEventListener('mouseup', () => handleTouchEnd(key));
            element.addEventListener('mouseleave', () => handleTouchEnd(key));
        }
    })

    const loop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#333';
      ctx.fillRect(0,0, canvas.width, canvas.height);

      drawTrack(ctx, canvas);
      drawKart(ctx, player1Ref.current);
      drawKart(ctx, player2Ref.current);
      
      // Draw UI
      ctx.fillStyle = "white";
      ctx.font = "bold 24px 'Space Grotesk', sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText(`P1 Laps: ${player1Ref.current.laps}/${TOTAL_LAPS}`, 20, 40);
      ctx.textAlign = 'right';
      ctx.fillText(`P2 Laps: ${player2Ref.current.laps}/${TOTAL_LAPS}`, canvas.width - 20, 40);


      if(gameState !== 'playing') {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 60px 'Space Grotesk', sans-serif";
        if(gameState === 'waiting') {
            ctx.fillText("Kart Havoc", canvas.width / 2, canvas.height / 2 - 50);
            ctx.font = "30px 'Space Grotesk', sans-serif";
            ctx.fillText("P1: WASD | P2: Arrows", canvas.width/2, canvas.height/2 + 20);
        } else if (gameState === 'countdown') {
            ctx.fillText(countdown > 0 ? `${countdown}` : "GO!", canvas.width / 2, canvas.height / 2);
        } else if (gameState === 'over' && winner) {
            ctx.fillText(`${winner} Wins!`, canvas.width / 2, canvas.height / 2 - 50);
        }
      }

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
            // No easy way to remove anonymous functions, but they will be garbage collected with the component
        }
    })
    };
  }, [gameState, winner, resetKarts, countdown, isMobile]);

  const TouchButton = ({id, children, className}: {id: string, children: React.ReactNode, className?: string}) => (
    <Button id={id} size="icon" variant="secondary" className={cn("w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40", className)}>
        {children}
    </Button>
  )

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-[95vw] h-[70vh] md:w-[90vw] md:h-[80vh]">
        <canvas ref={canvasRef} className="w-full h-full rounded-lg shadow-2xl" />
        {isMobile && gameState === 'playing' && (
            <div className="absolute bottom-4 w-full flex justify-between px-4">
                {/* Player 1 Controls */}
                <div className="flex items-center gap-2">
                    <TouchButton id="p1-left"><ChevronLeft /></TouchButton>
                    <div className="flex flex-col gap-2">
                        <TouchButton id="p1-up" className="w-12 h-12"><ArrowUp/></TouchButton>
                        <TouchButton id="p1-down" className="w-12 h-12"><ArrowDown/></TouchButton>
                    </div>
                    <TouchButton id="p1-right"><ChevronRight /></TouchButton>
                </div>
                {/* Player 2 Controls */}
                <div className="flex items-center gap-2">
                     <TouchButton id="p2-left"><ChevronLeft /></TouchButton>
                    <div className="flex flex-col gap-2">
                        <TouchButton id="p2-up" className="w-12 h-12"><ArrowUp/></TouchButton>
                        <TouchButton id="p2-down" className="w-12 h-12"><ArrowDown/></TouchButton>
                    </div>
                    <TouchButton id="p2-right"><ChevronRight /></TouchButton>
                </div>
            </div>
        )}
      </div>
      {(gameState === 'waiting' || gameState === 'over') && (
         <Button onClick={startGame} size="lg" variant="secondary" className="mt-8 text-lg animate-fade-in">
           {gameState === 'waiting' ? 'Start Race' : 'Play Again'}
         </Button>
      )}
    </div>
  )
};

export default KartHavoc;

