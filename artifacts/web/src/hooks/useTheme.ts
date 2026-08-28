import { useEffect, useState } from "react"
import { type Theme, getTheme, setTheme, onThemeChanged } from "../lib/theme"

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme)

  useEffect(() => onThemeChanged(() => setThemeState(getTheme())), [])

  return {
    theme,
    setTheme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
  }
}
