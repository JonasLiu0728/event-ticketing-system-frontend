import { test, expect } from "@playwright/test"

const ACCOUNTS = {
  employee: { id: "1000001",     password: "password123" },
  welfare:  { id: "welfare_001", password: "password123" },
  hr:       { id: "hr_001",      password: "password123" },
}

// ─────────────────────────────────────────
// Part 1：第一次登入 + 設定喜好
// ─────────────────────────────────────────
test.describe("【Demo】第一次登入流程", () => {

  test("員工第一次登入，可以設定活動偏好與飲食需求", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("text=企業活動訂票系統")).toBeVisible()

    // 點「第一次登入」
    await page.click("text=第一次登入")
    await page.fill('input[autocomplete="username"]', ACCOUNTS.employee.id)
    await page.fill('input[autocomplete="current-password"]', ACCOUNTS.employee.password)
    await page.click('button[type="submit"]')

    // 進入 onboarding 頁面
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15000 })
    await expect(page.locator("text=歡迎")).toBeVisible()

    // 選擇活動偏好
    await page.click("text=🏃 運動")
    await page.click("text=🍽️ 美食")

    // 設定飲食需求
    await page.selectOption("select", "non-veg")

    // 完成設定
    await page.click("text=完成設定，開始探索活動")
    await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })
  })

  test("HR 第一次登入，可以設定偏好", async ({ page }) => {
    await page.goto("/")

    await page.click("text=第一次登入")
    await page.fill('input[autocomplete="username"]', ACCOUNTS.hr.id)
    await page.fill('input[autocomplete="current-password"]', ACCOUNTS.hr.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15000 })
    await expect(page.locator("text=歡迎")).toBeVisible()

    await page.click("text=🎵 音樂")
    await page.click("text=完成設定，開始探索活動")
    await expect(page).toHaveURL(/\/admin\/hr$/, { timeout: 15000 })
  })

  test("福委第一次登入，進入歡迎頁面", async ({ page }) => {
    await page.goto("/")

    await page.click("text=第一次登入")
    await page.fill('input[autocomplete="username"]', ACCOUNTS.welfare.id)
    await page.fill('input[autocomplete="current-password"]', ACCOUNTS.welfare.password)
    await page.click('button[type="submit"]')

    // 福委走 /welcome 不是 /onboarding
    await expect(page).toHaveURL(/\/welcome$/, { timeout: 15000 })
    await expect(page.locator("text=歡迎加入福委會")).toBeVisible()

    await page.click("text=開始使用")
    await expect(page).toHaveURL(/\/admin\/events$/, { timeout: 15000 })
  })
})

// ─────────────────────────────────────────
// Part 2：已設定過，直接登入
// ─────────────────────────────────────────
test.describe("【Demo】直接登入，跳轉到對應頁面", () => {

  test("員工登入 → 活動列表", async ({ page }) => {
    await page.goto("/")

    await page.click("text=員工登入")
    await page.fill('input[autocomplete="username"]', ACCOUNTS.employee.id)
    await page.fill('input[autocomplete="current-password"]', ACCOUNTS.employee.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })
    await expect(page.locator("text=活動列表")).toBeVisible()
  })

  test("福委登入 → 活動管理", async ({ page }) => {
    await page.goto("/")

    await page.click("text=福委登入")
    await page.fill('input[autocomplete="username"]', ACCOUNTS.welfare.id)
    await page.fill('input[autocomplete="current-password"]', ACCOUNTS.welfare.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/admin\/events$/, { timeout: 15000 })
    await expect(page.getByRole("heading", { name: "活動管理" })).toBeVisible()
  })

  test("HR 登入 → 統計報表", async ({ page }) => {
    await page.goto("/")

    await page.click("text=HR 登入")
    await page.fill('input[autocomplete="username"]', ACCOUNTS.hr.id)
    await page.fill('input[autocomplete="current-password"]', ACCOUNTS.hr.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/admin\/hr$/, { timeout: 15000 })
    await expect(page.locator("text=統計報表")).toBeVisible()
  })
})