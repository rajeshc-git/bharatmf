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
    if (!body || !Array.isArray(body.funds)) {
      return NextResponse.json({ success: false, error: 'funds array is required' }, { status: 400 });
    }

    const updatedFunds: FundHolding[] = body.funds;
    saveStoredFunds(updatedFunds);
    addLog(`Portfolio updated: ${updatedFunds.length} funds saved`, 'info');

    const summary = await getLivePortfolio(true);
    return NextResponse.json({
      success: true,
      summary,
      message: 'Holdings updated successfully',
    });
  } catch (err: any) {
    console.error('Portfolio POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
