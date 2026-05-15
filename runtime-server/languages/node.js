function escapeCode(code) {
  return code
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}

export function createNodeCommand(code) {

  const escaped = escapeCode(code);

  return `
docker run --rm \
--memory="256m" \
--cpus="0.5" \
--pids-limit=64 \
--network none \
--read-only \
node:20-alpine \
node -e "${escaped}"
`;

}