import { NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email || '';
    const otp = body.otp || '';

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: 'Email and OTP are required' }, { status: 400 });
    }

    const result = await verifyOTP(email, otp);
    if (!result.success || !result.token) {
      return NextResponse.json(result, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      token: result.token,
      email,
      message: 'Logged in successfully',
    });

    // Set 30-day persistent cookie
    response.cookies.set('mf_nav_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
