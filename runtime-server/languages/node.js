export function createNodeCommand(code) {
  const escaped = code.replace(/"/g, '\\"');

  return `
docker run --rm \
--memory=256m \
--cpus=0.5 \
--network=none \
node:20-alpine \
node -e "${escaped}"
`;
}