const CONFIG = require("./config");

function escapeCode(code) {
  return code
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$");
}

function createPHPCommand(code) {
  const escaped = escapeCode(code);
  return `docker run --rm \
--memory="${CONFIG.LIMITS.memory_light}" \
--cpus="${CONFIG.LIMITS.cpus}" \
--pids-limit=${CONFIG.LIMITS.pidsLimit} \
--network none \
php:8-cli-alpine \
php -r "${escaped}"`;
}

module.exports = { createPHPCommand };