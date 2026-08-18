const STORAGE_KEY = "surebet.adminKey"
const CHANGE_EVENT = "surebet:admin-auth-changed"

export function getAdminKey(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function isAdminAuthed(): boolean {
  return !!getAdminKey()
}

export function setAdminKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearAdminKey(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function onAdminAuthChanged(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}
