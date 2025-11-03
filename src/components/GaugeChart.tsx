import { useMemo } from 'react';

interface GaugeChartProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
}

export function GaugeChart({ value, min, max, label, unit }: GaugeChartProps) {
  // Ensure value is within bounds
  const clampedValue = Math.max(min, Math.min(max, value));
  
  // Calculate percentage (0-1)
  const percentage = (clampedValue - min) / (max - min);
  
  // Calculate angle (-180 to 0 degrees, 180 degree arc rotated 90° left)
  const angle = -180 + (percentage * 180);
  
  // Generate color based on percentage (green to red)
  const getColor = (pct: number) => {
    // 0 = green, 0.5 = yellow, 1 = red
    if (pct < 0.5) {
      // Green to yellow
      const r = Math.round(34 + (pct * 2) * (234 - 34));
      const g = Math.round(197 + (pct * 2) * (179 - 197));
      const b = Math.round(94 + (pct * 2) * (34 - 94));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to red
      const r = Math.round(234 + ((pct - 0.5) * 2) * (239 - 234));
      const g = Math.round(179 - ((pct - 0.5) * 2) * (179 - 68));
      const b = Math.round(34 - ((pct - 0.5) * 2) * 34);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };
  
  // Generate arc path
  const radius = 80;
  const centerX = 100;
  const centerY = 100;
  const strokeWidth = 20;
  
  // Create gradient stops for the arc
  const gradientStops = useMemo(() => {
    const stops = [];
    for (let i = 0; i <= 10; i++) {
      const pct = i / 10;
      stops.push({
        offset: `${pct * 100}%`,
        color: getColor(pct),
      });
    }
    return stops;
  }, []);
  
  // Calculate needle endpoint
  const needleLength = radius - strokeWidth / 2;
  const needleAngleRad = (angle * Math.PI) / 180;
  const needleX = centerX + needleLength * Math.cos(needleAngleRad);
  const needleY = centerY + needleLength * Math.sin(needleAngleRad);
  
  // Create arc path (180 degree arc rotated 90° left)
  const startAngle = -180;
  const endAngle = 0;
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;
  
  const startX = centerX + radius * Math.cos(startAngleRad);
  const startY = centerY + radius * Math.sin(startAngleRad);
  const endX = centerX + radius * Math.cos(endAngleRad);
  const endY = centerY + radius * Math.sin(endAngleRad);
  
  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;
  
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 140" className="w-full max-w-xs">
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, idx) => (
              <stop key={idx} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Colored arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={`url(#gradient-${label})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const tickAngle = -180 + (pct * 180);
          const tickAngleRad = (tickAngle * Math.PI) / 180;
          const tickLength = 8;
          const innerRadius = radius - strokeWidth / 2 - 5;
          const outerRadius = innerRadius - tickLength;
          const x1 = centerX + innerRadius * Math.cos(tickAngleRad);
          const y1 = centerY + innerRadius * Math.sin(tickAngleRad);
          const x2 = centerX + outerRadius * Math.cos(tickAngleRad);
          const y2 = centerY + outerRadius * Math.sin(tickAngleRad);
          
          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#6b7280"
              strokeWidth={2}
            />
          );
        })}
        
        {/* Scale labels */}
        {[0, 0.5, 1].map((pct, idx) => {
          const labelAngle = -180 + (pct * 180);
          const labelAngleRad = (labelAngle * Math.PI) / 180;
          const labelRadius = radius - strokeWidth / 2 - 20;
          const x = centerX + labelRadius * Math.cos(labelAngleRad);
          const y = centerY + labelRadius * Math.sin(labelAngleRad);
          const labelValue = (min + (max - min) * pct).toFixed(0);
          
          return (
            <text
              key={idx}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="#6b7280"
              fontWeight="600"
            >
              {labelValue}
            </text>
          );
        })}
        
        {/* Center circle */}
        <circle cx={centerX} cy={centerY} r="8" fill="#374151" />
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="#374151"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Needle tip circle */}
        <circle cx={needleX} cy={needleY} r="3" fill="#374151" />
      </svg>
      
      {/* Value display */}
      <div className="text-center mt-2">
        <div className="text-2xl font-bold" style={{ color: getColor(percentage) }}>
          {value.toFixed(2)}
        </div>
        <div className="text-sm text-gray-600">
          {label} ({unit})
        </div>
      </div>
    </div>
  );
}
