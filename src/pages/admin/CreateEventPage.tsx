import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { createEvent } from "../../api/events"
import PageTransition from "../../components/PageTransition"
import { validateEventForm } from "../../utils/validateEventForm"
import MapPicker from "../../components/MapPicker"
import { UNLIMITED_TICKETS } from "../../utils/eventStatus"

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const CATEGORIES = [
  { value: "sport", label: "運動" },
  { value: "food", label: "美食" },
  { value: "travel", label: "旅遊" },
  { value: "culture", label: "文藝" },
  { value: "family", label: "親子" },
  { value: "contest", label: "競賽" },
  { value: "music", label: "音樂" },
]

interface FAQ {
  question: string
  answer: string
}

function CreateEventPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [registrationDays, setRegistrationDays] = useState("")

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
    latitude: "",
    longitude: "",
    checkinRadiusMeters: "200",
    eventStartTime: "",
    eventEndTime: "",
    registrationStart: toDatetimeLocal(new Date()),
    registrationEnd: "",
    ticketLimit: "",
    cancellationDeadline: "",
    isDraft: true,
  })

  // 通用欄位變更；若改的是 registrationStart 且已填天數，同步重算截止時間
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm(prev => {
      const updated = { ...prev, [name]: value }
      if (name === "registrationStart" && registrationDays && Number(registrationDays) > 0 && value) {
        const start = new Date(value)
        const end = new Date(start.getTime() + Number(registrationDays) * 86400000)
        updated.registrationEnd = toDatetimeLocal(end)
      }
      return updated
    })
  }

  // 填入天數 → 自動算截止日期
  function handleDaysChange(e: React.ChangeEvent<HTMLInputElement>) {
    const days = e.target.value
    setRegistrationDays(days)
    if (form.registrationStart && days && Number(days) > 0) {
      const start = new Date(form.registrationStart)
      const end = new Date(start.getTime() + Number(days) * 86400000)
      setForm(prev => ({ ...prev, registrationEnd: toDatetimeLocal(end) }))
    }
  }

  // 手動選截止日期 → 反推天數
  function handleEndDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const endStr = e.target.value
    setForm(prev => ({ ...prev, registrationEnd: endStr }))
    if (form.registrationStart && endStr) {
      const diffDays = Math.round(
        (new Date(endStr).getTime() - new Date(form.registrationStart).getTime()) / 86400000
      )
      setRegistrationDays(diffDays > 0 ? String(diffDays) : "")
    }
  }

  function addFaq() {
    setFaqs(prev => [...prev, { question: "", answer: "" }])
  }

  function updateFaq(index: number, field: "question" | "answer", value: string) {
    setFaqs(prev =>
      prev.map((faq, i) => i === index ? { ...faq, [field]: value } : faq)
    )
  }

  function removeFaq(index: number) {
    setFaqs(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(isDraft: boolean) {
    const error = validateEventForm(form)
    if (error) {
      setMessage(error)
      return
    }
    if (!form.registrationEnd) {
      setMessage("請填入報名截止時間（天數或自訂日期）")
      return
    }
    setSubmitting(true)
    try {
      await createEvent({
        name: form.name,
        description: form.description,
        category: form.category,
        location: form.location,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        checkinRadiusMeters: Number(form.checkinRadiusMeters),
        eventStartTime: new Date(form.eventStartTime).toISOString(),
        eventEndTime: new Date(form.eventEndTime).toISOString(),
        registrationStart: new Date(form.registrationStart).toISOString(),
        registrationEnd: new Date(form.registrationEnd).toISOString(),
        ticketLimit: form.ticketLimit ? Number(form.ticketLimit) : UNLIMITED_TICKETS,
        cancellationDeadline: form.cancellationDeadline
          ? new Date(form.cancellationDeadline).toISOString()
          : null, 
        isDraft,
        faqs: faqs.filter(f => f.question && f.answer),
      })
      navigate("/admin/events")
    } catch {
      setMessage("建立失敗，請稍後再試")
    }
    setSubmitting(false)
  }

  const inputClass = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500 placeholder-zinc-500"
  const labelClass = "text-zinc-400 text-sm block mb-2"

  return (
    <PageTransition>
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">新增活動</h1>

      <div className="flex flex-col gap-4">

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">基本資訊</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>活動名稱 *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="活動名稱" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>活動描述</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="活動描述" rows={3} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>活動類別 *</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                <option value="">請選擇類別</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>活動地點 *</label>
              <input name="location" value={form.location} onChange={handleChange} placeholder="活動地點" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">地理位置（報到用）</h3>
          <MapPicker
            lat={form.latitude ? Number(form.latitude) : undefined}
            lng={form.longitude ? Number(form.longitude) : undefined}
            onChange={(lat, lng) =>
              setForm(prev => ({
                ...prev,
                latitude: String(lat.toFixed(6)),
                longitude: String(lng.toFixed(6)),
              }))
            }
          />
          <div className="mt-4">
            <label className={labelClass}>報到範圍（公尺）</label>
            <input
              name="checkinRadiusMeters"
              value={form.checkinRadiusMeters}
              onChange={handleChange}
              placeholder="200"
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">時間設定</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>活動開始時間 *</label>
              <input type="datetime-local" name="eventStartTime" value={form.eventStartTime} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>活動結束時間</label>
              <input type="datetime-local" name="eventEndTime" value={form.eventEndTime} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>報名開始時間</label>
              <input type="datetime-local" name="registrationStart" value={form.registrationStart} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>報名截止時間 *</label>
              <div className="flex flex-col gap-2">
                {/* 方式一：填天數 */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={registrationDays}
                    onChange={handleDaysChange}
                    placeholder="天數"
                    className={inputClass}
                  />
                  <span className="text-zinc-500 text-xs whitespace-nowrap flex-shrink-0">天後截止</span>
                </div>
                {/* 方式二：手動選日期 */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 text-xs whitespace-nowrap flex-shrink-0 w-4">或</span>
                  <input
                    type="datetime-local"
                    name="registrationEnd"
                    value={form.registrationEnd}
                    onChange={handleEndDateChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">報名規則</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>票數限制（留空代表不限制）</label>
              <input name="ticketLimit" value={form.ticketLimit} onChange={handleChange} placeholder="50" type="number" max="999999" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>取消截止時間（留空代表不可取消）</label>
              <input type="datetime-local" name="cancellationDeadline" value={form.cancellationDeadline} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">常見問題</h3>
            <button
              onClick={addFaq}
              className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              + 新增問答
            </button>
          </div>

          {faqs.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">尚未新增任何問答</p>
          ) : (
            <div className="flex flex-col gap-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-xs">問答 {i + 1}</span>
                    <button
                      onClick={() => removeFaq(i)}
                      className="text-red-400 hover:text-red-300 text-xs transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                  <div>
                    <label className={labelClass}>問題</label>
                    <input
                      value={faq.question}
                      onChange={e => updateFaq(i, "question", e.target.value)}
                      placeholder="例如：需要自備餐具嗎？"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>回答</label>
                    <textarea
                      value={faq.answer}
                      onChange={e => updateFaq(i, "answer", e.target.value)}
                      placeholder="例如：不需要，主辦方提供"
                      rows={2}
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {message && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
            {message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            儲存草稿
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            直接發布
          </button>
        </div>
      </div>
    </div>
    </PageTransition>
  )
}

export default CreateEventPage