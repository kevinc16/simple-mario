const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");

const world = {
  gravity: 0.7,
  floor: canvas.height - 72,
};

const player = {
  x: 80,
  y: world.floor - 48,
  width: 36,
  height: 48,
  velocityX: 0,
  velocityY: 0,
  speed: 0.8,
  jumpForce: 14,
  grounded: true,
};

const keys = new Set();

window.addEventListener("keydown", (event) => {
  keys.add(event.code);

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

function update() {
  const movingLeft = keys.has("ArrowLeft") || keys.has("KeyA");
  const movingRight = keys.has("ArrowRight") || keys.has("KeyD");
  const jumping = keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space");

  if (movingLeft) player.velocityX -= player.speed;
  if (movingRight) player.velocityX += player.speed;

  if (jumping && player.grounded) {
    player.velocityY = -player.jumpForce;
    player.grounded = false;
  }

  player.velocityX *= 0.82;
  player.velocityY += world.gravity;
  player.x += player.velocityX;
  player.y += player.velocityY;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  if (player.y + player.height >= world.floor) {
    player.y = world.floor - player.height;
    player.velocityY = 0;
    player.grounded = true;
  }
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#78c8f0";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#44a53d";
  context.fillRect(0, world.floor, canvas.width, 14);
  context.fillStyle = "#8b5a2b";
  context.fillRect(0, world.floor + 14, canvas.width, canvas.height - world.floor);

  context.fillStyle = "#e63946";
  context.fillRect(player.x, player.y, player.width, player.height);
  context.fillStyle = "#2454a6";
  context.fillRect(player.x + 5, player.y + 25, player.width - 10, 23);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
