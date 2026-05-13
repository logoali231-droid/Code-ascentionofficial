export function createPHPCommand(code) {
  const escaped = code.replace(/"/g, '\\"');

  return `
docker run --rm \
--memory=256m \
--cpus=0.5 \
--network=none \
php:8-cli \
php -r "${escaped}"
`;
}