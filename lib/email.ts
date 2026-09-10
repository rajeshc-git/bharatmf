import nodemailer from 'nodemailer';
import { PortfolioSummary } from './types';
import { getStoredState, saveStoredState, addLog } from './storage';

function formatINR(val: number, includeDecimals = true): string {
  if (isNaN(val)) return '₹0';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  });
  return `${sign}₹${formatted}`;
}

export function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== 'false';
  const user = process.env.SMTP_USER || 'rajeshpub1@gmail.com';
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export function generateEmailHtml(summary: PortfolioSummary, isTest = false): string {
  const isOverallPositive = summary.totalGainLoss >= 0;
  const isTodayPositive = summary.todayChange >= 0;

  const overallColor = isOverallPositive ? '#059669' : '#DC2626';
  const todayColor = isTodayPositive ? '#059669' : '#DC2626';

  // Mobile-first responsive fund cards + desktop table rows
  const fundCards = summary.funds
    .map((fund) => {
      const fundPositive = fund.totalGainLoss >= 0;
      const todayFundPositive = fund.oneDayChange >= 0;
      const fundGainColor = fundPositive ? '#059669' : '#DC2626';
      const todayChangeColor = todayFundPositive ? '#059669' : '#DC2626';

      return `
      <!-- Fund Card Item (Mobile & Desktop Responsive) -->
      <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="vertical-align: top;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; background: #FFF7ED; border: 1px solid #FED7AA; color: #EA580C; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; text-transform: uppercase;">
                  ${(fund.logoInitial || fund.shortName.slice(0, 3)).toUpperCase()}
                </span>
                <span style="font-size: 11px; color: #64748B; font-weight: 600;">
                  AMFI: ${fund.schemeCode}
                </span>
              </div>
              <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-top: 6px; line-height: 1.3;">
                ${fund.shortName}
              </div>
              <div style="font-size: 12px; color: #64748B; margin-top: 3px;">
                NAV: <strong style="color: #1E293B;">₹${fund.currentNav.toFixed(2)}</strong> &bull; Date: ${fund.navDate} &bull; ${fund.units.toFixed(2)} units
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 14px;">
              <!-- 3-Column Metrics Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #F1F5F9; padding-top: 10px;">
                <tr>
                  <td width="33%" style="vertical-align: top;">
                    <div style="font-size: 11px; color: #64748B; font-weight: 600;">Invested</div>
                    <div style="font-size: 13px; font-weight: 700; color: #334155; margin-top: 2px;">
                      ${formatINR(fund.investedAmount, false)}
                    </div>
                  </td>
                  <td width="33%" style="vertical-align: top; text-align: center;">
                    <div style="font-size: 11px; color: #64748B; font-weight: 600;">Current Value</div>
                    <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 2px;">
                      ${formatINR(fund.currentValue, true)}
                    </div>
                    <div style="font-size: 10px; color: ${todayChangeColor}; font-weight: 700; margin-top: 1px;">
                      ${todayFundPositive ? '▲ +' : '▼ '}${formatINR(fund.oneDayChange, true)}
                    </div>
                  </td>
                  <td width="34%" style="vertical-align: top; text-align: right;">
                    <div style="font-size: 11px; color: #64748B; font-weight: 600;">Total P&amp;L</div>
                    <div style="font-size: 14px; font-weight: 800; color: ${fundGainColor}; margin-top: 2px;">
                      ${fundPositive ? '+' : ''}${formatINR(fund.totalGainLoss, true)}
                    </div>
                    <div style="font-size: 10px; color: ${fundGainColor}; font-weight: 700; margin-top: 1px;">
                      (${fund.totalGainLossPercent >= 0 ? '+' : ''}${fund.totalGainLossPercent.toFixed(2)}%)
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Daily Mutual Fund NAV Update</title>
  <style>
    /* Mobile responsive adjustments */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .mobile-padding { padding: 18px 16px !important; }
      .hero-val { font-size: 26px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; padding: 24px 10px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Top Header Strip (Light Mode + Bharat Hunt Orange Brand) -->
          <tr>
            <td class="mobile-padding" style="background: #FFFFFF; padding: 28px 24px 20px 24px; border-bottom: 1px solid #F1F5F9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="display: inline-flex; align-items: center; gap: 6px; background-color: #FFF7ED; border: 1px solid #FFEDD5; color: #EA580C; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 10px; border-radius: 9999px;">
                      <span>🇮🇳</span>
                      <span>${isTest ? 'TEST EMAIL &bull; ' : ''}Bharat MF NAV Update</span>
                    </div>
                    <h1 style="color: #0F172A; font-size: 22px; font-weight: 800; margin: 12px 0 4px 0; letter-spacing: -0.5px;">
                      Daily Mutual Fund Digest
                    </h1>
                    <p style="color: #64748B; font-size: 12px; margin: 0;">
                      Official AMFI NAVs as of <strong style="color: #334155;">${summary.latestNavDate}</strong> &bull; Delivered via Gmail SMTP
                    </p>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <div style="background-color: #F1F5F9; border: 1px solid #E2E8F0; padding: 6px 10px; border-radius: 8px; color: #0F172A; font-size: 11px; font-weight: 700; display: inline-block;">
                      ${summary.funds.length} Funds
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Portfolio Hero Card (Light Mode with Warm Ambient Card) -->
              <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%); border: 1px solid #FED7AA; border-radius: 14px; padding: 20px; margin-top: 18px; box-shadow: 0 4px 12px -2px rgba(255, 91, 0, 0.06);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align: top;">
                      <div style="font-size: 11px; color: #EA580C; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">
                        Total Portfolio Value
                      </div>
                      <div class="hero-val" style="font-size: 30px; font-weight: 900; color: #0F172A; margin-top: 4px; letter-spacing: -0.8px;">
                        ${formatINR(summary.totalCurrentValue, true)}
                      </div>
                    </td>
                    <td align="right" style="vertical-align: top;">
                      <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
                        Total Returns
                      </div>
                      <div style="font-size: 18px; font-weight: 800; color: ${overallColor}; margin-top: 4px;">
                        ${isOverallPositive ? '+' : ''}${formatINR(summary.totalGainLoss, true)}
                      </div>
                      <div style="font-size: 11px; color: ${overallColor}; font-weight: 700;">
                        (${summary.totalGainLossPercent >= 0 ? '+' : ''}${summary.totalGainLossPercent.toFixed(2)}% Overall)
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 14px; border-top: 1px solid rgba(254, 215, 170, 0.6); margin-top: 14px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td>
                            <span style="color: #64748B; font-size: 11px;">Invested:</span>
                            <strong style="color: #0F172A; font-size: 12px; margin-left: 4px;">${formatINR(summary.totalInvested, false)}</strong>
                          </td>
                          <td align="right">
                            <span style="color: #64748B; font-size: 11px;">1-Day Change:</span>
                            <strong style="color: ${todayColor}; font-size: 12px; margin-left: 4px;">
                              ${isTodayPositive ? '▲ +' : '▼ '}${formatINR(summary.todayChange, true)} (${summary.todayChangePercent >= 0 ? '+' : ''}${summary.todayChangePercent.toFixed(2)}%)
                            </strong>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Fund Cards Section (Stackable & 100% Mobile Friendly) -->
          <tr>
            <td class="mobile-padding" style="background-color: #F8FAFC; padding: 22px 24px;">
              <div style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px;">
                Holdings Breakdown (Real AMFI Data)
              </div>
              
              <!-- Cards Container with mobile safety -->
              <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                ${fundCards}
              </div>
            </td>
          </tr>

          <!-- EOD Timing Info Banner -->
          <tr>
            <td style="padding: 0 24px 20px 24px; background-color: #F8FAFC;">
              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 12px 14px;">
                <p style="margin: 0; font-size: 11px; color: #065F46; line-height: 1.5;">
                  <strong>⚡ EOD AMFI Sync:</strong> In India, mutual funds publish official NAVs each evening between 9:00 PM and 11:30 PM IST. This email is automatically dispatched once confirmed daily NAVs are released.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer (Light Clean) -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 20px 24px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #475569; font-weight: 600;">
                Generated by <strong>Bharat MF NAV Engine (Bun 1.4 &bull; Next.js 16)</strong>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Source: <a href="https://www.mfapi.in" style="color: #EA580C; text-decoration: none; font-weight: 600;">MFapi.in / AMFI Official</a> &bull; Sent to ${process.env.NOTIFICATION_EMAIL || 'rajeshpub1@gmail.com'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPortfolioEmail(summary: PortfolioSummary, recipient?: string, isTest = false) {
  const targetEmail = recipient || process.env.NOTIFICATION_EMAIL || 'rajeshpub1@gmail.com';
  const from = process.env.SMTP_FROM || `"MF NAV Tracker" <${process.env.SMTP_USER || 'rajeshpub1@gmail.com'}>`;
  const transporter = createTransporter();

  const isTodayPositive = summary.todayChange >= 0;
  const changeArrow = isTodayPositive ? '▲' : '▼';
  const subjectPrefix = isTest ? '[TEST EMAIL] ' : '';
  const subject = `${subjectPrefix}Mutual Fund Daily NAV (${summary.latestNavDate}): ${formatINR(summary.totalCurrentValue, true)} (${changeArrow} ${summary.todayChangePercent >= 0 ? '+' : ''}${summary.todayChangePercent.toFixed(2)}%)`;

  const html = generateEmailHtml(summary, isTest);

  try {
    const info = await transporter.sendMail({
      from,
      to: targetEmail,
      subject,
      html,
    });

    const state = getStoredState();
    state.lastEmailSentDate = summary.latestNavDate;
    state.lastEmailSentTimestamp = new Date().toISOString();
    state.lastEmailStatus = 'success';
    state.lastEmailMessage = `Email sent successfully (MessageId: ${info.messageId})`;
    saveStoredState(state);

    addLog(
      `${isTest ? 'Test email' : 'Daily digest email'} sent to ${targetEmail} for date ${summary.latestNavDate}`,
      'success'
    );

    return { success: true, messageId: info.messageId, recipient: targetEmail };
  } catch (err: any) {
    console.error('Failed to send email:', err);
    const state = getStoredState();
    state.lastEmailStatus = 'error';
    state.lastEmailMessage = err.message || 'Unknown email error';
    saveStoredState(state);

    addLog(`Email delivery failed: ${err.message}`, 'error');
    throw err;
  }
}
