import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  isDegraded?: boolean;
  freshness?: 'REALTIME' | 'DELAYED' | 'STALE';
  percentDelta?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 110,
  height = 32,
  isDegraded = false,
  freshness = 'REALTIME',
  percentDelta = 0,
}) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="sparkline-empty" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 3;
  const usableHeight = height - padding * 2;
  const step = (width - padding * 2) / (data.length - 1);

  const points = data.map((val, idx) => {
    const x = padding + idx * step;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

  // Color selection based on degradation state
  const isStale = freshness === 'STALE';
  let strokeColor: string;
  let fillColor: string;

  if (isStale || isDegraded) {
    // Muted desaturated slate/amber for degraded data
    strokeColor = isStale ? '#94A3B8' : '#F59E0B';
    fillColor = isStale ? 'rgba(148, 163, 184, 0.08)' : 'rgba(245, 158, 11, 0.08)';
  } else if (percentDelta >= 0) {
    strokeColor = '#10B981'; // Vibrant emerald
    fillColor = 'rgba(16, 185, 129, 0.12)';
  } else {
    strokeColor = '#F43F5E'; // Vibrant rose
    fillColor = 'rgba(244, 63, 94, 0.12)';
  }

  const gradientId = `spark-grad-${Math.random().toString(36).substring(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      className={`sparkline-svg ${isStale ? 'stale' : ''}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Area under curve */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Main sparkline path - DASHED if stale/degraded to signify uncertainty */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isStale ? 1.4 : 1.75}
        strokeDasharray={isStale ? '3 3' : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isStale ? 0.6 : 0.95}
      />

      {/* End point dot */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - ((data[data.length - 1] - min) / range) * usableHeight}
          r={isStale ? 1.5 : 2.5}
          fill={strokeColor}
          opacity={isStale ? 0.7 : 1}
        />
      )}
    </svg>
  );
};
