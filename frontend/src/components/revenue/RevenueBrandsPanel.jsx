// frontend/src/components/revenue/RevenueBrandsPanel.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Filter, ChevronDown, ChevronRight } from 'lucide-react';

const RevenueBrandsPanel = ({
  brandsList = [],
  insightBrandId,
  setInsightBrandId,
  brandPerformanceInsights = [],
  handleHallOfFameClick,
  formatCurrency,
}) => {
  return (
    <div className="lg:col-span-1 border border-border bg-card rounded-3xl overflow-hidden shadow-sm flex flex-col h-[700px]">
      
      {/* Header */}
      <div className="p-6 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Period Performance Peaks
            </h3>
          </div>

          <span className="text-[8px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full">
            {brandsList.length} Brands · All Time
          </span>
        </div>

        <div className="relative group">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" size={12} />

          <select
            value={insightBrandId}
            onChange={(e) => setInsightBrandId(e.target.value)}
            className="w-full bg-white/50 dark:bg-muted/40 border border-border rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="All">All Brands</option>
            {brandsList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name.toUpperCase()}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {brandPerformanceInsights.map((insight, idx) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            onClick={() =>
              insight.hasSessions &&
              handleHallOfFameClick(insight.id, insight.peakPeriod)
            }
            className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
              insight.hasSessions
                ? 'border-border/60 hover:border-primary/40 hover:bg-muted/30 cursor-pointer group'
                : 'border-border/30 opacity-40'
            }`}
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-bold uppercase">
                  {insight.name}
                </h4>

                {insight.hasSessions ? (
                  <TrendingUp size={10} className="text-emerald-500" />
                ) : (
                  <span className="text-[8px] text-muted-foreground">
                    No sessions
                  </span>
                )}
              </div>

              {insight.hasSessions ? (
                <>
                  <div className="text-lg font-bold">
                    {formatCurrency(insight.peakRevenue)}
                  </div>

                  <div className="mt-3 text-[9px] text-muted-foreground">
                    <div>
                      <strong>Peak:</strong> {insight.peakPeriod}
                    </div>
                    <div>{insight.peakRange}</div>
                  </div>

                  <ChevronRight className="mt-3 text-muted-foreground" size={12} />
                </>
              ) : (
                <p className="text-[9px] text-muted-foreground">
                  No sessions recorded yet
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RevenueBrandsPanel;