// frontend/src/components/charts/RevenueBarChart.jsx

import { Activity, Brain, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ── Tooltip ──────────────────────────────────────────────────────────────────
const RevenueTooltip = ({ active, payload, formatCurrency }) => {
  if (!active || !payload?.length) return null;
  const dp = payload[0]?.payload || {};

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl min-w-[180px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
        {dp.year}
      </p>

      <div className="space-y-2">
        {dp.actual > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-[10px] font-medium" style={{ color: '#3b82f6' }}>
                Actual Revenue
              </span>
            </div>

            <span className="text-[10px] font-bold" style={{ color: '#3b82f6' }}>
              {formatCurrency(dp.actual)}
            </span>
          </div>
        )}

        {dp.forecast > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-[10px] font-medium" style={{ color: '#ef4444' }}>
                Forecast Revenue
              </span>
            </div>

            <span className="text-[10px] font-bold" style={{ color: '#ef4444' }}>
              {formatCurrency(dp.forecast)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div className="flex items-end justify-around h-full px-8 pb-8 gap-6 animate-pulse">
    {[70, 45, 85, 60, 90].map((h, i) => (
      <div
        key={i}
        className="flex-1 bg-muted rounded-t"
        style={{ height: `${h}%` }}
      />
    ))}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyChart = ({ onRerunModel, isRetraining, hasBrandFilter }) => (
  <div className="flex flex-col items-center justify-center h-full text-center gap-4">
    <Activity size={44} className="text-muted-foreground/25" />

    <div>
      <p className="text-sm font-medium text-muted-foreground">
        No revenue data available
      </p>

      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
        {hasBrandFilter
          ? 'No data available for the selected brand.'
          : 'Run the ML model to generate future revenue forecasts.'}
      </p>
    </div>

    {!hasBrandFilter && (
      <button
        onClick={onRerunModel}
        disabled={isRetraining}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold"
      >
        {isRetraining ? (
          <>
            <Activity size={13} className="animate-spin" />
            Training…
          </>
        ) : (
          <>
            <Brain size={13} />
            Run ML Models
          </>
        )}
      </button>
    )}
  </div>
);

// ── Custom X-axis tick ────────────────────────────────────────────────────────
const YearTick = ({ x, y, payload }) => (
  <text
    x={x}
    y={y + 14}
    textAnchor="middle"
    fill="var(--muted-foreground)"
    fontSize={12}
    fontWeight={600}
  >
    {payload.value}
  </text>
);

// ── Main component ────────────────────────────────────────────────────────────
export const RevenueBarChart = ({
  chartData = [],
  hasForecast = false,
  isRetraining = false,
  isLoading = false,
  onRerunModel,
  formatCompactCurrency,
  formatCurrency,
  selectedBrand = null,
}) => {
  const hasData = chartData.length > 0;
  const hasBrandFilter = !!selectedBrand;

  const firstForecastYear = hasForecast
    ? chartData.find((d) => d.forecast > 0)?.year
    : null;

  // Calculate dynamic height based on number of data points
  const chartHeight = hasData ? (chartData.length > 6 ? 380 : 350) : 300;

  return (
    <div className="lg:col-span-2 dashboard-card p-0 overflow-hidden h-fit">

      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />

            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
              Revenue Forecast & Trend Analysis
              {selectedBrand && (
                <span className="ml-2 text-[9px] font-normal text-muted-foreground">
                  ({selectedBrand})
                </span>
              )}
            </h3>

            {hasForecast && (
              <span className="text-[9px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                ML Powered
              </span>
            )}
          </div>

          {/* Legend - Colored text to match bars */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-[10px] font-medium" style={{ color: '#3b82f6' }}>
                Actual Revenue
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-[10px] font-medium" style={{ color: '#ef4444' }}>
                Forecast Revenue
              </span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-1">
          Comparison between historical revenue performance and AI-generated future projections.
        </p>
      </div>

      {/* Chart - Increased height and adjusted margins to prevent x-axis cropping */}
      <div
        className={`w-full px-2 pt-3 ${
          hasData ? `h-[${chartHeight}px]` : 'py-10'
        }`}
        style={hasData ? { height: `${chartHeight}px` } : {}}
      >
        {isLoading ? (
          <ChartSkeleton />
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={0}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              barCategoryGap="20%"
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={{ strokeOpacity: 0.25 }}
                vertical={{ strokeOpacity: 0.12 }}
              />

              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={{ stroke: 'var(--border)', strokeOpacity: 0.4 }}
                tick={<YearTick />}
                padding={{ left: 30, right: 30 }}
                interval={0}
                angle={0}
                dy={8}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: 'var(--muted-foreground)',
                  fontWeight: 500,
                }}
                tickFormatter={formatCompactCurrency}
                width={80}
                dy={0}
              />

              <Tooltip
                content={<RevenueTooltip formatCurrency={formatCurrency} />}
                cursor={{ fill: 'var(--muted)', opacity: 0.15 }}
              />

              {firstForecastYear && (
                <ReferenceLine
                  x={firstForecastYear}
                  stroke="#ef4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'FORECAST',
                    position: 'insideTopRight',
                    fontSize: 8,
                    fill: '#ef4444',
                    fontWeight: 700,
                    angle: 0,
                  }}
                />
              )}

              {/* ACTUAL REVENUE BAR - Primary Blue with hover effect */}
              <Bar
                dataKey="actual"
                name="Actual Revenue"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={80}
                className="bar-actual"
                onMouseEnter={(data, index) => {
                  // Hover effect for actual bars
                  const bars = document.querySelectorAll('.recharts-bar-rectangle');
                  if (bars[index]) {
                    bars[index].style.filter = 'brightness(0.85)';
                    bars[index].style.transform = 'translateY(-2px)';
                    bars[index].style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                  }
                }}
                onMouseLeave={(data, index) => {
                  const bars = document.querySelectorAll('.recharts-bar-rectangle');
                  if (bars[index]) {
                    bars[index].style.filter = 'brightness(1)';
                    bars[index].style.transform = 'translateY(0)';
                  }
                }}
              />

              {/* FORECAST REVENUE BAR - Red with slight transparency and hover effect */}
              <Bar
                dataKey="forecast"
                name="Forecast Revenue"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={80}
                opacity={0.85}
                className="bar-forecast"
                onMouseEnter={(data, index) => {
                  // Hover effect for forecast bars (offset index for actual+forecast)
                  const bars = document.querySelectorAll('.recharts-bar-rectangle');
                  const actualCount = chartData.filter(d => d.actual > 0).length;
                  const forecastIndex = actualCount + index;
                  if (bars[forecastIndex]) {
                    bars[forecastIndex].style.filter = 'brightness(0.75)';
                    bars[forecastIndex].style.transform = 'translateY(-2px)';
                    bars[forecastIndex].style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                  }
                }}
                onMouseLeave={(data, index) => {
                  const bars = document.querySelectorAll('.recharts-bar-rectangle');
                  const actualCount = chartData.filter(d => d.actual > 0).length;
                  const forecastIndex = actualCount + index;
                  if (bars[forecastIndex]) {
                    bars[forecastIndex].style.filter = 'brightness(1)';
                    bars[forecastIndex].style.transform = 'translateY(0)';
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart
            onRerunModel={onRerunModel}
            isRetraining={isRetraining}
            hasBrandFilter={hasBrandFilter}
          />
        )}
      </div>

      {/* Footer */}
      {hasForecast && (
        <div className="border-t border-border/60 bg-gradient-to-r from-muted/20 via-muted/10 to-transparent px-6 py-4">
          <div className="flex items-start gap-3">
            
            <div className="shrink-0">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center">
                <Brain size={14} className="text-red-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold tracking-wide text-foreground">
                Machine Learning Forecast Analysis
              </p>

              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Forecasts are generated using multiple machine learning models including
                <span className="font-medium text-foreground"> Linear Regression</span>,
                <span className="font-medium text-foreground"> Ridge Regression</span>,
                <span className="font-medium text-foreground"> Random Forest</span>, and
                <span className="font-medium text-foreground"> Gradient Boosting</span>.
                Results represent predictive estimates and should be interpreted as
                analytical guidance rather than guaranteed outcomes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueBarChart;