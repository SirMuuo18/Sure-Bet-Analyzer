import { PRIMARY_NAV, TOOLS_NAV, UTILITY_NAV, type Tab } from "../lib/nav"

function NavGroup({
  label,
  items,
  active,
  onSelect,
}: {
  label: string
  items: { id: Tab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[]
  active: Tab
  onSelect: (tab: Tab) => void
}) {
  return (
    <div className="px-3">
      <div className="px-3 pt-4 pb-1.5 text-[10px] font-bold text-ink-faint uppercase tracking-widest">
        {label}
      </div>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-surface-2 text-ink"
                : "text-ink-muted hover:text-ink hover:bg-surface-2/60"
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-accent" : ""}`} />
            <span className="truncate">{item.label}</span>
            {isActive && <span className="ml-auto w-1 h-4 rounded-full bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}

export default function Sidebar({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <aside className="hidden md:flex w-60 bg-surface border-r border-line flex-col shrink-0 h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-line">
        <h1 className="text-lg font-bold text-ink tracking-tight">
          SUREBET<span className="text-accent">.</span>
        </h1>
        <p className="text-[11px] text-ink-faint mt-0.5 font-medium tracking-wide uppercase">Game Intelligence</p>
      </div>
      <nav className="flex-1 overflow-y-auto pb-4">
        <NavGroup label="Intelligence" items={PRIMARY_NAV} active={active} onSelect={onSelect} />
        <NavGroup label="Tools" items={TOOLS_NAV} active={active} onSelect={onSelect} />
        <NavGroup label="" items={UTILITY_NAV} active={active} onSelect={onSelect} />
      </nav>
      <div className="px-6 py-4 border-t border-line text-[11px] text-ink-faint leading-relaxed">
        Predictions are probabilistic, not guaranteed. Bet responsibly.
      </div>
    </aside>
  )
}
