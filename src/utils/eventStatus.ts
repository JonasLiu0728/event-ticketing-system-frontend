import type { Event } from "../types"
export const UNLIMITED_TICKETS = 1_000_000

export function isUnlimitedTicket(ticketLimit: number | null | undefined): boolean {
  return ticketLimit == null || ticketLimit >= UNLIMITED_TICKETS
}

export interface StatusConfig {
  label: string
  color: string
  bg: string
}

// 這份是「活動狀態」設定，原本散在 EventCard / EventManagePage / EventDetailPage 三個檔案
export const STATUS_CONFIG: Record<string, StatusConfig> = {
  not_open:    { label: "尚未開始報名", color: "text-zinc-400",    bg: "bg-zinc-800" },
  registering: { label: "報名中",       color: "text-emerald-400", bg: "bg-emerald-900/30" },
  waitlist:    { label: "候補登記",     color: "text-amber-400",   bg: "bg-amber-900/30" },
  closed:      { label: "報名截止",     color: "text-red-400",     bg: "bg-red-900/30" },
  ended:       { label: "活動結束",     color: "text-zinc-500",    bg: "bg-zinc-800" },
}

// 未知狀態時不要 crash，回傳原字串當 label
export function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status] ?? { label: status, color: "text-zinc-400", bg: "bg-zinc-800" }
}

export const CATEGORY_EMOJI: Record<string, string> = {
  sport:   "🏃",
  food:    "🍽️",
  travel:  "✈️",
  culture: "🎨",
  family:  "👨‍👩‍👧",
  contest: "🏆",
  music:   "🎵",
}

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? "📅"
}

// 剩餘票數低於 10% 視為「快沒了」
export function isLowTicket(event: Pick<Event, "ticketLimit" | "remainingTickets">): boolean {
  if (isUnlimitedTicket(event.ticketLimit)) return false
  return event.remainingTickets < event.ticketLimit! / 10
}

export function isFull(event: Pick<Event, "ticketLimit" | "remainingTickets">): boolean {
  if (isUnlimitedTicket(event.ticketLimit)) return false
  return event.remainingTickets === 0
}