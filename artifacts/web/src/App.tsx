import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Opportunities from "./pages/Opportunities"
import Events from "./pages/Events"
import Odds from "./pages/Odds"
import Setup from "./pages/Setup"
import Predictions from "./pages/Predictions"
import Accumulator from "./pages/Accumulator"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

type Tab = "opportunities" | "predictions" | "accumulator" | "events" | "odds" | "setup"

const TABS: { id: Tab; label: string }[] = [
  { id: "opportunities", label: "Opportunities" },
  { id: "predictions", label: "✦ Predictions" },
  { id: "accumulator", label: "🎯 Accumulator" },
  { id: "events", label: "Events" },
  { id: "odds", label: "Odds" },
  { id: "setup", label: "Setup" },
]

function Layout() {
  const [activeTab, setActiveTab] = useState<Tab>("opportunities")

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-gray-800">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Sure-Bet
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Arbitrage Analyzer</p>
        </div>
        <nav className="flex-1 py-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-gray-800 text-white border-r-2 border-green-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {activeTab === "opportunities" && <Opportunities />}
          {activeTab === "predictions" && <Predictions />}
          {activeTab === "accumulator" && <Accumulator />}
          {activeTab === "events" && <Events />}
          {activeTab === "odds" && <Odds />}
          {activeTab === "setup" && <Setup />}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout />
    </QueryClientProvider>
  )
}
