import { test, expect } from "@playwright/test"

const ACCOUNT_API = "https://cnticketsystem.xyz/account/v1"
const EVENT_API   = "https://cnticketsystem.xyz/event/v1"
const TX_API      = "https://cnticketsystem.xyz/transaction/v1"

const WELFARE  = { employeeId: "welfare_001", password: "password123", role: "welfare_member" }
const EMPLOYEE = { employeeId: "1000001",     password: "password123", role: "employee" }
const HR       = { id: "hr_001", password: "password123" }

async function loginAPI(account: any): Promise<string> {
  const res = await fetch(`${ACCOUNT_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`登入失敗: ${JSON.stringify(json)}`)
  return json.data.token
}

async function loginUI(page: any) {
  await page.goto("/")
  await page.click("text=HR 登入")
  await page.fill('input[autocomplete="username"]', HR.id)
  await page.fill('input[autocomplete="current-password"]', HR.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/admin\/hr$/, { timeout: 15000 })
}

test.describe.configure({ mode: "serial" })

test.describe("【Demo】HR", () => {
  let welfareToken:  string
  let userToken:     string
  let eventId:       string
  let eventName:     string
  let transactionId: string

  test.beforeAll(async () => {
    welfareToken = await loginAPI(WELFARE)
    userToken    = await loginAPI(EMPLOYEE)

    eventName = `[Demo] HR 示範 ${Date.now()}`
    const now = Date.now()

    // 建活動
    const eventRes = await fetch(`${EVENT_API}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${welfareToken}`,
      },
      body: JSON.stringify({
        name: eventName,
        description: "HR demo 用",
        category: "sport",
        location: "Demo 地點",
        latitude: 24.8066,
        longitude: 120.9686,
        checkinRadiusMeters: 200,
        eventStartTime:    new Date(now + 7 * 86400000).toISOString(),
        eventEndTime:      new Date(now + 7 * 86400000 + 3600000).toISOString(),
        registrationStart: new Date(now - 60000).toISOString(),
        registrationEnd:   new Date(now + 6 * 86400000).toISOString(),
        ticketLimit: 30,
        isDraft: false,
      }),
    })
    const eventJson = await eventRes.json()
    eventId = eventJson.data?.eventId
    expect(eventId, `活動建立失敗: ${JSON.stringify(eventJson)}`).toBeTruthy()

    // 員工報名一筆，讓 HR 統計報表有資料看
    const txRes = await fetch(`${TX_API}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        eventId, guestCount: 0, dietType: "none",
        selfDriving: false, saveAutofill: false,
      }),
    })
    const txJson = await txRes.json()
    transactionId = txJson.data?.transactionId
  })

  test.afterAll(async () => {
    if (transactionId) {
      await fetch(`${TX_API}/transactions/${transactionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      }).catch(() => {})
    }
    if (eventId) {
      await fetch(`${EVENT_API}/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${welfareToken}` },
      }).catch(() => {})
    }
  })

  test("查看統計報表並搜尋", async ({ page }) => {
    await loginUI(page)

    await expect(page.getByRole("heading", { name: "統計報表" })).toBeVisible()
    await page.waitForTimeout(2000)

    // 往下滑
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(1500)
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(1500)

    // 搜尋我們的 demo 活動
    await page.fill('input[placeholder="搜尋活動..."]', "[Demo]")
    await page.waitForTimeout(2500)

    await expect(page.locator(`text=${eventName}`)).toBeVisible({ timeout: 10000 })
  })

  test("從統計頁進入這場活動的報名名單", async ({ page }) => {
    await loginUI(page)

    await page.fill('input[placeholder="搜尋活動..."]', "[Demo]")
    await page.waitForTimeout(2000)

    // 點剛剛 demo 活動旁邊的「詳細名單」
    const card = page.locator(`text=${eventName}`).first().locator("../..")
    await card.locator("text=詳細名單").click()
    await expect(page).toHaveURL(/\/admin\/events\/.*\/registrations$/)
    await page.waitForTimeout(2500)

    // 切換不同狀態篩選
    await page.locator("select").selectOption("confirmed")
    await page.waitForTimeout(1500)
    await page.locator("select").selectOption("waitlist")
    await page.waitForTimeout(1500)
    await page.locator("select").selectOption("")
    await page.waitForTimeout(1500)
  })

  test("HR 也可以瀏覽活動列表", async ({ page }) => {
    await loginUI(page)

    await page.locator("nav").getByText("活動", { exact: true }).click()
    await expect(page).toHaveURL(/\/events$/)
    await page.waitForTimeout(2000)

    const card = page.locator('[data-testid="event-card"]').first()
    if (await card.count() > 0) {
      await card.click()
      await page.waitForTimeout(2500)
    }
  })
})