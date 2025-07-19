try {
  const player = document.getElementById('player');
  const game = document.getElementById('game');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const scoreText = document.getElementById('score');
  const controls = document.querySelectorAll('.ctrl');
  const joystickArea = document.getElementById('joystickArea');
  const joystickKnob = document.getElementById('joystickKnob');

  // Kiểm tra sự tồn tại của các phần tử DOM
  if (!player || !game || !startBtn || !restartBtn || !scoreText || !joystickArea || !joystickKnob) {
    console.error('Một hoặc nhiều phần tử DOM không được tìm thấy.');
    alert('Lỗi: Không thể tải trò chơi do thiếu phần tử giao diện.');
    throw new Error('Thiếu phần tử DOM');
  }

  let dirs = { x: 0, y: 0 };
  let speed = 2;
  let spawnInterval = 2000;
  let maxObstacles = 1;
  let survivalTime = 0;
  let highTime = parseFloat(localStorage.getItem('highTime')) || 0;
  let gameInterval, obsInterval, timerInterval, difficultyInterval;
  let gameRunning = false;
  let keyState = {};
  let startTime;
  let diagonalEnabled = false;
  let reverseEnabled = false;
  let touchStart = null;
  const joystickRadius = 50;

  scoreText.innerText = `Thời gian: 0s | Cao nhất: ${highTime.toFixed(1)}s`;

  function resetPlayer() {
    try {
      dirs = { x: 0, y: 0 };
      keyState = {};
      touchStart = null;
      joystickKnob.style.left = '35px';
      joystickKnob.style.top = '35px';
      joystickArea.classList.remove('active');
      player.style.left = '50%';
      player.style.bottom = '50%';
    } catch (error) {
      console.error('Lỗi trong resetPlayer:', error);
    }
  }

  controls.forEach(c => {
    c.addEventListener('click', () => setDir(c.dataset.dir));
  });

  joystickArea.addEventListener('touchstart', e => {
    if (!gameRunning) return;
    e.preventDefault();
    touchStart = e.touches[0];
    joystickArea.classList.add('active');
  });

  joystickArea.addEventListener('touchmove', e => {
    if (!gameRunning || !touchStart) return;
    e.preventDefault();
    try {
      const touch = e.touches[0];
      let dx = touch.clientX - touchStart.clientX;
      let dy = touch.clientY - touchStart.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > joystickRadius) {
        const scale = joystickRadius / distance;
        dx *= scale;
        dy *= scale;
      }
      joystickKnob.style.left = `${50 - 15 + dx}px`;
      joystickKnob.style.top = `${50 - 15 + dy}px`;
      dirs = { x: dx / joystickRadius, y: -dy / joystickRadius };
    } catch (error) {
      console.error('Lỗi trong touchmove:', error);
    }
  });

  joystickArea.addEventListener('touchend', e => {
    if (!gameRunning) return;
    touchStart = null;
    dirs = { x: 0, y: 0 };
    joystickKnob.style.left = '35px';
    joystickKnob.style.top = '35px';
    joystickArea.classList.remove('active');
  });

  function setDir(d) {
    if (!gameRunning) return;
    try {
      if (d == 'up') keyState['ArrowUp'] = true;
      if (d == 'down') keyState['ArrowDown'] = true;
      if (d == 'left') keyState['ArrowLeft'] = true;
      if (d == 'right') keyState['ArrowRight'] = true;
      updateDirs();
    } catch (error) {
      console.error('Lỗi trong setDir:', error);
    }
  }

  function updateDirs() {
    if (touchStart) return;
    try {
      dirs = { x: 0, y: 0 };
      if (keyState['ArrowUp']) dirs.y = 1;
      if (keyState['ArrowDown']) dirs.y = -1;
      if (keyState['ArrowLeft']) dirs.x = -1;
      if (keyState['ArrowRight']) dirs.x = 1;
    } catch (error) {
      console.error('Lỗi trong updateDirs:', error);
    }
  }

  document.addEventListener('keyup', (e) => {
    try {
      if (e.key === 'ArrowUp') keyState['ArrowUp'] = false;
      if (e.key === 'ArrowDown') keyState['ArrowDown'] = false;
      if (e.key === 'ArrowLeft') keyState['ArrowLeft'] = false;
      if (e.key === 'ArrowRight') keyState['ArrowRight'] = false;
      updateDirs();
    } catch (error) {
      console.error('Lỗi trong keyup:', error);
    }
  });

  function spawnObstacle() {
    try {
      const currentObstacles = document.querySelectorAll('.obstacle').length;
      if (currentObstacles >= maxObstacles) return;

      const obstacle = document.createElement('div');
      obstacle.classList.add('obstacle');
      const directions = diagonalEnabled
        ? ['up', 'down', 'left', 'right', 'down-right', 'down-left', 'up-right', 'up-left']
        : ['up', 'down', 'left', 'right'];
      let dir = directions[Math.floor(Math.random() * directions.length)];
      obstacle.dataset.dir = dir;
      let x, y;
      if (dir == 'left') {
        x = game.offsetWidth;
        y = Math.random() * (game.offsetHeight - 30);
      } else if (dir == 'right') {
        x = -30;
        y = Math.random() * (game.offsetHeight - 30);
      } else if (dir == 'up') {
        y = game.offsetHeight;
        x = Math.random() * (game.offsetWidth - 30);
      } else if (dir == 'down') {
        y = -30;
        x = Math.random() * (game.offsetWidth - 30);
      } else if (dir == 'down-right') {
        x = -30;
        y = -30;
      } else if (dir == 'down-left') {
        x = game.offsetWidth;
        y = -30;
      } else if (dir == 'up-right') {
        x = -30;
        y = game.offsetHeight;
      } else if (dir == 'up-left') {
        x = game.offsetWidth;
        y = game.offsetHeight;
      }

      obstacle.style.left = x + 'px';
      obstacle.style.top = y + 'px';
      game.appendChild(obstacle);

      let isReversed = false;

      const mv = setInterval(() => {
        if (!gameRunning) {
          clearInterval(mv);
          return;
        }
        try {
          let px = player.offsetLeft, py = player.offsetTop;
          let ox = obstacle.offsetLeft, oy = obstacle.offsetTop;
          let dx = 0, dy = 0;

          if (reverseEnabled && !isReversed && Math.random() < 0.01) {
            isReversed = true;
            if (dir == 'left') dir = 'right';
            else if (dir == 'right') dir = 'left';
            else if (dir == 'up') dir = 'down';
            else if (dir == 'down') dir = 'up';
            else if (dir == 'down-right') dir = 'up-left';
            else if (dir == 'down-left') dir = 'up-right';
            else if (dir == 'up-right') dir = 'down-left';
            else if (dir == 'up-left') dir = 'down-right';
            obstacle.dataset.dir = dir;
          }

          if (dir == 'left') dx = -speed;
          else if (dir == 'right') dx = speed;
          else if (dir == 'up') dy = -speed;
          else if (dir == 'down') dy = speed;
          else if (dir == 'down-right') { dx = speed; dy = speed; }
          else if (dir == 'down-left') { dx = -speed; dy = speed; }
          else if (dir == 'up-right') { dx = speed; dy = -speed; }
          else if (dir == 'up-left') { dx = -speed; dy = -speed; }

          if (dx !== 0 || dy !== 0) {
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            dx = (dx / magnitude) * speed;
            dy = (dy / magnitude) * speed;
          }

          ox += dx;
          oy += dy;
          obstacle.style.left = ox + 'px';
          obstacle.style.top = oy + 'px';

          if (ox < px + 30 && ox + 30 > px && oy < py + 30 && oy + 30 > py) {
            clearInterval(mv);
            obstacle.remove();
            endGame();
          }

          if (
            (ox + 30 < 0) ||
            (ox > game.offsetWidth) ||
            (oy + 30 < 0) ||
            (oy > game.offsetHeight)
          ) {
            clearInterval(mv);
            obstacle.remove();
          }
        } catch (error) {
          console.error('Lỗi trong spawnObstacle interval:', error);
          clearInterval(mv);
        }
      }, 20);
    } catch (error) {
      console.error('Lỗi trong spawnObstacle:', error);
    }
  }

  function startGame() {
    try {
      gameRunning = true;
      speed = 2;
      spawnInterval = 2000;
      maxObstacles = 1;
      diagonalEnabled = false;
      reverseEnabled = false;
      survivalTime = 0;
      resetPlayer();
      scoreText.innerText = `Thời gian: 0s | Cao nhất: ${highTime.toFixed(1)}s`;
      startBtn.style.display = 'none';
      restartBtn.style.display = 'none';

      const obstacles = document.querySelectorAll('.obstacle');
      obstacles.forEach(obstacle => obstacle.remove());

      spawnObstacle();
      startTime = Date.now();
      timerInterval = setInterval(() => {
        if (gameRunning) {
          survivalTime = (Date.now() - startTime) / 1000;
          scoreText.innerText = `Thời gian: ${survivalTime.toFixed(1)}s | Cao nhất: ${highTime.toFixed(1)}s`;
          if (survivalTime >= 50 && !diagonalEnabled) {
            diagonalEnabled = true;
          }
          if (survivalTime >= 70 && !reverseEnabled) {
            reverseEnabled = true;
          }
        }
      }, 100);

      difficultyInterval = setInterval(() => {
        if (gameRunning) {
          speed += 1;
          spawnInterval = Math.max(500, spawnInterval - 200);
          maxObstacles += 1;
          clearInterval(obsInterval);
          obsInterval = setInterval(spawnObstacle, spawnInterval);
        }
      }, 10000);

      obsInterval = setInterval(spawnObstacle, spawnInterval);
    } catch (error) {
      console.error('Lỗi trong startGame:', error);
      gameRunning = false;
    }
  }

  function endGame() {
    try {
      gameRunning = false;
      clearInterval(obsInterval);
      clearInterval(timerInterval);
      clearInterval(difficultyInterval);
      if (survivalTime > highTime) {
        highTime = survivalTime;
        localStorage.setItem('highTime', highTime);
      }
      scoreText.innerText = `Thời gian: ${survivalTime.toFixed(1)}s | Cao nhất: ${highTime.toFixed(1)}s`;
      restartBtn.style.display = 'block';
    } catch (error) {
      console.error('Lỗi trong endGame:', error);
    }
  }

  function loop() {
    if (gameRunning) {
      try {
        let moveSpeed = 3;
        let dx = dirs.x * moveSpeed;
        let dy = dirs.y * moveSpeed;
        if (dx !== 0 || dy !== 0) {
          const magnitude = Math.sqrt(dx * dx + dy * dy);
          if (magnitude > 0) {
            dx = (dx / magnitude) * moveSpeed;
            dy = (dy / magnitude) * moveSpeed;
          }
        }
        let l = player.offsetLeft + dx;
        let t = player.offsetTop - dy;
        l = Math.max(0, Math.min(game.offsetWidth - 30, l));
        t = Math.max(0, Math.min(game.offsetHeight - 30, t));
        player.style.left = l + 'px';
        player.style.top = t + 'px';
      } catch (error) {
        console.error('Lỗi trong loop:', error);
      }
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;
    try {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keyState[e.key] = true;
        updateDirs();
      }
    } catch (error) {
      console.error('Lỗi trong keydown:', error);
    }
  });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  loop();

} catch (error) {
  console.error('Lỗi khởi tạo trò chơi:', error);
  alert('Lỗi: Không thể khởi động trò chơi. Vui lòng kiểm tra console để biết chi tiết.');
}