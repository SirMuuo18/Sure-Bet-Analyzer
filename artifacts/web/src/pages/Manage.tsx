import { useState } from "react"
import PageHeader from "../components/PageHeader"
import Setup from "./Setup"
import Events from "./Events"
import Odds from "./Odds"
import { useAdminAuth } from "../hooks/useAdminAuth"

type ManageTab = "setup" | "events" | "odds"

const TABS: { id: ManageTab; label: string }[] = [
  { id: "setup", label: "Sports & Bookmakers" },
  { id: "events", label: "Events" },
  { id: "odds", label: "Odds" },
]

function AdminSignIn({ onSignIn }: { onSignIn: (key: string) => void }) {
  const [key, setKey] = useState("")

  return (
    <div className="max-w-sm mx-auto text-center py-12">
      <h3 className="text-base font-semibold text-ink mb-2">Admin sign-in required</h3>
      <p className="text-ink-muted text-sm mb-5">
        Creating and editing sports, bookmakers, events and odds requires an admin key. Viewing data elsewhere in the
        app doesn't.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (key.trim()) onSignIn(key.trim())
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin key"
          autoComplete="off"
          className="w-full bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!key.trim()}
          className="px-4 py-2 bg-accent hover:bg-accent-strong disabled:bg-surface-2 disabled:text-ink-faint text-canvas text-sm font-semibold rounded transition-colors"
        >
          Sign in
        </button>
      </form>
    </div>
  )
}

export default function Manage() {
  const [tab, setTab] = useState<ManageTab>("setup")
  const { isAdmin, signIn, signOut } = useAdminAuth()

  return (
    <div>
      <PageHeader title="Manage Data" subtitle="Sports, bookmakers, events and odds — the raw inputs behind every prediction" />

      {isAdmin ? (
        <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-lg border border-line bg-surface text-xs text-ink-muted leading-relaxed">
          <span>Signed in as admin — writes here go straight to the shared database.</span>
          <button onClick={signOut} className="text-accent-strong hover:underline font-medium shrink-0 ml-4">
            Sign out
          </button>
        </div>
      ) : (
        <div className="mb-6 px-4 py-3 rounded-lg border border-watch/30 bg-watch-dim text-xs text-watch leading-relaxed">
          The server rejects writes from anyone without a valid admin key — sign in below to manage data.
        </div>
      )}

      {!isAdmin ? (
        <AdminSignIn onSignIn={signIn} />
      ) : (
        <>
          <div className="flex gap-1 mb-6 bg-surface border border-line rounded-lg p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  tab === t.id ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "setup" && <Setup />}
          {tab === "events" && <Events />}
          {tab === "odds" && <Odds />}
        </>
      )}
    </div>
  )
}
