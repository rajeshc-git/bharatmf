import React from 'react';

interface IndiaFlagProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function IndiaFlag({ width = 18, height = 12, className = '', style }: IndiaFlagProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: 2.5,
        boxShadow: '0 0 1px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Saffron Top Band */}
      <rect width="24" height="5.33" fill="#FF9933" />
      {/* White Middle Band */}
      <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
      {/* Green Bottom Band */}
      <rect y="10.67" width="24" height="5.33" fill="#138808" />
      {/* Ashoka Chakra Center Navy Blue */}
      <circle cx="12" cy="8" r="2.2" stroke="#000080" strokeWidth="0.5" fill="none" />
      <circle cx="12" cy="8" r="0.5" fill="#000080" />
      {/* Chakra Spokes */}
      {[...Array(8)].map((_, i) => (
        <line
          key={i}
          x1="12"
          y1="6"
          x2="12"
          y2="10"
          stroke="#000080"
          strokeWidth="0.3"
          transform={`rotate(${i * 22.5} 12 8)`}
        />
      ))}
    </svg>
  );
}
