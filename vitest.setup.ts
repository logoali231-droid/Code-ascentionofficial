// vitest setup file - guard imports so build/typecheck doesn't require vitest dev deps
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const v = require('vitest');
    const beforeAll = v.beforeAll;
    const afterAll = v.afterAll;

    beforeAll(() => {
        // Global setup code here
    });

    afterAll(() => {
        // Global teardown code here
    });
} catch (e) {
    // no-op if vitest is not installed
}