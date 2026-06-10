# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-welfare.spec.ts >> 【Demo】福委 - 活動管理 >> 新增、編輯（改名）、刪除一個活動
- Location: e2e/demo-welfare.spec.ts:16:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="registrationEnd"]')

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
    - heading "新增活動" [level=1] [ref=e15]
    - generic [ref=e16]:
      - generic [ref=e17]:
        - heading "基本資訊" [level=3] [ref=e18]
        - generic [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]: 活動名稱 *
            - textbox "活動名稱" [ref=e22]: "[Demo] 測試活動 1781061355493"
          - generic [ref=e23]:
            - generic [ref=e24]: 活動描述
            - textbox "活動描述" [ref=e25]: Demo 用活動
          - generic [ref=e26]:
            - generic [ref=e27]: 活動類別 *
            - combobox [ref=e28]:
              - option "請選擇類別"
              - option "運動" [selected]
              - option "美食"
              - option "旅遊"
              - option "文藝"
              - option "親子"
              - option "競賽"
              - option "音樂"
          - generic [ref=e29]:
            - generic [ref=e30]: 活動地點 *
            - textbox "活動地點" [ref=e31]: Demo 地點
      - generic [ref=e32]:
        - heading "地理位置（報到用）" [level=3] [ref=e33]
        - generic [ref=e34]:
          - generic [ref=e36]:
            - generic:
              - generic [ref=e37]:
                - button "Zoom in" [ref=e38] [cursor=pointer]: +
                - button "Zoom out" [ref=e39] [cursor=pointer]: −
              - generic [ref=e40]:
                - link "Leaflet" [ref=e41] [cursor=pointer]:
                  - /url: https://leafletjs.com
                  - img [ref=e42]
                  - text: Leaflet
                - text: "| ©"
                - link "OpenStreetMap" [ref=e46] [cursor=pointer]:
                  - /url: https://openstreetmap.org/copyright
          - paragraph [ref=e47]: 點擊地圖選取活動位置
        - generic [ref=e48]:
          - generic [ref=e49]: 報到範圍（公尺）
          - textbox "200" [ref=e50]
      - generic [ref=e51]:
        - heading "時間設定" [level=3] [ref=e52]
        - generic [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]: 活動開始時間 *
            - textbox [ref=e56]: 2026-06-17T03:15
          - generic [ref=e57]:
            - generic [ref=e58]: 活動結束時間
            - textbox [active] [ref=e59]: 2026-06-17T04:15
          - generic [ref=e60]:
            - generic [ref=e61]: 報名開始時間
            - textbox [ref=e62]: 2026-06-10T03:15
          - generic [ref=e63]:
            - generic [ref=e64]: 報名截止時間 *
            - generic [ref=e65]:
              - generic [ref=e66]:
                - spinbutton [ref=e67]
                - generic [ref=e68]: 天後截止
              - generic [ref=e69]:
                - generic [ref=e70]: 或
                - textbox [ref=e71]
      - generic [ref=e72]:
        - heading "報名規則" [level=3] [ref=e73]
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]: 票數限制（留空代表不限制）
            - spinbutton [ref=e77]
          - generic [ref=e78]:
            - generic [ref=e79]: 取消截止時間（留空代表不可取消）
            - textbox [ref=e80]
      - generic [ref=e81]:
        - generic [ref=e82]:
          - heading "常見問題" [level=3] [ref=e83]
          - button "+ 新增問答" [ref=e84]
        - paragraph [ref=e85]: 尚未新增任何問答
      - generic [ref=e86]:
        - button "儲存草稿" [ref=e87]
        - button "直接發布" [ref=e88]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test"
  2  | 
  3  | const WELFARE = { id: "welfare_001", password: "password123" }
  4  | 
  5  | async function login(page: any) {
  6  |   await page.goto("/")
  7  |   await page.click("text=福委登入")
  8  |   await page.fill('input[autocomplete="username"]', WELFARE.id)
  9  |   await page.fill('input[autocomplete="current-password"]', WELFARE.password)
  10 |   await page.click('button[type="submit"]')
  11 |   await expect(page).toHaveURL(/\/admin\/events$/, { timeout: 15000 })
  12 | }
  13 | 
  14 | test.describe("【Demo】福委 - 活動管理", () => {
  15 | 
  16 |   test("新增、編輯（改名）、刪除一個活動", async ({ page }) => {
  17 |     await login(page)
  18 | 
  19 |     const demoName = `[Demo] 測試活動 ${Date.now()}`
  20 |     const editedName = `${demoName} - 已編輯`
  21 | 
  22 |     // ─── 新增 ───
  23 |     await page.click("text=+ 新增活動")
  24 |     await expect(page).toHaveURL(/\/admin\/events\/new$/)
  25 |     await page.waitForTimeout(1500)
  26 | 
  27 |     await page.fill('input[name="name"]', demoName)
  28 |     await page.fill('textarea[name="description"]', "Demo 用活動")
  29 |     await page.selectOption('select[name="category"]', "sport")
  30 |     await page.fill('input[name="location"]', "Demo 地點")
  31 |     await page.waitForTimeout(800)
  32 | 
  33 |     // 設定時間（活動開始 + 報名截止）
  34 |     const now = new Date()
  35 |     const eventStart = new Date(now.getTime() + 7 * 86400000)
  36 |     const regEnd     = new Date(now.getTime() + 5 * 86400000)
  37 |     const pad = (n: number) => String(n).padStart(2, "0")
  38 |     const fmt = (d: Date) =>
  39 |       `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  40 | 
  41 |     await page.fill('input[name="eventStartTime"]', fmt(eventStart))
  42 |     await page.fill('input[name="eventEndTime"]', fmt(new Date(eventStart.getTime() + 3600000)))
> 43 |     await page.fill('input[name="registrationEnd"]', fmt(regEnd))
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  44 |     await page.waitForTimeout(800)
  45 | 
  46 |     // 隨便點地圖選一個位置
  47 |     await page.locator(".leaflet-container").click({ position: { x: 200, y: 140 } })
  48 |     await page.waitForTimeout(1500)
  49 | 
  50 |     // 直接發布
  51 |     await page.click("text=直接發布")
  52 |     await page.waitForTimeout(3000)
  53 | 
  54 |     // ─── 編輯 ───
  55 |     // 找到剛建立的活動
  56 |     const eventRow = page.locator(`text=${demoName}`).first()
  57 |     await eventRow.locator("..").locator("..").locator("text=編輯").click()
  58 |     await page.waitForTimeout(2000)
  59 | 
  60 |     await page.fill('input[name="name"]', editedName)
  61 |     await page.waitForTimeout(800)
  62 |     await page.click("text=儲存變更")
  63 |     await page.waitForTimeout(2500)
  64 | 
  65 |     // ─── 刪除 ───
  66 |     const editedRow = page.locator(`text=${editedName}`).first()
  67 |     page.on("dialog", dialog => dialog.accept())
  68 |     await editedRow.locator("..").locator("..").locator("text=刪除").click()
  69 |     await page.waitForTimeout(2500)
  70 |   })
  71 | })
  72 | 
  73 | test.describe("【Demo】福委 - 使用者管理", () => {
  74 | 
  75 |   test("查看使用者，並示範角色切換（會還原）", async ({ page }) => {
  76 |     await login(page)
  77 | 
  78 |     await page.click("text=使用者")
  79 |     await expect(page).toHaveURL(/\/admin\/users$/)
  80 |     await page.waitForTimeout(2000)
  81 | 
  82 |     // 篩選看看
  83 |     await page.locator("select").nth(0).selectOption("employee")
  84 |     await page.waitForTimeout(1500)
  85 |     await page.locator("select").nth(0).selectOption("")
  86 |     await page.waitForTimeout(1500)
  87 | 
  88 |     // 拿第一個 user 的 role select 來示範改回去
  89 |     const roleSelect = page.locator("select").nth(2)
  90 |     if (await roleSelect.count() > 0) {
  91 |       const original = await roleSelect.inputValue()
  92 |       await roleSelect.selectOption("hr")
  93 |       await page.waitForTimeout(2000)
  94 |       // 還原，避免改到 production
  95 |       await roleSelect.selectOption(original)
  96 |       await page.waitForTimeout(1500)
  97 |     }
  98 |   })
  99 | })
```