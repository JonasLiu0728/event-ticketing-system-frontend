import { test, expect } from "@playwright/test"

const ACCOUNT_API = "https://cnticketsystem.xyz/account/v1"
const EVENT_API   = "https://cnticketsystem.xyz/event/v1"
const TX_API      = "https://cnticketsystem.xyz/transaction/v1"

const WELFARE  = { employeeId: "welfare_001", password: "password123", role: "welfare_member" }
const EMPLOYEE = { employeeId: "1000001",     password: "password123", role: "employee" }

async function loginAPI(account: typeof WELFARE): Promise<string> {
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
  await page.click("text=員工登入")
  await page.fill('input[autocomplete="username"]', EMPLOYEE.employeeId)
  await page.fill('input[autocomplete="current-password"]', EMPLOYEE.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/events$/, { timeout: 15000 })
}

test.describe.configure({ mode: "serial" })  // 確保依序執行

test.describe("【Demo】員工", () => {
  let welfareToken: string
  let userToken:    string
  let eventId:      string
  let eventName:    string

  test.beforeAll(async () => {
    welfareToken = await loginAPI(WELFARE)
    userToken    = await loginAPI(EMPLOYEE)

    eventName = `[Demo] 員工示範 ${Date.now()}`
    const now = Date.now()
    const res = await fetch(`${EVENT_API}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${welfareToken}`,
      },
      body: JSON.stringify({
        name: eventName,
        description: "Demo 用，請勿手動操作",
        category: "sport",
        location: "Demo 地點",
        latitude: 24.8066,
        longitude: 120.9686,
        checkinRadiusMeters: 200,
        eventStartTime:    new Date(now + 7 * 86400000).toISOString(),
        eventEndTime:      new Date(now + 7 * 86400000 + 3600000).toISOString(),
        registrationStart: new Date(now - 60000).toISOString(),
        registrationEnd:   new Date(now + 6 * 86400000).toISOString(),
        cancellationDeadline: new Date(now + 5 * 86400000).toISOString(),
        ticketLimit: 50,
        isDraft: false,
      }),
    })
    const json = await res.json()
    eventId = json.data?.eventId
    expect(eventId, `活動建立失敗: ${JSON.stringify(json)}`).toBeTruthy()
  })

  test.afterAll(async () => {
    // 如果測試結束時還有報名，先取消（避免活動無法刪除）
    try {
      const txRes = await fetch(`${TX_API}/transactions`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      const txJson = await txRes.json()
      const tx = (txJson.data ?? []).find((t: any) => t.eventId === eventId && t.status === "confirmed")
      if (tx) {
        await fetch(`${TX_API}/transactions/${tx.transactionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${userToken}` },
        }).catch(() => {})
      }
    } catch {}

    if (eventId) {
      await fetch(`${EVENT_API}/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${welfareToken}` },
      }).catch(() => {})
    }
  })

  test("瀏覽活動列表並切換排序", async ({ page }) => {
    await loginUI(page)

    await page.click("text=最熱門")
    await page.waitForTimeout(1500)
    await page.click("text=報名中")
    await page.waitForTimeout(1500)
    await page.click("text=為你推薦")
    await page.waitForTimeout(1500)
  })

  test("點進活動詳情並報名", async ({ page }) => {
    await loginUI(page)

    // 直接導向我們建立的 demo 活動
    await page.goto(`/events/${eventId}`)
    await expect(page.locator(`text=${eventName}`)).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1500)

    // 選飲食、勾自行開車
    await page.locator("select").first().selectOption("veg")
    await page.waitForTimeout(800)
    await page.locator('input[type="checkbox"]').check()
    await page.waitForTimeout(800)

    // 點報名
    await page.click("text=立即報名")
    await page.waitForTimeout(2500)

    // 應該變成「您已報名此活動」
    await expect(page.locator("text=您已報名此活動")).toBeVisible({ timeout: 10000 })
  })

  test("查看報名紀錄並往下滑", async ({ page }) => {
    await loginUI(page)

    await page.click("text=報名")
    await expect(page).toHaveURL(/\/my-transactions$/)
    await page.waitForTimeout(2000)

    // 應該能看到剛剛報的活動
    await expect(page.locator(`text=${eventName}`)).toBeVisible({ timeout: 10000 })

    // 往下滑
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(1000)
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(1000)

    // 點「查看票券」
    const viewTicketBtn = page.locator("text=查看票券").first()
    if (await viewTicketBtn.count() > 0) {
      await viewTicketBtn.click()
      await page.waitForTimeout(2500)
    }
  })

  test("從票券頁進入票券詳情", async ({ page }) => {
    await loginUI(page)

    await page.click("text=票券")
    await expect(page).toHaveURL(/\/my-tickets$/)
    await page.waitForTimeout(1500)

    // 找剛剛活動的票券
    const ticketCard = page.locator(`text=${eventName}`).first()
    if (await ticketCard.count() > 0) {
      await ticketCard.click()
      await page.waitForTimeout(2500)
    }
  })

  test("取消這筆報名", async ({ page }) => {
    await loginUI(page)

    await page.click("text=報名")
    await expect(page).toHaveURL(/\/my-transactions$/)
    await page.waitForTimeout(1500)

    // 找剛剛建立的活動，點旁邊的取消報名
    const card = page.locator(`text=${eventName}`).first().locator("../..")
    const cancelBtn = card.locator("text=取消報名")
    if (await cancelBtn.count() > 0) {
      page.on("dialog", dialog => dialog.accept())
      await cancelBtn.click()
      await page.waitForTimeout(2500)
    }
  })

  test("調整個人活動偏好與飲食需求", async ({ page }) => {
    await loginUI(page)

    await page.click("text=個人")
    await expect(page).toHaveURL(/\/profile$/)
    await page.waitForTimeout(1500)

    await page.click("text=🏃 運動")
    await page.waitForTimeout(800)
    await page.click("text=🍽️ 美食")
    await page.waitForTimeout(800)
    await page.click("text=🎵 音樂")
    await page.waitForTimeout(800)

    await page.selectOption("select", "veg")
    await page.waitForTimeout(800)

    await page.click("text=儲存")
    await expect(
      page.locator("text=✓ 已儲存").or(page.locator("text=儲存中..."))
    ).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(2000)
  })
})