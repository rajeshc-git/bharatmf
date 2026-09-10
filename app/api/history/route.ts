import { NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/redis';
import { MFapiSchemeResponse, MFapiNavPoint } from '@/lib/types';

// Parse "DD-MM-YYYY" to Date
function parseIndianDate(dateStr: string): Date {
  const [d, m, y] = dateStr.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schemeCodeStr = searchParams.get('schemeCode');
    const timeframe = (searchParams.get('timeframe') || '1Y').toUpperCase();

    if (!schemeCodeStr) {
      return NextResponse.json({ success: false, error: 'schemeCode is required' }, { status: 400 });
    }

    const schemeCode = parseInt(schemeCodeStr, 10);
    const cacheKey = `history:${schemeCode}`;

    let schemeData = await cacheGet<MFapiSchemeResponse>(cacheKey);

    if (!schemeData) {
      // Fetch full history from MFapi.in
      const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`MFapi responded with status ${res.status}`);
      }
      schemeData = (await res.json()) as MFapiSchemeResponse;
      if (schemeData && Array.isArray(schemeData.data)) {
        // Cache in Redis for 24 hours
        await cacheSet(cacheKey, schemeData, 86400);
      }
    }

    if (!schemeData || !Array.isArray(schemeData.data) || schemeData.data.length === 0) {
      return NextResponse.json({ success: false, error: 'No historical data found' }, { status: 404 });
    }

    // Filter points according to timeframe
    const allPoints = schemeData.data; // Ordered latest first (index 0 is newest)
    const latestDate = parseIndianDate(allPoints[0]!.date);

    let daysToKeep = 365;
    if (timeframe === '1D') daysToKeep = 3;
    else if (timeframe === '1M') daysToKeep = 30;
    else if (timeframe === '3M') daysToKeep = 90;
    else if (timeframe === '6M') daysToKeep = 180;
    else if (timeframe === '1Y') daysToKeep = 365;
    else if (timeframe === '3Y') daysToKeep = 1095; // 3 Years
    else if (timeframe === '5Y') daysToKeep = 1825; // 5 Years
    else if (timeframe === 'ALL') daysToKeep = 36500; // All available history

    const cutoffTime = latestDate.getTime() - daysToKeep * 24 * 60 * 60 * 1000;

    let filtered = allPoints
      .filter((pt) => parseIndianDate(pt.date).getTime() >= cutoffTime)
      .reverse(); // Reverse so chronological order (oldest to newest) for charting

    // If 1D has fewer than 2 points, take at least the last 2 available points for comparison
    if (filtered.length < 2 && allPoints.length >= 2) {
      filtered = [allPoints[1]!, allPoints[0]!].reverse();
    }

    // Downsample if more than 120 points to keep SVG rendering instant
    let sampled: Array<{ date: string; nav: number }> = [];
    if (filtered.length > 120) {
      const step = Math.ceil(filtered.length / 120);
      for (let i = 0; i < filtered.length; i += step) {
        sampled.push({
          date: filtered[i]!.date,
          nav: parseFloat(filtered[i]!.nav),
        });
      }
      // Ensure the very last point (latest) is included
      const lastPt = filtered[filtered.length - 1]!;
      if (sampled[sampled.length - 1]?.date !== lastPt.date) {
        sampled.push({ date: lastPt.date, nav: parseFloat(lastPt.nav) });
      }
    } else {
      sampled = filtered.map((pt) => ({
        date: pt.date,
        nav: parseFloat(pt.nav),
      }));
    }

    if (sampled.length === 0) {
      return NextResponse.json({ success: false, error: 'No data points in timeframe' });
    }

    const navValues = sampled.map((p) => p.nav);
    const high = Math.max(...navValues);
    const low = Math.min(...navValues);
    const startNav = sampled[0]!.nav;
    const endNav = sampled[sampled.length - 1]!.nav;
    const change = endNav - startNav;
    const changePercent = startNav > 0 ? (change / startNav) * 100 : 0;

    return NextResponse.json({
      success: true,
      meta: schemeData.meta,
      timeframe,
      points: sampled,
      stats: {
        high,
        low,
        startNav,
        endNav,
        change,
        changePercent,
        count: sampled.length,
      },
    });
  } catch (err: any) {
    console.error('History API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
