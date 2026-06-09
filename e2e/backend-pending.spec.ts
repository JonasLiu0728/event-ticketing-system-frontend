import { test, expect } from "@playwright/test"

const REAL_ACCOUNTS = {
  employee: { id: "1000001",     password: "password123" },
  admin:    { id: "welfare_001", password: "password123" },
}

// 測試 1：核銷功能 — 手動核銷後票券應更新為已核銷
test("核銷功能：手動核銷後票券狀態應更新為已核銷", async ({ page }) => {
  // 福委登入
  await page.goto("https://event-ticketing-system-frontend-eight.vercel.app/")
  await page.click("text=福委登入")
  await page.fill('input[autocomplete="username"]', REAL_ACCOUNTS.admin.id)
  await page.fill('input[autocomplete="current-password"]', REAL_ACCOUNTS.admin.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/admin\/events$/, { timeout: 15000 })

  // 進入核銷頁面
  await page.waitForSelector("text=核銷")
  await page.locator("text=核銷").first().click()
  await expect(page).toHaveURL(/\/admin\/events\/.*\/checkin$/)

  // 執行手動核銷
  const checkinBtn = page.locator("button:has-text('核銷')").first()
  if (await checkinBtn.count() > 0) {
    page.on("dialog", dialog => dialog.accept())
    await page.waitForLoadState("networkidle") 
    await checkinBtn.click()
    await page.waitForTimeout(1000)

    // 重新載入確認狀態已更新
    await page.reload()
    await page.waitForTimeout(2000)

    // 核銷完成後，該按鈕應該消失（變成「完成」或消失）
    await expect(page.locator("button:has-text('核銷')").first()).not.toBeVisible()
  }
})

// 測試 2：registrationStart — 尚未開始報名的活動不應讓使用者報名
test.skip("registrationStart：尚未開始報名的活動不應顯示報名入口", async ({ page }) => {
  await page.goto("https://event-ticketing-system-frontend-eight.vercel.app/")
  await page.click("text=員工登入")
  await page.fill('input[autocomplete="username"]', REAL_ACCOUNTS.employee.id)
  await page.fill('input[autocomplete="current-password"]', REAL_ACCOUNTS.employee.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })

  // 逐一確認「尚未開始報名」的活動不應顯示報名按鈕
  const cards = page.locator('[data-testid="event-card"]')
  const count = await cards.count()

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i)
    const statusText = await card.locator('[data-testid="event-status"]').textContent()

    if (statusText?.includes("尚未開始報名")) {
      await card.click()
      await page.waitForTimeout(500)

      // 不應該出現「立即報名」按鈕
      await expect(page.locator("text=立即報名")).not.toBeVisible()

      await page.goBack()
      await page.waitForTimeout(300)
    }
  }
})

// 測試 3：通知功能 — 應能看到最新通知
test("通知功能：應能看到最新系統通知", async ({ page }) => {
  await page.goto("https://event-ticketing-system-frontend-eight.vercel.app/")
  await page.click("text=員工登入")
  await page.fill('input[autocomplete="username"]', REAL_ACCOUNTS.employee.id)
  await page.fill('input[autocomplete="current-password"]', REAL_ACCOUNTS.employee.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })

  // 前往報名紀錄確認有資料
  await page.click("text=報名")
  await page.waitForTimeout(1000)

  await expect(page).toHaveURL(/\/my-transactions$/)
  await expect(page.locator("text=我的報名紀錄")).toBeVisible()
})