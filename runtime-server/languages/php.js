function escapeCode(code) {
  return code
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

export function createPHPCommand(code) {

  const escaped = escapeCode(code);

  return `
docker run --rm \
--memory="256m" \
--cpus="0.5" \
--pids-limit=64 \
--network none \
php:8-cli-alpine \
php -r "${escaped}"
`;

}