function escapeCode(code) {
  return code
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

export function createPythonCommand(code) {

  const escaped = escapeCode(code);

  return `
docker run --rm \
--memory="256m" \
--cpus="0.5" \
--pids-limit=64 \
--network none \
python:3.12-alpine \
python -c "${escaped}"
`;

}