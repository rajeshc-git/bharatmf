import { NextResponse } from 'next/server';
import { getLivePortfolio } from '@/lib/mfapi';
import { sendPortfolioEmail, generateEmailHtml } from '@/lib/email';
import { getStoredState } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || 'test'; // 'test' | 'trigger_eod' | 'preview'
    const recipient = body.recipient || process.env.NOTIFICATION_EMAIL || 'rajeshpub1@gmail.com';

    const summary = await getLivePortfolio(false);

    if (action === 'preview') {
      const html = generateEmailHtml(summary, false);
      return NextResponse.json({
        success: true,
        html,
      });
    }

    if (action === 'test') {
      const result = await sendPortfolioEmail(summary, recipient, true);
      const state = getStoredState();
      return NextResponse.json({
        success: true,
        message: `Test email dispatched successfully to ${recipient}!`,
        result,
        state,
      });
    }

    if (action === 'trigger_eod') {
      const result = await sendPortfolioEmail(summary, recipient, false);
      const state = getStoredState();
      return NextResponse.json({
        success: true,
        message: `Daily EOD digest sent successfully to ${recipient}!`,
        result,
        state,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Email route error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to process email request',
      },
      { status: 500 }
    );
  }
}
