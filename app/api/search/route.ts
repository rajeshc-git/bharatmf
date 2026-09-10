import { NextResponse } from 'next/server';
import { searchMutualFunds } from '@/lib/mfapi';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const results = await searchMutualFunds(query);
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('Search route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
