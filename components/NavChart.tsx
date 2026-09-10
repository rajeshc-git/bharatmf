'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Database, RefreshCw, BarChart2, Activity, Layers } from 'lucide-react';

interface ChartPoint {
  date: string;
  nav: number;
}

interface NavChartProps {
  schemeCode: number;
  schemeName: string;
  initialTimeframe?: '1D' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';
}

type ChartStyle = 'groww' | 'indmoney' | 'pro';

export default function NavChart({ schemeCode, schemeName, initialTimeframe = '1Y' }: NavChartProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL'>(initialTimeframe);
  const [chartStyle, setChartStyle] = useState<ChartStyle>('groww');
  const [data, setData] = useState<{
    points: ChartPoint[];
    stats: {
      high: number;
      low: number;
      startNav: number;
      endNav: number;
      change: number;
      changePercent: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved chart style preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mf_chart_style') as ChartStyle | null;
      if (saved && (saved === 'groww' || saved === 'indmoney' || saved === 'pro')) {
        setChartStyle(saved);
      }
    }
  }, []);

  const changeChartStyle = (style: ChartStyle) => {
    setChartStyle(style);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mf_chart_style', style);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/history?schemeCode=${schemeCode}&timeframe=${timeframe}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) {
          setData({ points: json.points, stats: json.stats });
        }
      })
      .catch((err) => console.error('Chart fetch error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [schemeCode, timeframe]);

  const points = data?.points || [];
  const stats = data?.stats;

  // Chart dimensions
  const width = 680;
  const height = 290;
  const padding = { top: 32, right: 24, bottom: 42, left: 24 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  let pathD = '';
  let areaD = '';
  let coords: Array<{ x: number; y: number; point: ChartPoint }> = [];

  if (points.length > 1 && stats) {
    const minNav = stats.low * 0.995;
    const maxNav = stats.high * 1.005;
    const range = maxNav - minNav || 1;

    coords = points.map((p, i) => {
      const x = padding.left + (i / (points.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - ((p.nav - minNav) / range) * innerHeight;
      return { x, y, point: p };
    });

    if (chartStyle === 'indmoney') {
      // Clean linear connections for INDmoney style
      pathD = coords.reduce((acc, curr, idx) => {
        if (idx === 0) return `M ${curr.x} ${curr.y}`;
        return `${acc} L ${curr.x} ${curr.y}`;
      }, '');
    } else {
      // Smooth spline curve for Groww & Pro Trader
      pathD = coords.reduce((acc, curr, idx) => {
        if (idx === 0) return `M ${curr.x} ${curr.y}`;
        const prev = coords[idx - 1]!;
        const cx = (prev.x + curr.x) / 2;
        return `${acc} Q ${prev.x} ${prev.y}, ${cx} ${(prev.y + curr.y) / 2}`;
      }, '');
    }

    const lastCoord = coords[coords.length - 1]!;
    pathD += ` L ${lastCoord.x} ${lastCoord.y}`;

    const firstCoord = coords[0]!;
    areaD = `${pathD} L ${lastCoord.x} ${height - padding.bottom} L ${firstCoord.x} ${height - padding.bottom} Z`;
  }

  // Smooth touch & drag position tracker
  const updateScrubPosition = useCallback(
    (clientX: number) => {
      if (!svgRef.current || coords.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const relativeX = ((clientX - rect.left) / rect.width) * width;

      let closestIdx = 0;
      let minDiff = Infinity;
      coords.forEach((coord, idx) => {
        const diff = Math.abs(coord.x - relativeX);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      setHoverIndex(closestIdx);
    },
    [coords, width]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    updateScrubPosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0 || e.pointerType === 'mouse') {
      updateScrubPosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      updateScrubPosition(e.touches[0]!.clientX);
    }
  };

  const activeCoord = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : coords[coords.length - 1];

  const currentHoverNav = activeCoord ? activeCoord.point.nav : stats?.endNav || 0;
  const startTfNav = stats?.startNav || currentHoverNav;
  const scrubDiff = currentHoverNav - startTfNav;
  const scrubDiffPercent = startTfNav > 0 ? (scrubDiff / startTfNav) * 100 : 0;
  const isScrubPositive = scrubDiff >= 0;

  // Chart theme colors based on active style
  const primaryStroke =
    chartStyle === 'indmoney'
      ? isScrubPositive ? '#10B981' : '#EF4444'
      : chartStyle === 'pro'
      ? '#06B6D4'
      : '#FF5B00';

  const secondaryStroke =
    chartStyle === 'indmoney'
      ? isScrubPositive ? '#059669' : '#DC2626'
      : chartStyle === 'pro'
      ? '#3B82F6'
      : '#FF7700';

  return (
    <div
      ref={containerRef}
      style={{
        background: 'var(--bg-box)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: '20px 20px',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Top Header: Performance Badge & Chart Style Toggler */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            NAV Pulse
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--orange-bg)',
              color: 'var(--orange)',
              fontSize: 10,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 9999,
              border: '1px solid var(--border-orange)',
            }}
          >
            <Database size={10} />
            AMFI Live
          </span>
        </div>

        {/* 3 Chart Visualizer Style Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-pill)', padding: 3, borderRadius: 10, border: '1px solid var(--border)', gap: 2 }}>
          <button
            onClick={() => changeChartStyle('groww')}
            style={{
              background: chartStyle === 'groww' ? 'var(--orange)' : 'transparent',
              color: chartStyle === 'groww' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
            title="Groww Flow Glowing Area Chart"
          >
            <Activity size={12} />
            <span>Groww</span>
          </button>

          <button
            onClick={() => changeChartStyle('indmoney')}
            style={{
              background: chartStyle === 'indmoney' ? (isScrubPositive ? '#10B981' : '#EF4444') : 'transparent',
              color: chartStyle === 'indmoney' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
            title="INDmoney Dual-tone Linear Chart"
          >
            <TrendingUp size={12} />
            <span>INDmoney</span>
          </button>

          <button
            onClick={() => changeChartStyle('pro')}
            style={{
              background: chartStyle === 'pro' ? '#06B6D4' : 'transparent',
              color: chartStyle === 'pro' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
            title="Pro Trader Technical Volume & Velocity Chart"
          >
            <BarChart2 size={12} />
            <span>Pro Trader</span>
          </button>
        </div>
      </div>

      {/* Prominent Live NAV, Percentage & Date Banner */}
      <div style={{ background: 'var(--bg-pill)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.8 }}>
                ₹{currentHoverNav.toFixed(2)}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 800,
                  color: isScrubPositive ? 'var(--green)' : 'var(--red)',
                }}
              >
                {isScrubPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>
                  {isScrubPositive ? '+' : ''}₹{scrubDiff.toFixed(2)} ({isScrubPositive ? '+' : ''}
                  {scrubDiffPercent.toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Large Visible Date Tag for Mobile */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--orange-bg)', border: '1px solid var(--border-orange)', padding: '5px 12px', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>NAV Date:</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--orange)' }}>
              {activeCoord ? activeCoord.point.date : points[points.length - 1]?.date || 'Latest'}
            </span>
          </div>
        </div>

        {/* 52W / Period Range metrics */}
        {stats && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, marginTop: 8, color: 'var(--text-muted)' }}>
            <span>
              Low: <strong style={{ color: 'var(--text-primary)' }}>₹{stats.low.toFixed(2)}</strong>
            </span>
            <span style={{ color: 'var(--text-dim)' }}>&bull;</span>
            <span>
              High: <strong style={{ color: 'var(--text-primary)' }}>₹{stats.high.toFixed(2)}</strong>
            </span>
            <span style={{ color: 'var(--text-dim)' }}>&bull;</span>
            <span style={{ color: 'var(--text-dim)' }}>Drag/touch chart to scrub history</span>
          </div>
        )}
      </div>

      {/* SVG Interactive Canvas with Touch Gestures */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: height,
          touchAction: 'none',
          cursor: 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={(e) => {
          if (e.touches.length > 0) updateScrubPosition(e.touches[0]!.clientX);
        }}
        onTouchMove={handleTouchMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.45)',
              borderRadius: 14,
              zIndex: 10,
            }}
          >
            <RefreshCw size={26} style={{ color: 'var(--orange)', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`grad-${schemeCode}-${chartStyle}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryStroke} stopOpacity={chartStyle === 'groww' ? 0.45 : chartStyle === 'pro' ? 0.35 : 0.25} />
              <stop offset="60%" stopColor={secondaryStroke} stopOpacity={chartStyle === 'groww' ? 0.12 : 0.05} />
              <stop offset="100%" stopColor={secondaryStroke} stopOpacity="0.0" />
            </linearGradient>
            <filter id={`glow-${schemeCode}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={primaryStroke} floodOpacity="0.55" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="var(--border)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={padding.top + innerHeight / 2} x2={width - padding.right} y2={padding.top + innerHeight / 2} stroke="var(--border)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="var(--border)" />

          {/* Area Fill */}
          {areaD && <path d={areaD} fill={`url(#grad-${schemeCode}-${chartStyle})`} />}

          {/* Pro Trader Mode: Momentum / Movement Histogram Bars at Bottom */}
          {chartStyle === 'pro' &&
            coords.map((c, i) => {
              if (i === 0) return null;
              const prev = coords[i - 1]!;
              const isUp = c.point.nav >= prev.point.nav;
              const barHeight = Math.min(24, Math.abs(c.y - prev.y) * 1.5 + 4);
              return (
                <rect
                  key={`bar-${i}`}
                  x={c.x - 1.5}
                  y={height - padding.bottom - barHeight}
                  width="3"
                  height={barHeight}
                  fill={isUp ? '#10B981' : '#EF4444'}
                  opacity="0.45"
                  rx="1"
                />
              );
            })}

          {/* Main Curve Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={primaryStroke}
              strokeWidth={chartStyle === 'indmoney' ? '2.4' : '3.0'}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-${schemeCode})`}
            />
          )}

          {/* INDmoney Style: Subtle Landmark High/Low Dotted Lines */}
          {chartStyle === 'indmoney' && stats && (
            <g opacity="0.6">
              <line
                x1={padding.left}
                y1={padding.top}
                x2={width - padding.right}
                y2={padding.top}
                stroke="#10B981"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1={padding.left}
                y1={height - padding.bottom}
                x2={width - padding.right}
                y2={height - padding.bottom}
                stroke="#EF4444"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Active Hover / Touch Crosshair with Glow & Floating Pill */}
          {activeCoord && (
            <g>
              {/* Vertical scrub line */}
              <line
                x1={activeCoord.x}
                y1={padding.top}
                x2={activeCoord.x}
                y2={height - padding.bottom}
                stroke={secondaryStroke}
                strokeWidth="1.8"
                strokeDasharray="4 4"
                opacity="0.85"
              />

              {/* Floating Tooltip Pill */}
              <g transform={`translate(${Math.max(65, Math.min(width - 65, activeCoord.x))}, ${padding.top - 12})`}>
                <rect x="-55" y="-12" width="110" height="22" rx="6" fill="#1E293B" stroke={primaryStroke} strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800">
                  ₹{activeCoord.point.nav.toFixed(2)}
                </text>
              </g>

              {/* Outer pulsing ring */}
              <circle cx={activeCoord.x} cy={activeCoord.y} r="10" fill={primaryStroke} opacity="0.35" />
              {/* Center point */}
              <circle cx={activeCoord.x} cy={activeCoord.y} r="5" fill="#FFFFFF" stroke={primaryStroke} strokeWidth="3" />
            </g>
          )}

          {/* Large Visible Start and End Date labels at bottom */}
          {coords.length > 0 && (
            <g fontSize="12" fill="var(--text-secondary)" fontWeight="700">
              <text x={padding.left} y={height - 12} textAnchor="start">
                {coords[0]!.point.date}
              </text>
              <text x={width - padding.right} y={height - 12} textAnchor="end">
                {coords[coords.length - 1]!.point.date}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Controls: Responsive Scrollable Timeframe Pills */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-pill)',
            padding: '4px',
            borderRadius: 14,
            border: '1px solid var(--border)',
            gap: 4,
            overflowX: 'auto',
            maxWidth: '100%',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {(['1D', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setHoverIndex(null);
                setTimeframe(tf);
              }}
              style={{
                background: timeframe === tf ? 'linear-gradient(135deg, #FF5B00 0%, #FF7700 100%)' : 'transparent',
                color: timeframe === tf ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                touchAction: 'manipulation',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

