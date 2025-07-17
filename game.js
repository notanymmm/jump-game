const player = document.getElementById('player');
const game = document.getElementById('game');
const startBtn = document.getElementById('startBtn');
const scoreText = document.getElementById('score');

let isJumping = false;
let gameInterval;
let obstacleInterval;
let score = 0;
let gameRunning = false;

// Nhảy
function jump() {
  if (isJumping || !gameRunning) return;
  isJumping = true;
  let jumpHeight = 0;
  let upInterval = setInterval(() => {
    if (jumpHeight >= 100) {
      clearInterval(upInterval);
      let downInterval = setInterval(() => {
        if (jumpHeight <= 0) {
          clearInterval(downInterval);
          isJumping = false;
        } else {
          jumpHeight -= 5;
          player.style.bottom = jumpHeight + 'px';
        }
      }, 20);
    } else {
      jumpHeight += 5;
      player.style.bottom = jumpHeight + 'px';
    }
  }, 20);
}

// Tạo obstacle ngẫu nhiên
function spawnObstacle() {
  const obstacle = document.createElement('div');
  obstacle.classList.add('obstacle');
  obstacle.style.right = '0px';
  game.appendChild(obstacle);

  let obstacleLeft = game.offsetWidth;
  const moveInterval = setInterval(() => {
    if (!gameRunning) return;
    obstacleLeft -= 5;
    obstacle.style.left = obstacleLeft + 'px';

    const playerRect = player.getBoundingClientRect();
    const obsRect = obstacle.getBoundingClientRect();

    if (
      obsRect.left < playerRect.right &&
      obsRect.right > playerRect.left &&
      obsRect.top < playerRect.bottom &&
      obsRect.bottom > playerRect.top
    ) {
      gameOver();
      clearInterval(moveInterval);
      return;
    }

    if (obstacleLeft + 30 < 50 && !obstacle.passed) {
      score++;
      scoreText.innerText = `Score: ${score}`;
      obstacle.passed = true;
    }

    if (obstacleLeft < -30) {
      clearInterval(moveInterval);
      obstacle.remove();
    }
  }, 20);
}

// Start game
function startGame() {
  gameRunning = true;
  score = 0;
  scoreText.innerText = "Score: 0";
  startBtn.style.display = "none";

  gameInterval = setInterval(() => {
    // random thời gian 1 - 4.5s
    spawnObstacle();
  }, Math.random() * 3000 + 1000);
}

// Game over
function gameOver() {
  gameRunning = false;
  clearInterval(gameInterval);
  alert("Game Over! Score: " + score);
  location.reload();
}

// SPACE cho PC
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') jump();
});

// Vuốt lên cho điện thoại
let touchStartY = 0;
document.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
});
document.addEventListener('touchend', e => {
  const touchEndY = e.changedTouches[0].clientY;
  if (touchStartY - touchEndY > 50) {
    jump();
  }
});

startBtn.addEventListener('click', startGame);
