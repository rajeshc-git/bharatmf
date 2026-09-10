'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Clock, Database, RefreshCw, Zap } from 'lucide-react';

interface ChartPoint {
  date: string;
  nav: number;
}

interface NavChartProps {
  schemeCode: number;
  schemeName: string;
  initialTimeframe?: '1D' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';
}

export default function NavChart({ schemeCode, schemeName, initialTimeframe = '1Y' }: NavChartProps) {
  const [timeframe, setTimeframe] = useState<'1D' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL'>(initialTimeframe);
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
  const isPositive = (stats?.change || 0) >= 0;

  // Chart dimensions
  const width = 680;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };

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

    pathD = coords.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      // Smooth quadratic curve
      const prev = coords[idx - 1]!;
      const cx = (prev.x + curr.x) / 2;
      return `${acc} Q ${prev.x} ${prev.y}, ${cx} ${(prev.y + curr.y) / 2}`;
    }, '');

    // Close line to last point
    const lastCoord = coords[coords.length - 1]!;
    pathD += ` L ${lastCoord.x} ${lastCoord.y}`;

    // Create gradient filled area
    const firstCoord = coords[0]!;
    areaD = `${pathD} L ${lastCoord.x} ${height - padding.bottom} L ${firstCoord.x} ${height - padding.bottom} Z`;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || coords.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    let closestIdx = 0;
    let minDiff = Infinity;
    coords.forEach((coord, idx) => {
      const diff = Math.abs(coord.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoverIndex(closestIdx);
  };

  const activeCoord = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : coords[coords.length - 1];

  return (
    <div style={{ background: 'var(--bg-box)', borderRadius: 16, border: '1px solid var(--border)', padding: '20px 24px', position: 'relative' }}>
      
      {/* Top Controls: Timeframe Pills & Stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              NAV Performance History
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--orange-bg)', color: 'var(--orange)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, border: '1px solid var(--border-orange)' }}>
              <Database size={10} />
              AMFI Official
            </span>
          </div>

          {activeCoord ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
                ₹{activeCoord.point.nav.toFixed(2)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                on {activeCoord.point.date}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              ₹{stats?.endNav.toFixed(2) || '0.00'}
            </div>
          )}
        </div>

        {/* Timeframe selector (responsive scrollable pill strip) */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-pill)', padding: 3, borderRadius: 10, border: '1px solid var(--border)', gap: 3, overflowX: 'auto', maxWidth: '100%' }}>
          {(['1D', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                background: timeframe === tf ? 'linear-gradient(135deg, #FF5B00 0%, #FF7700 100%)' : 'transparent',
                color: timeframe === tf ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Sub metrics strip */}
      {stats && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: isPositive ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {isPositive ? '+' : ''}₹{stats.change.toFixed(2)} ({isPositive ? '+' : ''}{stats.changePercent.toFixed(2)}% in {timeframe})
            </span>
          </div>
          <span style={{ color: 'var(--text-dim)' }}>&bull;</span>
          <span style={{ color: 'var(--text-muted)' }}>
            Low: <strong style={{ color: 'var(--text-secondary)' }}>₹{stats.low.toFixed(2)}</strong>
          </span>
          <span style={{ color: 'var(--text-dim)' }}>&bull;</span>
          <span style={{ color: 'var(--text-muted)' }}>
            High: <strong style={{ color: 'var(--text-secondary)' }}>₹{stats.high.toFixed(2)}</strong>
          </span>
        </div>
      )}

      {/* SVG Canvas */}
      <div style={{ position: 'relative', width: '100%', height: 260 }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 12, zIndex: 10 }}>
            <RefreshCw size={24} style={{ color: 'var(--orange)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : null}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`grad-${schemeCode}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5B00" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#FF7700" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#FF7700" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FF5B00" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Grid horizontal lines */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="var(--border)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={padding.top + innerHeight / 2} x2={width - padding.right} y2={padding.top + innerHeight / 2} stroke="var(--border)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="var(--border)" />

          {/* Area Fill */}
          {areaD && <path d={areaD} fill={`url(#grad-${schemeCode})`} />}

          {/* Main Curve Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#FF5B00"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Active Hover Crosshair */}
          {activeCoord && (
            <g>
              {/* Vertical line */}
              <line
                x1={activeCoord.x}
                y1={padding.top}
                x2={activeCoord.x}
                y2={height - padding.bottom}
                stroke="#FF7700"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.75"
              />
              {/* Outer pulsing ring */}
              <circle cx={activeCoord.x} cy={activeCoord.y} r="8" fill="#FF5B00" opacity="0.3" />
              {/* Center point */}
              <circle cx={activeCoord.x} cy={activeCoord.y} r="4.5" fill="#FFFFFF" stroke="#FF5B00" strokeWidth="2.5" />
            </g>
          )}

          {/* Start and End date labels */}
          {coords.length > 0 && (
            <g fontSize="10" fill="var(--text-dim)" fontWeight="600">
              <text x={padding.left} y={height - 8} textAnchor="start">
                {coords[0]!.point.date}
              </text>
              <text x={width - padding.right} y={height - 8} textAnchor="end">
                {coords[coords.length - 1]!.point.date}
              </text>
            </g>
          )}
        </svg>
      </div>

    </div>
  );
}
