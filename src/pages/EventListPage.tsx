import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { getEvents } from "../api/events"
import EventCard from "../components/EventCard"
import PageTransition from "../components/PageTransition"
import { EventCardSkeleton } from "../components/Skeleton"
import { useDebounce } from "../hooks/useDebounce"
import { sortEvents, type SortOption } from "../utils/sortEvents"

const CATEGORIES = ["sport", "food", "travel", "culture", "family", "contest", "music"]

const CATEGORY_LABELS: Record<string, string> = {
  sport: "運動", food: "美食", travel: "旅遊",
  culture: "文藝", family: "親子", contest: "競賽", music: "音樂",
}

const SORT_LABELS: Record<SortOption, string> = {
  recommended:        "為你推薦",
  popular:            "最熱門",
  status_registering: "報名中",
}

function EventListPage() {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState("")
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState("")
  const [sort, setSort] = useState<SortOption>("recommended")

  const debouncedSetKeyword = useDebounce((val: string) => {
    setKeyword(val)
  }, 400)

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    debouncedSetKeyword(e.target.value)
  }

  const { data, isLoading } = useQuery({
    queryKey: ["events", keyword, category],
    queryFn: ({ signal }) => getEvents({ keyword, category }, signal),
    staleTime: 1000 * 60 * 3,
  })

  const events = data?.data ?? []
  const filtered = sortEvents(events, sort)

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">活動列表</h1>

        <div className="flex flex-col gap-3 mb-6">
          <input
            placeholder="搜尋活動..."
            value={inputValue}
            onChange={handleSearchChange}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
          >
            <option value="">所有類別</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(SORT_LABELS) as SortOption[]).map(option => (
              <button
                key={option}
                onClick={() => setSort(option)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sort === option
                    ? "bg-white text-zinc-900"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
                }`}
              >
                {SORT_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-3">🔍</p>
            <p>沒有符合的活動</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((event, index) => (
                <motion.div
                  key={event.eventId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <EventCard
                    event={event}
                    onClick={() => navigate(`/events/${event.eventId}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default EventListPage