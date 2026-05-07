/**
 * RevenueBarChart.jsx
 * 
 * Grouped bar chart for comparing actual revenue vs ML predictions
 * - Shows actual revenue (primary color) and predicted revenue (blue)
 * - X-axis shows date/month labels
 * - Tooltip shows detailed values with confidence score
 */

import { Activity, Brain } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

// Custom Tooltip Component
const RevenueTooltip = ({ active, payload, formatCurrency }) => {
  if (!active || !payload?.length) return null;
  
  const dataPoint = payload[0]?.payload || {};
  const dateLabel = dataPoint?.dateDisplay || dataPoint?.period;
  const actualValue = dataPoint?.actual;
  const forecastValue = dataPoint?.forecast;
  const r2Score = dataPoint?.r2Score;
  const isForecast = dataPoint?.isForecast || (actualValue == null && forecastValue != null);

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl ring-1 ring-black/5 min-w-[180px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
        {dateLabel}
      </p>
      <div className="space-y-2">
        {actualValue != null && actualValue > 0 && !isForecast && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Actual Revenue</span>
            </div>
            <span className="text-[10px] font-bold text-primary">
              {formatCurrency(actualValue)}
            </span>
          </div>
        )}
        {forecastValue != null && forecastValue > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-medium text-muted-foreground">ML Forecast</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-blue-500">
                {formatCurrency(forecastValue)}
              </span>
              {r2Score != null && isForecast && (
                <span className="text-[9px] text-muted-foreground">
                  Confidence: {(r2Score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Empty State Component
const EmptyChart = ({ onRerunModel, isRetraining, hasBrandFilter }) => (
  <div className="flex flex-col items-center justify-center h-full text-center gap-4">
    <Activity size={44} className="text-muted-foreground/25" aria-hidden="true" />
    <div>
      <p className="text-sm font-medium text-muted-foreground">No revenue data available</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
        {hasBrandFilter 
          ? 'No data for selected brand filter' 
          : 'Run ML models to generate predictions'}
      </p>
    </div>
    {!hasBrandFilter && (
      <button
        onClick={onRerunModel}
        disabled={isRetraining}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold transition-opacity disabled:opacity-60"
      >
        {isRetraining
          ? <><Activity size={13} className="animate-spin" /> Training…</>
          : <><Brain size={13} /> Run ML Models</>
        }
      </button>
    )}
  </div>
);

// Main Component
export const RevenueBarChart = ({
  chartData = [],
  hasForecast = false,
  isRetraining = false,
  onRerunModel,
  formatCompactCurrency,
  formatCurrency,
  selectedBrand = null,
}) => {
  const hasData = chartData.length > 0;
  const hasBrandFilter = !!selectedBrand;

  return (
    <div className="lg:col-span-2 dashboard-card p-0 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
              Revenue Forecast &amp; Trend Analysis
            </h3>
            {hasForecast && (
              <span className="text-[9px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                ML Powered
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-medium text-muted-foreground">Predicted</span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Actual revenue vs ML-predicted revenue by period
        </p>
      </div>

      {/* Chart Area */}
      <div className="h-[400px] w-full p-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              barGap={4}
              barCategoryGap={20}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--border)" 
                strokeOpacity={0.2} 
                vertical={false} 
              />
              
              <XAxis
                dataKey="dateDisplay"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 500 }}
                dy={10}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
              />
              
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 500 }}
                tickFormatter={formatCompactCurrency}
                width={70}
              />
              
              <Tooltip content={<RevenueTooltip formatCurrency={formatCurrency} />} />
              
              <Legend 
                wrapperStyle={{ fontSize: '10px' }}
                iconType="circle"
              />
              
              {/* Actual Revenue Bar */}
              <Bar
                dataKey="actual"
                name="Actual Revenue"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              
              {/* ML Forecast Bar */}
              <Bar
                dataKey="forecast"
                name="ML Forecast"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
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
        <div className="px-6 py-3 border-t border-border/60 bg-muted/5 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[9px] text-muted-foreground">
            ML Models: Linear Regression · Ridge · Random Forest · Gradient Boosting
          </p>
          <p className="text-[9px] text-muted-foreground">
            Best model selected via LOOCV per period
          </p>
        </div>
      )}
    </div>
  );
};

export default RevenueBarChart;