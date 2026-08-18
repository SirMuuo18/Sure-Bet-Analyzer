import { useEffect, useState } from "react"
import { isAdminAuthed, onAdminAuthChanged, setAdminKey, clearAdminKey } from "../lib/adminAuth"

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(isAdminAuthed)

  useEffect(() => onAdminAuthChanged(() => setIsAdmin(isAdminAuthed())), [])

  return {
    isAdmin,
    signIn: setAdminKey,
    signOut: clearAdminKey,
  }
}
