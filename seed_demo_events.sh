#!/bin/bash
# 一次塞 7 個 demo 活動到 production 後端
# 用法: chmod +x seed_demo_events.sh && ./seed_demo_events.sh
#
# 需要: jq (Codespaces 預設有裝)

set -u  # 變數未定義就報錯,但不要 set -e (個別失敗繼續跑)

ACCOUNT_API="https://cnticketsystem.xyz/account/v1"
EVENT_API="https://cnticketsystem.xyz/event/v1"
TX_API="https://cnticketsystem.xyz/transaction/v1"

# 檢查 jq
if ! command -v jq &> /dev/null; then
  echo "❌ 需要 jq,請先安裝: sudo apt-get install -y jq"
  exit 1
fi

# === 登入福委 ===
echo "🔑 登入福委 (welfare_001)..."
WELFARE_TOKEN=$(curl -s -X POST "$ACCOUNT_API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"welfare_001","password":"password123","role":"welfare_member"}' \
  | jq -r '.data.token // empty')

if [ -z "$WELFARE_TOKEN" ]; then
  echo "❌ 福委登入失敗,確認帳密與後端連線"
  exit 1
fi
echo "✅ 福委登入成功"
echo ""

# === Helper: 算 ISO 日期 ===
iso_date() {
  date -u -d "$1" +"%Y-%m-%dT%H:%M:%S.000Z"
}

# === Helper: 建立活動 (progress 到 stderr,event_id 到 stdout) ===
create_event() {
  local name="$1"
  local category="$2"
  local location="$3"
  local lat="$4"
  local lng="$5"
  local reg_start="$6"
  local reg_end="$7"
  local event_start="$8"
  local event_end="$9"
  local ticket_limit="${10}"
  local description="${11}"

  local body=$(cat <<EOF
{
  "name": "$name",
  "description": "$description",
  "category": "$category",
  "location": "$location",
  "latitude": $lat,
  "longitude": $lng,
  "checkinRadiusMeters": 200,
  "eventStartTime": "$event_start",
  "eventEndTime": "$event_end",
  "registrationStart": "$reg_start",
  "registrationEnd": "$reg_end",
  "ticketLimit": $ticket_limit,
  "cancellationDeadline": "$event_start",
  "isDraft": false,
  "faqs": []
}
EOF
)

  local response=$(curl -s -X POST "$EVENT_API/events" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WELFARE_TOKEN" \
    -d "$body")

  local event_id=$(echo "$response" | jq -r '.data.eventId // empty')
  if [ -z "$event_id" ]; then
    echo "  ❌ 建立 \"$name\" 失敗: $(echo "$response" | jq -c '.error // .')" >&2
    return 1
  fi
  echo "  ✅ \"$name\"  →  $event_id" >&2
  echo "$event_id"
}

# === Helper: 員工填票 (讓活動進入候補狀態) ===
EMPLOYEE_TOKEN=""
employee_login() {
  if [ -n "$EMPLOYEE_TOKEN" ]; then return 0; fi
  EMPLOYEE_TOKEN=$(curl -s -X POST "$ACCOUNT_API/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"employeeId":"1000001","password":"password123","role":"employee"}' \
    | jq -r '.data.token // empty')
  if [ -z "$EMPLOYEE_TOKEN" ]; then
    echo "  ⚠️ 員工 1000001 登入失敗,候補狀態可能無法觸發" >&2
    return 1
  fi
}

fill_ticket() {
  local event_id="$1"
  employee_login || return 1
  local response=$(curl -s -X POST "$TX_API/transactions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -d "{\"eventId\":\"$event_id\",\"guestCount\":0,\"dietType\":\"none\",\"selfDriving\":false,\"saveAutofill\":false}")
  local status=$(echo "$response" | jq -r '.data.status // empty')
  if [ "$status" = "confirmed" ]; then
    echo "     ↳ 員工已報名,票位已填滿 → 後續會顯示候補中" >&2
  else
    echo "     ↳ ⚠️ 填票結果: $(echo "$response" | jq -c '.')" >&2
  fi
}

# ====================================================
# 開始建立活動
# ====================================================
echo "📅 開始建立活動..."
echo ""

# ─── 報名中 (3 個) ────────────────────────────
echo "── 報名中 ──"

create_event \
  "2026 春季當代藝術畫展" "culture" \
  "台北市立美術館" 25.0723 121.5247 \
  "$(iso_date '-3 days')" "$(iso_date '+14 days')" \
  "$(iso_date '+20 days')" "$(iso_date '+20 days +4 hours')" \
  80 "結合本地與國際藝術家的當代視覺藝術展覽" > /dev/null

create_event \
  "Q2 部門季度聚餐" "food" \
  "信義區晶華軒" 25.0337 121.5645 \
  "$(iso_date '-1 day')" "$(iso_date '+7 days')" \
  "$(iso_date '+10 days')" "$(iso_date '+10 days +3 hours')" \
  50 "部門季度聚餐,提供素食與葷食選擇" > /dev/null

create_event \
  "公司棒球友誼賽" "contest" \
  "天母棒球場" 25.1175 121.5311 \
  "$(iso_date '-2 days')" "$(iso_date '+12 days')" \
  "$(iso_date '+18 days')" "$(iso_date '+18 days +4 hours')" \
  40 "公司部門間棒球友誼賽,歡迎攜帶家屬觀賽" > /dev/null

# ─── 候補中 (3 個, ticketLimit=1 然後立刻填掉) ─────
echo ""
echo "── 候補中 ──"

ID=$(create_event \
  "員工兩天一夜南投旅遊" "travel" \
  "南投日月潭" 23.8590 120.9151 \
  "$(iso_date '-5 days')" "$(iso_date '+15 days')" \
  "$(iso_date '+25 days')" "$(iso_date '+26 days')" \
  1 "兩天一夜深度遊覽日月潭與周邊景點") && fill_ticket "$ID"

ID=$(create_event \
  "2026 春日城市馬拉松" "sport" \
  "大安森林公園" 25.0301 121.5359 \
  "$(iso_date '-4 days')" "$(iso_date '+10 days')" \
  "$(iso_date '+16 days')" "$(iso_date '+16 days +5 hours')" \
  1 "10K 城市跑步活動,完賽即可獲得紀念衫") && fill_ticket "$ID"

ID=$(create_event \
  "年終感恩音樂會" "music" \
  "國家音樂廳" 25.0354 121.5208 \
  "$(iso_date '-2 days')" "$(iso_date '+9 days')" \
  "$(iso_date '+14 days')" "$(iso_date '+14 days +2 hours')" \
  1 "邀請知名樂團演出的年終感恩音樂會") && fill_ticket "$ID"

# ─── 已結束 (1 個) ────────────────────────────
echo ""
echo "── 已結束 ──"

create_event \
  "親子日:小小工程師體驗營" "family" \
  "新北市兒童樂園" 25.0729 121.5161 \
  "$(iso_date '-30 days')" "$(iso_date '-20 days')" \
  "$(iso_date '-15 days')" "$(iso_date '-15 days +5 hours')" \
  30 "讓員工子女體驗工程師工作日常的互動活動" > /dev/null

echo ""
echo "🎉 完成!打開 /events 看看效果"