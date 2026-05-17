const CONFIG = require("./config");

function escapeCode(code) {
  return code
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$");
}

function createPythonCommand(code) {
  const escaped = escapeCode(code);
  return `docker run --rm \
--memory="${CONFIG.LIMITS.memory_light}" \
--cpus="${CONFIG.LIMITS.cpus}" \
--pids-limit=${CONFIG.LIMITS.pidsLimit} \
--network none \
python:3.12-alpine \
python -c "${escaped}"`;
}

module.exports = { createPythonCommand };