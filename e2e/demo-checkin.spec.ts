import { test, expect } from "@playwright/test"

const ACCOUNT_API = "https://cnticketsystem.xyz/account/v1"
const EVENT_API   = "https://cnticketsystem.xyz/event/v1"
const TX_API      = "https://cnticketsystem.xyz/transaction/v1"

const WELFARE  = { employeeId: "welfare_001", password: "password123", role: "welfare_member" }
const EMPLOYEE = { employeeId: "1000001",     password: "password123", role: "employee" }

// 活動地點：清大附近
const EVENT_LAT = 24.8066
const EVENT_LNG = 120.9686
// 範圍外：台北 101
const FAR_LAT = 25.0339
const FAR_LNG = 121.5645

async function login(account: typeof WELFARE): Promise<string> {
  const res = await fetch(`${ACCOUNT_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`登入失敗: ${JSON.stringify(json)}`)
  return json.data.token
}

test.describe("【Demo】員工報到 - 兩種情境", () => {
  let welfareToken: string
  let userToken: string
  let eventId: string
  let ticketId: string
  let transactionId: string

  test.beforeAll(async () => {
    welfareToken = await login(WELFARE)
    userToken    = await login(EMPLOYEE)

    // 建立進行中活動（eventStart 在過去，eventEnd 在未來）
    const now = Date.now()
    const eventRes = await fetch(`${EVENT_API}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${welfareToken}`,
      },
      body: JSON.stringify({
        name: `[Demo] 報到示範 ${new Date().toISOString().slice(0, 16)}`,
        description: "報到 demo 用",
        category: "sport",
        location: "清大",
        latitude: EVENT_LAT,
        longitude: EVENT_LNG,
        checkinRadiusMeters: 200,
        eventStartTime:    new Date(now - 60_000).toISOString(),
        eventEndTime:      new Date(now + 2 * 3600_000).toISOString(),
        registrationStart: new Date(now - 120_000).toISOString(),
        registrationEnd:   new Date(now + 3600_000).toISOString(),
        ticketLimit: 10,
        isDraft: false,
      }),
    })
    const eventJson = await eventRes.json()
    eventId = eventJson.data.eventId

    // 員工報名
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
    transactionId = txJson.data.transactionId
    ticketId      = txJson.data.ticketId
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

  test("情境 A：位置不在範圍內，報到失敗", async ({ browser }) => {
    // 把位置設在台北 101
    const context = await browser.newContext({
      geolocation: { latitude: FAR_LAT, longitude: FAR_LNG },
      permissions: ["geolocation"],
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: "test-results/" },
    })
    const page = await context.newPage()

    await page.goto("/")
    await page.click("text=員工登入")
    await page.fill('input[autocomplete="username"]', EMPLOYEE.employeeId)
    await page.fill('input[autocomplete="current-password"]', EMPLOYEE.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })

    // 直接導去票券詳情
    await page.goto(`/my-tickets/${ticketId}`)
    await page.waitForTimeout(2000)

    // 點報到
    await page.click("text=報到")
    await page.waitForTimeout(3000)

    // 應該看到失敗訊息
    await expect(
      page.locator("text=範圍").or(page.locator("text=失敗"))
    ).toBeVisible({ timeout: 10000 })

    await context.close()
  })

  test("情境 B：位置在範圍內，報到成功", async ({ browser }) => {
    // 把位置設在活動地點
    const context = await browser.newContext({
      geolocation: { latitude: EVENT_LAT, longitude: EVENT_LNG },
      permissions: ["geolocation"],
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: "test-results/" },
    })
    const page = await context.newPage()

    await page.goto("/")
    await page.click("text=員工登入")
    await page.fill('input[autocomplete="username"]', EMPLOYEE.employeeId)
    await page.fill('input[autocomplete="current-password"]', EMPLOYEE.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })

    await page.goto(`/my-tickets/${ticketId}`)
    await page.waitForTimeout(2000)

    await page.click("text=報到")
    await page.waitForTimeout(3000)

    // 應該看到成功訊息或變成已報到
    await expect(
      page.locator("text=成功").or(page.locator("text=已報到"))
    ).toBeVisible({ timeout: 10000 })

    await context.close()
  })
})