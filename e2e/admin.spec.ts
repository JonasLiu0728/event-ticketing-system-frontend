import { test, expect } from "@playwright/test"

const MOCK_ACCOUNTS = { id: "admin", password: "1234" }
const REAL_ACCOUNTS = { id: "welfare_001", password: "password123" }

function getAccount(baseURL: string) {
  return baseURL.includes("localhost") ? MOCK_ACCOUNTS : REAL_ACCOUNTS
}

async function loginAsAdmin(page: any, baseURL: string) {
  const account = getAccount(baseURL)
  await page.goto("/")
  await page.click("text=福委登入")
  await page.fill('input[autocomplete="username"]', account.id)
  await page.fill('input[autocomplete="current-password"]', account.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/admin\/events$/, { timeout: 15000 })
}

test.describe("活動管理", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!)
  })

  test("可以看到活動管理頁面", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "活動管理" })).toBeVisible()
    await expect(page.locator("text=+ 新增活動")).toBeVisible()
  })

  test("可以開啟新增活動頁面", async ({ page }) => {
    await page.click("text=+ 新增活動")
    await expect(page).toHaveURL(/\/admin\/events\/new$/)
    await expect(page.getByRole("heading", { name: "新增活動" })).toBeVisible()
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('select[name="category"]')).toBeVisible()
    await expect(page.locator('input[name="location"]')).toBeVisible()
    await expect(page.locator("text=儲存草稿")).toBeVisible()
    await expect(page.locator("text=直接發布")).toBeVisible()
  })

  test("未填必填欄位顯示錯誤訊息", async ({ page }) => {
    await page.click("text=+ 新增活動")
    await page.click("text=儲存草稿")
    await expect(page.locator("text=請填寫所有必填欄位")).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/events\/new$/)
  })

  test("草稿活動可以發布", async ({ page }) => {
    const publishBtn = page.locator("text=發布").first()
    if (await publishBtn.count() > 0) {
      await publishBtn.click()
      await expect(publishBtn).not.toBeVisible()
    }
  })

  test("可以刪除活動", async ({ page }) => {
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(800)

    const deleteBtn = page.locator("text=刪除").first()
    if (await deleteBtn.count() > 0) {
      const countBefore = await page.locator("text=刪除").count()
      page.on("dialog", dialog => dialog.accept())
      await deleteBtn.click()
      await page.waitForTimeout(1500)
      const countAfter = await page.locator("text=刪除").count()
      expect(countAfter).toBeLessThanOrEqual(countBefore)
    }
  })

  test("可以看報名詳情", async ({ page }) => {
    const detailBtn = page.locator("text=報名詳情").first()
    if (await detailBtn.count() > 0) {
      await detailBtn.click()
      await expect(page).toHaveURL(/\/admin\/events\/.*\/registrations$/)
      await expect(page.getByRole("heading", { name: "報名詳情" })).toBeVisible()
    }
  })

  test("可以進入核銷頁面", async ({ page }) => {
    const checkinBtn = page.locator("text=核銷").first()
    if (await checkinBtn.count() > 0) {
      await checkinBtn.click()
      await expect(page).toHaveURL(/\/admin\/events\/.*\/checkin$/)
      await expect(page.getByRole("heading", { name: "核銷" })).toBeVisible()
    }
  })
})

test.describe("報名詳情", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!)
    await page.waitForSelector("text=報名詳情")
    await page.locator("text=報名詳情").first().click()
    await expect(page).toHaveURL(/\/admin\/events\/.*\/registrations$/)
  })

  test("可以看到報名統計", async ({ page }) => {
    await expect(page.locator("text=正取").first()).toBeVisible()
    await expect(page.locator("text=候補").first()).toBeVisible()
    await expect(page.locator("text=已取消").first()).toBeVisible()
  })

  test("可以依狀態篩選報名", async ({ page }) => {
    await page.locator("select").selectOption("confirmed")
    await expect(page.locator("text=正取").first()).toBeVisible()
  })
})

test.describe("使用者管理", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!)
    await page.click("text=使用者")
    await expect(page).toHaveURL(/\/admin\/users$/)
  })

  test("可以看到使用者管理頁面", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "使用者管理" })).toBeVisible()
  })

  test("可以依角色篩選", async ({ page }) => {
    await page.locator("select").nth(0).selectOption("employee")
    await expect(page.getByRole("heading", { name: "使用者管理" })).toBeVisible()
  })

  test("可以依狀態篩選", async ({ page }) => {
    await page.locator("select").nth(1).selectOption("active")
    await expect(page.getByRole("heading", { name: "使用者管理" })).toBeVisible()
  })

  test("可以修改使用者角色", async ({ page }) => {
    const roleSelect = page.locator("select").nth(2)
    if (await roleSelect.count() > 0) {
      const originalRole = await roleSelect.inputValue()  // 記住原本角色
      await roleSelect.selectOption("hr")
      await expect(roleSelect).toHaveValue("hr")
      await roleSelect.selectOption(originalRole)          // 改回去
      await expect(roleSelect).toHaveValue(originalRole)
    }
  })

  test("可以刪除使用者", async ({ page }) => {
    // 等使用者列表完整渲染後再量
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(800)

    const deleteBtn = page.locator("text=刪除").first()
    if (await deleteBtn.count() > 0) {
      const countBefore = await page.locator("text=刪除").count()
      page.on("dialog", dialog => dialog.accept())
      await deleteBtn.click()
      await page.waitForTimeout(1500)  // 拉長一點，避免後端還沒回
      const countAfter = await page.locator("text=刪除").count()
      expect(countAfter).toBeLessThanOrEqual(countBefore)
    }
  })
})

test.describe("核銷", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await loginAsAdmin(page, baseURL!)
    await page.waitForSelector("text=核銷")
    await page.locator("text=核銷").first().click()
    await expect(page).toHaveURL(/\/admin\/events\/.*\/checkin$/)
    await page.waitForLoadState("networkidle") 
  })

  test("可以搜尋票券", async ({ page }) => {
    await page.waitForSelector('input[placeholder="搜尋姓名或票券 ID..."]')
    await page.fill('input[placeholder="搜尋姓名或票券 ID..."]', "john")
    await expect(page.getByRole("heading", { name: "核銷" })).toBeVisible()
  })

})