// ===========================
// Configuration Constants
// ===========================
const CONFIG = {
    GRID_SIZE: 20,
    MIN_SPEED: 50,
    POINTS_PER_FOOD: 10,
    INITIAL_SNAKE_LENGTH: 3,
    MIN_SWIPE_DISTANCE: 30,

    // Difficulty settings
    DIFFICULTY: {
        EASY: {
            name: 'Easy',
            foodTimeout: 7000,      // 7 seconds in ms
            initialSpeed: 200,
            speedIncrement: 3
        },
        MEDIUM: {
            name: 'Medium',
            foodTimeout: 5000,      // 5 seconds in ms
            initialSpeed: 150,
            speedIncrement: 5
        },
        HARD: {
            name: 'Hard',
            foodTimeout: 3000,      // 3 seconds in ms
            initialSpeed: 100,
            speedIncrement: 8
        }
    }
};

// ===========================
// Game State
// ===========================
const gameState = {
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    score: 0,
    isPlaying: false,
    gameLoopId: null,
    speed: 150,
    shouldGrow: false,
    difficulty: null,           // Selected difficulty object
    difficultyKey: null,        // Difficulty key (EASY, MEDIUM, HARD)
    foodTimerId: null,          // Timer ID for food relocation
    gameStartTime: null,        // Timestamp when game started
    leaderboard: {
        scores: [],
        loading: false,
        error: null,
        playerRank: null
    }
};

// ===========================
// Canvas and DOM Elements
// ===========================
let canvas, ctx, cellSize;
let scoreElement, overlayElement, overlayTitleElement, overlayMessageElement, finalScoreElement, startButton;

// ===========================
// Snake Module
// ===========================
const Snake = {
    initialize() {
        // Start snake in center, moving right
        const centerX = Math.floor(CONFIG.GRID_SIZE / 2);
        const centerY = Math.floor(CONFIG.GRID_SIZE / 2);

        gameState.snake = [];
        for (let i = 0; i < CONFIG.INITIAL_SNAKE_LENGTH; i++) {
            gameState.snake.push({
                x: centerX - i,
                y: centerY
            });
        }

        gameState.direction = { x: 1, y: 0 };
        gameState.nextDirection = { x: 1, y: 0 };
        gameState.shouldGrow = false;
    },

    move() {
        // Update direction from buffered input
        gameState.direction = { ...gameState.nextDirection };

        // Calculate new head position
        const head = gameState.snake[0];
        const newHead = {
            x: head.x + gameState.direction.x,
            y: head.y + gameState.direction.y
        };

        // Add new head
        gameState.snake.unshift(newHead);

        // Remove tail (unless growing)
        if (!gameState.shouldGrow) {
            gameState.snake.pop();
        } else {
            gameState.shouldGrow = false;
        }
    },

    grow() {
        gameState.shouldGrow = true;
    },

    checkSelfCollision() {
        const head = gameState.snake[0];

        // Check if head collides with body (skip head itself)
        for (let i = 1; i < gameState.snake.length; i++) {
            if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
                return true;
            }
        }
        return false;
    },

    checkWallCollision() {
        const head = gameState.snake[0];
        return head.x < 0 || head.x >= CONFIG.GRID_SIZE ||
               head.y < 0 || head.y >= CONFIG.GRID_SIZE;
    }
};

// ===========================
// Food Module
// ===========================
const Food = {
    generate() {
        let newFood;
        let isOnSnake;

        do {
            isOnSnake = false;
            newFood = {
                x: Math.floor(Math.random() * CONFIG.GRID_SIZE),
                y: Math.floor(Math.random() * CONFIG.GRID_SIZE)
            };

            // Check if food spawned on snake
            for (let segment of gameState.snake) {
                if (segment.x === newFood.x && segment.y === newFood.y) {
                    isOnSnake = true;
                    break;
                }
            }
        } while (isOnSnake);

        gameState.food = newFood;

        // Start food timer
        this.startTimer();
    },

    startTimer() {
        // Clear existing timer if any
        this.clearTimer();

        // Only start timer if game is playing and difficulty is set
        if (gameState.isPlaying && gameState.difficulty) {
            gameState.foodTimerId = setTimeout(() => {
                this.relocate();
            }, gameState.difficulty.foodTimeout);
        }
    },

    clearTimer() {
        if (gameState.foodTimerId) {
            clearTimeout(gameState.foodTimerId);
            gameState.foodTimerId = null;
        }
    },

    relocate() {
        // Generate new food position
        this.generate();
    },

    checkCollision() {
        const head = gameState.snake[0];
        return head.x === gameState.food.x && head.y === gameState.food.y;
    },

    regenerate() {
        // Called when snake eats food
        this.clearTimer();  // Stop current timer
        this.generate();    // Generate new food (which starts new timer)
    }
};

// ===========================
// Input Module
// ===========================
const Input = {
    touchStartX: 0,
    touchStartY: 0,

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Prevent default for arrow keys and space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            // Start game with space
            if (e.key === ' ' && !gameState.isPlaying) {
                // If difficulty already selected (game over screen), start directly
                // Otherwise, user needs to select difficulty first
                if (gameState.difficulty) {
                    Game.start();
                }
                return;
            }

            // Map keys to directions
            const keyMap = {
                'ArrowUp': { x: 0, y: -1 },
                'ArrowDown': { x: 0, y: 1 },
                'ArrowLeft': { x: -1, y: 0 },
                'ArrowRight': { x: 1, y: 0 },
                'w': { x: 0, y: -1 },
                'W': { x: 0, y: -1 },
                's': { x: 0, y: 1 },
                'S': { x: 0, y: 1 },
                'a': { x: -1, y: 0 },
                'A': { x: -1, y: 0 },
                'd': { x: 1, y: 0 },
                'D': { x: 1, y: 0 }
            };

            const newDirection = keyMap[e.key];
            if (newDirection && gameState.isPlaying) {
                this.setDirection(newDirection);
            }
        });
    },

    setupTouch() {
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;

            // Tap to start if not playing
            if (!gameState.isPlaying) {
                Game.start();
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();

            if (!gameState.isPlaying) return;

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;

            // Calculate distance
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance < CONFIG.MIN_SWIPE_DISTANCE) return;

            // Determine direction based on angle
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0) {
                    this.setDirection({ x: 1, y: 0 });
                } else {
                    this.setDirection({ x: -1, y: 0 });
                }
            } else {
                // Vertical swipe
                if (deltaY > 0) {
                    this.setDirection({ x: 0, y: 1 });
                } else {
                    this.setDirection({ x: 0, y: -1 });
                }
            }
        }, { passive: false });

        // Overlay tap to start
        overlayElement.addEventListener('click', (e) => {
            if (!gameState.isPlaying && e.target === startButton) {
                Game.start();
            }
        });
    },

    setDirection(newDirection) {
        // Prevent 180° turns (opposite direction)
        const isOpposite = (newDirection.x === -gameState.direction.x && newDirection.x !== 0) ||
                          (newDirection.y === -gameState.direction.y && newDirection.y !== 0);

        if (!isOpposite) {
            gameState.nextDirection = newDirection;
        }
    }
};

// ===========================
// Render Module
// ===========================
const Render = {
    clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    drawSnake() {
        gameState.snake.forEach((segment, index) => {
            // Draw snake segments with rounded corners
            const x = segment.x * cellSize;
            const y = segment.y * cellSize;
            const radius = 4;

            ctx.fillStyle = index === 0 ? '#00ff41' : '#00cc34';
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, radius);
            ctx.fill();
        });
    },

    drawFood() {
        const x = gameState.food.x * cellSize + cellSize / 2;
        const y = gameState.food.y * cellSize + cellSize / 2;
        const radius = cellSize / 2 - 2;

        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
};

// ===========================
// UI Module
// ===========================
const UI = {
    updateScore() {
        scoreElement.textContent = gameState.score;
    },

    showOverlay(isGameOver = false) {
        const difficultyContainer = document.getElementById('difficultyButtons');

        if (isGameOver) {
            overlayTitleElement.textContent = 'Game Over!';
            overlayMessageElement.textContent = 'Press SPACE or TAP to restart';
            finalScoreElement.textContent = `Final Score: ${gameState.score}`;
            finalScoreElement.classList.remove('hidden');

            // Hide difficulty selection on game over
            difficultyContainer.classList.add('hidden');

            // Show start button
            startButton.classList.remove('hidden');
            startButton.textContent = 'Play Again';
        } else {
            overlayTitleElement.textContent = 'Snake Game';
            overlayMessageElement.textContent = 'Choose your difficulty';
            finalScoreElement.classList.add('hidden');

            // Show difficulty selection on initial screen
            difficultyContainer.classList.remove('hidden');

            // Hide start button until difficulty selected
            startButton.classList.add('hidden');
            startButton.textContent = 'Start Game';

            // Clear selected difficulty highlight
            document.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
        }

        overlayElement.classList.remove('hidden');
    },

    hideOverlay() {
        overlayElement.classList.add('hidden');
    },

    showLeaderboard(scores, playerRank, error) {
        const section = document.getElementById('leaderboardSection');
        const loading = document.getElementById('leaderboardLoading');
        const errorEl = document.getElementById('leaderboardError');
        const list = document.getElementById('leaderboardList');

        section.classList.remove('hidden');
        loading.classList.add('hidden');

        if (error) {
            errorEl.textContent = error;
            errorEl.classList.remove('hidden');
            list.classList.add('hidden');
            return;
        }

        errorEl.classList.add('hidden');
        list.classList.remove('hidden');
        list.innerHTML = '';

        if (scores.length === 0) {
            list.innerHTML = '<li class="leaderboard-empty">No scores yet. Be the first!</li>';
            return;
        }

        scores.forEach((entry, index) => {
            const li = document.createElement('li');
            li.className = 'leaderboard-entry';
            if (playerRank && index + 1 === playerRank) {
                li.classList.add('player-score');
            }

            li.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="score">${entry.score}</span>
                <span class="difficulty-badge">${entry.difficulty}</span>
            `;
            list.appendChild(li);
        });
    },

    showLeaderboardLoading() {
        const section = document.getElementById('leaderboardSection');
        const loading = document.getElementById('leaderboardLoading');
        const errorEl = document.getElementById('leaderboardError');
        const list = document.getElementById('leaderboardList');

        section.classList.remove('hidden');
        loading.classList.remove('hidden');
        errorEl.classList.add('hidden');
        list.classList.add('hidden');
    },

    hideLeaderboard() {
        const section = document.getElementById('leaderboardSection');
        section.classList.add('hidden');
    }
};

// ===========================
// Leaderboard Module
// ===========================
const Leaderboard = {
    baseUrl: '/.netlify/functions',

    async submitScore(score, difficulty, snakeLength, gameTime) {
        try {
            const response = await fetch(`${this.baseUrl}/submit-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score,
                    timestamp: Date.now(),
                    gameData: {
                        difficulty,
                        snakeLength,
                        gameTime
                    }
                })
            });

            const data = await response.json();
            return {
                success: data.success,
                rank: data.rank,
                error: data.error
            };
        } catch (error) {
            console.error('Failed to submit score:', error);
            return { success: false, error: 'Network error' };
        }
    },

    async fetchLeaderboard() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.baseUrl}/get-leaderboard`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await response.json();
            return {
                success: data.success,
                scores: data.scores || [],
                error: data.error
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, scores: [], error: 'Request timed out' };
            }
            console.error('Failed to fetch leaderboard:', error);
            return { success: false, scores: [], error: 'Unable to connect' };
        }
    }
};

// ===========================
// Game Module (Main Controller)
// ===========================
const Game = {
    init() {
        // Get DOM elements
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        scoreElement = document.getElementById('score');
        overlayElement = document.getElementById('gameOverlay');
        overlayTitleElement = document.getElementById('overlayTitle');
        overlayMessageElement = document.getElementById('overlayMessage');
        finalScoreElement = document.getElementById('finalScore');
        startButton = document.getElementById('startButton');

        // Get difficulty button elements
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');

        // Setup difficulty selection handlers
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                this.selectDifficulty(difficulty);

                // Update UI
                difficultyButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                // Show start button, update message
                startButton.classList.remove('hidden');
                overlayMessageElement.textContent = `Difficulty: ${CONFIG.DIFFICULTY[difficulty].name}`;
            });
        });

        // Setup canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Setup input handlers
        Input.setupKeyboard();
        Input.setupTouch();

        // Show initial overlay
        UI.showOverlay(false);
    },

    selectDifficulty(difficultyLevel) {
        gameState.difficulty = CONFIG.DIFFICULTY[difficultyLevel];
        gameState.difficultyKey = difficultyLevel;
    },

    resizeCanvas() {
        const container = canvas.parentElement;
        const maxSize = Math.min(container.clientWidth * 0.9, 600);

        canvas.width = maxSize;
        canvas.height = maxSize;

        cellSize = canvas.width / CONFIG.GRID_SIZE;

        // Redraw if game is not playing
        if (!gameState.isPlaying && gameState.snake.length > 0) {
            Render.clearCanvas();
            Render.drawSnake();
            Render.drawFood();
        }
    },

    start() {
        // Require difficulty selection
        if (!gameState.difficulty) {
            return;
        }

        // Reset game state
        this.reset();

        // Initialize game objects
        Snake.initialize();
        Food.generate();  // This now starts the food timer

        // Record game start time
        gameState.gameStartTime = Date.now();

        // Update UI
        UI.updateScore();
        UI.hideOverlay();
        UI.hideLeaderboard();

        // Start game loop with difficulty-based speed
        gameState.speed = gameState.difficulty.initialSpeed;
        gameState.isPlaying = true;
        this.loop();
    },

    reset() {
        // Clear any existing timers
        if (gameState.gameLoopId) {
            clearTimeout(gameState.gameLoopId);
        }
        Food.clearTimer();  // Clear food timer

        // Reset state
        gameState.score = 0;
        gameState.isPlaying = false;
        gameState.shouldGrow = false;
        // Note: Keep difficulty setting between games
    },

    loop() {
        if (!gameState.isPlaying) return;

        // Move snake
        Snake.move();

        // Check collisions
        if (Snake.checkWallCollision() || Snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }

        // Check food collision
        if (Food.checkCollision()) {
            Snake.grow();
            gameState.score += CONFIG.POINTS_PER_FOOD;
            UI.updateScore();
            Food.regenerate();  // This clears old timer and starts new one

            // Increase speed using difficulty-based increment
            gameState.speed = Math.max(
                CONFIG.MIN_SPEED,
                gameState.speed - gameState.difficulty.speedIncrement
            );
        }

        // Render
        Render.clearCanvas();
        Render.drawSnake();
        Render.drawFood();

        // Schedule next frame
        gameState.gameLoopId = setTimeout(() => this.loop(), gameState.speed);
    },

    async gameOver() {
        gameState.isPlaying = false;

        // Clear timers
        if (gameState.gameLoopId) {
            clearTimeout(gameState.gameLoopId);
        }
        Food.clearTimer();  // Stop food timer

        // Calculate game time
        const gameTime = Date.now() - gameState.gameStartTime;

        UI.showOverlay(true);
        UI.showLeaderboardLoading();

        // Submit score and fetch leaderboard (non-blocking)
        try {
            // Submit score first
            const submitResult = await Leaderboard.submitScore(
                gameState.score,
                gameState.difficultyKey,
                gameState.snake.length,
                gameTime
            );

            gameState.leaderboard.playerRank = submitResult.rank;

            // Then fetch updated leaderboard
            const leaderboardResult = await Leaderboard.fetchLeaderboard();

            if (leaderboardResult.success) {
                gameState.leaderboard.scores = leaderboardResult.scores;
                gameState.leaderboard.error = null;
                UI.showLeaderboard(
                    leaderboardResult.scores,
                    submitResult.rank,
                    null
                );
            } else {
                gameState.leaderboard.error = leaderboardResult.error;
                UI.showLeaderboard([], null, leaderboardResult.error);
            }
        } catch (error) {
            console.error('Leaderboard error:', error);
            UI.showLeaderboard([], null, 'Unable to load leaderboard');
        }
    }
};

// ===========================
// Initialize Game
// ===========================
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
