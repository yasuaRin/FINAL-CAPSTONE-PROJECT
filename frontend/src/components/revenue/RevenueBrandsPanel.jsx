// frontend/src/components/revenue/RevenueBrandsPanel.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ChevronRight, Calendar } from 'lucide-react';

const RevenueBrandsPanel = ({
  brandsList = [],
  insightBrandId,
  brandPerformanceInsights = [],
  handleHallOfFameClick,
  formatCurrency,
}) => {
  return (
    <div className="lg:col-span-1 border border-border bg-card rounded-3xl overflow-hidden shadow-sm flex flex-col h-[700px]">
      
      {/* Header - No filter select, just title */}
      <div className="p-6 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">
            Brand Performance Overview
          </h3>
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
                    {formatCurrency(insight.totalRevenue)}
                  </div>
                  
                  <div className="mt-3 text-[9px] text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar size={8} className="text-primary" />
                      <span>
                        <strong>Active:</strong> {insight.overallRange}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp size={8} className="text-primary" />
                      <span>
                        <strong>Peak {insight.peakPeriod}:</strong> {formatCurrency(insight.bestPeriodRevenue || insight.peakRevenue)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="mt-2 text-muted-foreground" size={12} />
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