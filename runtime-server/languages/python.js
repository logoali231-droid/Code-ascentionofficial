export function createPythonCommand(code) {
  const escaped = code.replace(/"/g, '\\"');

  return `
docker run --rm \
--memory=256m \
--cpus=0.5 \
--network=none \
python:3.12-alpine \
python -c "${escaped}"
`;
}