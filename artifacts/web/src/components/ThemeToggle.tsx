import { useTheme } from "../hooks/useTheme"
import { SunIcon, MoonIcon } from "./icons"

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
      >
        {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-2/60 transition-colors"
    >
      {isDark ? <SunIcon className="w-4 h-4 shrink-0" /> : <MoonIcon className="w-4 h-4 shrink-0" />}
      {isDark ? "Light theme" : "Dark theme"}
    </button>
  )
}
