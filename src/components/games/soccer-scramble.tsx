
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

type Body = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  color: string;
  friction: number;
  mass: number;
};

const SoccerScramble: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-green-700 text-white touch-none relative overflow-hidden">
      <GameCanvas />
    </div>
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'over'>('waiting');
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [countdown, setCountdown] = useState(3);
  const [lastGoal, setLastGoal] = useState<string | null>(null);

  const player1Ref = useRef<Body>({ id: 'p1', x: 0, y: 0, width: 50, height: 50, vx: 0, vy: 0, color: '#4285F4', friction: 0.9, mass: 10 });
  const player2Ref = useRef<Body>({ id: 'p2', x: 0, y: 0, width: 50, height: 50, vx: 0, vy: 0, color: '#DB4437', friction: 0.9, mass: 10 });
  const ballRef = useRef<Body>({ id: 'ball', x: 0, y: 0, width: 30, height: 30, vx: 0, vy: 0, color: 'white', friction: 0.98, mass: 1 });
  
  const gameLoopId = useRef<number>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();


  const GRAVITY = 0.5;
  const JUMP_POWER = -15;
  const MOVE_SPEED = 0.8;
  const MAX_SPEED = 15;

  const resetPositions = useCallback((canvas: HTMLCanvasElement) => {
    player1Ref.current = { ...player1Ref.current, x: canvas.width / 4, y: canvas.height - 100, vx: 0, vy: 0 };
    player2Ref.current = { ...player2Ref.current, x: (canvas.width / 4) * 3, y: canvas.height - 100, vx: 0, vy: 0 };
    ballRef.current = { ...ballRef.current, x: canvas.width / 2 - 15, y: canvas.height / 2, vx: 0, vy: 0 };
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
    }
    countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
            if (prev - 1 <= 0) {
                clearInterval(countdownIntervalRef.current);
            }
            return prev - 1;
        });
    }, 1000);
  }, []);

  const handleGoal = useCallback((scoringPlayer: 'player1' | 'player2') => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    
    setScores(prevScores => {
        const newScores = { ...prevScores };
        if (scoringPlayer === 'player1') {
          newScores.player1++;
        } else {
          newScores.player2++;
        }

        if (newScores.player1 >= 3 || newScores.player2 >= 3) {
            setGameState('over');
        }
        return newScores;
    });

    setLastGoal(scoringPlayer === 'player1' ? 'Blue Scores!' : 'Red Scores!');
    resetPositions(canvas);
    startCountdown();
    setTimeout(() => setLastGoal(null), 2000);

  }, [resetPositions, startCountdown]);
  
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;

    setScores({ player1: 0, player2: 0 });
    setLastGoal(null);
    setGameState('playing');
    resetPositions(canvas);
    startCountdown();
  }, [resetPositions, startCountdown]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (gameState !== 'playing') {
            setGameState('waiting');
        }
        resetPositions(canvas);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleStartAction = (e: Event) => {
        e.preventDefault();
        if (gameState !== 'playing') {
            startGame();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (gameState !== 'playing' && (e.key === ' ' || e.key === 'Enter')) {
        handleStartAction(e);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handleStartAction);
    canvas.addEventListener('touchstart', handleStartAction);


    const update = () => {
      if (gameState !== 'playing' || countdown > 0) {
        return;
      }
      
      const entities = [player1Ref.current, player2Ref.current, ballRef.current];
      const player1 = player1Ref.current;
      const player2 = player2Ref.current;

      // Player 1 controls
      if (keysPressed.current['a']) player1.vx -= MOVE_SPEED;
      if (keysPressed.current['d']) player1.vx += MOVE_SPEED;
      if (keysPressed.current['w'] && player1.y + player1.height >= canvas.height - 1) {
        player1.vy = JUMP_POWER;
      }
      
      // Player 2 controls
      if (keysPressed.current['arrowleft']) player2.vx -= MOVE_SPEED;
      if (keysPressed.current['arrowright']) player2.vx += MOVE_SPEED;
      if (keysPressed.current['arrowup'] && player2.y + player2.height >= canvas.height - 1) {
        player2.vy = JUMP_POWER;
      }

      entities.forEach(body => {
        // Gravity (not for ball)
        if(body.id !== 'ball') {
           body.vy += GRAVITY;
        } else {
           body.vy += GRAVITY * 0.2; // Lighter gravity for ball
        }

        // Update position
        body.x += body.vx;
        body.y += body.vy;
        
        // Friction
        body.vx *= body.friction;
        body.vy *= body.friction;
        
        // Clamp speed
        body.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, body.vx));
        body.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, body.vy));

        // Wall collisions
        if (body.x < 0) {
          body.x = 0;
          body.vx *= -0.7;
        }
        if (body.x + body.width > canvas.width) {
          body.x = canvas.width - body.width;
          body.vx *= -0.7;
        }

        // Floor collision
        if (body.y + body.height > canvas.height) {
          body.y = canvas.height - body.height;
          body.vy *= -0.5;
        }
        // Ceiling collision
        if(body.y < 0) {
          body.y = 0;
          body.vy *= -0.5;
        }
      });
      
      // Entity collisions
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            const body1 = entities[i];
            const body2 = entities[j];
            
            const dx = (body1.x + body1.width / 2) - (body2.x + body2.width / 2);
            const dy = (body1.y + body1.height / 2) - (body2.y + body2.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const min_dist = (body1.width / 2 + body2.width / 2);
            
            if (distance < min_dist) {
                // Collision response
                const angle = Math.atan2(dy, dx);
                const overlap = min_dist - distance;
                
                // Static resolution (push apart)
                const resolveX = overlap * Math.cos(angle);
                const resolveY = overlap * Math.sin(angle);
                
                const totalMass = body1.mass + body2.mass;
                const body1MoveFactor = body2.mass / totalMass;
                const body2MoveFactor = body1.mass / totalMass;

                body1.x += resolveX * body1MoveFactor;
                body1.y += resolveY * body1MoveFactor;
                body2.x -= resolveX * body2MoveFactor;
                body2.y -= resolveY * body2MoveFactor;
                
                // Dynamic resolution (transfer momentum)
                const normalX = dx / distance;
                const normalY = dy / distance;
                const relativeVelX = body1.vx - body2.vx;
                const relativeVelY = body1.vy - body2.vy;
                const speed = relativeVelX * normalX + relativeVelY * normalY;

                if (speed < 0) {
                    const impulse = 2 * speed / totalMass;
                    body1.vx -= impulse * body2.mass * normalX * 1.1; // Add a bit of extra "kick"
                    body1.vy -= impulse * body2.mass * normalY * 1.1;
                    body2.vx += impulse * body1.mass * normalX * 1.1;
                    body2.vy += impulse * body1.mass * normalY * 1.1;
                }
            }
        }
      }

      // Goal check
      const goalHeight = 150;
      const goalWidth = 20;
      const ball = ballRef.current;
      // Player 2 scores (left goal)
      if (ball.x < goalWidth && ball.y > canvas.height - goalHeight) {
        handleGoal('player2');
      }
      // Player 1 scores (right goal)
      if (ball.x + ball.width > canvas.width - goalWidth && ball.y > canvas.height - goalHeight) {
        handleGoal('player1');
      }
    };
    
    const drawPlayer = (ctx: CanvasRenderingContext2D, player: Body) => {
        ctx.save();
        ctx.translate(player.x, player.y);
        
        // Body
        ctx.fillStyle = player.color;
        ctx.fillRect(0, 0, player.width, player.height);
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(player.width * 0.2, player.height * 0.2, 8, 8);
        ctx.fillRect(player.width * 0.6, player.height * 0.2, 8, 8);
        ctx.fillStyle = 'black';
        ctx.fillRect(player.width * 0.2 + 2, player.height * 0.2 + 2, 4, 4);
        ctx.fillRect(player.width * 0.6 + 2, player.height * 0.2 + 2, 4, 4);
        
        ctx.restore();
    }
    
    const drawBall = (ctx: CanvasRenderingContext2D, ball: Body) => {
        ctx.save();
        ctx.translate(ball.x + ball.width/2, ball.y + ball.height/2);
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(0, 0, ball.width/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = 'black';
        for(let i=0; i<6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.arc(ball.width/3, 0, ball.width/6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }


    const draw = () => {
        if (!canvasRef.current || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
        // Draw pitch
        ctx.fillStyle = '#6abf4b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw goals
        const goalHeight = 150;
        const goalWidth = 20;
        ctx.fillStyle = '#DDDDDD';
        ctx.fillRect(0, canvas.height - goalHeight, goalWidth, goalHeight); // Left goal
        ctx.fillRect(canvas.width - goalWidth, canvas.height - goalHeight, goalWidth, goalHeight); // Right goal
        ctx.strokeStyle = '#AAAAAA';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, canvas.height - goalHeight, goalWidth, goalHeight);
        ctx.strokeRect(canvas.width - goalWidth, canvas.height - goalHeight, goalWidth, goalHeight);
        
        // Draw center circle
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height, 100, Math.PI, 0);
        ctx.stroke();

        // Draw entities
        drawPlayer(ctx, player1Ref.current);
        drawPlayer(ctx, player2Ref.current);
        drawBall(ctx, ballRef.current);

        // Draw scores
        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${scores.player1} - ${scores.player2}`, canvas.width / 2, 80);

        if (lastGoal) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.font = 'bold 80px "Space Grotesk", sans-serif';
            ctx.fillText(lastGoal, canvas.width / 2, canvas.height / 2);
        }

        // Draw UI text
        if (gameState !== 'playing') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = 'bold 60px "Space Grotesk", sans-serif';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 10;
            const winner = scores.player1 > scores.player2 ? "Blue Player Wins!" : "Red Player Wins!";
            ctx.fillText(gameState === 'over' ? winner : "Soccer Scramble", canvas.width / 2, canvas.height / 2 - 80);
            
            ctx.font = '30px "Space Grotesk", sans-serif';
            if (gameState === 'over') {
                 ctx.fillText("Click or Tap to Play Again", canvas.width / 2, canvas.height / 2 + 50);
            } else {
                 ctx.fillText("Click or Tap to Play", canvas.width / 2, canvas.height / 2);
            }
            ctx.shadowBlur = 0;
        } else if (countdown > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 120px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            const text = countdown > 0 ? `${countdown}` : "GO!";
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
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
        canvas.removeEventListener('mousedown', handleStartAction);
        canvas.removeEventListener('touchstart', handleStartAction);
      }

      if (gameLoopId.current) {
        cancelAnimationFrame(gameLoopId.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [gameState, scores, countdown, lastGoal, handleGoal, resetPositions, startGame]);

  return <canvas ref={canvasRef} className="touch-none w-full h-full cursor-pointer" />;
};

export default SoccerScramble;

    