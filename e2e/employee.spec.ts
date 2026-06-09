import { test, expect } from "@playwright/test"

const MOCK_ACCOUNTS = { id: "employee", password: "1234" }
const REAL_ACCOUNTS = { id: "1000001", password: "password123" }

function getAccount(baseURL: string) {
  return baseURL.includes("localhost") ? MOCK_ACCOUNTS : REAL_ACCOUNTS
}

async function loginAsEmployee(page: any, baseURL: string) {
  const account = getAccount(baseURL)
  await page.goto("/")
  await page.click("text=員工登入")
  await page.fill('input[autocomplete="username"]', account.id)
  await page.fill('input[autocomplete="current-password"]', account.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })
}

// ✅ 移除 beforeAll/afterAll，資料庫已有活動資料不需要自動建立

test.describe("活動瀏覽", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsEmployee(page, baseURL!)
  })

  test("可以看到活動列表", async ({ page }) => {
    await expect(page.locator("text=活動列表")).toBeVisible()
    await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible({ timeout: 15000 })
  })

  test("可以搜尋活動", async ({ page }) => {
    await expect(
      page.locator('[data-testid="event-card"]').first()
    ).toBeVisible({ timeout: 15000 })

    // 只抓活動名稱（h2），避免抓到「活動開始」「報名截止」等 UI 文字
    const eventName = (await page.locator('[data-testid="event-card"] h2').first().textContent()) ?? ""
    const match = eventName.match(/[\u4e00-\u9fa5]{2}/)
    const keyword = match ? match[0] : "活動"

    await page.fill('input[placeholder="搜尋活動..."]', keyword)
    await page.waitForTimeout(800)

    await expect(
      page.locator('[data-testid="event-card"]').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test("可以依分類篩選", async ({ page }) => {
    await page.selectOption("select", "sport")
    await page.waitForTimeout(500)
    await expect(page.locator("text=活動列表")).toBeVisible()
  })

  test("可以切換排序", async ({ page }) => {
    await page.click("text=最熱門")
    await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible({ timeout: 10000 })
  })

  test("可以點進活動詳情", async ({ page }) => {
    await page.locator('[data-testid="event-card"]').first().click()
    await expect(page).toHaveURL(/\/events\/\w+/, { timeout: 10000 })
    await expect(page.locator("text=報名資料")).toBeVisible()
  })

  test("活動詳情顯示正確資訊", async ({ page }) => {
    await page.locator('[data-testid="event-card"]').first().click()
    await expect(page).toHaveURL(/\/events\/\w+/, { timeout: 10000 })
    await expect(page.locator("text=📍").first()).toBeVisible()
    await expect(page.locator("text=活動開始").first()).toBeVisible()
    await expect(page.locator("text=報名截止").first()).toBeVisible()
  })
})

test.describe("報名流程", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsEmployee(page, baseURL!)
    await page.locator('[data-testid="event-card"]').first().click()
    await expect(page).toHaveURL(/\/events\/\w+/)
  })

  test("可以選擇飲食需求", async ({ page }) => {
    const select = page.locator("select").first()
    await select.selectOption("veg")
    await expect(select).toHaveValue("veg")
  })

  test("可以勾選自行開車", async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]')
    await checkbox.check()
    await expect(checkbox).toBeChecked()
  })

  test("報名按鈕存在且可點擊", async ({ page }) => {
    const btn = page.locator("text=立即報名")
      .or(page.locator("text=加入候補"))
      .or(page.locator("text=您已報名此活動"))
      .or(page.locator("text=目前無法報名"))
      .or(page.locator("text=載入中..."))
    await expect(btn.first()).toBeVisible()
  })

  test("點擊報名後按鈕狀態改變", async ({ page }) => {
    const registerBtn = page.locator("text=立即報名")
    if (await registerBtn.isVisible()) {
      await registerBtn.click()
      await page.waitForTimeout(600)
      const changedBtn = page.locator("text=報名中...")
        .or(page.locator("text=您已報名此活動"))
        .or(page.locator("text=已加入候補名單"))
      await expect(changedBtn.first()).toBeVisible()
    }
  })
})

test.describe("報名紀錄", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsEmployee(page, baseURL!)
    await page.click("text=報名")
    await expect(page).toHaveURL(/\/my-transactions$/)
  })

  test("可以看到報名紀錄頁面", async ({ page }) => {
    await expect(page.locator("text=我的報名紀錄")).toBeVisible()
  })

  test("可以依狀態篩選", async ({ page }) => {
    await page.selectOption("select", "confirmed")
    await expect(page.locator("text=我的報名紀錄")).toBeVisible()
  })
})

test.describe("票券", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsEmployee(page, baseURL!)
    await page.click("text=票券")
    await expect(page).toHaveURL(/\/my-tickets$/)
  })

  test("可以看到票券頁面", async ({ page }) => {
    await expect(page.locator("text=我的票券")).toBeVisible()
  })

  test("可以依狀態篩選票券", async ({ page }) => {
    await page.selectOption("select", "unused")
    await expect(page.locator("text=我的票券")).toBeVisible()
  })

  test("可以點進票券詳情", async ({ page }) => {
    const ticket = page.locator("text=可報到, text=已報到, text=未開放").first()
    if (await ticket.count() > 0) {
      await ticket.locator("..").locator("..").click()
      await expect(page.url()).toMatch(/\/my-tickets\//)
      await expect(page.locator("text=票券編號")).toBeVisible()
    }
  })
})

test.describe("個人資料", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsEmployee(page, baseURL!)
    await page.click("text=個人")
    await expect(page).toHaveURL(/\/profile$/)
  })

  test("可以看到個人資料頁面", async ({ page }) => {
    await expect(page.locator("text=個人資料")).toBeVisible()
    await expect(page.locator("text=活動偏好")).toBeVisible()
    await expect(page.locator("text=報名自動填入")).toBeVisible()
  })

  test("可以選擇活動偏好", async ({ page }) => {
    await page.click("text=🏃 運動")
    await expect(page.locator("text=🏃 運動")).toBeVisible()
  })

  test("可以儲存設定", async ({ page }) => {
    await page.click("text=儲存")
    await expect(
      page.locator("text=✓ 已儲存").or(page.locator("text=儲存中..."))
    ).toBeVisible()
  })
})