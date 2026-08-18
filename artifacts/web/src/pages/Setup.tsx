import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getSports,
  getBookmakers,
  createSport,
  createBookmaker,
  apiErrorMessage,
} from "../api"

function SportsPanel() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: "", slug: "" })
  const [error, setError] = useState<string | null>(null)

  const { data: sports = [], isLoading } = useQuery({
    queryKey: ["sports"],
    queryFn: getSports,
  })

  const mutation = useMutation({
    mutationFn: createSport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sports"] })
      setForm({ name: "", slug: "" })
      setError(null)
    },
    onError: (e: Error) => setError(apiErrorMessage(e)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.slug) {
      setError("Both fields are required.")
      return
    }
    mutation.mutate({ name: form.name, slug: form.slug })
  }

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setForm({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    })
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <h3 className="text-base font-semibold text-ink mb-4">Sports</h3>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="mb-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Football"
            className="w-full bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="e.g. football"
            className="w-full bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-3 py-1.5 bg-accent hover:bg-accent-strong disabled:bg-surface-2 disabled:text-ink-faint text-canvas text-sm font-semibold rounded transition-colors"
          >
            {mutation.isPending ? "Adding…" : "Add Sport"}
          </button>
          {mutation.isSuccess && (
            <span className="text-positive text-xs">Added!</span>
          )}
        </div>
        {error && <p className="text-risk text-xs">{error}</p>}
      </form>

      {/* List */}
      {isLoading ? (
        <div className="text-ink-muted text-sm">Loading…</div>
      ) : sports.length === 0 ? (
        <div className="text-ink-faint text-sm">No sports yet.</div>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2/60 text-left">
                <th className="py-2 px-3 text-xs font-semibold text-ink-muted uppercase">
                  Name
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-ink-muted uppercase">
                  Slug
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-ink-muted uppercase">
                  Active
                </th>
              </tr>
            </thead>
            <tbody>
              {sports.map((sport) => (
                <tr
                  key={sport.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="py-2 px-3 text-sm text-ink">{sport.name}</td>
                  <td className="py-2 px-3 text-sm text-ink-muted font-mono">
                    {sport.slug}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-xs font-medium ${
                        sport.isActive ? "text-positive" : "text-ink-muted"
                      }`}
                    >
                      {sport.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BookmakersPanel() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: "", url: "" })
  const [error, setError] = useState<string | null>(null)

  const { data: bookmakers = [], isLoading } = useQuery({
    queryKey: ["bookmakers"],
    queryFn: getBookmakers,
  })

  const mutation = useMutation({
    mutationFn: createBookmaker,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookmakers"] })
      setForm({ name: "", url: "" })
      setError(null)
    },
    onError: (e: Error) => setError(apiErrorMessage(e)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) {
      setError("Name is required.")
      return
    }
    mutation.mutate({ name: form.name, ...(form.url ? { url: form.url } : {}) })
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5">
      <h3 className="text-base font-semibold text-ink mb-4">Bookmakers</h3>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="mb-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Bet365"
            className="w-full bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">
            URL <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://bet365.com"
            className="w-full bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-3 py-1.5 bg-accent hover:bg-accent-strong disabled:bg-surface-2 disabled:text-ink-faint text-canvas text-sm font-semibold rounded transition-colors"
          >
            {mutation.isPending ? "Adding…" : "Add Bookmaker"}
          </button>
          {mutation.isSuccess && (
            <span className="text-positive text-xs">Added!</span>
          )}
        </div>
        {error && <p className="text-risk text-xs">{error}</p>}
      </form>

      {/* List */}
      {isLoading ? (
        <div className="text-ink-muted text-sm">Loading…</div>
      ) : bookmakers.length === 0 ? (
        <div className="text-ink-faint text-sm">No bookmakers yet.</div>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2/60 text-left">
                <th className="py-2 px-3 text-xs font-semibold text-ink-muted uppercase">
                  Name
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-ink-muted uppercase">
                  URL
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-ink-muted uppercase">
                  Active
                </th>
              </tr>
            </thead>
            <tbody>
              {bookmakers.map((bm) => (
                <tr
                  key={bm.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="py-2 px-3 text-sm text-ink">{bm.name}</td>
                  <td className="py-2 px-3 text-sm text-ink-muted font-mono text-xs">
                    {bm.url ? (
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-strong hover:text-accent-strong"
                      >
                        {bm.url}
                      </a>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-xs font-medium ${
                        bm.isActive ? "text-positive" : "text-ink-muted"
                      }`}
                    >
                      {bm.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Setup() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SportsPanel />
      <BookmakersPanel />
    </div>
  )
}
