import { NextResponse } from 'next/server';
import { checkAndTriggerEodEmail } from '@/lib/scheduler';
import { getLivePortfolio } from '@/lib/mfapi';
import { getStoredState } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const checkEmail = body.checkEmail === true;

    if (checkEmail) {
      const result = await checkAndTriggerEodEmail(false);
      const summary = await getLivePortfolio(true);
      const state = getStoredState();
      return NextResponse.json({
        success: true,
        result,
        summary,
        state,
      });
    }

    const summary = await getLivePortfolio(true);
    const state = getStoredState();

    return NextResponse.json({
      success: true,
      summary,
      state,
      message: 'NAVs synced from MFapi successfully',
    });
  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
