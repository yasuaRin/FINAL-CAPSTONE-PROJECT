import { useState, useEffect, useRef } from 'react';
import { Activity, Brain, RefreshCw, TrendingUp, X } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Area,
} from 'recharts';

// ── Scoped style: color-mix() fallback + chart-canvas responsive height ────
const CHART_STYLE = `
  .rlc-filter-chip {
    background: rgba(37, 99, 235, 0.10);
    border-color: rgba(37, 99, 235, 0.20);
  }
  .rlc-filter-chip {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    border-color: color-mix(in srgb, var(--primary) 20%, transparent);
  }
  .rlc-chart-canvas { height: 380px; }
  @media (max-width: 640px) {
    .rlc-chart-canvas { height: 280px; }
  }
`;

// ── Tooltip ──────────────────────────────────────────────────────────────────
const RevenueTooltip = ({ active, payload, formatCurrency }) => {
  if (!active || !payload?.length) return null;
  const dp = payload[0]?.payload || {};

  return (
    <div style={{
      background: 'var(--card, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      minWidth: '190px',
      maxWidth: '90vw',
    }}>
      <p style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--muted-foreground, #6b7280)', marginBottom: '10px',
      }}>
        {dp.displayName}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {dp.actual > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '2px', background: '#3b82f6', borderRadius: '2px' }} />
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#3b82f6' }}>Actual</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(dp.actual)}</span>
          </div>
        )}
        {dp.forecast > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '2px', background: '#ef4444', borderRadius: '2px' }} />
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#ef4444' }}>Forecast</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(dp.forecast)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '100%', padding: '0 32px 32px', gap: '24px' }}>
    {[55, 70, 45, 85, 60, 90, 75].map((h, i) => (
      <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--muted, #f3f4f6)', borderRadius: '4px 4px 0 0', opacity: 0.6 }} />
    ))}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyChart = ({ onRerunModel, isRetraining, hasBrandFilter }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: '16px' }}>
    <TrendingUp size={40} style={{ color: 'var(--muted-foreground, #9ca3af)', opacity: 0.3 }} />
    <div>
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted-foreground, #6b7280)', margin: 0 }}>No revenue data available</p>
      <p style={{ fontSize: '11px', color: 'var(--muted-foreground, #9ca3af)', marginTop: '4px', opacity: 0.75 }}>
        {hasBrandFilter ? 'No data available for the selected brand.' : 'Run the ML model to generate future revenue forecasts.'}
      </p>
    </div>
    {!hasBrandFilter && (
      <button onClick={onRerunModel} disabled={isRetraining} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 16px', background: 'var(--primary)', color: '#fff',
        border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
        cursor: isRetraining ? 'not-allowed' : 'pointer', opacity: isRetraining ? 0.7 : 1,
        minHeight: '36px',
      }}>
        {isRetraining ? <><Activity size={13} />Training</> : <><Brain size={13} />Run ML Models</>}
      </button>
    )}
  </div>
);

// ── X-Axis Tick ───────────────────────────────────────────────────────────────
// Roughly how much horizontal room a "Jan 25"-style label needs to not
// collide with its neighbors when laid out horizontally.
const MIN_TICK_SPACING_PX = 56;
// Rotated labels need much less horizontal room per tick, so on small
// screens we switch to rotated labels instead of just dropping most of them.
const MIN_TICK_SPACING_ROTATED_PX = 34;
// Fixed "chrome" around the plot area that eats into the measured chart
// canvas width: left Y-axis (76) + right Y-axis (76) + chart margins
// (left 16 + right 24). Subtracting this gives the width actually
// available for X-axis labels, instead of the full canvas width.
const PLOT_CHROME_WIDTH = 76 + 76 + 16 + 24;
// Below this usable-plot-width, switch ticks to rotated mode.
const ROTATE_BREAKPOINT_PX = 480;

const PeriodTick = ({ x, y, payload, index, visibleData, containerWidth, rotate }) => {
  const total = visibleData?.length || 1;

  // Width-aware when we know the chart's actual rendered plot width
  // (updates on resize/split-screen via the ResizeObserver below); falls
  // back to the old count-only thresholds if width isn't available yet
  // (e.g. very old browsers without ResizeObserver, or the first render
  // before it fires).
  let step;
  if (containerWidth && containerWidth > 0) {
    const spacing = rotate ? MIN_TICK_SPACING_ROTATED_PX : MIN_TICK_SPACING_PX;
    const maxLabels = Math.max(1, Math.floor(containerWidth / spacing));
    step = Math.max(1, Math.ceil(total / maxLabels));
  } else {
    step = total > 24 ? 3 : total > 12 ? 2 : 1;
  }
  if (index % step !== 0) return null;

  if (rotate) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={10}
          transform="rotate(-40)"
          textAnchor="end"
          fill="var(--muted-foreground, #9ca3af)"
          fontSize={9}
          fontWeight={500}
          fontFamily="inherit"
        >
          {payload.value}
        </text>
      </g>
    );
  }

  return (
    <text x={x} y={y + 14} textAnchor="middle" dominantBaseline="middle"
      fill="var(--muted-foreground, #9ca3af)" fontSize={10} fontWeight={500} fontFamily="inherit">
      {payload.value}
    </text>
  );
};

// ── Custom dot — shown on every data point ────────────────────────────────────
const ActualDot = (props) => {
  const { cx, cy, value } = props;
  if (!value || value === 0 || !cx || !cy) return null;
  return (
    <circle cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
  );
};

const ForecastDot = (props) => {
  const { cx, cy, value } = props;
  if (!value || value === 0 || !cx || !cy) return null;
  return (
    <circle cx={cx} cy={cy} r={3} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
  );
};

// ── Filter Chip Component ────────────────────────────────────────────────────
const FilterChip = ({ brand, onRemove }) => (
  <span className="rlc-filter-chip" style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--primary)',
    maxWidth: '100%',
  }}>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{brand}</span>
    <button
      onClick={onRemove}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        margin: '-4px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--primary)',
        opacity: 0.6,
        transition: 'opacity 0.15s',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
    >
      <X size={14} />
    </button>
  </span>
);

// ── Main component ────────────────────────────────────────────────────────────
export const RevenueLineChart = ({
  chartData = [],
  hasForecast = false,
  isRetraining = false,
  isLoading = false,
  onRerunModel,
  formatCompactCurrency,
  formatCurrency,
  selectedBrand = null,
  onClearBrandFilter,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const hasData = chartData.length > 0;
  const hasBrandFilter = !!selectedBrand;

  // Chart canvas width, kept in sync via ResizeObserver so the X-axis label
  // spacing (see PeriodTick above) recalculates whenever the window is
  // resized or the browser is split-screened — not just on initial mount.
  const [chartWidth, setChartWidth] = useState(0);
  const chartCanvasRef = useRef(null);

  useEffect(() => {
    const el = chartCanvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasData, mounted]);

  // Usable plot width = measured canvas width minus the fixed chrome
  // (both Y-axes + chart margins) that the X-axis labels actually have
  // to share. This is what drives both tick-skipping and rotation.
  const usablePlotWidth = chartWidth > 0 ? Math.max(0, chartWidth - PLOT_CHROME_WIDTH) : 0;
  const rotateTicks = usablePlotWidth > 0 && usablePlotWidth < ROTATE_BREAKPOINT_PX;

  const firstForecastPeriod = hasForecast
    ? chartData.find((d) => d.forecast > 0)?.displayName
    : null;

  // Null-out zeros so lines don't collapse to baseline where there's no data
  const normalizedData = chartData.map((d) => ({
    ...d,
    actual:   d.actual   > 0 ? d.actual   : null,
    forecast: d.forecast > 0 ? d.forecast : null,
  }));

  const handleClearFilter = () => {
    console.log('🗑️ Clearing brand filter...');
    if (onClearBrandFilter) {
      onClearBrandFilter();
    } else {
      console.warn('⚠️ onClearBrandFilter prop is not provided!');
    }
  };

  return (
    <div style={{
      gridColumn: 'span 2',
      background: 'var(--card, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{CHART_STYLE}</style>

      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border, #e5e7eb)',
        background: 'var(--muted, #f9fafb)',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--foreground, #111827)', margin: 0,
            }}>
              Revenue Forecast & Trend Analysis
            </h3>

            {selectedBrand && (
              <FilterChip
                brand={selectedBrand}
                onRemove={handleClearFilter}
              />
            )}
          </div>
        </div>
        <button onClick={onRerunModel} disabled={isRetraining} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', background: 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
          cursor: isRetraining ? 'not-allowed' : 'pointer',
          opacity: isRetraining ? 0.7 : 1, transition: 'background 0.15s', flexShrink: 0,
          minHeight: '32px',
        }}>
          {isRetraining ? <><Activity size={13} />Retraining</> : <><RefreshCw size={13} />Rerun ML</>}
        </button>
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, minHeight: '300px', minWidth: 0, padding: '16px 8px 0' }}>
        {isLoading ? (
          <ChartSkeleton />
        ) : hasData && mounted ? (
          <div className="rlc-chart-canvas" ref={chartCanvasRef} style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={280} minWidth={0}>
              <ComposedChart
                data={normalizedData}
                margin={{ top: 16, right: 24, left: 16, bottom: rotateTicks ? 52 : 40 }}
              >

                <defs>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border, #e5e7eb)"
                  strokeOpacity={0.5}
                  vertical={false}
                />

                <XAxis
                  dataKey="displayName"
                  axisLine={false}
                  tickLine={false}
                  tick={(props) => (
                    <PeriodTick
                      {...props}
                      visibleData={chartData}
                      containerWidth={usablePlotWidth}
                      rotate={rotateTicks}
                    />
                  )}
                  padding={{ left: 16, right: 16 }}
                  height={rotateTicks ? 60 : 44}
                  interval={0}
                />

                {/* Left Y-axis — Actual revenue scale */}
                <YAxis
                  yAxisId="actual"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground, #9ca3af)', fontWeight: 500 }}
                  tickFormatter={formatCompactCurrency}
                  width={76}
                  domain={['auto', 'auto']}
                />

                {/* Right Y-axis — Forecast revenue scale (independent) */}
                <YAxis
                  yAxisId="forecast"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#ef4444', fontWeight: 500, opacity: 0.7 }}
                  tickFormatter={formatCompactCurrency}
                  width={76}
                  domain={['auto', 'auto']}
                />

                <Tooltip
                  content={<RevenueTooltip formatCurrency={formatCurrency} />}
                  cursor={{ stroke: 'var(--border, #e5e7eb)', strokeWidth: 1, strokeDasharray: '4 2' }}
                />

                {firstForecastPeriod && (
                  <ReferenceLine
                    yAxisId="actual"
                    x={firstForecastPeriod}
                    stroke="#ef4444"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'FORECAST',
                      position: 'insideTopRight',
                      fontSize: 9, fill: '#ef4444', fontWeight: 700, letterSpacing: '0.06em',
                    }}
                  />
                )}

                {/* Actual Revenue — blue solid line + fill + dots */}
                <Area
                  yAxisId="actual"
                  type="monotone"
                  dataKey="actual"
                  name="Actual Revenue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#gradActual)"
                  dot={<ActualDot />}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  connectNulls={false}
                />

                {/* Forecast Revenue — red solid line + fill + dots, independent scale */}
                <Area
                  yAxisId="forecast"
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast Revenue"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#gradForecast)"
                  dot={<ForecastDot />}
                  activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                  connectNulls={false}
                />

              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart onRerunModel={onRerunModel} isRetraining={isRetraining} hasBrandFilter={hasBrandFilter} />
        )}
      </div>

      {/* Legend */}
      {hasData && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px 24px', padding: '12px 20px',
          borderTop: '1px solid var(--border, #e5e7eb)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
              <line x1="0" y1="6" x2="28" y2="6" stroke="#3b82f6" strokeWidth="2.5" />
              <circle cx="14" cy="6" r="3" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#3b82f6' }}>Actual Revenue</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
              <line x1="0" y1="6" x2="28" y2="6" stroke="#ef4444" strokeWidth="2.5" />
              <circle cx="14" cy="6" r="3" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#ef4444' }}>Forecast Revenue</span>
          </div>
        </div>
      )}

      {/* Footer — ML info */}
      {hasForecast && (
        <div style={{
          borderTop: '1px solid var(--border, #e5e7eb)',
          background: 'var(--muted, #f9fafb)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Brain size={14} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--foreground, #111827)', margin: 0 }}>
              Machine Learning Forecast
            </p>
            <p style={{ fontSize: '10px', color: 'var(--muted-foreground, #9ca3af)', marginTop: '4px', lineHeight: 1.6 }}>
              Forecasts are generated using{' '}
              <span style={{ fontWeight: 600, color: 'var(--foreground, #374151)' }}>Linear Regression</span>,{' '}
              <span style={{ fontWeight: 600, color: 'var(--foreground, #374151)' }}>Ridge Regression</span>,{' '}
              <span style={{ fontWeight: 600, color: 'var(--foreground, #374151)' }}>Random Forest</span>, and{' '}
              <span style={{ fontWeight: 600, color: 'var(--foreground, #374151)' }}>Gradient Boosting</span>.
              {' '}Results are predictive estimates and should be treated as analytical guidance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueLineChart;