import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getEvents,
  getOdds,
  getBookmakers,
  submitOdds,
  type Outcome,
} from "../api"

const OUTCOMES: Outcome[] = ["home", "draw", "away"]

export default function Odds() {
  const qc = useQueryClient()
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    bookmakerId: "",
    outcome: "" as Outcome | "",
    decimalOdds: "",
  })

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => getEvents(),
  })

  const { data: bookmakers = [] } = useQuery({
    queryKey: ["bookmakers"],
    queryFn: getBookmakers,
  })

  const { data: odds = [], isLoading: oddsLoading } = useQuery({
    queryKey: ["odds", selectedEventId],
    queryFn: () => getOdds(parseInt(selectedEventId)),
    enabled: !!selectedEventId,
  })

  const mutation = useMutation({
    mutationFn: submitOdds,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["odds", selectedEventId] })
      setForm({ bookmakerId: "", outcome: "", decimalOdds: "" })
      setError(null)
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEventId || !form.bookmakerId || !form.outcome || !form.decimalOdds) {
      setError("All fields are required.")
      return
    }
    const odds = parseFloat(form.decimalOdds)
    if (isNaN(odds) || odds <= 1) {
      setError("Decimal odds must be greater than 1.")
      return
    }
    mutation.mutate({
      eventId: parseInt(selectedEventId),
      bookmakerId: parseInt(form.bookmakerId),
      outcome: form.outcome as Outcome,
      decimalOdds: odds,
    })
  }

  const selectedEvent = events.find((e) => e.id === parseInt(selectedEventId))
  const getBookmakerName = (id: number) =>
    bookmakers.find((b) => b.id === id)?.name ?? `#${id}`

  // Group odds by outcome
  const oddsByOutcome = OUTCOMES.reduce(
    (acc, outcome) => {
      acc[outcome] = odds.filter((o) => o.outcome === outcome)
      return acc
    },
    {} as Record<Outcome, typeof odds>
  )

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Odds</h2>

      {/* Event Selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <label className="block text-xs font-medium text-gray-400 mb-2">
          Select Event
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full max-w-md bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
        >
          <option value="">Choose an event…</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.homeTeam} vs {ev.awayTeam}
            </option>
          ))}
        </select>
      </div>

      {selectedEventId && (
        <>
          {/* Current Odds */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
            <h3 className="text-base font-semibold text-white mb-4">
              Current Odds
              {selectedEvent && (
                <span className="font-normal text-gray-400 ml-2 text-sm">
                  — {selectedEvent.homeTeam} vs {selectedEvent.awayTeam}
                </span>
              )}
            </h3>
            {oddsLoading ? (
              <div className="text-gray-500 text-sm">Loading odds…</div>
            ) : odds.length === 0 ? (
              <div className="text-gray-600 text-sm">No odds submitted yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {OUTCOMES.map((outcome) => (
                  <div key={outcome} className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 font-semibold uppercase mb-2">
                      {outcome}
                    </div>
                    {oddsByOutcome[outcome].length === 0 ? (
                      <div className="text-gray-600 text-xs">No odds</div>
                    ) : (
                      <div className="space-y-1">
                        {oddsByOutcome[outcome].map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between"
                          >
                            <span className="text-gray-400 text-xs">
                              {getBookmakerName(o.bookmakerId)}
                            </span>
                            <span className="text-white font-mono text-sm font-semibold">
                              {parseFloat(o.decimalOdds).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Odds Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-base font-semibold text-white mb-4">
              Submit / Update Odds
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Bookmaker
                </label>
                <select
                  value={form.bookmakerId}
                  onChange={(e) => setForm({ ...form, bookmakerId: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select bookmaker…</option>
                  {bookmakers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Outcome
                </label>
                <select
                  value={form.outcome}
                  onChange={(e) =>
                    setForm({ ...form, outcome: e.target.value as Outcome })
                  }
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select outcome…</option>
                  {OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Decimal Odds
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={form.decimalOdds}
                  onChange={(e) => setForm({ ...form, decimalOdds: e.target.value })}
                  placeholder="e.g. 2.50"
                  className="w-32 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white text-sm font-semibold rounded transition-colors"
                >
                  {mutation.isPending ? "Saving…" : "Submit Odds"}
                </button>
                {mutation.isSuccess && (
                  <span className="text-green-400 text-sm">Saved!</span>
                )}
              </div>
            </form>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </>
      )}

      {!selectedEventId && (
        <div className="text-center py-12 text-gray-600">
          Select an event above to view and submit odds.
        </div>
      )}
    </div>
  )
}
