import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 60000,
    retries: 0,
    use: {
        headless: true,
        viewport: { width: 800, height: 600 },
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    reporter: [['list']],
});
