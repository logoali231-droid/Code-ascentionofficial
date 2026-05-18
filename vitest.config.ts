let _config: any = {};

try {
  // vitest is a dev dependency; be defensive if it's not installed in this environment
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { defineConfig } = require("vitest/config");
  _config = defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./vitest.setup.ts",
    },
  });
} catch (e) {
  // fallback: export a minimal config object so typecheck/build won't fail
  _config = {};
}

export default _config;
