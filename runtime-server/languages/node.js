const CONFIG = require("./config");

function escapeCode(code) {
  return code
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}

function createNodeCommand(code) {
  const escaped = escapeCode(code);
  return `docker run --rm \
--memory="${CONFIG.LIMITS.memory_light}" \
--cpus="${CONFIG.LIMITS.cpus}" \
--pids-limit=${CONFIG.LIMITS.pidsLimit} \
--network none \
--read-only \
node:20-alpine \
node -e "${escaped}"`;
}

module.exports = { createNodeCommand };