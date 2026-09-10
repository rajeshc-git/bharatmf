import fs from 'fs';
import path from 'path';
import { FundHolding, AppState } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const DEFAULT_FUNDS: FundHolding[] = [
  {
    id: 'hdfc-flexi-cap',
    schemeCode: 118955,
    schemeName: 'HDFC Flexi Cap Fund - Direct Plan - Growth Option',
    shortName: 'HDFC Flexi Cap Fund',
    investedAmount: 100000,
    units: 45.0232,
    fundHouse: 'HDFC Mutual Fund',
    category: 'Flexi Cap Fund',
    iconBg: '#C62828',
    accentColor: '#E53935',
    logoInitial: 'HDFC',
  },
  {
    id: 'invesco-small-cap',
    schemeCode: 145137,
    schemeName: 'Invesco India Small Cap Fund - Direct Plan - Growth',
    shortName: 'Invesco India Small Cap Fund',
    investedAmount: 50000,
    units: 953.3565,
    fundHouse: 'Invesco Mutual Fund',
    category: 'Small Cap Fund',
    iconBg: '#0D47A1',
    accentColor: '#1976D2',
    logoInitial: 'INV',
  },
  {
    id: 'motilal-midcap-150',
    schemeCode: 147622,
    schemeName: 'Motilal Oswal Nifty Midcap 150 Index Fund - Direct Plan - Growth',
    shortName: 'Motilal Oswal Nifty Midcap 150 Index Fund',
    investedAmount: 45000,
    units: 1085.612,
    fundHouse: 'Motilal Oswal Mutual Fund',
    category: 'Index Fund',
    iconBg: '#E65100',
    accentColor: '#FB8C00',
    logoInitial: 'MO',
  },
  {
    id: 'kotak-mid-cap',
    schemeCode: 119775,
    schemeName: 'Kotak Mid Cap Fund - Direct Plan - Growth',
    shortName: 'Kotak Mid Cap Fund',
    investedAmount: 4100,
    units: 23.9712,
    fundHouse: 'Kotak Mahindra Mutual Fund',
    category: 'Mid Cap Fund',
    iconBg: '#B71C1C',
    accentColor: '#D32F2F',
    logoInitial: 'KOTAK',
  },
  {
    id: 'icici-gold-etf-fof',
    schemeCode: 120685,
    schemeName: 'ICICI Prudential Gold ETF FOF - Direct Plan - Growth',
    shortName: 'ICICI Prudential Gold ETF FOF Fund',
    investedAmount: 100,
    units: 2.09789,
    fundHouse: 'ICICI Prudential Mutual Fund',
    category: 'Gold ETF FoF',
    iconBg: '#BF360C',
    accentColor: '#F4511E',
    logoInitial: 'ICICI',
  },
];

const DEFAULT_STATE: AppState = {
  lastSyncTimestamp: '',
  lastEmailSentDate: '',
  lastEmailSentTimestamp: '',
  lastEmailStatus: 'idle',
  recentLogs: [
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      message: 'Portfolio initialized with 5 INDmoney tracking mutual funds',
      type: 'info',
    },
  ],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getStoredFunds(): FundHolding[] {
  ensureDataDir();
  if (!fs.existsSync(PORTFOLIO_FILE)) {
    saveStoredFunds(DEFAULT_FUNDS);
    return DEFAULT_FUNDS;
  }
  try {
    const raw = fs.readFileSync(PORTFOLIO_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read portfolio.json, reverting to defaults:', err);
  }
  saveStoredFunds(DEFAULT_FUNDS);
  return DEFAULT_FUNDS;
}

export function saveStoredFunds(funds: FundHolding[]): void {
  ensureDataDir();
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(funds, null, 2), 'utf-8');
}

export function getStoredState(): AppState {
  ensureDataDir();
  if (!fs.existsSync(STATE_FILE)) {
    saveStoredState(DEFAULT_STATE);
    return DEFAULT_STATE;
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (err) {
    console.error('Failed to read state.json:', err);
    return DEFAULT_STATE;
  }
}

export function saveStoredState(state: AppState): void {
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const state = getStoredState();
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    message,
    type,
  };
  state.recentLogs = [newLog, ...(state.recentLogs || [])].slice(0, 50);
  saveStoredState(state);
}
