import crypto from 'crypto';
import { cacheGet, cacheSet, cacheDel } from './redis';
import { createTransporter } from './email';

const AUTH_SECRET = process.env.AUTH_SECRET || 'mf_nav_super_secret_session_key_2026_blazing_fast';
const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL || 'rajeshpub1@gmail.com').toLowerCase().trim();

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createSessionToken(email: string): string {
  const payload = JSON.stringify({
    email,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days session
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): { valid: boolean; email?: string } {
  if (!token || !token.includes('.')) return { valid: false };
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return { valid: false };

  const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
  if (signature !== expectedSignature) {
    return { valid: false };
  }

  try {
    const json = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    if (json.expiresAt && json.expiresAt < Date.now()) {
      return { valid: false };
    }
    return { valid: true, email: json.email };
  } catch {
    return { valid: false };
  }
}

export async function sendLoginOTPEmail(email: string, otp: string) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `"MF NAV Tracker" <${process.env.SMTP_USER || 'rajeshpub1@gmail.com'}>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Login Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 500px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with Bharat Hunt Warm Orange Accent (Light Mode) -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px 28px 20px 28px; text-align: center; border-bottom: 1px solid #F1F5F9;">
              <div style="display: inline-flex; align-items: center; gap: 8px; background-color: #FFF7ED; border: 1px solid #FED7AA; color: #EA580C; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 12px; border-radius: 9999px;">
                <span style="display: inline-block; width: 14px; height: 10px; border-radius: 2px; overflow: hidden; vertical-align: middle; box-shadow: 0 0 1px rgba(0,0,0,0.3); line-height: 0;">
                  <span style="display: block; height: 3.3px; background-color: #FF9933;"></span>
                  <span style="display: block; height: 3.4px; background-color: #FFFFFF;"></span>
                  <span style="display: block; height: 3.3px; background-color: #138808;"></span>
                </span>
                <span>Bharat MF Security</span>
              </div>
              <h1 style="color: #0F172A; font-size: 22px; font-weight: 800; margin: 16px 0 6px 0; letter-spacing: -0.5px;">
                Your Login Verification Code
              </h1>
              <p style="color: #64748B; font-size: 13px; margin: 0;">
                Use this single-use 6-digit OTP to access your mutual fund portfolio.
              </p>
            </td>
          </tr>

          <!-- OTP Box (Warm Light Orange with Orange Code) -->
          <tr>
            <td style="padding: 32px 28px; text-align: center; background-color: #FFFFFF;">
              <div style="background-color: #FFF7ED; border: 2px dashed #FDBA74; border-radius: 14px; padding: 22px; display: inline-block; min-width: 240px;">
                <span style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #EA580C; font-family: monospace; display: block; margin-left: 10px;">
                  ${otp}
                </span>
              </div>
              
              <p style="color: #64748B; font-size: 12px; margin: 20px 0 0 0; line-height: 1.5;">
                This code is valid for <strong>10 minutes</strong>. Once entered, your browser session will remain securely saved until you log out.
              </p>
            </td>
          </tr>

          <!-- Footer (Light Clean) -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 18px 24px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Sent to <strong>${email}</strong> via Gmail SMTP &bull; Bharat MF NAV Tracker
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from,
    to: email,
    subject: `🔐 Your Login Code: ${otp} (MF NAV Tracker)`,
    html,
  });
}

export async function requestOTP(email: string): Promise<{ success: boolean; message: string }> {
  const normalized = email.toLowerCase().trim();
  if (normalized !== ALLOWED_EMAIL) {
    return {
      success: false,
      message: 'Access restricted: This email is not authorized to receive login OTP.',
    };
  }

  const otp = generateOTP();
  await cacheSet(`otp:${normalized}`, otp, 600); // 10 mins TTL

  try {
    await sendLoginOTPEmail(normalized, otp);
    return {
      success: true,
      message: `A 6-digit OTP was sent to ${normalized}. Please check your Gmail.`,
    };
  } catch (err: any) {
    console.error('Failed to send OTP email:', err);
    return {
      success: false,
      message: `Failed to send email: ${err.message}`,
    };
  }
}

export async function verifyOTP(email: string, submittedOtp: string): Promise<{ success: boolean; token?: string; message: string }> {
  const normalized = email.toLowerCase().trim();
  const cachedOtp = await cacheGet<string>(`otp:${normalized}`);

  if (!cachedOtp) {
    return { success: false, message: 'OTP has expired or was not requested. Please request a new code.' };
  }

  if (cachedOtp.trim() !== submittedOtp.trim()) {
    return { success: false, message: 'Invalid OTP code. Please check and try again.' };
  }

  // OTP is correct! Clear it so it cannot be reused
  await cacheDel(`otp:${normalized}`);

  const token = createSessionToken(normalized);
  return {
    success: true,
    token,
    message: 'Authentication successful!',
  };
}
