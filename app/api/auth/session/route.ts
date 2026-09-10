import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // 1. Check Cookie
    const cookieHeader = request.headers.get('cookie') || '';
    let token = '';
    const match = cookieHeader.match(/mf_nav_session=([^;]+)/);
    if (match && match[1]) {
      token = match[1];
    }

    // 2. Or check Authorization header fallback
    if (!token) {
      const authHeader = request.headers.get('authorization') || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const { valid, email } = verifySessionToken(token);
    return NextResponse.json({
      authenticated: valid,
      email: valid ? email : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message });
  }
}

export async function POST(request: Request) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear session cookie
    response.cookies.set('mf_nav_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
