const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const livesElement = document.querySelector("#lives");
const statusElement = document.querySelector("#status");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayText = document.querySelector("#overlay-text");
const restartButton = document.querySelector("#restart");

const WORLD = { width: 6400, floor: 468, gravity: 0.72 };
const START = { x: 90, y: 360 };
const CHECKPOINT = { x: 3230, y: 360 };
const GOAL_X = 6260;

const ground = [
  { x: 0, y: WORLD.floor, width: 1060, height: 72 },
  { x: 1190, y: WORLD.floor, width: 820, height: 72 },
  { x: 2150, y: WORLD.floor, width: 840, height: 72 },
  { x: 3120, y: WORLD.floor, width: 900, height: 72 },
  { x: 4180, y: WORLD.floor, width: 930, height: 72 },
  { x: 5260, y: WORLD.floor, width: 1140, height: 72 },
];

const platforms = [
  { x: 370, y: 378, width: 170, height: 24 },
  { x: 650, y: 310, width: 145, height: 24 },
  { x: 900, y: 382, width: 120, height: 24 },
  { x: 1270, y: 370, width: 175, height: 24 },
  { x: 1540, y: 300, width: 145, height: 24 },
  { x: 1820, y: 390, width: 150, height: 24 },
  { x: 2270, y: 375, width: 175, height: 24 },
  { x: 2550, y: 294, width: 150, height: 24 },
  { x: 2800, y: 384, width: 150, height: 24 },
  { x: 3220, y: 372, width: 180, height: 24 },
  { x: 3500, y: 300, width: 160, height: 24 },
  { x: 3770, y: 230, width: 150, height: 24 },
  { x: 4260, y: 374, width: 180, height: 24 },
  { x: 4550, y: 304, width: 150, height: 24 },
  { x: 4840, y: 378, width: 180, height: 24 },
  { x: 5340, y: 370, width: 180, height: 24 },
  { x: 5610, y: 296, width: 160, height: 24 },
  { x: 5870, y: 224, width: 160, height: 24 },
  { x: 6100, y: 376, width: 150, height: 24 },
];

const solids = [...ground, ...platforms];
const enemyBlueprints = [
  { x: 760, y: 432, minX: 650, maxX: 990, speed: 1.35 },
  { x: 1370, y: 334, minX: 1270, maxX: 1445, speed: 1.05 },
  { x: 1740, y: 432, minX: 1550, maxX: 1950, speed: 1.55 },
  { x: 2360, y: 339, minX: 2270, maxX: 2445, speed: 1.15 },
  { x: 2750, y: 432, minX: 2210, maxX: 2930, speed: 1.65 },
  { x: 3610, y: 264, minX: 3500, maxX: 3660, speed: 1.1 },
  { x: 3890, y: 432, minX: 3180, maxX: 3970, speed: 1.8 },
  { x: 4670, y: 268, minX: 4550, maxX: 4700, speed: 1.1 },
  { x: 5480, y: 432, minX: 5300, maxX: 5790, speed: 1.7 },
  { x: 5960, y: 188, minX: 5870, maxX: 6030, speed: 1.05 },
];

const state = {
  score: 0,
  lives: 3,
  cameraX: 0,
  checkpointReached: false,
  running: true,
  messageTimer: 0,
  elapsedFrames: 0,
};

const player = {
  x: START.x,
  y: START.y,
  previousY: START.y,
  width: 36,
  height: 48,
  velocityX: 0,
  velocityY: 0,
  acceleration: 0.82,
  maxSpeed: 7,
  jumpForce: 14.5,
  grounded: false,
  facing: 1,
  invulnerable: 0,
};

const keys = new Set();
let jumpQueued = false;
let enemies = createEnemies();

function createEnemies() {
  return enemyBlueprints.map((enemy, index) => ({
    ...enemy,
    id: index,
    width: 38,
    height: 36,
    direction: index % 2 === 0 ? 1 : -1,
    defeated: false,
  }));
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["ArrowUp", "KeyW", "Space"].includes(event.code) && !event.repeat) jumpQueued = true;
  if (event.code === "KeyR" && !state.running) restartGame();
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());
restartButton.addEventListener("click", restartGame);

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function updatePlayer() {
  const movingLeft = keys.has("ArrowLeft") || keys.has("KeyA");
  const movingRight = keys.has("ArrowRight") || keys.has("KeyD");

  if (movingLeft) {
    player.velocityX -= player.acceleration;
    player.facing = -1;
  }
  if (movingRight) {
    player.velocityX += player.acceleration;
    player.facing = 1;
  }
  if (!movingLeft && !movingRight) player.velocityX *= 0.78;
  player.velocityX = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.velocityX));

  if (jumpQueued && player.grounded) {
    player.velocityY = -player.jumpForce;
    player.grounded = false;
  }
  jumpQueued = false;

  player.x += player.velocityX;
  resolveHorizontalCollisions();
  player.previousY = player.y;
  player.velocityY = Math.min(player.velocityY + WORLD.gravity, 18);
  player.y += player.velocityY;
  player.grounded = false;
  resolveVerticalCollisions();
  player.x = Math.max(0, Math.min(WORLD.width - player.width, player.x));
  if (player.invulnerable > 0) player.invulnerable -= 1;

  if (player.y > canvas.height + 160) loseLife();
  if (!state.checkpointReached && player.x >= CHECKPOINT.x) {
    state.checkpointReached = true;
    state.score += 250;
    showStatus("Checkpoint!", 120);
  }
  if (player.x + player.width >= GOAL_X) finishLevel();
}

function resolveHorizontalCollisions() {
  for (const solid of solids) {
    if (!overlaps(player, solid)) continue;
    if (player.velocityX > 0) player.x = solid.x - player.width;
    if (player.velocityX < 0) player.x = solid.x + solid.width;
    player.velocityX = 0;
  }
}

function resolveVerticalCollisions() {
  for (const solid of solids) {
    if (!overlaps(player, solid)) continue;
    if (player.velocityY > 0) {
      player.y = solid.y - player.height;
      player.velocityY = 0;
      player.grounded = true;
    } else if (player.velocityY < 0) {
      player.y = solid.y + solid.height;
      player.velocityY = 0;
    }
  }
}

function updateEnemies() {
  for (const enemy of enemies) {
    if (enemy.defeated) continue;
    enemy.x += enemy.speed * enemy.direction;
    if (enemy.x <= enemy.minX || enemy.x + enemy.width >= enemy.maxX) {
      enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX - enemy.width, enemy.x));
      enemy.direction *= -1;
    }
    if (!overlaps(player, enemy) || player.invulnerable > 0) continue;

    const previousBottom = player.previousY + player.height;
    if (player.velocityY > 0 && previousBottom <= enemy.y + 12) {
      enemy.defeated = true;
      player.y = enemy.y - player.height;
      player.velocityY = -10.5;
      state.score += 100;
      showStatus("Stomp! +100", 55);
    } else {
      loseLife();
      return;
    }
  }
}

function loseLife() {
  if (!state.running || player.invulnerable > 0) return;
  state.lives -= 1;
  if (state.lives <= 0) {
    state.running = false;
    showOverlay("Game over", `Score: ${state.score}. Press R or use the button to try again.`);
    updateHud();
    return;
  }

  const spawn = state.checkpointReached ? CHECKPOINT : START;
  Object.assign(player, {
    x: spawn.x,
    y: spawn.y,
    previousY: spawn.y,
    velocityX: 0,
    velocityY: 0,
    invulnerable: 100,
  });
  state.cameraX = Math.max(0, spawn.x - 220);
  showStatus(`Watch out! ${state.lives} lives left`, 100);
}

function finishLevel() {
  if (!state.running) return;
  state.running = false;
  const timeBonus = Math.max(0, 5000 - Math.floor(state.elapsedFrames / 6) * 10);
  state.score += timeBonus;
  showOverlay("Level complete!", `Final score: ${state.score} · Time bonus: ${timeBonus}`);
  updateHud();
}

function restartGame() {
  Object.assign(state, {
    score: 0,
    lives: 3,
    cameraX: 0,
    checkpointReached: false,
    running: true,
    messageTimer: 0,
    elapsedFrames: 0,
  });
  Object.assign(player, {
    x: START.x,
    y: START.y,
    previousY: START.y,
    velocityX: 0,
    velocityY: 0,
    grounded: false,
    invulnerable: 0,
  });
  enemies = createEnemies();
  keys.clear();
  overlay.hidden = true;
  updateHud();
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.hidden = false;
}

function showStatus(message, frames) {
  statusElement.textContent = message;
  state.messageTimer = frames;
}

function updateCamera() {
  const target = player.x - canvas.width * 0.38;
  state.cameraX += (target - state.cameraX) * 0.1;
  state.cameraX = Math.max(0, Math.min(WORLD.width - canvas.width, state.cameraX));
}

function updateHud() {
  scoreElement.textContent = `Score ${String(state.score).padStart(5, "0")}`;
  livesElement.textContent = `Lives ${state.lives}`;
  if (state.messageTimer > 0) state.messageTimer -= 1;
  else statusElement.textContent = `${Math.min(100, Math.round((player.x / GOAL_X) * 100))}% to goal`;
}

function update() {
  if (!state.running) return;
  state.elapsedFrames += 1;
  updatePlayer();
  updateEnemies();
  updateCamera();
  updateHud();
}

function drawCloud(x, y, scale = 1) {
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.fillRect(x, y + 12 * scale, 75 * scale, 18 * scale);
  context.fillRect(x + 14 * scale, y, 28 * scale, 28 * scale);
  context.fillRect(x + 40 * scale, y + 5 * scale, 24 * scale, 25 * scale);
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#63bff2");
  gradient.addColorStop(1, "#c8efff");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 10; i += 1) {
    const x = i * 430 - ((state.cameraX * 0.18) % 430) - 100;
    drawCloud(x, 65 + (i % 3) * 48, i % 2 === 0 ? 1 : 0.75);
  }
  context.fillStyle = "#79b85a";
  for (let i = 0; i < 9; i += 1) {
    const x = i * 340 - ((state.cameraX * 0.35) % 340) - 120;
    context.beginPath();
    context.moveTo(x, WORLD.floor);
    context.lineTo(x + 150, 275 + (i % 2) * 45);
    context.lineTo(x + 310, WORLD.floor);
    context.fill();
  }
}

function drawBrick(rect, isGround = false) {
  const screenX = Math.round(rect.x - state.cameraX);
  if (screenX + rect.width < 0 || screenX > canvas.width) return;
  context.fillStyle = isGround ? "#9a552d" : "#d98232";
  context.fillRect(screenX, rect.y, rect.width, rect.height);
  context.fillStyle = isGround ? "#55ad42" : "#f4aa43";
  context.fillRect(screenX, rect.y, rect.width, isGround ? 13 : 5);
  context.strokeStyle = "rgba(74, 38, 24, 0.55)";
  context.lineWidth = 2;
  for (let x = screenX; x < screenX + rect.width; x += 32) {
    context.strokeRect(x, rect.y, Math.min(32, screenX + rect.width - x), Math.min(24, rect.height));
  }
}

function drawPlayer() {
  if (player.invulnerable > 0 && Math.floor(player.invulnerable / 6) % 2 === 0) return;
  const x = Math.round(player.x - state.cameraX);
  const y = Math.round(player.y);
  context.fillStyle = "#d62828";
  context.fillRect(x + 5, y, 27, 9);
  context.fillRect(x + 2, y + 8, 32, 14);
  context.fillStyle = "#f0b27a";
  context.fillRect(x + 8, y + 14, 22, 14);
  context.fillStyle = "#1e4d9b";
  context.fillRect(x + 5, y + 27, 27, 17);
  context.fillStyle = "#492715";
  context.fillRect(x + (player.facing > 0 ? 25 : 8), y + 17, 4, 5);
  context.fillRect(x + 3, y + 43, 13, 5);
  context.fillRect(x + 21, y + 43, 13, 5);
}

function drawEnemy(enemy) {
  if (enemy.defeated) return;
  const x = Math.round(enemy.x - state.cameraX);
  if (x + enemy.width < 0 || x > canvas.width) return;
  context.fillStyle = "#8a4b23";
  context.fillRect(x + 3, enemy.y + 9, 32, 22);
  context.fillRect(x + 8, enemy.y + 4, 22, 26);
  context.fillStyle = "#f7e6c4";
  context.fillRect(x + 8, enemy.y + 14, 22, 10);
  context.fillStyle = "#171717";
  context.fillRect(x + 12, enemy.y + 12, 4, 5);
  context.fillRect(x + 24, enemy.y + 12, 4, 5);
  context.fillRect(x, enemy.y + 29, 15, 7);
  context.fillRect(x + 23, enemy.y + 29, 15, 7);
}

function drawCheckpoint() {
  const x = CHECKPOINT.x - state.cameraX;
  if (x < -50 || x > canvas.width + 50) return;
  context.fillStyle = "#e9ecef";
  context.fillRect(x, 318, 6, 150);
  context.fillStyle = state.checkpointReached ? "#43aa4f" : "#f6c945";
  context.fillRect(x + 6, 322, 54, 30);
  context.fillStyle = "#183153";
  context.font = "bold 13px monospace";
  context.fillText("MID", x + 17, 342);
}

function drawGoal() {
  const x = GOAL_X - state.cameraX;
  context.fillStyle = "#f1f5f9";
  context.fillRect(x, 252, 8, WORLD.floor - 252);
  context.fillStyle = "#f4d35e";
  context.beginPath();
  context.moveTo(x + 8, 265);
  context.lineTo(x + 80, 288);
  context.lineTo(x + 8, 311);
  context.fill();
  context.fillStyle = "#e63946";
  context.fillRect(x - 13, WORLD.floor - 8, 34, 8);
}

function drawPitWarning(x) {
  const screenX = x - state.cameraX;
  if (screenX < -30 || screenX > canvas.width + 30) return;
  context.fillStyle = "#fff3b0";
  context.beginPath();
  context.moveTo(screenX, 442);
  context.lineTo(screenX + 12, 462);
  context.lineTo(screenX - 12, 462);
  context.fill();
  context.fillStyle = "#2b2d42";
  context.font = "bold 14px monospace";
  context.fillText("!", screenX - 4, 459);
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  ground.forEach((rect) => drawBrick(rect, true));
  platforms.forEach((rect) => drawBrick(rect));
  [1040, 1990, 2970, 4000, 5090].forEach(drawPitWarning);
  drawCheckpoint();
  drawGoal();
  enemies.forEach(drawEnemy);
  drawPlayer();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.gameDebug = {
  get state() {
    return {
      playerX: Math.round(player.x),
      playerY: Math.round(player.y),
      lives: state.lives,
      score: state.score,
      checkpointReached: state.checkpointReached,
      running: state.running,
      grounded: player.grounded,
    };
  },
  restart: restartGame,
};

updateHud();
loop();
