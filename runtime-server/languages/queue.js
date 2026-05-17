// queue.js
const CONFIG = require("./config");

let running = 0;
const queue = [];

async function enqueue(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (running >= CONFIG.QUEUE.maxConcurrent) return;
  if (queue.length === 0) return;

  const item = queue.shift();
  running++;

  try {
    const result = await item.task();
    item.resolve(result);
  } catch (err) {
    item.reject(err);
  } finally {
    running--;
    processQueue();
  }
}

module.exports = { enqueue };