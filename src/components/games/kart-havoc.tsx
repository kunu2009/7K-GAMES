
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';


type Kart = {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  color: string;
  laps: number;
  lastCheckpoint: number;
  targetWaypoint?: number;
};

type TrackSegment = {
  x1: number, y1: number, x2: number, y2: number
}

type Waypoint = {
  x: number, y: number
}

type Joystick = {
    base: { x: number, y: number, radius: number };
    stick: { x: number, y: number, radius: number };
    active: boolean;
    touchId: number | null;
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
  
  const player1Ref = useRef<Kart>({ id: 1, x: 0, y: 0, angle: -Math.PI / 2, speed: 0, color: '#4285F4', laps: 0, lastCheckpoint: 0 });
  const player2Ref = useRef<Kart>({ id: 2, x: 0, y: 0, angle: -Math.PI / 2, speed: 0, color: '#DB4437', laps: 0, lastCheckpoint: 0, targetWaypoint: 0 });
  
  const joystick1Ref = useRef<Joystick>({ base: {x:0, y:0, radius: 50}, stick: {x:0, y:0, radius: 25}, active: false, touchId: null });
  const joystick2Ref = useRef<Joystick>({ base: {x:0, y:0, radius: 50}, stick: {x:0, y:0, radius: 25}, active: false, touchId: null });

  const resetKarts = useCallback(() => {
    const canvas = canvasRef.current;
    if(!canvas || !finishLineRef.current) return;
    const startX = finishLineRef.current.x1 + (finishLineRef.current.x2 - finishLineRef.current.x1) / 2;
    const startY = finishLineRef.current.y1 + 60;
    
    player1Ref.current = { id: 1, x: startX - 40, y: startY, angle: -Math.PI / 2, speed: 0, color: '#4285F4', laps: 0, lastCheckpoint: 0 };
    player2Ref.current = { id: 2, x: startX + 40, y: startY, angle: -Math.PI / 2, speed: 0, color: '#DB4437', laps: 0, lastCheckpoint: 0, targetWaypoint: 0 };
    
    // Reset AI state as well
    if(gameMode === 'ai' && player2Ref.current) {
        player2Ref.current.lastCheckpoint = 0;
        player2Ref.current.laps = 0;
        player2Ref.current.targetWaypoint = 0;
    }
  }, [gameMode]);

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
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(-w/2 - 4, -h/2 + 5, 4, 10); // Left front
    ctx.fillRect(-w/2 - 4, h/2 - 15, 4, 10); // Left rear
    ctx.fillRect(w/2, -h/2 + 5, 4, 10); // Right front
    ctx.fillRect(w/2, h/2 - 15, 4, 10); // Right rear

    // Spoiler / Front Bumper
    ctx.fillStyle = kart.id === 1 ? '#fbbc05' : '#4CAF50';
    ctx.fillRect(-w/2, -h/2 - 2, w, 4);

    ctx.restore();
  };

  const drawTrack = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const isPortrait = canvas.height > canvas.width;
    const trackWidth = isMobile ? 120 : 180;
    const marginX = isPortrait ? 20 : canvas.width * 0.1;
    const marginY = isPortrait ? 100 : canvas.height * 0.1;

    const outerWidth = canvas.width - marginX * 2;
    const outerHeight = canvas.height - marginY * 2;

    if (!trackPathRef.current) {
        const path = new Path2D();
        
        const innerRectX = marginX + trackWidth;
        const innerRectY = marginY + trackWidth;
        const innerRectW = outerWidth - trackWidth * 2;
        const innerRectH = outerHeight - trackWidth * 2;

        // Outer boundary
        path.rect(marginX, marginY, outerWidth, outerHeight);
        // Inner boundary (creates the hole)
        path.rect(innerRectX, innerRectY, innerRectW, innerRectH);
        
        trackPathRef.current = path;

        const waypoints = [
           { x: marginX + trackWidth/2, y: marginY + outerHeight - trackWidth/2 }, 
           { x: marginX + trackWidth/2, y: marginY + trackWidth/2 },
           { x: marginX + outerWidth/2, y: marginY + trackWidth/2 },
           { x: marginX + outerWidth - trackWidth/2, y: marginY + trackWidth/2 },
           { x: marginX + outerWidth - trackWidth/2, y: marginY + outerHeight/2 },
           { x: marginX + outerWidth - trackWidth/2, y: marginY + outerHeight - trackWidth/2 },
           { x: marginX + outerWidth/2, y: marginY + outerHeight - trackWidth/2 },
        ];
        trackWaypointsRef.current = [...waypoints]; 

        const startLineY = marginY + outerHeight - trackWidth;
        finishLineRef.current = { x1: innerRectX, y1: startLineY, x2: marginX + outerWidth, y2: startLineY };
    }
     
    // Draw asphalt
    ctx.fillStyle = '#4A4A4A';
    ctx.fill(trackPathRef.current, 'evenodd');

    // Draw track borders
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 10;
    const innerRectX = marginX + trackWidth;
    const innerRectY = marginY + trackWidth;
    const innerRectW = outerWidth - trackWidth * 2;
    const innerRectH = outerHeight - trackWidth * 2;
    ctx.strokeRect(marginX, marginY, outerWidth, outerHeight);
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

  const drawJoysticks = (ctx: CanvasRenderingContext2D) => {
    [joystick1Ref.current, joystick2Ref.current].forEach(joy => {
        if (!joy.active) return;
        ctx.save();
        // Base
        ctx.beginPath();
        ctx.arc(joy.base.x, joy.base.y, joy.base.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
        ctx.fill();
        // Stick
        ctx.beginPath();
        ctx.arc(joy.stick.x, joy.stick.y, joy.stick.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        ctx.restore();
    })
  }
  
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
    }
    // Make AI always target the next waypoint
    target = waypoints[kart.targetWaypoint];


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
    let p2Acceleration = 0;
    let p2Turn = 0;

    const maxSpeed = isMobile ? 5 : 6;

    if (isMobile) {
        const joy1 = joystick1Ref.current;
        if(joy1.active) {
            const dx = joy1.stick.x - joy1.base.x;
            const dy = joy1.stick.y - joy1.base.y;
            p1Turn = dx / joy1.base.radius * 0.05;
            p1Acceleration = -dy / joy1.base.radius * 0.3;
        }
        if(gameMode === '2p'){
            const joy2 = joystick2Ref.current;
             if(joy2.active) {
                const dx = joy2.stick.x - joy2.base.x;
                const dy = joy2.stick.y - joy2.base.y;
                p2Turn = dx / joy2.base.radius * 0.05;
                p2Acceleration = -dy / joy2.base.radius * 0.3;
            }
        }
    } 
    
    if (!isMobile || gameMode === 'ai') { // Keyboard for P1 always, and P2 if not AI
        if (keysPressed.current[controls.p1.up]) p1Acceleration = 0.25;
        if (keysPressed.current[controls.p1.down]) p1Acceleration = -0.2;
        if (keysPressed.current[controls.p1.left]) p1Turn = -0.04;
        if (keysPressed.current[controls.p1.right]) p1Turn = 0.04;
    }

    if (!isMobile && gameMode === '2p') { // Keyboard for P2
        if (keysPressed.current[controls.p2.up]) p2Acceleration = 0.25;
        if (keysPressed.current[controls.p2.down]) p2Acceleration = -0.2;
        if (keysPressed.current[controls.p2.left]) p2Turn = -0.04;
        if (keysPressed.current[controls.p2.right]) p2Turn = 0.04;
    }

    const p1 = player1Ref.current;
    p1.speed += p1Acceleration;
    p1.speed *= 0.96; // Slightly more friction for better control
    p1.speed = Math.max(-3, Math.min(maxSpeed, p1.speed));
    if (Math.abs(p1.speed) > 0.1) {
        p1.angle += p1Turn * (p1.speed / maxSpeed);
    }

    // Update P2 (Human or AI)
    const p2 = player2Ref.current;
    if (gameMode === 'ai') {
        updateAI(p2);
    } else {
        p2.speed += p2Acceleration;
        p2.speed *= 0.96;
        p2.speed = Math.max(-3, Math.min(maxSpeed, p2.speed));
        if (Math.abs(p2.speed) > 0.1) {
            p2.angle += p2Turn * (p2.speed / maxSpeed);
        }
    }

    karts.forEach((kart) => {
        const prevY = kart.y;
        kart.x += Math.sin(kart.angle) * kart.speed;
        kart.y -= Math.cos(kart.angle) * kart.speed;

        // --- Physics & Rules ---
        const ctx = canvas.getContext('2d');
        if(ctx && trackPathRef.current && !ctx.isPointInPath(trackPathRef.current, kart.x, kart.y, 'evenodd')) {
          kart.speed *= 0.9;
          kart.x -= Math.sin(kart.angle) * kart.speed;
          kart.y += Math.cos(kart.angle) * kart.speed;
          kart.speed *= -0.5; // Bounce effect
        }

        // Collision with other kart
        const otherKart = kart.id === 1 ? p2 : p1;
        const dx = kart.x - otherKart.x;
        const dy = kart.y - otherKart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < KART_HEIGHT) {
            const tempSpeed = kart.speed;
            kart.speed = otherKart.speed * 0.8;
            otherKart.speed = tempSpeed * 0.8;
            
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
                    setWinner(kart.id === 1 ? 'Player 1' : (gameMode === 'ai' ? 'The AI' : 'Player 2'));
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
      drawTrack(canvas.getContext('2d')!, canvas);
      resetKarts();
      // Setup joysticks for mobile
      if(isMobile) {
          joystick1Ref.current.base.x = canvas.width * 0.25;
          joystick1Ref.current.base.y = canvas.height - 80;
          joystick2Ref.current.base.x = canvas.width * 0.75;
          joystick2Ref.current.base.y = canvas.height - 80;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; };
    
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const touches = e.changedTouches;
        for(let i=0; i < touches.length; i++) {
            const touch = touches[i];
            if(touch.clientX < canvas.width/2) { // P1
                joystick1Ref.current.active = true;
                joystick1Ref.current.touchId = touch.identifier;
                joystick1Ref.current.base.x = touch.clientX;
                joystick1Ref.current.base.y = touch.clientY;
                joystick1Ref.current.stick.x = touch.clientX;
                joystick1Ref.current.stick.y = touch.clientY;
            } else { // P2
                joystick2Ref.current.active = true;
                joystick2Ref.current.touchId = touch.identifier;
                joystick2Ref.current.base.x = touch.clientX;
                joystick2Ref.current.base.y = touch.clientY;
                joystick2Ref.current.stick.x = touch.clientX;
                joystick2Ref.current.stick.y = touch.clientY;
            }
        }
    };
    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touches = e.changedTouches;
        for(let i=0; i < touches.length; i++) {
            const touch = touches[i];
            let joy;
            if(touch.identifier === joystick1Ref.current.touchId) joy = joystick1Ref.current;
            else if(touch.identifier === joystick2Ref.current.touchId) joy = joystick2Ref.current;
            else continue;

            const dx = touch.clientX - joy.base.x;
            const dy = touch.clientY - joy.base.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if(dist > joy.base.radius) {
                joy.stick.x = joy.base.x + (dx / dist) * joy.base.radius;
                joy.stick.y = joy.base.y + (dy / dist) * joy.base.radius;
            } else {
                joy.stick.x = touch.clientX;
                joy.stick.y = touch.clientY;
            }
        }
    };
    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        const touches = e.changedTouches;
        for(let i=0; i < touches.length; i++) {
            const touch = touches[i];
            if(touch.identifier === joystick1Ref.current.touchId) {
                joystick1Ref.current.active = false;
                joystick1Ref.current.touchId = null;
            } else if (touch.identifier === joystick2Ref.current.touchId) {
                joystick2Ref.current.active = false;
                joystick2Ref.current.touchId = null;
            }
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    if(isMobile) {
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);
    }
    
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

      if(isMobile) drawJoysticks(ctx);

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
      if (canvas && isMobile) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
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

    