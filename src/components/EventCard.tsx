import type { Event } from "../types"
import { getStatusConfig, getCategoryEmoji, isUnlimitedTicket } from "../utils/eventStatus"

interface Props {
  event: Event
  onClick: () => void
}

function EventCard({ event, onClick }: Props) {
  const isActive = event.status === "registering"
  const config = getStatusConfig(event.status)
  const emoji = getCategoryEmoji(event.category)

  return (
    <div
      onClick={onClick}
      data-testid="event-card"
      className={`
        group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5
        cursor-pointer transition-all duration-200
        hover:border-zinc-600 hover:bg-zinc-800/80
        ${!isActive ? "opacity-50" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold text-lg leading-tight truncate">
              {event.name}
            </h2>
            <p className="text-zinc-400 text-sm mt-1 flex items-center gap-1">
              <span>📍</span>
              {event.location}
            </p>
            <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1">
              <span>🕐</span>
              活動開始：{new Date(event.eventStartTime).toLocaleString("zh-TW")}
            </p>
            <p className="text-zinc-500 text-sm mt-0.5 flex items-center gap-1">
              <span>🕕</span>
              活動結束：{new Date(event.eventEndTime).toLocaleString("zh-TW")}
            </p>
            <p className="text-zinc-500 text-sm mt-0.5 flex items-center gap-1">
              <span>📅</span>
              報名截止：{new Date(event.registrationEnd).toLocaleString("zh-TW")}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            data-testid="event-status"
            className={`text-xs font-medium px-3 py-1 rounded-full ${config.bg} ${config.color}`}
          >
            {config.label}
          </span>
          {!isUnlimitedTicket(event.ticketLimit) ? (
            <span className="text-xs text-zinc-500">
              名額 <span className="text-white font-medium">{event.ticketLimit}</span> 人
            </span>
          ) : (
            <span className="text-xs text-zinc-500">不限名額</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventCard