/**
 * Arbitrage (sure-bet) calculation utilities.
 *
 * A sure-bet exists when the sum of inverse odds across all outcomes is < 1.
 * Profit % = (1 / sum - 1) * 100
 */

export type OutcomeKey = "home" | "draw" | "away";

export interface OddsEntry {
  bookmakerId: number;
  outcome: OutcomeKey;
  odds: number;
}

export interface StakeDetail {
  bookmakerId: number;
  odds: number;
  stake: number;
  payout: number;
}

export interface ArbitrageResult {
  profitPercentage: number;
  stakes: {
    home: StakeDetail;
    draw?: StakeDetail;
    away: StakeDetail;
  };
}

/**
 * Given the best odds per outcome, compute whether an arbitrage exists.
 * @param totalBankroll - Total amount to distribute across bets (default 100)
 */
export function calculateArbitrage(
  bestOdds: { home: OddsEntry; draw?: OddsEntry; away: OddsEntry },
  totalBankroll = 100,
): ArbitrageResult | null {
  const entries: Array<{ key: OutcomeKey; entry: OddsEntry }> = [
    { key: "home", entry: bestOdds.home },
    { key: "away", entry: bestOdds.away },
  ];
  if (bestOdds.draw) {
    entries.push({ key: "draw", entry: bestOdds.draw });
  }

  const impliedSum = entries.reduce((acc, { entry }) => acc + 1 / entry.odds, 0);

  if (impliedSum >= 1) {
    return null; // No arbitrage
  }

  const profitPercentage = (1 / impliedSum - 1) * 100;

  const stakeMap: Record<string, StakeDetail> = {};
  for (const { key, entry } of entries) {
    const stake = totalBankroll / (entry.odds * impliedSum);
    stakeMap[key] = {
      bookmakerId: entry.bookmakerId,
      odds: entry.odds,
      stake: Math.round(stake * 100) / 100,
      payout: Math.round(stake * entry.odds * 100) / 100,
    };
  }

  return {
    profitPercentage: Math.round(profitPercentage * 10000) / 10000,
    stakes: stakeMap as ArbitrageResult["stakes"],
  };
}

/**
 * From a list of odds for a single event, pick the best (highest) odds per
 * outcome across all bookmakers.
 */
export function bestOddsPerOutcome(
  oddsList: OddsEntry[],
): { home: OddsEntry; draw?: OddsEntry; away: OddsEntry } | null {
  const best: Partial<Record<OutcomeKey, OddsEntry>> = {};
  for (const entry of oddsList) {
    const current = best[entry.outcome];
    if (!current || entry.odds > current.odds) {
      best[entry.outcome] = entry;
    }
  }
  if (!best.home || !best.away) return null;
  return { home: best.home, draw: best.draw, away: best.away };
}
