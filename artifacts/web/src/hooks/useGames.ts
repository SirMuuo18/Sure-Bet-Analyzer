import { useQuery } from "@tanstack/react-query"
import { getPredictions, getEvents, getSports, getBookmakers, type Prediction, type SportEvent } from "../api"

export interface Game extends Prediction {
  sportName: string
  event: SportEvent | null
}

export function useGames() {
  const predictionsQ = useQuery({
    queryKey: ["predictions"],
    queryFn: getPredictions,
    refetchInterval: 60_000,
  })
  const eventsQ = useQuery({ queryKey: ["events"], queryFn: () => getEvents() })
  const sportsQ = useQuery({ queryKey: ["sports"], queryFn: getSports })
  const bookmakersQ = useQuery({ queryKey: ["bookmakers"], queryFn: getBookmakers })

  const sportsById = new Map(sportsQ.data?.map((s) => [s.id, s.name]) ?? [])
  const eventsById = new Map(eventsQ.data?.map((e) => [e.id, e]) ?? [])
  const bookmakersById: Record<number, string> = {}
  for (const b of bookmakersQ.data ?? []) bookmakersById[b.id] = b.name

  const games: Game[] = (predictionsQ.data ?? [])
    .map((p) => {
      const event = eventsById.get(p.eventId) ?? null
      return {
        ...p,
        sportName: event ? (sportsById.get(event.sportId) ?? "Sport") : "Sport",
        event,
      }
    })
    // Soonest-first — every consumer of useGames is implicitly browsing
    // "upcoming" matches, so that's the natural default order.
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

  return {
    games,
    bookmakersById,
    isLoading: predictionsQ.isLoading,
    isError: predictionsQ.isError,
    refetch: predictionsQ.refetch,
    isFetching: predictionsQ.isFetching,
    dataUpdatedAt: predictionsQ.dataUpdatedAt,
  }
}
