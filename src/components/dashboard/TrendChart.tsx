import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Wind, Sun, AlertTriangle } from 'lucide-react';

export interface TrendDataPoint {
  hour: string;
  pm25: number;
  aqi: number;
  isVentilationWindow?: boolean;
}

export function TrendChart({ data }: { data: TrendDataPoint[] }) {
  // SVG dimensions
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const maxVal = Math.max(...data.map((d) => d.aqi), 300);
  const minVal = 0;

  const getX = (index: number) =>
    paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);

  const getY = (val: number) =>
    height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);

  // Build SVG path
  const points = data.map((d, i) => `${getX(i)},${getY(d.aqi)}`).join(' ');
  const areaPath = `${points} L ${getX(data.length - 1)},${height - paddingY} L ${getX(0)},${height - paddingY} Z`;

  return (
    <div className="bg-white border border-[#E2E8DE] rounded-[14px] p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)]">
              24-Hour Diurnal Pollution Trend & Ventilation Window
            </h4>
            <Badge variant="accent" size="sm">Copernicus Model</Badge>
          </div>
          <p className="text-xs text-[#68766C] mt-0.5">
            Physical aerosol dispersion model illustrating the diurnal morning peak and afternoon solar lifting.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#397A55]"></span>
            <span>Ventilation Window</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#B8423D]"></span>
            <span>Inversion Peak</span>
          </span>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[600px] select-none"
          role="img"
          aria-label="24-Hour Air Quality Trend Line Graph"
        >
          {/* Subtle Grid Lines */}
          {[100, 200, 300].map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#E2E8DE"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  fill="#68766C"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="system-ui"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <polygon
            points={areaPath}
            fill="#397A55"
            fillOpacity="0.08"
          />

          {/* Trend Line */}
          <polyline
            fill="none"
            stroke="#397A55"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Points and Ventilation Highlights */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.aqi);
            return (
              <g key={d.hour}>
                {d.isVentilationWindow && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="9"
                    fill="#397A55"
                    fillOpacity="0.2"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r="4.5"
                  fill={d.isVentilationWindow ? '#287A4B' : d.aqi > 200 ? '#B8423D' : '#397A55'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text
                  x={cx}
                  y={height - paddingY + 16}
                  fill="#68766C"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="system-ui"
                >
                  {d.hour}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Advisory Bar */}
      <div className="p-3.5 rounded-[10px] bg-[#EEF3EA] border border-[#CDE0D3] flex items-center justify-between text-xs text-[#27352D]">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-[#397A55]" />
          <span>
            <strong>Optimal Ventilation Window:</strong> 13:00 to 15:00 today. Outdoor PM2.5 drops to daily minimum.
          </span>
        </div>
        <span className="font-semibold text-[#397A55] hidden sm:inline">
          Open windows for 20 mins max with cross-draft
        </span>
      </div>
    </div>
  );
}
