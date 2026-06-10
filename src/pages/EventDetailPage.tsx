import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getEventById } from "../api/events"
import { checkEligibility, createTransaction } from "../api/transactions"
import { getMe } from "../api/auth"
import type { Event } from "../types"
import PageTransition from "../components/PageTransition"
import Toast from "../components/Toast"
import { useToast } from "../hooks/useToast"
import { useDebounce } from "../hooks/useDebounce"
import { isUnlimitedTicket } from "../utils/eventStatus"

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  not_open:    { label: "尚未開始報名", color: "text-zinc-400",   bg: "bg-zinc-800" },
  registering: { label: "報名中",       color: "text-emerald-400", bg: "bg-emerald-900/30" },
  waitlist:    { label: "候補登記",     color: "text-amber-400",   bg: "bg-amber-900/30" },
  closed:      { label: "報名截止",     color: "text-red-400",     bg: "bg-red-900/30" },
  ended:       { label: "活動結束",     color: "text-zinc-500",    bg: "bg-zinc-800" },
}

function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { toast, showToast } = useToast()
  const queryClient = useQueryClient()

  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [dietType, setDietType] = useState<"veg" | "non-veg" | null>(null)
  const [selfDriving, setSelfDriving] = useState(false)
  const [guestCount, setGuestCount] = useState(0)
  const [registering, setRegistering] = useState(false)
  const [waitlisted, setWaitlisted] = useState(false)
  const [autofillApplied, setAutofillApplied] = useState(false)

  // 活動靜態資料：5 分鐘快取（不包含即時票數）
  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["event", eventId],
    queryFn: ({ signal }) => getEventById(eventId!, signal),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5,
  })

  // 報名資格 + 即時剩餘票數：每次都重新確認（staleTime: 0）
  const { data: eligibility, refetch: refetchEligibility } = useQuery({
    queryKey: ["eligibility", eventId],
    queryFn: ({ signal }) => checkEligibility(eventId!, signal),
    enabled: !!eventId,
    staleTime: 0,
  })

  // 使用者個人資料：帶入 autofill 設定，5 分鐘快取
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => getMe(signal),
    staleTime: 1000 * 60 * 5,
  })

  // 當使用者資料載入後，自動帶入 autofill 偏好（只帶入一次）
  useEffect(() => {
    if (me && !autofillApplied) {
      setDietType(me.dietType)
      setSelfDriving(me.selfDriving ?? false)
      setAutofillApplied(true)
    }
  }, [me, autofillApplied])

  useEffect(() => {
    if (eligibility?.reason === "ALREADY_REGISTERED") {
      setAlreadyRegistered(true)
    }
  }, [eligibility])

  async function handleRegisterAction() {
    if (!eventId || registering) return
    setRegistering(true)
    try {
      const result = await createTransaction({
        eventId,
        guestCount,
        dietType: dietType ?? "none",
        selfDriving,
        saveAutofill: false,
      })

      // ⚠️ 後端可能因為名額剛好被搶完而把你放入候補,要看 status
      if (result.status === "waitlist") {
        showToast(
          `名額已被搶完,已加入候補名單${
            result.waitlistNumber ? `(第 ${result.waitlistNumber} 號)` : ""
          }`,
          "warning"
        )
        setWaitlisted(true)
      } else if (result.status === "confirmed") {
        showToast("報名成功!", "success")
        setAlreadyRegistered(true)
      } else {
        // 不該發生的狀態
        showToast("報名狀態異常,請重新整理確認", "error")
      }

      queryClient.invalidateQueries({ queryKey: ["event", eventId] })
      queryClient.invalidateQueries({ queryKey: ["eligibility", eventId] })
      queryClient.invalidateQueries({ queryKey: ["events"] })
    } catch (err: any) {
      const code = err?.code
      if (code === "ALREADY_REGISTERED") {
        showToast("您已報名此活動", "info")
        setAlreadyRegistered(true)
      } else if (code === "NO_TICKETS") {
        // 後端如果走 409 路線就走這裡(spec 兩種都可能)
        showToast("差一點!名額剛好在此時售完,已自動為您加入候補名單", "warning")
        setWaitlisted(true)
        refetchEligibility()
      } else if (code === "ACCOUNT_LOCKED") {
        showToast("帳號已被鎖定,無法報名", "error")
      } else {
        showToast(err?.message ?? "報名失敗,請稍後再試", "error")
      }
    } finally {
      setRegistering(false)
    }
  }

  const handleRegister = useDebounce(handleRegisterAction, 500)

  function getActionButton() {
    if (!event) return null

    if (!eligibility) {
      return (
        <button disabled className="w-full py-3 rounded-xl bg-zinc-700 disabled:opacity-50 text-zinc-400 font-semibold">
          載入中...
        </button>
      )
    }

    if (alreadyRegistered) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-400 text-sm text-center">
          您已報名此活動
        </div>
      )
    }

    if (waitlisted) {
      return (
        <div className="bg-amber-900/30 border border-amber-800 rounded-xl px-4 py-3 text-amber-400 text-sm text-center">
          已加入候補名單
        </div>
      )
    }

    if (!eligibility.eligible) {
      const reason = eligibility.reason
      if (reason === "LOCKED") {
        const unlockAt = eligibility.unlockAt
          ? new Date(eligibility.unlockAt).toLocaleDateString("zh-TW")
          : "不明"
        return (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
            帳號已被鎖定，無法報名（預計 {unlockAt} 解鎖）
          </div>
        )
      }
      if (reason === "ALREADY_REGISTERED") {
        return (
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-400 text-sm text-center">
            您已報名此活動
          </div>
        )
      }
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-500 text-sm text-center">
          目前無法報名
        </div>
      )
    }

    // 活動本身要在可動作的狀態，否則顯示無法報名
    const isActionable = event.status === "registering" || event.status === "waitlist"
    if (!isActionable) {
      const reasonText =
        event.status === "closed" ? "報名已截止"
        : event.status === "ended" ? "活動已結束"
        : "活動尚未開放報名"
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-500 text-sm text-center">
          目前無法報名（{reasonText}）
        </div>
      )
    }

    // 由 eligibility（即時資料）決定是正取還是候補
    if (eligibility.isWaitlist) {
      return (
        <button
          onClick={handleRegister}
          disabled={registering}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold transition-colors"
        >
          {registering ? "處理中..." : "加入候補"}
        </button>
      )
    }

    return (
      <button
        onClick={handleRegister}
        disabled={registering}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        {registering ? "報名中..." : "立即報名"}
      </button>
    )
  }

  if (eventLoading) return (
    <div className="text-center py-16 text-zinc-500">載入中...</div>
  )

  if (!event) return (
    <div className="text-center py-16 text-zinc-500">找不到活動</div>
  )

  const config = STATUS_CONFIG[event.status] ?? { label: event.status, color: "text-zinc-400", bg: "bg-zinc-800" }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-white">{event.name}</h1>
            <span className={`text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ${config.bg} ${config.color}`}>
              {config.label}
            </span>
          </div>
          <p className="text-zinc-400 text-sm mb-4">{event.description}</p>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <span>📍</span>
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span>🕐</span>
              <span>活動開始：{new Date(event.eventStartTime).toLocaleString("zh-TW")}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span>🕕</span>
              <span>活動結束：{new Date(event.eventEndTime).toLocaleString("zh-TW")}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span>📋</span>
              <span>報名開始：{new Date(event.registrationStart).toLocaleString("zh-TW")}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span>📅</span>
              <span>報名截止：{new Date(event.registrationEnd).toLocaleString("zh-TW")}</span>
            </div>
            {event.cancellationDeadline && (
              <div className="flex items-center gap-2 text-zinc-400">
                <span>⚠️</span>
                <span>取消截止：{new Date(event.cancellationDeadline).toLocaleString("zh-TW")}</span>
              </div>
            )}
            {isUnlimitedTicket(event.ticketLimit) ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <span>🎫</span>
                <span>名額：<span className="text-white font-medium">不限</span></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400">
                <span>🎫</span>
                <span>
                  剩餘名額：
                  {eligibility ? (
                    <span className="text-white font-medium">{eligibility.remainingTickets}</span>
                  ) : (
                    <span className="text-zinc-500">…</span>
                  )}
                  {" / "}{event.ticketLimit}
                </span>
              </div>
            )}
          </div>
        </div>

        {event.faqs && event.faqs.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
            <h3 className="text-white font-semibold mb-4">常見問題</h3>
            <div className="flex flex-col gap-3">
              {event.faqs.map((faq, i) => (
                <div key={i} className="bg-zinc-800 rounded-xl p-4">
                  <p className="text-white text-sm font-medium mb-1">Q: {faq.question}</p>
                  <p className="text-zinc-400 text-sm">A: {faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">報名資料</h3>
            {me?.dietType || me?.selfDriving ? (
              <span className="text-xs text-zinc-500">已自動帶入個人設定</span>
            ) : null}
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-zinc-400 text-sm block mb-2">飲食需求</label>
              <select
                disabled={!eligibility}
                value={dietType ?? ""}
                onChange={e => setDietType(e.target.value as "veg" | "non-veg" | null || null)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
              >
                <option value="">無需求</option>
                <option value="veg">素食</option>
                <option value="non-veg">葷食</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                disabled={!eligibility}
                checked={selfDriving}
                onChange={e => setSelfDriving(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-zinc-300 text-sm">自行開車</span>
            </label>

            {event.guestAllowed && isUnlimitedTicket(event.ticketLimit) && (
              <div>
                <label className="text-zinc-400 text-sm block mb-2">
                  攜帶家屬人數：<span className="text-white font-semibold">{guestCount} 人</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 text-xs">0</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={guestCount}
                    onChange={e => setGuestCount(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-zinc-500 text-xs">10</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {getActionButton()}
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </PageTransition>
  )
}

export default EventDetailPage