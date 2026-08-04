import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getEvents, getSports, createEvent, type EventStatus } from "../api"

const STATUS_COLORS: Record<EventStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  live: "bg-green-500/20 text-green-400",
  completed: "bg-gray-700 text-gray-400",
  cancelled: "bg-red-500/20 text-red-400",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

export default function Events() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<EventStatus | "">("")
  const [sportFilter, setSportFilter] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    sportId: "",
    homeTeam: "",
    awayTeam: "",
    startsAt: "",
  })

  const { data: sports = [] } = useQuery({
    queryKey: ["sports"],
    queryFn: getSports,
  })

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", statusFilter, sportFilter],
    queryFn: () =>
      getEvents({
        ...(statusFilter ? { status: statusFilter as EventStatus } : {}),
        ...(sportFilter ? { sportId: parseInt(sportFilter) } : {}),
      }),
  })

  const mutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] })
      setForm({ sportId: "", homeTeam: "", awayTeam: "", startsAt: "" })
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.sportId || !form.homeTeam || !form.awayTeam || !form.startsAt) {
      setError("All fields are required.")
      return
    }
    mutation.mutate({
      sportId: parseInt(form.sportId),
      homeTeam: form.homeTeam,
      awayTeam: form.awayTeam,
      startsAt: new Date(form.startsAt).toISOString(),
    })
  }

  const getSportName = (id: number) =>
    sports.find((s) => s.id === id)?.name ?? `Sport #${id}`

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Events</h2>

      {/* Add Event Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <h3 className="text-base font-semibold text-white mb-4">Add Event</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Sport
            </label>
            <select
              value={form.sportId}
              onChange={(e) => setForm({ ...form, sportId: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="">Select sport…</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Starts At
            </label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Home Team
            </label>
            <input
              type="text"
              value={form.homeTeam}
              onChange={(e) => setForm({ ...form, homeTeam: e.target.value })}
              placeholder="e.g. Arsenal"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Away Team
            </label>
            <input
              type="text"
              value={form.awayTeam}
              onChange={(e) => setForm({ ...form, awayTeam: e.target.value })}
              placeholder="e.g. Chelsea"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white text-sm font-semibold rounded transition-colors"
            >
              {mutation.isPending ? "Adding…" : "Add Event"}
            </button>
            {error && <span className="text-red-400 text-sm">{error}</span>}
            {mutation.isSuccess && (
              <span className="text-green-400 text-sm">Event added!</span>
            )}
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EventStatus | "")}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
        >
          <option value="">All sports</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Events Table */}
      {isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-600">No events found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/60 text-left">
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Match
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Sport
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Starts At
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-white">
                    {event.homeTeam} vs {event.awayTeam}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {getSportName(event.sportId)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {formatDate(event.startsAt)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLORS[event.status]
                      }`}
                    >
                      {event.status}
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
