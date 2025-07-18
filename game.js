const player = document.getElementById('player');
const game = document.getElementById('game');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreText = document.getElementById('score');
const controls = document.querySelectorAll('.ctrl');

let dirs = { x:0, y:0 };
let speed = 2; // Tốc độ ban đầu của chướng ngại vật
let spawnInterval = 2000; // Khoảng thời gian xuất hiện chướng ngại vật ban đầu (ms)
let maxObstacles = 1; // Số lượng chướng ngại vật tối đa
let survivalTime = 0; // Thời gian sống sót (giây)
let highTime = parseFloat(localStorage.getItem('highTime')) || 0; // Thời gian sống lâu nhất
let gameInterval, obsInterval, timerInterval, difficultyInterval;
let gameRunning = false;
let keyState = {}; // Lưu trạng thái phím
let startTime; // Thời gian bắt đầu trò chơi
let diagonalEnabled = false; // Cờ để bật hướng xéo sau 50s
let touchStart = null; // Lưu điểm chạm ban đầu
const joystickRadius = 50; // Bán kính khu vực joystick
let joystickArea = null; // Phần tử khu vực joystick
let joystickKnob = null; // Phần tử nút điều khiển

// Khởi hiển thị thời gian
scoreText.innerText = `Time: 0s | High: ${highTime.toFixed(1)}s`;

// Reset vị trí
function resetPlayer() {
  dirs = { x:0, y:0 };
  keyState = {}; // Đặt lại trạng thái phím
  touchStart = null; // Đặt lại điểm chạm
  removeJoystick(); // Xóa joystick nếu có
  player.style.left = '50%';
  player.style.bottom = '50%';
}

// Xóa khu vực joystick
function removeJoystick() {
  if (joystickArea) {
    joystickArea.remove();
    joystickArea = null;
  }
  if (joystickKnob) {
    joystickKnob.remove();
    joystickKnob = null;
  }
}

// Bật hướng từ button
controls.forEach(c=>{
  c.addEventListener('click', ()=>setDir(c.dataset.dir));
});

// Điều khiển bằng joystick ảo trên điện thoại
game.addEventListener('touchstart', e => {
  if (!gameRunning) return;
  e.preventDefault();
  const touch = e.touches[0];

  // Kiểm tra nếu chạm ở nửa dưới của khu vực chơi thì mới tạo joystick
  const rect = game.getBoundingClientRect();
  if (touch.clientY < rect.top + rect.height / 2) return;

  touchStart = touch;

  // tạo vùng joystick
  joystickArea = document.createElement('div');
  joystickArea.id = 'joystickArea';
  joystickArea.style.left = `${touch.clientX - 50}px`;
  joystickArea.style.top = `${touch.clientY - 50}px`;
  game.appendChild(joystickArea);

  // tạo nút joystick
  joystickKnob = document.createElement('div');
  joystickKnob.id = 'joystickKnob';
  joystickKnob.style.left = '35px';
  joystickKnob.style.top = '35px';
  joystickArea.appendChild(joystickKnob);
  joystickArea.classList.add('active');
});



game.addEventListener('touchmove', e => {
  if (!gameRunning || !touchStart) return;
  e.preventDefault();
  const touch = e.touches[0];
  let dx = touch.clientX - touchStart.clientX;
  let dy = touch.clientY - touchStart.clientY;

  // Giới hạn trong hình tròn
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > joystickRadius) {
    const scale = joystickRadius / distance;
    dx *= scale;
    dy *= scale;
  }

  // Di chuyển nút joystick
  if (joystickKnob) {
    joystickKnob.style.left = `${50 - 15 + dx}px`;
    joystickKnob.style.top = `${50 - 15 + dy}px`;
  }

  // Di chuyển player
  dirs = { x: dx / joystickRadius, y: -dy / joystickRadius }; // trục y ngược
});


game.addEventListener('touchend', e => {
  if (!gameRunning) return;
  touchStart = null;
  dirs = { x: 0, y: 0 };
  removeJoystick(); // xóa joystick khỏi màn
});


function setDir(d){
  if(!gameRunning) return;
  if(d=='up') keyState['ArrowUp'] = true;
  if(d=='down') keyState['ArrowDown'] = true;
  if(d=='left') keyState['ArrowLeft'] = true;
  if(d=='right') keyState['ArrowRight'] = true;
  updateDirs();
}

function updateDirs(){
  if (touchStart) return; // Ưu tiên điều khiển joystick trên điện thoại
  dirs = { x:0, y:0 };
  if(keyState['ArrowUp']) dirs.y = 1;
  if(keyState['ArrowDown']) dirs.y = -1;
  if(keyState['ArrowLeft']) dirs.x = -1;
  if(keyState['ArrowRight']) dirs.x = 1;
}

// Xử lý phím thả
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') keyState['ArrowUp'] = false;
  if (e.key === 'ArrowDown') keyState['ArrowDown'] = false;
  if (e.key === 'ArrowLeft') keyState['ArrowLeft'] = false;
  if (e.key === 'ArrowRight') keyState['ArrowRight'] = false;
  updateDirs();
});

// Tạo obstacle từ bốn hướng
function spawnObstacle() {
  // Kiểm tra số lượng chướng ngại vật hiện có
  const currentObstacles = document.querySelectorAll('.obstacle').length;
  if(currentObstacles >= maxObstacles) return; // Không tạo nếu đã đủ

  const obstacle = document.createElement('div');
  obstacle.classList.add('obstacle');
  // Chọn hướng: sau 50s, tăng xác suất hướng xéo
  const directions = diagonalEnabled 
    ? ['up', 'down', 'left', 'right', 'down-right', 'down-left', 'up-right', 'up-left', 'down-right', 'down-left', 'up-right', 'up-left']
    : ['up', 'down', 'left', 'right'];
  const dir = directions[Math.floor(Math.random() * directions.length)];
  obstacle.dataset.dir = dir;
  let x, y;
  // Vị trí xuất phát
  if(dir=='left') {
    x = game.offsetWidth; // Từ cạnh phải
    y = Math.random() * game.offsetHeight;
  } else if(dir=='right') {
    x = 0 - 30; // Từ cạnh trái
    y = Math.random() * game.offsetHeight;
  } else if(dir=='up') {
    y = 0 - 30; // Từ cạnh trên
    x = Math.random() * game.offsetWidth;
  } else if(dir=='down') {
    y = game.offsetHeight; // Từ cạnh dưới
    x = Math.random() * game.offsetWidth;
  } else if(dir=='down-right') {
    x = 0 - 30; // Từ góc trái trên
    y = 0 - 30;
  } else if(dir=='down-left') {
    x = game.offsetWidth; // Từ góc phải trên
    y = 0 - 30;
  } else if(dir=='up-right') {
    x = 0 - 30; // Từ góc trái dưới
    y = game.offsetHeight;
  } else if(dir=='up-left') {
    x = game.offsetWidth; // Từ góc phải dưới
    y = game.offsetHeight;
  }
  obstacle.style.left = x+'px';
  obstacle.style.top = y+'px';
  game.appendChild(obstacle);
  console.log(`Obstacle created: direction=${dir}, x=${x}, y=${y}`); // Debug log

  const mv = setInterval(()=>{
    if(!gameRunning){ clearInterval(mv); return; }
    let px = player.offsetLeft, py = player.offsetTop;
    let ox = obstacle.offsetLeft, oy = obstacle.offsetTop;
    // Di chuyển theo hướng
    let dx = 0, dy = 0;
    if(dir=='left') dx = -speed;
    if(dir=='right') dx = speed;
    if(dir=='up') dy = speed;
    if(dir=='down') dy = -speed;
    if(dir=='down-right') { dx = speed; dy = -speed; }
    if(dir=='down-left') { dx = -speed; dy = -speed; }
    if(dir=='up-right') { dx = speed; dy = speed; }
    if(dir=='up-left') { dx = -speed; dy = speed; }
    // Chuẩn hóa tốc độ cho hướng xéo
    if(dx !== 0 && dy !== 0){
      const magnitude = Math.sqrt(dx*dx + dy*dy);
      dx = (dx / magnitude) * speed;
      dy = (dy / magnitude) * speed;
    }
    ox += dx;
    oy += dy;
    obstacle.style.left = ox+'px';
    obstacle.style.top = oy+'px';

    // Kiểm tra va chạm và xóa chướng ngại vật
    if(ox<px+30 && ox+30>px && oy<py+30 && oy+30>py){
      clearInterval(mv); // Dừng di chuyển chướng ngại vật
      obstacle.remove(); // Xóa chướng ngại vật
      endGame(); // Kết thúc trò chơi
    }
    // Xóa chướng ngại vật khi ra khỏi màn hình
    if(ox<0||ox>game.offsetWidth||oy<0||oy>game.offsetHeight){
      clearInterval(mv);
      obstacle.remove();
    }
  },20);
}

// Bắt đầu
function startGame(){
  gameRunning = true; 
  speed = 2; // Đặt lại tốc độ
  spawnInterval = 2000; // Đặt lại khoảng thời gian xuất hiện
  maxObstacles = 1; // Đặt lại số chướng ngại vật tối đa
  diagonalEnabled = false; // Đặt lại cờ hướng xéo
  survivalTime = 0; 
  resetPlayer();
  scoreText.innerText = `Time: 0s | High: ${highTime.toFixed(1)}s`;
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  // Xóa tất cả chướng ngại vật hiện có
  const obstacles = document.querySelectorAll('.obstacle');
  obstacles.forEach(obstacle => obstacle.remove());
  // Tạo một chướng ngại vật ngay lập tức
  spawnObstacle();
  // Bắt đầu đếm thời gian
  startTime = Date.now();
  timerInterval = setInterval(()=>{
    if(gameRunning){
      survivalTime = (Date.now() - startTime) / 1000; // Tính thời gian bằng giây
      scoreText.innerText = `Time: ${survivalTime.toFixed(1)}s | High: ${highTime.toFixed(1)}s`;
      // Bật hướng xéo sau 50s
      if(survivalTime >= 50 && !diagonalEnabled){
        diagonalEnabled = true;
        console.log('Diagonal obstacles enabled'); // Debug log
      }
    }
  },100);
  // Tăng độ khó mỗi 10 giây
  difficultyInterval = setInterval(()=>{
    if(gameRunning){
      speed += 1; // Tăng tốc độ chướng ngại vật
      spawnInterval = Math.max(500, spawnInterval - 200); // Giảm thời gian xuất hiện, tối thiểu 500ms
      maxObstacles += 1; // Tăng số chướng ngại vật tối đa
      clearInterval(obsInterval); // Dừng interval cũ
      obsInterval = setInterval(spawnObstacle, spawnInterval); // Cập nhật interval mới
      console.log(`Difficulty increased: speed=${speed}, spawnInterval=${spawnInterval}, maxObstacles=${maxObstacles}`); // Debug log
    }
  },10000);
  obsInterval = setInterval(spawnObstacle, spawnInterval);
}

// Kết thúc
function endGame(){
  gameRunning = false;
  clearInterval(obsInterval);
  clearInterval(timerInterval); // Dừng đếm thời gian
  clearInterval(difficultyInterval); // Dừng tăng độ khó
  if(survivalTime > highTime){
    highTime = survivalTime;
    localStorage.setItem('highTime', highTime);
  }
  scoreText.innerText = `Time: ${survivalTime.toFixed(1)}s | High: ${highTime.toFixed(1)}s`;
  restartBtn.style.display = 'block';
}

// Update liên tục chuyển player
function loop(){
  if(gameRunning){
    // Chuẩn hóa tốc độ để di chuyển xéo không nhanh hơn
    let moveSpeed = 3;
    let dx = dirs.x * moveSpeed;
    let dy = dirs.y * moveSpeed;
    if(dx !== 0 || dy !== 0){
      // Chuẩn hóa vector hướng để tốc độ di chuyển xéo bằng di chuyển thẳng
      const magnitude = Math.sqrt(dx*dx + dy*dy);
      if (magnitude > 0) {
        dx = (dx / magnitude) * moveSpeed;
        dy = (dy / magnitude) * moveSpeed;
      }
    }
    let l = player.offsetLeft + dx;
    let t = player.offsetTop - dy;
    l = Math.max(0, Math.min(game.offsetWidth-30, l));
    t = Math.max(0, Math.min(game.offsetHeight-30, t));
    player.style.left = l+'px';
    player.style.top = t+'px';
  }
  requestAnimationFrame(loop);
}

// Bàn phím máy tính (phím mũi tên)
document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    keyState[e.key] = true;
    updateDirs();
  }
});

// Sự kiện
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
loop();