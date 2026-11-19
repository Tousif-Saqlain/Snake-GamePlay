// DOM Elements
const board = document.getElementById('board');
const scoreBox = document.getElementById('scoreBox');
const hiscoreBox = document.getElementById('hiscoreBox');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const finalScoreWrap = document.getElementById('finalScoreWrap');
const finalScoreValue = document.getElementById('finalScoreValue');
const difficultyGroup = document.getElementById('difficultyGroup');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const soundBtn = document.getElementById('soundBtn');
const diffButtons = document.querySelectorAll('.diff-btn');
const controlButtons = document.querySelectorAll('.ctrl-btn');

// Audio Setup (fails gracefully if files are missing or blocked)
const foodSound = new Audio('music/food.mp3');
const gameOverSound = new Audio('music/gameover.mp3');
const moveSound = new Audio('music/move.mp3');
const musicSound = new Audio('music/music.mp3');
musicSound.loop = true;

let soundEnabled = true;

function playAudio(audioObj) {
    if (!soundEnabled) return;
    audioObj.currentTime = 0;
    audioObj.play().catch(() => {});
}

// Game Constants & State
const GRID_SIZE = 18;
let baseSpeed = 10;
let speed = baseSpeed;
let score = 0;
let lastPaintTime = 0;
let isRunning = false;
let isPaused = false;

let inputDir = { x: 0, y: 0 };
let nextDir = { x: 0, y: 0 };
let snakeArr = [{ x: 9, y: 9 }];
let food = { x: 5, y: 5 };

// Load High Score
let hiscoreval = Number(localStorage.getItem('hiscore')) || 0;
hiscoreBox.textContent = hiscoreval;

// Generate food on a free cell
function spawnFood() {
    let newFood;
    let onSnake = true;
    while (onSnake) {
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE) + 1,
            y: Math.floor(Math.random() * GRID_SIZE) + 1
        };
        onSnake = snakeArr.some(seg => seg.x === newFood.x && seg.y === newFood.y);
    }
    return newFood;
}

// Collision Check (1 to 18 inclusive)
function isCollide(snake) {
    const head = snake[0];
    if (head.x < 1 || head.x > GRID_SIZE || head.y < 1 || head.y > GRID_SIZE) {
        return true;
    }
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            return true;
        }
    }
    return false;
}

// Start or Restart Game
function startGame() {
    snakeArr = [
        { x: 9, y: 9 },
        { x: 8, y: 9 },
        { x: 7, y: 9 }
    ];
    inputDir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    speed = baseSpeed;
    scoreBox.textContent = score;
    food = spawnFood();
    isRunning = true;
    isPaused = false;
    pauseBtn.textContent = '⏸';
    overlay.classList.add('hidden');

    if (soundEnabled) {
        musicSound.play().catch(() => {});
    }
    render();
}

function handleGameOver() {
    isRunning = false;
    musicSound.pause();
    playAudio(gameOverSound);

    overlayTitle.textContent = 'Game Over';
    overlaySubtitle.textContent = 'Ready for another run?';
    finalScoreValue.textContent = score;
    finalScoreWrap.classList.remove('hidden');
    difficultyGroup.classList.remove('hidden');
    startBtn.textContent = 'Play Again';
    overlay.classList.remove('hidden');
}

function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    if (isPaused) {
        musicSound.pause();
        pauseBtn.textContent = '▶';
        overlayTitle.textContent = 'Paused';
        overlaySubtitle.textContent = 'Take a breather.';
        finalScoreWrap.classList.add('hidden');
        difficultyGroup.classList.add('hidden');
        startBtn.textContent = 'Resume';
        overlay.classList.remove('hidden');
    } else {
        if (soundEnabled) musicSound.play().catch(() => {});
        pauseBtn.textContent = '⏸';
        overlay.classList.add('hidden');
    }
}

// Core Game Loop
function main(ctime) {
    window.requestAnimationFrame(main);
    if (!isRunning || isPaused) return;

    if ((ctime - lastPaintTime) / 1000 < 1 / speed) {
        return;
    }
    lastPaintTime = ctime;
    gameEngine();
}

function gameEngine() {
    // Apply buffered direction
    inputDir = { ...nextDir };

    // Calculate new head position
    const newHead = {
        x: snakeArr[0].x + inputDir.x,
        y: snakeArr[0].y + inputDir.y
    };

    const nextSnake = [newHead, ...snakeArr.slice(0, -1)];

    // Check collision
    if (isCollide(nextSnake)) {
        handleGameOver();
        return;
    }

    // Check food eaten
    if (newHead.x === food.x && newHead.y === food.y) {
        playAudio(foodSound);
        score += 1;
        scoreBox.textContent = score;

        // Slight progressive speed boost
        speed = Math.min(baseSpeed + Math.floor(score / 5) * 0.6, 20);

        if (score > hiscoreval) {
            hiscoreval = score;
            localStorage.setItem('hiscore', hiscoreval);
            hiscoreBox.textContent = hiscoreval;
        }

        // Grow snake
        snakeArr.unshift(newHead);
        food = spawnFood();
    } else {
        snakeArr = nextSnake;
    }

    render();
}

function render() {
    board.innerHTML = '';

    snakeArr.forEach((segment, index) => {
        const el = document.createElement('div');
        el.style.gridRowStart = segment.y;
        el.style.gridColumnStart = segment.x;
        el.classList.add(index === 0 ? 'head' : 'snake');
        board.appendChild(el);
    });

    const foodEl = document.createElement('div');
    foodEl.style.gridRowStart = food.y;
    foodEl.style.gridColumnStart = food.x;
    foodEl.classList.add('food');
    board.appendChild(foodEl);
}

// Direction Handler (prevents 180-degree reversal)
function setDirection(dir) {
    if (!isRunning || isPaused) return;

    const dirMap = {
        UP:    { x: 0, y: -1 },
        DOWN:  { x: 0, y: 1 },
        LEFT:  { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 }
    };

    const desired = dirMap[dir];
    if (!desired) return;

    // Ignore reversing directly into yourself
    if (desired.x + inputDir.x === 0 && desired.y + inputDir.y === 0) return;

    if (desired.x !== nextDir.x || desired.y !== nextDir.y) {
        nextDir = desired;
        playAudio(moveSound);
    }
}

// Keyboard Controls (Arrow Keys + WASD + Space)
window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === ' ') {
        if (!isRunning) {
            startGame();
        } else {
            togglePause();
        }
        return;
    }

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            setDirection('UP');
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            setDirection('DOWN');
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            setDirection('LEFT');
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            setDirection('RIGHT');
            break;
    }
});

// On-Screen D-Pad Controls
controlButtons.forEach(btn => {
    const trigger = e => {
        e.preventDefault();
        setDirection(btn.dataset.dir);
    };
    btn.addEventListener('touchstart', trigger, { passive: false });
    btn.addEventListener('mousedown', trigger);
});

// Swipe Gesture Controls on the Board
let touchStartX = 0;
let touchStartY = 0;

board.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

board.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const minSwipe = 24;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
        setDirection(dy > 0 ? 'DOWN' : 'UP');
    }
}, { passive: true });

// UI Button Events
startBtn.addEventListener('click', () => {
    if (isPaused) {
        togglePause();
    } else {
        startGame();
    }
});

pauseBtn.addEventListener('click', togglePause);

soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    if (!soundEnabled) {
        musicSound.pause();
    } else if (isRunning && !isPaused) {
        musicSound.play().catch(() => {});
    }
});

diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        baseSpeed = Number(btn.dataset.speed);
    });
});

// Initial render & loop start
render();
window.requestAnimationFrame(main);