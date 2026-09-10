import { NextResponse } from 'next/server';
import { getLivePortfolio } from '@/lib/mfapi';
import { getStoredFunds, saveStoredFunds, getStoredState, addLog } from '@/lib/storage';
import { initScheduler } from '@/lib/scheduler';
import { FundHolding } from '@/lib/types';

// Ensure scheduler is running when API is touched
initScheduler();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const summary = await getLivePortfolio(force);
    const state = getStoredState();

    return NextResponse.json({
      success: true,
      summary,
      state,
    });
  } catch (err: any) {
    console.error('Portfolio GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body) {
      return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });
    }

    let currentFunds = getStoredFunds();

    // 1. Handle single fund add or update
    if (body.action === 'add' || body.action === 'update') {
      const fund: FundHolding = body.fund;
      if (!fund || !fund.schemeCode) {
        return NextResponse.json({ success: false, error: 'fund details are required' }, { status: 400 });
      }

      const existingIndex = currentFunds.findIndex((f) => f.schemeCode === fund.schemeCode);
      if (existingIndex >= 0) {
        currentFunds[existingIndex] = { ...currentFunds[existingIndex], ...fund };
        addLog(`Updated fund holding: ${fund.shortName || fund.schemeName}`, 'info');
      } else {
        currentFunds.push(fund);
        addLog(`Added new fund to portfolio: ${fund.shortName || fund.schemeName}`, 'info');
      }
      saveStoredFunds(currentFunds);
    }
    // 2. Handle fund remove / delete
    else if (body.action === 'remove' || body.action === 'delete') {
      const schemeCode = Number(body.schemeCode || (body.fund && body.fund.schemeCode));
      if (!schemeCode) {
        return NextResponse.json({ success: false, error: 'schemeCode is required for deletion' }, { status: 400 });
      }

      const removed = currentFunds.find((f) => f.schemeCode === schemeCode);
      currentFunds = currentFunds.filter((f) => f.schemeCode !== schemeCode);
      saveStoredFunds(currentFunds);
      addLog(`Removed fund: ${removed ? removed.shortName : schemeCode}`, 'info');
    }
    // 3. Handle bulk array of funds
    else if (Array.isArray(body.funds)) {
      currentFunds = body.funds;
      saveStoredFunds(currentFunds);
      addLog(`Portfolio updated: ${currentFunds.length} funds saved`, 'info');
    } else {
      return NextResponse.json(
        { success: false, error: 'Valid action (add, update, remove) or funds array is required' },
        { status: 400 }
      );
    }

    const summary = await getLivePortfolio(true);
    return NextResponse.json({
      success: true,
      summary,
      message: 'Holdings saved successfully',
    });
  } catch (err: any) {
    console.error('Portfolio POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
