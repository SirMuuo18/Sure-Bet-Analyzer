import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getSports,
  getBookmakers,
  createSport,
  createBookmaker,
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
    onError: (e: Error) => setError(e.message),
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
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h3 className="text-base font-semibold text-white mb-4">Sports</h3>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="mb-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Football"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="e.g. football"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white text-sm font-semibold rounded transition-colors"
          >
            {mutation.isPending ? "Adding…" : "Add Sport"}
          </button>
          {mutation.isSuccess && (
            <span className="text-green-400 text-xs">Added!</span>
          )}
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </form>

      {/* List */}
      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : sports.length === 0 ? (
        <div className="text-gray-600 text-sm">No sports yet.</div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/60 text-left">
                <th className="py-2 px-3 text-xs font-semibold text-gray-400 uppercase">
                  Name
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-400 uppercase">
                  Slug
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-400 uppercase">
                  Active
                </th>
              </tr>
            </thead>
            <tbody>
              {sports.map((sport) => (
                <tr
                  key={sport.id}
                  className="border-b border-gray-800 last:border-0"
                >
                  <td className="py-2 px-3 text-sm text-white">{sport.name}</td>
                  <td className="py-2 px-3 text-sm text-gray-400 font-mono">
                    {sport.slug}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-xs font-medium ${
                        sport.isActive ? "text-green-400" : "text-gray-500"
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
    onError: (e: Error) => setError(e.message),
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
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h3 className="text-base font-semibold text-white mb-4">Bookmakers</h3>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="mb-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Bet365"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            URL <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://bet365.com"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white text-sm font-semibold rounded transition-colors"
          >
            {mutation.isPending ? "Adding…" : "Add Bookmaker"}
          </button>
          {mutation.isSuccess && (
            <span className="text-green-400 text-xs">Added!</span>
          )}
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </form>

      {/* List */}
      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : bookmakers.length === 0 ? (
        <div className="text-gray-600 text-sm">No bookmakers yet.</div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/60 text-left">
                <th className="py-2 px-3 text-xs font-semibold text-gray-400 uppercase">
                  Name
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-400 uppercase">
                  URL
                </th>
                <th className="py-2 px-3 text-xs font-semibold text-gray-400 uppercase">
                  Active
                </th>
              </tr>
            </thead>
            <tbody>
              {bookmakers.map((bm) => (
                <tr
                  key={bm.id}
                  className="border-b border-gray-800 last:border-0"
                >
                  <td className="py-2 px-3 text-sm text-white">{bm.name}</td>
                  <td className="py-2 px-3 text-sm text-gray-400 font-mono text-xs">
                    {bm.url ? (
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {bm.url}
                      </a>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-xs font-medium ${
                        bm.isActive ? "text-green-400" : "text-gray-500"
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
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Setup</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SportsPanel />
        <BookmakersPanel />
      </div>
    </div>
  )
}
