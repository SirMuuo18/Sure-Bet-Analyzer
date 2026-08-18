import type { ComponentType, SVGProps } from "react"
import {
  HomeIcon,
  GamesIcon,
  ValueIcon,
  ArbitrageIcon,
  AccumulatorIcon,
  InsightsIcon,
  StrategyIcon,
  ManageIcon,
} from "../components/icons"

export type Tab =
  | "home"
  | "games"
  | "value"
  | "arbitrage"
  | "accumulator"
  | "insights"
  | "strategy"
  | "manage"

export interface NavItem {
  id: Tab
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const PRIMARY_NAV: NavItem[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "games", label: "Games", icon: GamesIcon },
  { id: "value", label: "Value", icon: ValueIcon },
  { id: "insights", label: "Insights", icon: InsightsIcon },
]

export const TOOLS_NAV: NavItem[] = [
  { id: "arbitrage", label: "Arbitrage", icon: ArbitrageIcon },
  { id: "accumulator", label: "Accumulator", icon: AccumulatorIcon },
  { id: "strategy", label: "Playbook", icon: StrategyIcon },
]

export const UTILITY_NAV: NavItem[] = [{ id: "manage", label: "Manage Data", icon: ManageIcon }]

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...TOOLS_NAV, ...UTILITY_NAV]

export const MOBILE_MORE_NAV: NavItem[] = [...TOOLS_NAV, ...UTILITY_NAV]
