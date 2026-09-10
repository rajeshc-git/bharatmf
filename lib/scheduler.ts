import cron from 'node-cron';
import { getLivePortfolio } from './mfapi';
import { sendPortfolioEmail } from './email';
import { getStoredState, saveStoredState, addLog } from './storage';

let isSchedulerRunning = false;
let isCheckInProgress = false;

export async function checkAndTriggerEodEmail(force = false) {
  if (isCheckInProgress) {
    return { success: false, message: 'Sync/Check already in progress' };
  }

  isCheckInProgress = true;
  try {
    const summary = await getLivePortfolio(true);
    const state = getStoredState();

    state.lastSyncTimestamp = new Date().toISOString();
    saveStoredState(state);

    const latestNavDate = summary.latestNavDate;

    // Check if we have already sent an email for this NAV date
    if (!force && state.lastEmailSentDate === latestNavDate) {
      addLog(`EOD check: Latest NAV date ${latestNavDate} was already notified. Skipping.`, 'info');
      return {
        success: true,
        triggered: false,
        reason: `Already sent for NAV date ${latestNavDate}`,
        latestNavDate,
      };
    }

    // New date discovered! Send the daily digest email
    addLog(`New NAV date detected: ${latestNavDate}. Dispatching daily digest...`, 'info');
    const result = await sendPortfolioEmail(summary, undefined, false);

    return {
      success: true,
      triggered: true,
      latestNavDate,
      messageId: result.messageId,
    };
  } catch (err: any) {
    console.error('Error during EOD check:', err);
    addLog(`EOD check failed: ${err.message}`, 'error');
    return { success: false, error: err.message };
  } finally {
    isCheckInProgress = false;
  }
}

export function initScheduler() {
  if (isSchedulerRunning) {
    return;
  }
  isSchedulerRunning = true;

  const scheduleExpr = process.env.CRON_SCHEDULE || '*/20 21,22,23 * * 1-5';
  const timezone = process.env.TIMEZONE || 'Asia/Kolkata';

  addLog(`EOD Scheduler started with cron: "${scheduleExpr}" (${timezone})`, 'info');

  try {
    cron.schedule(
      scheduleExpr,
      async () => {
        addLog('Cron trigger: Checking for updated mutual fund NAVs...', 'info');
        await checkAndTriggerEodEmail(false);
      },
      {
        timezone,
      }
    );
  } catch (err: any) {
    console.error('Failed to register cron task:', err);
  }
}
