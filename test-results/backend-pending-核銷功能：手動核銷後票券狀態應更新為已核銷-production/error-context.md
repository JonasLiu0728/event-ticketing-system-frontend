# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: backend-pending.spec.ts >> 核銷功能：手動核銷後票券狀態應更新為已核銷
- Location: e2e/backend-pending.spec.ts:9:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text(\'核銷\')').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - navigation [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - button "←" [ref=e6]
        - generic [ref=e7]: 企業活動訂票系統
      - generic [ref=e8]:
        - generic [ref=e9] [cursor=pointer]: 活動管理
        - generic [ref=e10] [cursor=pointer]: 使用者
        - generic [ref=e11] [cursor=pointer]: 個人
        - button "登出" [ref=e12]
  - generic [ref=e14]:
    - heading "核銷" [level=1] [ref=e16]
    - generic [ref=e17]:
      - generic [ref=e18]:
        - paragraph [ref=e19]: 已核銷
        - paragraph [ref=e20]: "0"
      - generic [ref=e21]:
        - paragraph [ref=e22]: 未核銷
        - paragraph [ref=e23]: "0"
      - generic [ref=e24]:
        - paragraph [ref=e25]: 無效
        - paragraph [ref=e26]: "0"
    - textbox "搜尋姓名或票券 ID..." [ref=e27]
    - generic [ref=e29]: 找不到票券
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test"
  2  | 
  3  | const REAL_ACCOUNTS = {
  4  |   employee: { id: "1000001",     password: "password123" },
  5  |   admin:    { id: "welfare_001", password: "password123" },
  6  | }
  7  | 
  8  | // 測試 1：核銷功能 — 手動核銷後票券應更新為已核銷
  9  | test("核銷功能：手動核銷後票券狀態應更新為已核銷", async ({ page }) => {
  10 |   // 福委登入
  11 |   await page.goto("https://event-ticketing-system-frontend-eight.vercel.app/")
  12 |   await page.click("text=福委登入")
  13 |   await page.fill('input[autocomplete="username"]', REAL_ACCOUNTS.admin.id)
  14 |   await page.fill('input[autocomplete="current-password"]', REAL_ACCOUNTS.admin.password)
  15 |   await page.click('button[type="submit"]')
  16 |   await expect(page).toHaveURL(/\/admin\/events$/, { timeout: 15000 })
  17 | 
  18 |   // 進入核銷頁面
  19 |   await page.waitForSelector("text=核銷")
  20 |   await page.locator("text=核銷").first().click()
  21 |   await expect(page).toHaveURL(/\/admin\/events\/.*\/checkin$/)
  22 | 
  23 |   // 執行手動核銷
  24 |   const checkinBtn = page.locator("button:has-text('核銷')").first()
  25 |   if (await checkinBtn.count() > 0) {
  26 |     page.on("dialog", dialog => dialog.accept())
  27 |     await page.waitForLoadState("networkidle") 
> 28 |     await checkinBtn.click()
     |                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  29 |     await page.waitForTimeout(1000)
  30 | 
  31 |     // 重新載入確認狀態已更新
  32 |     await page.reload()
  33 |     await page.waitForTimeout(2000)
  34 | 
  35 |     // 核銷完成後，該按鈕應該消失（變成「完成」或消失）
  36 |     await expect(page.locator("button:has-text('核銷')").first()).not.toBeVisible()
  37 |   }
  38 | })
  39 | 
  40 | // 測試 2：registrationStart — 尚未開始報名的活動不應讓使用者報名
  41 | test.skip("registrationStart：尚未開始報名的活動不應顯示報名入口", async ({ page }) => {
  42 |   await page.goto("https://event-ticketing-system-frontend-eight.vercel.app/")
  43 |   await page.click("text=員工登入")
  44 |   await page.fill('input[autocomplete="username"]', REAL_ACCOUNTS.employee.id)
  45 |   await page.fill('input[autocomplete="current-password"]', REAL_ACCOUNTS.employee.password)
  46 |   await page.click('button[type="submit"]')
  47 |   await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })
  48 | 
  49 |   // 逐一確認「尚未開始報名」的活動不應顯示報名按鈕
  50 |   const cards = page.locator('[data-testid="event-card"]')
  51 |   const count = await cards.count()
  52 | 
  53 |   for (let i = 0; i < count; i++) {
  54 |     const card = cards.nth(i)
  55 |     const statusText = await card.locator('[data-testid="event-status"]').textContent()
  56 | 
  57 |     if (statusText?.includes("尚未開始報名")) {
  58 |       await card.click()
  59 |       await page.waitForTimeout(500)
  60 | 
  61 |       // 不應該出現「立即報名」按鈕
  62 |       await expect(page.locator("text=立即報名")).not.toBeVisible()
  63 | 
  64 |       await page.goBack()
  65 |       await page.waitForTimeout(300)
  66 |     }
  67 |   }
  68 | })
  69 | 
  70 | // 測試 3：通知功能 — 應能看到最新通知
  71 | test("通知功能：應能看到最新系統通知", async ({ page }) => {
  72 |   await page.goto("https://event-ticketing-system-frontend-eight.vercel.app/")
  73 |   await page.click("text=員工登入")
  74 |   await page.fill('input[autocomplete="username"]', REAL_ACCOUNTS.employee.id)
  75 |   await page.fill('input[autocomplete="current-password"]', REAL_ACCOUNTS.employee.password)
  76 |   await page.click('button[type="submit"]')
  77 |   await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })
  78 | 
  79 |   // 前往報名紀錄確認有資料
  80 |   await page.click("text=報名")
  81 |   await page.waitForTimeout(1000)
  82 | 
  83 |   await expect(page).toHaveURL(/\/my-transactions$/)
  84 |   await expect(page.locator("text=我的報名紀錄")).toBeVisible()
  85 | })
```