import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "mock",
      use: {
        baseURL: "http://localhost:5173",
      },
    },
    {
      name: "production",
      use: {
        baseURL: "https://event-ticketing-system-frontend-eight.vercel.app",
      },
    },
    {
      name: "demo",
      use: {
        baseURL: "https://event-ticketing-system-frontend-eight.vercel.app",
        headless: false,
        launchOptions: {
          slowMo: 800,
        },
        video: "on",
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
})