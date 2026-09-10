import { FundHolding, LiveFundData, PortfolioSummary, MFapiSchemeResponse } from './types';
import { getStoredFunds, addLog } from './storage';

interface CacheEntry {
  timestamp: number;
  data: MFapiSchemeResponse;
}

const memoryCache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache for fast UI response

export async function fetchSchemeData(schemeCode: number, forceRefresh = false): Promise<MFapiSchemeResponse | null> {
  const cached = memoryCache.get(schemeCode);
  const now = Date.now();

  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MF-NAV-Tracker/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`MFapi responded with status ${res.status}`);
    }

    const json = (await res.json()) as MFapiSchemeResponse;
    if (!json || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error('Invalid or empty data from MFapi');
    }

    memoryCache.set(schemeCode, { timestamp: now, data: json });
    return json;
  } catch (err: any) {
    console.error(`Failed to fetch scheme ${schemeCode}:`, err.message);
    if (cached) {
      return cached.data; // Fallback to stale cached data
    }
    return null;
  }
}

export async function getLivePortfolio(forceRefresh = false): Promise<PortfolioSummary> {
  const holdings = getStoredFunds();
  const liveFunds: LiveFundData[] = [];

  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalTodayChange = 0;
  let latestNavDate = '';

  const results = await Promise.allSettled(
    holdings.map(async (holding) => {
      const schemeData = await fetchSchemeData(holding.schemeCode, forceRefresh);
      return { holding, schemeData };
    })
  );

  for (const res of results) {
    if (res.status === 'fulfilled' && res.value) {
      const { holding, schemeData } = res.value;

      if (schemeData && schemeData.data && schemeData.data.length > 0) {
        const latestPoint = schemeData.data[0]!;
        const prevPoint = schemeData.data.length > 1 ? schemeData.data[1]! : latestPoint;

        const currentNav = parseFloat(latestPoint.nav) || 0;
        const prevNav = parseFloat(prevPoint.nav) || currentNav;
        const navDate = latestPoint.date;
        const prevNavDate = prevPoint.date;

        if (!latestNavDate || compareDates(navDate, latestNavDate) > 0) {
          latestNavDate = navDate;
        }

        const currentValue = holding.units * currentNav;
        const totalGainLoss = currentValue - holding.investedAmount;
        const totalGainLossPercent =
          holding.investedAmount > 0 ? (totalGainLoss / holding.investedAmount) * 100 : 0;

        const oneDayNavDiff = currentNav - prevNav;
        const oneDayChange = holding.units * oneDayNavDiff;
        const oneDayChangePercent = prevNav > 0 ? (oneDayNavDiff / prevNav) * 100 : 0;

        totalInvested += holding.investedAmount;
        totalCurrentValue += currentValue;
        totalTodayChange += oneDayChange;

        liveFunds.push({
          ...holding,
          currentNav,
          navDate,
          prevNav,
          prevNavDate,
          currentValue,
          totalGainLoss,
          totalGainLossPercent,
          oneDayChange,
          oneDayChangePercent,
          isUpdatedForLatestTradingDay: false, // will update below
          category: holding.category || schemeData.meta.scheme_category,
          fundHouse: holding.fundHouse || schemeData.meta.fund_house,
        });
      } else {
        // Fallback placeholder if offline
        liveFunds.push({
          ...holding,
          currentNav: 0,
          navDate: 'N/A',
          prevNav: 0,
          prevNavDate: 'N/A',
          currentValue: holding.investedAmount,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          oneDayChange: 0,
          oneDayChangePercent: 0,
          isUpdatedForLatestTradingDay: false,
        });
        totalInvested += holding.investedAmount;
        totalCurrentValue += holding.investedAmount;
      }
    }
  }

  // Mark whether each fund is updated to the latestNavDate
  for (const fund of liveFunds) {
    fund.isUpdatedForLatestTradingDay = fund.navDate === latestNavDate;
  }

  const allUpdated = liveFunds.every((f) => f.isUpdatedForLatestTradingDay);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  const todayChangePercent =
    totalCurrentValue - totalTodayChange > 0
      ? (totalTodayChange / (totalCurrentValue - totalTodayChange)) * 100
      : 0;

  return {
    totalInvested,
    totalCurrentValue,
    totalGainLoss,
    totalGainLossPercent,
    todayChange: totalTodayChange,
    todayChangePercent,
    latestNavDate: latestNavDate || 'N/A',
    allUpdated,
    funds: liveFunds,
    lastCheckedAt: new Date().toISOString(),
  };
}

export async function searchMutualFunds(query: string) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query.trim())}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, 15) : [];
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
}

// Helper to compare dates in "DD-MM-YYYY" format
function compareDates(d1: string, d2: string): number {
  if (!d1 || !d2) return 0;
  const parts1 = d1.split('-').map(Number);
  const parts2 = d2.split('-').map(Number);
  if (parts1.length !== 3 || parts2.length !== 3) return 0;
  const time1 = new Date(parts1[2]!, parts1[1]! - 1, parts1[0]!).getTime();
  const time2 = new Date(parts2[2]!, parts2[1]! - 1, parts2[0]!).getTime();
  return time1 - time2;
}
