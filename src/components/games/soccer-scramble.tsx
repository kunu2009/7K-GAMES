
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Type Definitions ---
type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  onGround: boolean;
  score: number;
  controls: { left: string; right: string; jump: string };
};

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type Goal = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SoccerScramble: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-green-500 text-white touch-none relative overflow-hidden">
      <GameCanvas />
    </div>
  );
};

const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const gameLoopId = useRef<number>();

    const [gameState, setGameState] = useState<'waiting' | 'playing' | 'goal' | 'over'>('waiting');
    const [winner, setWinner] = useState<string | null>(null);
    const goalMessageTimer = useRef<NodeJS.Timeout>();

    const player1Ref = useRef<Player>({
        x: 200, y: 500, vx: 0, vy: 0, width: 50, height: 50, color: '#ff4136', onGround: false, score: 0,
        controls: { left: 'a', right: 'd', jump: 'w' }
    });
    const player2Ref = useRef<Player>({
        x: 750, y: 500, vx: 0, vy: 0, width: 50, height: 50, color: '#0074d9', onGround: false, score: 0,
        controls: { left: 'arrowleft', right: 'arrowright', jump: 'arrowup' }
    });
    const ballRef = useRef<Ball>({ x: 500, y: 300, vx: 0, vy: 0, radius: 20 });
    
    const goal1Ref = useRef<Goal>({ x: 0, y: 0, width: 100, height: 250 });
    const goal2Ref = useRef<Goal>({ x: 900, y: 0, width: 100, height: 250 });
    
    // --- Constants ---
    const GRAVITY = 0.6;
    const FRICTION = 0.9;
    const PLAYER_ACCELERATION = 1.2;
    const MAX_PLAYER_SPEED = 7;
    const JUMP_POWER = -15;
    const WINNING_SCORE = 3;

    const resetPositions = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const player1 = player1Ref.current;
        const player2 = player2Ref.current;
        const ball = ballRef.current;
        
        player1.x = canvas.width * 0.25;
        player1.y = canvas.height - 100;
        player1.vx = 0; player1.vy = 0;
        
        player2.x = canvas.width * 0.75;
        player2.y = canvas.height - 100;
        player2.vx = 0; player2.vy = 0;

        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.vx = (Math.random() - 0.5) * 5;
        ball.vy = (Math.random() - 0.5) * 5;
    }, []);

    const startGame = useCallback(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;

        player1Ref.current.score = 0;
        player2Ref.current.score = 0;
        setWinner(null);
        resetPositions();

        goal1Ref.current.y = canvas.height - 290;
        goal2Ref.current.y = canvas.height - 290;

        setGameState('playing');
    }, [resetPositions]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        keysPressed.current[e.key.toLowerCase()] = true;
        if (gameState !== 'playing' && e.key === 'Enter') {
            startGame();
        }
    }, [gameState, startGame]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        keysPressed.current[e.key.toLowerCase()] = false;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const handleResize = () => {
            const parent = canvas.parentElement;
            if(parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                goal1Ref.current.y = canvas.height - 290;
                goal2Ref.current.y = canvas.height - 290;
                goal2Ref.current.x = canvas.width - 100;
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const updatePlayer = (player: Player) => {
            // Horizontal Movement
            if (keysPressed.current[player.controls.left]) {
                player.vx -= PLAYER_ACCELERATION;
            } else if (keysPressed.current[player.controls.right]) {
                player.vx += PLAYER_ACCELERATION;
            } else {
                player.vx *= FRICTION * 0.9; // More friction when idle
            }
            player.vx = Math.max(-MAX_PLAYER_SPEED, Math.min(MAX_PLAYER_SPEED, player.vx));
            player.x += player.vx;

            // Gravity
            player.vy += GRAVITY;
            player.y += player.vy;

            // Jumping
            if (keysPressed.current[player.controls.jump] && player.onGround) {
                player.vy = JUMP_POWER;
                player.onGround = false;
            }

            // Ground Collision
            if (player.y + player.height > canvas.height - 40) {
                player.y = canvas.height - 40 - player.height;
                player.vy = 0;
                player.onGround = true;
            }
            
            // Wall Collision
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        };

        const updateBall = () => {
            const ball = ballRef.current;
            ball.vx *= FRICTION;
            ball.vy *= FRICTION;

            ball.vy += GRAVITY * 0.5; // Less gravity on ball
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall Collision
            if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
                ball.vx *= -0.8;
                ball.x = ball.x - ball.radius < 0 ? ball.radius : canvas.width - ball.radius;
            }
            // Top Collision
             if (ball.y - ball.radius < 0) {
                ball.vy *= -0.8;
                ball.y = ball.radius;
            }
            // Ground Collision
            if (ball.y + ball.radius > canvas.height - 40) {
                ball.y = canvas.height - 40 - ball.radius;
                ball.vy *= -0.6;
            }
        };

        const checkCollisions = () => {
            const p1 = player1Ref.current;
            const p2 = player2Ref.current;
            const ball = ballRef.current;

            // Player-Ball Collision
            [p1, p2].forEach(player => {
                const dx = (ball.x) - (player.x + player.width / 2);
                const dy = (ball.y) - (player.y + player.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                const min_dist = ball.radius + player.width / 2;

                if (distance < min_dist) {
                    const angle = Math.atan2(dy, dx);
                    const tx = (player.x + player.width / 2) + Math.cos(angle) * min_dist;
                    const ty = (player.y + player.height / 2) + Math.sin(angle) * min_dist;
                    const ax = (tx - ball.x) * 0.8;
                    const ay = (ty - ball.y) * 0.8;
                    
                    player.vx -= ax;
                    player.vy -= ay;
                    ball.vx += ax;
                    ball.vy += ay;
                }
            });

             // Goal Collision
            const g1 = goal1Ref.current;
            const g2 = goal2Ref.current;
            if (ball.x - ball.radius < g1.x + g1.width && ball.y > g1.y) {
                p2.score++;
                setGameState('goal');
            }
            if (ball.x + ball.radius > g2.x && ball.y > g2.y) {
                p1.score++;
                setGameState('goal');
            }
        };

        const draw = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Background
            ctx.fillStyle = '#6ab04c';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#5a9a3b';
            ctx.fillRect(0, canvas.height-40, canvas.width, 40);

            // Goals
            const g1 = goal1Ref.current;
            const g2 = goal2Ref.current;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 5;
            ctx.strokeRect(g1.x, g1.y, g1.width, g1.height);
            ctx.strokeRect(g2.x, g2.y, g2.width, g2.height);

            // Players
            const p1 = player1Ref.current;
            const p2 = player2Ref.current;
            ctx.fillStyle = p1.color;
            ctx.fillRect(p1.x, p1.y, p1.width, p1.height);
            ctx.fillStyle = p2.color;
            ctx.fillRect(p2.x, p2.y, p2.width, p2.height);
            
            // Ball
            const ball = ballRef.current;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Score
            ctx.fillStyle = 'white';
            ctx.font = 'bold 48px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${p1.score} - ${p2.score}`, canvas.width / 2, 60);

             // Game State Text
            if (gameState !== 'playing') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.font = 'bold 60px "Space Grotesk", sans-serif';

                if(gameState === 'waiting') {
                    ctx.fillText("Soccer Scramble", canvas.width / 2, canvas.height / 2 - 40);
                    ctx.font = '30px "Space Grotesk", sans-serif';
                    ctx.fillText("Press Enter to Start", canvas.width / 2, canvas.height / 2 + 20);
                } else if(gameState === 'goal') {
                     ctx.fillText("GOAL!", canvas.width / 2, canvas.height / 2);
                } else if (gameState === 'over' && winner) {
                    ctx.fillText(`${winner} Wins!`, canvas.width / 2, canvas.height / 2 - 40);
                    ctx.font = '30px "Space Grotesk", sans-serif';
                    ctx.fillText("Press Enter to Play Again", canvas.width / 2, canvas.height / 2 + 20);
                }
            }
        };
        
        const gameLoop = () => {
            if (gameState === 'playing') {
                updatePlayer(player1Ref.current);
                updatePlayer(player2Ref.current);
                updateBall();
                checkCollisions();
            } else if(gameState === 'goal') {
                if (!goalMessageTimer.current) {
                    goalMessageTimer.current = setTimeout(() => {
                        const p1Score = player1Ref.current.score;
                        const p2Score = player2Ref.current.score;
                        if(p1Score >= WINNING_SCORE) {
                            setWinner("Player 1");
                            setGameState('over');
                        } else if (p2Score >= WINNING_SCORE) {
                            setWinner("Player 2");
                            setGameState('over');
                        } else {
                            resetPositions();
                            setGameState('playing');
                        }
                        goalMessageTimer.current = undefined;
                    }, 2000);
                }
            }
            draw();
            gameLoopId.current = requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
            if(goalMessageTimer.current) clearTimeout(goalMessageTimer.current);
        };
    }, [gameState, winner, handleKeyDown, handleKeyUp, resetPositions, startGame]);

    return <canvas ref={canvasRef} className="touch-none w-full h-full" />;
};

export default SoccerScramble;

    