import { useEffect, useState } from "react"
import { PRIMARY_NAV, MOBILE_MORE_NAV, type Tab } from "../lib/nav"
import { MoreIcon, CloseIcon } from "./icons"
import ThemeToggle from "./ThemeToggle"

export default function BottomNav({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const isMoreActive = MOBILE_MORE_NAV.some((i) => i.id === active)

  useEffect(() => {
    if (!moreOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [moreOpen])

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex items-end" role="dialog" aria-modal="true" aria-label="More navigation">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-surface border-t border-line rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-sm font-semibold text-ink">More</span>
              <div className="flex items-center gap-1">
                <ThemeToggle compact />
                <button onClick={() => setMoreOpen(false)} aria-label="Close menu" className="p-1.5 text-ink-muted hover:text-ink">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_MORE_NAV.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item.id)
                      setMoreOpen(false)
                    }}
                    className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? "bg-surface-2 text-ink" : "bg-surface-2/50 text-ink-muted"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-accent" : ""}`} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2.5"
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-accent" : "text-ink-faint"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-ink" : "text-ink-faint"}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2.5">
            <MoreIcon className={`w-5 h-5 ${isMoreActive ? "text-accent" : "text-ink-faint"}`} />
            <span className={`text-[10px] font-medium ${isMoreActive ? "text-ink" : "text-ink-faint"}`}>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
