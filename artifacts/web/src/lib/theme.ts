export type Theme = "light" | "dark"

const STORAGE_KEY = "surebet.theme"
const CHANGE_EVENT = "surebet:theme-changed"

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === "dark" ? "dark" : "light"
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  document.documentElement.setAttribute("data-theme", theme)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function applyStoredTheme(): void {
  document.documentElement.setAttribute("data-theme", getTheme())
}

export function onThemeChanged(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}
