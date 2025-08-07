// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests/playwright',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.P1IMPORT_BASE_URL || 'http://localhost:4000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
};

export default config;
