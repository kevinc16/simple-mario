const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const listeners = new Map();
const elements = new Map();
let nextFrame;

function makeElement(extra = {}) {
  return {
    hidden: true,
    textContent: "",
    addEventListener() {},
    ...extra,
  };
}

const drawingContext = new Proxy(
  {
    createLinearGradient() {
      return { addColorStop() {} };
    },
  },
  {
    get(target, property) {
      if (property in target) return target[property];
      return () => {};
    },
  },
);

elements.set("#game", makeElement({ width: 960, height: 540, getContext: () => drawingContext }));
elements.set("#score", makeElement());
elements.set("#lives", makeElement());
elements.set("#status", makeElement());
elements.set("#overlay", makeElement());
elements.set("#overlay-title", makeElement());
elements.set("#overlay-text", makeElement());
elements.set("#restart", makeElement());

const windowMock = {
  addEventListener(type, callback) {
    listeners.set(type, callback);
  },
};

const sandbox = {
  console,
  document: { querySelector: (selector) => elements.get(selector) },
  window: windowMock,
  requestAnimationFrame(callback) {
    nextFrame = callback;
  },
};

vm.createContext(sandbox);
const gameSource = fs.readFileSync(path.join(__dirname, "..", "src", "game.js"), "utf8");
vm.runInContext(gameSource, sandbox);

function press(code) {
  listeners.get("keydown")({ code, repeat: false, preventDefault() {} });
}

function release(code) {
  listeners.get("keyup")({ code });
}

function runFrames(count) {
  for (let frame = 0; frame < count; frame += 1) {
    const callback = nextFrame;
    assert.equal(typeof callback, "function", "the game loop should schedule another frame");
    callback();
  }
}

runFrames(20);
const startingX = windowMock.gameDebug.state.playerX;
press("ArrowRight");
runFrames(30);
release("ArrowRight");
assert.ok(windowMock.gameDebug.state.playerX > startingX + 100, "right input should move the player");

runFrames(40);
const groundedY = windowMock.gameDebug.state.playerY;
press("Space");
release("Space");
runFrames(5);
assert.ok(windowMock.gameDebug.state.playerY < groundedY, "jump input should move the player upward");

windowMock.gameDebug.restart();
press("ArrowRight");
for (let frame = 0; frame < 1800 && windowMock.gameDebug.state.running; frame += 1) {
  if (windowMock.gameDebug.state.grounded) {
    press("Space");
    release("Space");
  }
  runFrames(1);
}
release("ArrowRight");

const completedRun = windowMock.gameDebug.state;
assert.equal(completedRun.checkpointReached, true, `the route should pass the checkpoint: ${JSON.stringify(completedRun)}`);
assert.equal(windowMock.gameDebug.state.running, false, "the route should reach an end state");
assert.equal(elements.get("#overlay-title").textContent, "Level complete!", "the full route should reach the flag");
assert.equal(elements.get("#overlay").hidden, false, "the completion screen should be visible");

windowMock.gameDebug.restart();
assert.equal(windowMock.gameDebug.state.lives, 3, "restart should restore all lives");
assert.equal(windowMock.gameDebug.state.running, true, "restart should begin a new run");
assert.equal(elements.get("#overlay").hidden, true, "restart should hide the completion screen");

console.log("Game simulation passed: movement, jumping, checkpoint, finish, and restart.");
