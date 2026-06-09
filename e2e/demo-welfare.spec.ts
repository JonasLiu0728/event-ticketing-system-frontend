import { test, expect } from "@playwright/test"

const WELFARE = { id: "welfare_001", password: "password123" }

async function login(page: any) {
  await page.goto("/")
  await page.click("text=福委登入")
  await page.fill('input[autocomplete="username"]', WELFARE.id)
  await page.fill('input[autocomplete="current-password"]', WELFARE.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/admin\/events$/, { timeout: 15000 })
}

test.describe("【Demo】福委 - 活動管理", () => {

  test("新增、編輯（改名）、刪除一個活動", async ({ page }) => {
    await login(page)

    const demoName = `[Demo] 測試活動 ${Date.now()}`
    const editedName = `${demoName} - 已編輯`

    // ─── 新增 ───
    await page.click("text=+ 新增活動")
    await expect(page).toHaveURL(/\/admin\/events\/new$/)
    await page.waitForTimeout(1500)

    await page.fill('input[name="name"]', demoName)
    await page.fill('textarea[name="description"]', "Demo 用活動")
    await page.selectOption('select[name="category"]', "sport")
    await page.fill('input[name="location"]', "Demo 地點")
    await page.waitForTimeout(800)

    // 設定時間（活動開始 + 報名截止）
    const now = new Date()
    const eventStart = new Date(now.getTime() + 7 * 86400000)
    const regEnd     = new Date(now.getTime() + 5 * 86400000)
    const pad = (n: number) => String(n).padStart(2, "0")
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

    await page.fill('input[name="eventStartTime"]', fmt(eventStart))
    await page.fill('input[name="eventEndTime"]', fmt(new Date(eventStart.getTime() + 3600000)))
    await page.fill('input[name="registrationEnd"]', fmt(regEnd))
    await page.waitForTimeout(800)

    // 隨便點地圖選一個位置
    await page.locator(".leaflet-container").click({ position: { x: 200, y: 140 } })
    await page.waitForTimeout(1500)

    // 直接發布
    await page.click("text=直接發布")
    await page.waitForTimeout(3000)

    // ─── 編輯 ───
    // 找到剛建立的活動
    const eventRow = page.locator(`text=${demoName}`).first()
    await eventRow.locator("..").locator("..").locator("text=編輯").click()
    await page.waitForTimeout(2000)

    await page.fill('input[name="name"]', editedName)
    await page.waitForTimeout(800)
    await page.click("text=儲存變更")
    await page.waitForTimeout(2500)

    // ─── 刪除 ───
    const editedRow = page.locator(`text=${editedName}`).first()
    page.on("dialog", dialog => dialog.accept())
    await editedRow.locator("..").locator("..").locator("text=刪除").click()
    await page.waitForTimeout(2500)
  })
})

test.describe("【Demo】福委 - 使用者管理", () => {

  test("查看使用者，並示範角色切換（會還原）", async ({ page }) => {
    await login(page)

    await page.click("text=使用者")
    await expect(page).toHaveURL(/\/admin\/users$/)
    await page.waitForTimeout(2000)

    // 篩選看看
    await page.locator("select").nth(0).selectOption("employee")
    await page.waitForTimeout(1500)
    await page.locator("select").nth(0).selectOption("")
    await page.waitForTimeout(1500)

    // 拿第一個 user 的 role select 來示範改回去
    const roleSelect = page.locator("select").nth(2)
    if (await roleSelect.count() > 0) {
      const original = await roleSelect.inputValue()
      await roleSelect.selectOption("hr")
      await page.waitForTimeout(2000)
      // 還原，避免改到 production
      await roleSelect.selectOption(original)
      await page.waitForTimeout(1500)
    }
  })
})