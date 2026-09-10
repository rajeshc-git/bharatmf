export interface FundHolding {
  id: string;
  schemeCode: number;
  schemeName: string;
  shortName: string;
  investedAmount: number;
  units: number;
  fundHouse?: string;
  category?: string;
  iconBg?: string;
  accentColor?: string;
  logoInitial?: string;
}

export interface LiveFundData extends FundHolding {
  currentNav: number;
  navDate: string;
  prevNav: number;
  prevNavDate: string;
  currentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  oneDayChange: number;
  oneDayChangePercent: number;
  isUpdatedForLatestTradingDay: boolean;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayChange: number;
  todayChangePercent: number;
  latestNavDate: string;
  allUpdated: boolean;
  funds: LiveFundData[];
  lastCheckedAt: string;
}

export interface AppState {
  lastSyncTimestamp: string;
  lastEmailSentDate: string;
  lastEmailSentTimestamp: string;
  lastEmailStatus: 'success' | 'error' | 'idle';
  lastEmailMessage?: string;
  recentLogs: Array<{
    id: string;
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
}

export interface MFapiSchemeMeta {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
  isin_growth?: string | null;
  isin_div_reinvestment?: string | null;
}

export interface MFapiNavPoint {
  date: string; // DD-MM-YYYY
  nav: string;
}

export interface MFapiSchemeResponse {
  meta: MFapiSchemeMeta;
  data: MFapiNavPoint[];
  status: string;
}
