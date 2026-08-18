import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getEvents,
  getOdds,
  getBookmakers,
  submitOdds,
  apiErrorMessage,
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
    onError: (e: Error) => setError(apiErrorMessage(e)),
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
      {/* Event Selector */}
      <div className="bg-surface border border-line rounded-lg p-5 mb-6">
        <label className="block text-xs font-medium text-ink-muted mb-2">
          Select Event
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full max-w-md bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
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
          <div className="bg-surface border border-line rounded-lg p-5 mb-6">
            <h3 className="text-base font-semibold text-ink mb-4">
              Current Odds
              {selectedEvent && (
                <span className="font-normal text-ink-muted ml-2 text-sm">
                  — {selectedEvent.homeTeam} vs {selectedEvent.awayTeam}
                </span>
              )}
            </h3>
            {oddsLoading ? (
              <div className="text-ink-muted text-sm">Loading odds…</div>
            ) : odds.length === 0 ? (
              <div className="text-ink-faint text-sm">No odds submitted yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {OUTCOMES.map((outcome) => (
                  <div key={outcome} className="bg-surface-2 rounded-lg p-3">
                    <div className="text-xs text-ink-muted font-semibold uppercase mb-2">
                      {outcome}
                    </div>
                    {oddsByOutcome[outcome].length === 0 ? (
                      <div className="text-ink-faint text-xs">No odds</div>
                    ) : (
                      <div className="space-y-1">
                        {oddsByOutcome[outcome].map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between"
                          >
                            <span className="text-ink-muted text-xs">
                              {getBookmakerName(o.bookmakerId)}
                            </span>
                            <span className="text-ink font-mono text-sm font-semibold">
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
          <div className="bg-surface border border-line rounded-lg p-5">
            <h3 className="text-base font-semibold text-ink mb-4">
              Submit / Update Odds
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Bookmaker
                </label>
                <select
                  value={form.bookmakerId}
                  onChange={(e) => setForm({ ...form, bookmakerId: e.target.value })}
                  className="bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
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
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Outcome
                </label>
                <select
                  value={form.outcome}
                  onChange={(e) =>
                    setForm({ ...form, outcome: e.target.value as Outcome })
                  }
                  className="bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
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
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Decimal Odds
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={form.decimalOdds}
                  onChange={(e) => setForm({ ...form, decimalOdds: e.target.value })}
                  placeholder="e.g. 2.50"
                  className="w-32 bg-surface-2 border border-line-strong rounded px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 bg-accent hover:bg-accent-strong disabled:bg-surface-2 disabled:text-ink-faint text-canvas text-sm font-semibold rounded transition-colors"
                >
                  {mutation.isPending ? "Saving…" : "Submit Odds"}
                </button>
                {mutation.isSuccess && (
                  <span className="text-positive text-sm">Saved!</span>
                )}
              </div>
            </form>
            {error && <p className="text-risk text-sm mt-2">{error}</p>}
          </div>
        </>
      )}

      {!selectedEventId && (
        <div className="text-center py-12 text-ink-faint">
          Select an event above to view and submit odds.
        </div>
      )}
    </div>
  )
}
