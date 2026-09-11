'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Mail,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Menu,
  Search,
  LineChart as ChartIcon,
  ShieldCheck,
  LogOut,
  User,
  Zap,
  ArrowRight,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { PortfolioSummary, AppState, FundHolding } from '@/lib/types';
import NavChart from '@/components/NavChart';
import IndiaFlag from '@/components/IndiaFlag';

function formatCompactINR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(2)}K`;
  }
  return `${sign}₹${abs.toFixed(2)}`;
}

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

export default function Dashboard() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // App & Portfolio state
  const [data, setData] = useState<{ summary: PortfolioSummary; state: AppState } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingFund, setEditingFund] = useState<FundHolding | null>(null);
  const [chartFund, setChartFund] = useState<FundHolding | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Check auth & theme on mount
  useEffect(() => {
    checkSession();
    const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem('mf_theme') : null) as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('mf_theme', nextTheme);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const checkSession = async () => {
    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('mf_nav_token') : null;
      const headers: Record<string, string> = {};
      if (localToken) headers['Authorization'] = `Bearer ${localToken}`;

      const res = await fetch('/api/auth/session', { headers });
      const json = await res.json();
      if (json.authenticated) {
        setIsAuthenticated(true);
        setUserEmail(json.email || '');
        loadPortfolio();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthChecked(true);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToVerify = loginEmail.trim().toLowerCase();
    if (!emailToVerify || !emailToVerify.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify }),
      });
      const json = await res.json();
      if (json.success) {
        setOtpSent(true);
        showToast(json.message || `Verification OTP sent to ${emailToVerify}! Check your inbox.`, 'success');
      } else {
        showToast(json.message || 'Access restricted. Unable to send OTP.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to request OTP', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) return;
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), otp: otpCode.trim() }),
      });
      const json = await res.json();
      if (json.success && json.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('mf_nav_token', json.token);
        }
        setIsAuthenticated(true);
        setUserEmail(json.email || loginEmail);
        showToast('Login verified! Welcome to Bharat MF NAV Tracker.', 'success');
        loadPortfolio();
      } else {
        showToast(json.message || 'Verification failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/session', { method: 'POST' });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mf_nav_token');
      }
      setIsAuthenticated(false);
      setUserEmail('');
      setOtpSent(false);
      setOtpCode('');
      showToast('Logged out successfully', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const loadPortfolio = async (forceSync = false) => {
    if (forceSync) setSyncing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/portfolio${forceSync ? '?force=true' : ''}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (forceSync) {
          showToast('Live AMFI NAVs synced successfully!', 'success');
        }
      } else {
        showToast(`Failed to load: ${json.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Network error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Test email dispatched successfully!', 'success');
        loadPortfolio();
      } else {
        showToast(`Email error: ${json.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Email error: ${err.message}`, 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleFundSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.success) {
        setSearchResults(json.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSaveFund = async (fund: FundHolding) => {
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', fund }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Fund ${fund.shortName} updated!`, 'success');
        setEditingFund(null);
        loadPortfolio(true);
      } else {
        showToast(json.error, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteFund = async (schemeCode: number) => {
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', schemeCode }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Fund removed from tracker', 'info');
        loadPortfolio();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 1. Initial Checking Loading View
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="brand-logo" style={{ width: 48, height: 48, fontSize: 20 }}>
            <TrendingUp size={24} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--orange)' }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Securing session...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated OTP Login Form
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
        
        {/* Theme Toggle Top-Right on Login Screen */}
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <button
            onClick={toggleTheme}
            className="btn-theme-toggle"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {toast && (
          <div className={`toast-notice ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-info'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          
          {/* Tag Pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-pill)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 9999, marginBottom: 20 }}>
            <IndiaFlag width={18} height={12} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Built for India</span>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1.2, color: 'var(--text-primary)' }}>
            Discover India’s mutual fund <span style={{ color: 'var(--orange)', textShadow: '0 0 25px var(--orange-glow)' }}>NAV pulse.</span>
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 12, lineHeight: 1.6 }}>
            Daily end-of-day mutual fund tracker. Monitor AMFI releases and receive daily Gmail digests.
          </p>

          {/* OTP Box */}
          <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--border-orange)', borderRadius: 20, padding: 32, marginTop: 28, boxShadow: 'var(--shadow-card)' }}>
            
            {!otpSent ? (
              <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Portfolio Owner Email
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="input-orange"
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                    A 6-digit login verification code will be dispatched to your email.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !loginEmail.trim()}
                  className="btn-orange"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}
                >
                  {authLoading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
                  <span>{authLoading ? 'Sending Code...' : 'Send Login OTP via Gmail'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ display: 'inline-block', background: 'var(--orange-bg)', border: '1px solid var(--border-orange)', color: 'var(--orange)', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                    OTP Sent to {loginEmail}
                  </div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="input-orange"
                    style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 800, fontFamily: 'monospace' }}
                  />
                </div>

                <button type="submit" disabled={authLoading || otpCode.length < 4} className="btn-orange" style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}>
                  {authLoading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={16} />}
                  <span>{authLoading ? 'Verifying...' : 'Verify OTP & Enter'}</span>
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                  <button type="button" onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', fontWeight: 600 }}>
                    Change Email
                  </button>
                  <span>Session will be saved in browser</span>
                </div>
              </form>
            )}

          </div>

          <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Lock size={12} />
            <span>Encrypted Session &bull; AMFI Official &bull; Redis Caching</span>
          </div>

        </div>
      </div>
    );
  }

  // 3. Authenticated Dashboard
  const summary = data?.summary;
  const isOverallPositive = (summary?.totalGainLoss || 0) >= 0;
  const isTodayPositive = (summary?.todayChange || 0) >= 0;

  return (
    <div>
      {/* Toast Notice */}
      {toast && (
        <div className={`toast-notice ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-info'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Bharat Hunt Styled Top Navigation Bar */}
      <nav className="nav-bar">
        <div className="nav-container">
          
          <div className="brand-badge">
            <div className="brand-logo">
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="brand-text">Bharat MF</span>
                <span className="tag-india" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <IndiaFlag width={15} height={10} />
                  <span>India</span>
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="nav-actions-desktop">
            <button onClick={() => loadPortfolio(true)} disabled={syncing} className="btn-dark" title="Sync live NAVs">
              <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none', color: 'var(--orange)' }} />
              <span>Sync</span>
            </button>

            <button onClick={handleSendTestEmail} disabled={sendingEmail} className="btn-orange" title="Send live email test">
              <Mail size={14} />
              <span>{sendingEmail ? 'Sending...' : 'Send Mail'}</span>
            </button>

            <button onClick={() => setShowManageModal(true)} className="btn-dark" title="Manage Funds">
              <Sliders size={14} />
              <span>Manage</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="btn-theme-toggle"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User Profile & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-pill)', padding: '4px 6px 4px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {userEmail ? userEmail.split('@')[0] : 'Owner'}
              </span>
              <button onClick={() => setShowLogoutConfirm(true)} className="btn-danger" style={{ padding: '4px 8px', fontSize: 11 }} title="Logout from session">
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Actions: Theme Toggle, Quick Sync & Hamburger */}
          <div className="nav-actions-mobile">
            <button
              onClick={toggleTheme}
              className="btn-theme-toggle"
              style={{ padding: '7px 9px' }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button onClick={() => loadPortfolio(true)} disabled={syncing} className="btn-dark" style={{ padding: '7px 11px' }} title="Sync live NAVs">
              <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none', color: 'var(--orange)' }} />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`btn-hamburger ${mobileMenuOpen ? 'active' : ''}`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile Slide-down Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            {/* User Account Strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-pill)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #FF5B00, #FF7700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#FFF' }}>
                  {userEmail ? userEmail[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{userEmail || 'Portfolio Owner'}</div>
                  <div style={{ fontSize: 10, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }}></span>
                    Session Active
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="btn-danger"
                style={{ padding: '5px 10px', fontSize: 11 }}
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  loadPortfolio(true);
                }}
                disabled={syncing}
                className="btn-dark"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 13 }}
              >
                <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none', color: 'var(--orange)' }} />
                <span>{syncing ? 'Syncing Live AMFI NAVs...' : 'Sync Live AMFI NAVs'}</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSendTestEmail();
                }}
                disabled={sendingEmail}
                className="btn-orange"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 13 }}
              >
                <Mail size={15} />
                <span>{sendingEmail ? 'Sending Digest Email...' : 'Send Live Email Digest'}</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowManageModal(true);
                }}
                className="btn-dark"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 13 }}
              >
                <Sliders size={15} color="var(--orange)" />
                <span>Search & Manage Portfolio Funds</span>
              </button>

              <button
                onClick={() => {
                  toggleTheme();
                }}
                className="btn-dark"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: 13 }}
              >
                {theme === 'dark' ? <Sun size={15} color="var(--orange)" /> : <Moon size={15} color="var(--orange)" />}
                <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="hero-wrapper">

        {/* Hero Card */}
        <section className="hero-box">
          <div className="hero-stats-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5, flexWrap: 'wrap' }}>
                <span>Total Portfolio Valuation</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-dim)' }}></span>
                <span style={{ color: 'var(--orange)' }}>AMFI EOD: {summary?.latestNavDate}</span>
              </div>

              <div className="hero-value">
                {formatINR(summary?.totalCurrentValue || 0, true)}
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Total Invested: <strong style={{ color: 'var(--text-primary)' }}>{formatINR(summary?.totalInvested || 0, false)}</strong> ({formatCompactINR(summary?.totalInvested || 0)})
              </div>
            </div>

            <div className="metrics-scroll-row">
              {/* Returns */}
              <div className="metric-box">
                <div className="metric-title">Total Returns</div>
                <div className={`metric-number ${isOverallPositive ? 'gain-positive' : 'gain-negative'}`}>
                  {isOverallPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{isOverallPositive ? '+' : ''}{formatINR(summary?.totalGainLoss || 0, true)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: isOverallPositive ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                  {isOverallPositive ? '+' : ''}{summary?.totalGainLossPercent.toFixed(2)}% All-Time
                </div>
              </div>

              {/* 1-Day Change */}
              <div className="metric-box">
                <div className="metric-title">1-Day Change</div>
                <div className={`metric-number ${isTodayPositive ? 'gain-positive' : 'gain-negative'}`}>
                  <span>{isTodayPositive ? '▲ +' : '▼ '}{formatINR(summary?.todayChange || 0, true)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: isTodayPositive ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                  {isTodayPositive ? '+' : ''}{summary?.todayChangePercent.toFixed(2)}% Today
                </div>
              </div>
            </div>
          </div>

          <div className="hero-info-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontWeight: 600 }}>
                <CheckCircle2 size={16} color="var(--green)" />
                {summary?.funds.length} Funds Active & Tracked
              </span>
              <span className="hero-eod-detail">
                <span>&bull; </span>
                Next EOD Release: <strong style={{ color: 'var(--orange)' }}>Tonight 9:00 PM – 11:30 PM IST</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Funds List Header */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
                {summary?.funds.length} Active Funds
              </h2>
              <span className="funds-header-subtitle" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                &bull; AMFI Live
              </span>
            </div>
            <button
              onClick={() => loadPortfolio(true)}
              disabled={syncing}
              style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <span>{syncing ? 'Syncing...' : 'Refresh'}</span>
              <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {summary?.funds.map((fund) => {
              const fundPositive = fund.totalGainLoss >= 0;
              const todayPositive = fund.oneDayChange >= 0;

              return (
                <div key={fund.schemeCode} className="card-fund">
                  
                  {/* AMC Identity */}
                  <div className="fund-identity">
                    <div className="fund-avatar" style={{ backgroundColor: fund.iconBg || '#FF5B00' }}>
                      {(fund.logoInitial || fund.shortName.slice(0, 3)).toUpperCase()}
                    </div>
                    <div className="fund-identity-info">
                      <div className="fund-title">
                        {fund.shortName}
                      </div>
                      <div className="fund-meta">
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>AMFI: {fund.schemeCode}</span>
                        <span>&bull;</span>
                        <span>{fund.category || 'Mutual Fund'}</span>
                        <span>&bull;</span>
                        <span>
                          NAV: <strong style={{ color: 'var(--text-primary)' }}>₹{fund.currentNav.toFixed(2)}</strong> ({fund.navDate})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Columns (INDmoney / Groww aligned grid) */}
                  <div className="fund-stats-3col">
                    {/* Invested */}
                    <div className="fund-stat-cell">
                      <div className="fund-stat-label">Invested</div>
                      <div className="fund-stat-val">
                        {formatCompactINR(fund.investedAmount)}
                      </div>
                      <div className="fund-stat-sub">
                        {formatINR(fund.investedAmount, false)}
                      </div>
                    </div>

                    {/* Current Value */}
                    <div className="fund-stat-cell">
                      <div className="fund-stat-label">Current Value</div>
                      <div className="fund-stat-val">
                        {formatCompactINR(fund.currentValue)}
                      </div>
                      <div className="fund-stat-sub">
                        {fund.units.toFixed(2)} units
                      </div>
                    </div>

                    {/* Gain / Loss */}
                    <div className="fund-stat-cell">
                      <div className="fund-stat-label">Gain/ Loss</div>
                      <div className="fund-stat-val" style={{ color: fundPositive ? 'var(--green)' : 'var(--red)' }}>
                        {fundPositive ? '▲' : '▼'} {formatCompactINR(fund.totalGainLoss)}
                      </div>
                      <div className="fund-stat-sub" style={{ color: fundPositive ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                        {fundPositive ? '+' : ''}{fund.totalGainLossPercent.toFixed(2)}%
                      </div>
                      <div className="fund-stat-sub" style={{ color: todayPositive ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                        Today: {todayPositive ? '+' : ''}{fund.oneDayChangePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Symmetrical on mobile */}
                  <div className="fund-actions">
                    <button
                      onClick={() => setChartFund(fund)}
                      className="btn-orange"
                      style={{ padding: '6px 12px', fontSize: 11 }}
                      title="View historical NAV performance chart"
                    >
                      <ChartIcon size={13} />
                      <span>History</span>
                    </button>

                    <button
                      onClick={() => setEditingFund(fund)}
                      className="btn-dark"
                      style={{ padding: '6px 12px', fontSize: 11 }}
                    >
                      <Sliders size={13} />
                      <span>Edit</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </section>

        {/* Clean Responsive Centered Symmetrical Footer */}
        <footer style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10, fontSize: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
            <span>Official AMFI NAV Data via MFapi.in</span>
            <span style={{ color: 'var(--text-dim)' }}>&bull;</span>
            <span>Encrypted Session</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: 'var(--text-secondary)', background: 'var(--bg-pill)', border: '1px solid var(--border)', padding: '4px 14px', borderRadius: 9999, fontSize: 11, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }}></span>
            <span>Automated EOD Alert Active</span>
          </div>
        </footer>

      </main>

      {/* MODAL 1: Interactive Historical NAV Chart — Full-screen bottom sheet on mobile */}
      {chartFund && (
        <div className="modal-overlay" onClick={() => setChartFund(null)}>
          <div className="modal-sheet modal-chart" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  AMFI Scheme {chartFund.schemeCode}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chartFund.shortName}
                </h3>
              </div>
              <button onClick={() => setChartFund(null)} style={{ background: 'var(--bg-pill)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer', padding: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: 14, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <NavChart schemeCode={chartFund.schemeCode} schemeName={chartFund.shortName} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, flexShrink: 0 }}>
              <button onClick={() => setChartFund(null)} className="btn-dark" style={{ fontSize: 12 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Fund */}
      {editingFund && (
        <div className="modal-overlay" onClick={() => setEditingFund(null)}>
          <div className="modal-sheet" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Fund Holdings</h3>
              <button onClick={() => setEditingFund(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Fund Scheme</label>
                <div style={{ padding: '10px 14px', background: 'var(--bg-box)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{editingFund.shortName}</strong>
                  <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>AMFI Code: {editingFund.schemeCode}</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Invested Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={editingFund.investedAmount}
                  onChange={(e) => setEditingFund({ ...editingFund, investedAmount: parseFloat(e.target.value) || 0 })}
                  className="input-orange"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Units Held</label>
                <input
                  type="number"
                  step="any"
                  value={editingFund.units}
                  onChange={(e) => setEditingFund({ ...editingFund, units: parseFloat(e.target.value) || 0 })}
                  className="input-orange"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => {
                  handleDeleteFund(editingFund.schemeCode);
                  setEditingFund(null);
                }}
                className="btn-danger"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setEditingFund(null)} className="btn-dark" style={{ fontSize: 12 }}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleSaveFund(editingFund)} className="btn-orange" style={{ fontSize: 12 }}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manage & Search Funds */}
      {showManageModal && (
        <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} color="var(--orange)" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Search & Manage Funds</h3>
              </div>
              <button onClick={() => setShowManageModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                  Search AMFI Schemes (40,000+ mutual funds via MFapi.in)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleFundSearch(e.target.value)}
                    placeholder="Search e.g. Parag Parikh, SBI Small Cap..."
                    className="input-orange"
                    style={{ paddingLeft: 36 }}
                  />
                  <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 13 }} />
                  {searching && (
                    <RefreshCw size={16} color="var(--orange)" style={{ position: 'absolute', right: 12, top: 13, animation: 'spin 1s linear infinite' }} />
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div style={{ maxHeight: 220, overflowY: 'auto', background: 'var(--bg-box)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 8 }}>
                    {searchResults.map((res: any) => (
                      <div
                        key={res.schemeCode}
                        style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {res.schemeName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Code: {res.schemeCode}</div>
                        </div>
                        <button
                          onClick={() => {
                            const newFund: FundHolding = {
                              id: `fund-${res.schemeCode}`,
                              schemeCode: res.schemeCode,
                              schemeName: res.schemeName,
                              shortName: res.schemeName.split('-')[0].trim(),
                              investedAmount: 5000,
                              units: 10,
                              iconBg: '#FF5B00',
                              logoInitial: res.schemeName.slice(0, 3).toUpperCase(),
                            };
                            handleSaveFund(newFund);
                            setSearchResults([]);
                            setSearchQuery('');
                            setShowManageModal(false);
                          }}
                          className="btn-orange"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          <Plus size={12} />
                          <span>Add</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Currently Tracked Funds ({summary?.funds.length})
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {summary?.funds.map((fund) => (
                    <div
                      key={fund.schemeCode}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-box)', border: '1px solid var(--border)', borderRadius: 10 }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fund.shortName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          AMFI: {fund.schemeCode} &bull; Invested: {formatINR(fund.investedAmount, false)} &bull; {fund.units.toFixed(2)} units
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => {
                            setShowManageModal(false);
                            setEditingFund(fund);
                          }}
                          className="btn-dark"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFund(fund.schemeCode)}
                          className="btn-danger"
                          style={{ padding: '4px 8px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowManageModal(false)} className="btn-dark" style={{ fontSize: 12 }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-sheet" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Log Out Confirmation</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Are you sure you want to end your session?</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 14 }}>
              You will be signed out from this browser session. To sign back in, a 6-digit OTP code will be sent to your email.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-dark" style={{ fontSize: 12 }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="btn-danger"
                style={{ fontSize: 12, padding: '8px 16px' }}
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
