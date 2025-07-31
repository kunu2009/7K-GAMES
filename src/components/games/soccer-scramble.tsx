
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

type Body = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  color: string;
  friction: number;
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

  const player1Ref = useRef<Body>({ x: 0, y: 0, width: 50, height: 50, vx: 0, vy: 0, color: '#4285F4', friction: 0.9 });
  const player2Ref = useRef<Body>({ x: 0, y: 0, width: 50, height: 50, vx: 0, vy: 0, color: '#DB4437', friction: 0.9 });
  const ballRef = useRef<Body>({ x: 0, y: 0, width: 30, height: 30, vx: 0, vy: 0, color: 'white', friction: 0.98 });
  
  const gameLoopId = useRef<number>();

  const GRAVITY = 0.6;
  const JUMP_POWER = -12;
  const MOVE_SPEED = 6;
  const MAX_SPEED = 15;

  const resetPositions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    player1Ref.current = { ...player1Ref.current, x: canvas.width / 4, y: canvas.height - 100, vx: 0, vy: 0 };
    player2Ref.current = { ...player2Ref.current, x: (canvas.width / 4) * 3, y: canvas.height - 100, vx: 0, vy: 0 };
    ballRef.current = { ...ballRef.current, x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0 };
  }, []);

  const startGame = useCallback(() => {
    setScores({ player1: 0, player2: 0 });
    setLastGoal(null);
    setGameState('playing');
    setCountdown(3);
    resetPositions();
  }, [resetPositions]);

  const handleGoal = useCallback((scoringPlayer: 'player1' | 'player2') => {
    setScores(prevScores => {
        const newScores = { ...prevScores };
        if (scoringPlayer === 'player1') {
          newScores.player1++;
        } else {
          newScores.player2++;
        }

        if (newScores.player1 >= 3 || newScores.player2 >= 3) {
            setGameState('over');
        } else {
            setLastGoal(scoringPlayer === 'player1' ? 'Blue Scores!' : 'Red Scores!');
            setCountdown(3);
            resetPositions();
            setTimeout(() => setLastGoal(null), 2000);
        }
        return newScores;
    });
  }, [resetPositions]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (gameState !== 'playing') {
            startGame();
            setGameState('waiting');
        } else {
            resetPositions();
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (gameState !== 'playing' && (e.key === ' ' || e.key === 'Enter')) {
        startGame();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);


    const update = () => {
      if (gameState !== 'playing') return;
      if (countdown > 0) return;
      
      const entities = [player1Ref.current, player2Ref.current, ballRef.current];
      const player1 = player1Ref.current;
      const player2 = player2Ref.current;

      // Player 1 controls
      if (keysPressed.current['a']) player1.vx = -MOVE_SPEED;
      else if (keysPressed.current['d']) player1.vx = MOVE_SPEED;
      else player1.vx = 0;
      if (keysPressed.current['w'] && player1.y + player1.height >= canvas.height) {
        player1.vy = JUMP_POWER;
      }
      
      // Player 2 controls
      if (keysPressed.current['arrowleft']) player2.vx = -MOVE_SPEED;
      else if (keysPressed.current['arrowright']) player2.vx = MOVE_SPEED;
      else player2.vx = 0;
      if (keysPressed.current['arrowup'] && player2.y + player2.height >= canvas.height) {
        player2.vy = JUMP_POWER;
      }

      entities.forEach(body => {
        // Gravity
        body.vy += GRAVITY;

        // Friction
        body.vx *= body.friction;
        body.vy *= body.friction;
        
        // Clamp speed
        body.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, body.vx));
        body.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, body.vy));

        // Update position
        body.x += body.vx;
        body.y += body.vy;

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
                const angle = Math.atan2(dy, dx);
                const tx = (body1.x + body1.width / 2) + Math.cos(angle) * min_dist;
                const ty = (body1.y + body1.height / 2) + Math.sin(angle) * min_dist;
                const ax = (tx - (body2.x + body2.width / 2)) * 0.5;
                const ay = (ty - (body2.y + body2.height / 2)) * 0.5;

                body1.vx -= ax;
                body1.vy -= ay;
                body2.vx += ax;
                body2.vy += ay;
            }
        }
      }

      // Goal check
      const ball = ballRef.current;
      const goalHeight = 150;
      const goalWidth = 20;
      // Player 2 scores (left goal)
      if (ball.x < goalWidth && ball.y > canvas.height - goalHeight) {
        handleGoal('player2');
      }
      // Player 1 scores (right goal)
      if (ball.x + ball.width > canvas.width - goalWidth && ball.y > canvas.height - goalHeight) {
        handleGoal('player1');
      }
    };
    
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
        const entities = [player1Ref.current, player2Ref.current];
        entities.forEach(body => {
            ctx.fillStyle = body.color;
            ctx.fillRect(body.x, body.y, body.width, body.height);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeRect(body.x, body.y, body.width, body.height);
        });
        
        // Draw ball
        const ball = ballRef.current;
        ctx.beginPath();
        ctx.arc(ball.x + ball.width / 2, ball.y + ball.height / 2, ball.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();

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
            const winner = scores.player1 > scores.player2 ? "Player 1 Wins!" : "Player 2 Wins!";
            ctx.fillText(gameState === 'over' ? winner : "Soccer Scramble", canvas.width / 2, canvas.height / 2 - 80);
            
            ctx.font = '30px "Space Grotesk", sans-serif';
            ctx.fillText("Press Space or Enter to Play", canvas.width / 2, canvas.height / 2);
            ctx.shadowBlur = 0;
        } else if (countdown > 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 120px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${countdown}`, canvas.width / 2, canvas.height / 2);
        }
    }

    const gameLoop = () => {
        update();
        draw();
        gameLoopId.current = requestAnimationFrame(gameLoop);
    };
    
    let countdownInterval: NodeJS.Timeout | undefined;
    if (gameState === 'playing' && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
            if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
            }
            return prev - 1;
        });
      }, 1000);
    }
    
    gameLoopId.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopId.current) {
        cancelAnimationFrame(gameLoopId.current);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [gameState, scores, countdown, lastGoal, handleGoal, resetPositions, startGame]);

  return <canvas ref={canvasRef} className="touch-none w-full h-full" />;
};

export default SoccerScramble;
