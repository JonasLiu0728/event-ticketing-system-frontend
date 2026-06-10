import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getMe } from "../api/auth"
import { updateUser } from "../api/users"
import PageTransition from "../components/PageTransition"
import { getDefaultRoute } from "../utils/roles"

const CATEGORIES = [
  { value: "sport",   label: "🏃 運動" },
  { value: "food",    label: "🍽️ 美食" },
  { value: "travel",  label: "✈️ 旅遊" },
  { value: "culture", label: "🎨 文藝" },
  { value: "family",  label: "👨‍👩‍👧 親子" },
  { value: "contest", label: "🏆 競賽" },
  { value: "music",   label: "🎵 音樂" },
]

function OnboardingPage() {
  const navigate = useNavigate()
  const [tags, setTags] = useState<string[]>([])
  const [dietType, setDietType] = useState<"veg" | "non-veg" | null>(null)
  const [selfDriving, setSelfDriving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => getMe(signal),
    staleTime: 1000 * 60 * 5,
  })

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSave() {
    if (!me) return
    setSaving(true)
    setError("")
    try {
      await updateUser(me.userId, {
        preferences: tags,
        autofill: { dietType, selfDriving },
      })
      localStorage.setItem("userTags", JSON.stringify(tags))
      navigate(getDefaultRoute(me.role), { replace: true })
    } catch {
      setError("儲存失敗，請稍後再試")
      setSaving(false)
    }
  }

  function handleSkip() {
    if (!me) return
    navigate(getDefaultRoute(me.role), { replace: true })
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500">
      載入中...
    </div>
  )

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800 text-3xl mb-4">
              👋
            </div>
            <h1 className="text-2xl font-bold text-white">
              歡迎，{me?.username}！
            </h1>
            <p className="text-zinc-400 mt-2 text-sm">
              花 30 秒設定一下，系統就能幫你推薦最適合的活動
            </p>
          </div>

          <div className="flex flex-col gap-4">

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-1">你對哪些活動有興趣？</h3>
              <p className="text-zinc-500 text-sm mb-4">
                可以複選，之後在個人設定裡也可以隨時更改
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const isSelected = tags.includes(cat.value)
                  return (
                    <button
                      key={cat.value}
                      onClick={() => toggleTag(cat.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-white text-zinc-900"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-1">報名自動填入</h3>
              <p className="text-zinc-500 text-sm mb-4">
                報名活動時自動帶入以下資料，省去每次手動填寫
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-zinc-400 text-sm block mb-2">飲食需求</label>
                  <select
                    value={dietType ?? ""}
                    onChange={e =>
                      setDietType(e.target.value as "veg" | "non-veg" | null || null)
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
                  >
                    <option value="">無需求</option>
                    <option value="veg">素食</option>
                    <option value="non-veg">葷食</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setSelfDriving(v => !v)}
                    className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      selfDriving ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        selfDriving ? "left-5" : "left-1"
                      }`}
                    />
                  </div>
                  <span className="text-zinc-300 text-sm">通常會自行開車前往</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-semibold transition-colors"
            >
              {saving ? "儲存中..." : "完成設定，開始探索活動"}
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              先跳過，之後在個人設定再填
            </button>

          </div>
        </div>
      </div>
    </PageTransition>
  )
}

export default OnboardingPage