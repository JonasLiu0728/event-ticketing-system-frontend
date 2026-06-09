import { test, expect } from "@playwright/test"

const ACCOUNT_API = "https://cnticketsystem.xyz/account/v1"
const EVENT_API   = "https://cnticketsystem.xyz/event/v1"
const TX_API      = "https://cnticketsystem.xyz/transaction/v1"
const TICKET_API  = "https://cnticketsystem.xyz/ticket/v1"

const WELFARE = { employeeId: "welfare_001", password: "password123", role: "welfare_member" }
const USER    = { employeeId: "1000001",    password: "password123", role: "employee" }

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

test.describe("核銷流程", () => {
  let welfareToken: string
  let userToken: string
  let eventId: string
  let ticketId: string
  let transactionId: string

  test.beforeAll(async () => {
    welfareToken = await login(WELFARE)
    userToken = await login(USER)

    const now = Date.now()
    const eventRes = await fetch(`${EVENT_API}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${welfareToken}`,
      },
      body: JSON.stringify({
        name: `[自動測試] 核銷流程 ${new Date().toISOString().slice(0, 16)}`,
        description: "核銷自動測試用，請勿手動操作",
        category: "sport",
        location: "測試地點",
        latitude: 24.8066,
        longitude: 120.9686,
        checkinRadiusMeters: 200,
        eventStartTime:    new Date(now - 60_000).toISOString(),        // 1 分鐘前開始
        eventEndTime:      new Date(now + 2 * 3600_000).toISOString(),  // 2 小時後結束
        registrationStart: new Date(now - 120_000).toISOString(),       // 2 分鐘前開放報名
        registrationEnd:   new Date(now + 3600_000).toISOString(),      // 1 小時後截止報名
        ticketLimit: 10,
        isDraft: false,
      }),
    })
    const eventJson = await eventRes.json()
    eventId = eventJson.data?.eventId
    expect(eventId, `活動建立失敗: ${JSON.stringify(eventJson)}`).toBeTruthy()

    // 使用者報名取得票券
    const txRes = await fetch(`${TX_API}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        eventId,
        guestCount: 0,
        dietType: "none",
        selfDriving: false,
        saveAutofill: false,
      }),
    })
    const txJson = await txRes.json()
    transactionId = txJson.data?.transactionId
    ticketId = txJson.data?.ticketId
    expect(ticketId, `報名應該要拿到 ticketId: ${JSON.stringify(txJson)}`).toBeTruthy()
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

  test("核銷前票券狀態應為 unused", async () => {
    const res = await fetch(`${TICKET_API}/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const json = await res.json()
    expect(json.data.status).toBe("unused")
  })

  test("福委核銷後票券狀態變為 used，checkedInAt 有值", async () => {
    const checkinRes = await fetch(`${TICKET_API}/tickets/${ticketId}/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${welfareToken}`,
      },
      body: JSON.stringify({ latitude: 24.8066, longitude: 120.9686 }),
    })
    expect(checkinRes.status).toBe(200)

    const checkinJson = await checkinRes.json()
    expect(checkinJson.data.checkedIn).toBe(true)
    expect(checkinJson.data.checkedInAt).toBeTruthy()

    // 再查一次票券確認 status 真的變了
    const ticketRes = await fetch(`${TICKET_API}/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const ticketJson = await ticketRes.json()
    expect(ticketJson.data.status).toBe("used")
  })

  test("重複核銷同一張票，狀態仍為 used（冪等性）", async () => {
    const res = await fetch(`${TICKET_API}/tickets/${ticketId}/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${welfareToken}`,
      },
      body: JSON.stringify({ latitude: 24.8066, longitude: 120.9686 }),
    })
    expect(res.status).toBe(200)

    const ticketRes = await fetch(`${TICKET_API}/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const ticketJson = await ticketRes.json()
    expect(ticketJson.data.status).toBe("used")
  })
})