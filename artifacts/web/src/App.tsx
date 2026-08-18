import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Home from "./pages/Home"
import Games from "./pages/Games"
import Value from "./pages/Value"
import Insights from "./pages/Insights"
import Opportunities from "./pages/Opportunities"
import Accumulator from "./pages/Accumulator"
import StrategyHub from "./pages/StrategyHub"
import Manage from "./pages/Manage"
import Sidebar from "./components/Sidebar"
import BottomNav from "./components/BottomNav"
import type { Tab } from "./lib/nav"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function Layout() {
  const [activeTab, setActiveTab] = useState<Tab>("home")

  return (
    <div className="min-h-screen bg-canvas text-ink flex">
      <Sidebar active={activeTab} onSelect={setActiveTab} />

      <main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-5 sm:p-8">
          {activeTab === "home" && <Home onViewAllGames={() => setActiveTab("games")} />}
          {activeTab === "games" && <Games />}
          {activeTab === "value" && <Value />}
          {activeTab === "insights" && <Insights />}
          {activeTab === "arbitrage" && <Opportunities />}
          {activeTab === "accumulator" && <Accumulator />}
          {activeTab === "strategy" && <StrategyHub />}
          {activeTab === "manage" && <Manage />}
        </div>
      </main>

      <BottomNav active={activeTab} onSelect={setActiveTab} />
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
