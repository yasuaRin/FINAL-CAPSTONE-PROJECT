// frontend/src/components/revenue/RevenueBrandsPanel.jsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar } from 'lucide-react';

const RevenueBrandsPanel = ({
  brandsList = [],
  insightBrandId,
  brandPerformanceInsights = [],
  handleHallOfFameClick,
  formatCurrency,
}) => {
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <div className="lg:col-span-1 border border-border bg-card rounded-3xl overflow-hidden shadow-sm flex flex-col h-[700px]">
      
      {/* Header */}
      <div className="p-6 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">
            Brand Performance Overview
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {brandPerformanceInsights.map((insight, idx) => {
          const isHovered = hoveredItem === insight.id;
          
          return (
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
                  ? 'border-border/60 cursor-pointer group'
                  : 'border-border/30 opacity-40 cursor-not-allowed'
              }`}
              style={{
                transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
                transform: isHovered && insight.hasSessions ? "translateY(-4px)" : "translateY(0)",
                boxShadow: isHovered && insight.hasSessions ? "0 12px 32px rgba(239,68,68,0.15), 0 4px 12px rgba(0,0,0,0.08)" : "none",
                borderColor: isHovered && insight.hasSessions ? "rgba(239,68,68,0.3)" : "var(--border)",
                backgroundColor: isHovered && insight.hasSessions ? "rgba(239,68,68,0.02)" : "transparent",
              }}
              onMouseEnter={() => insight.hasSessions && setHoveredItem(insight.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="relative z-10">
                {insight.hasSessions ? (
                  <>
                   <div 
                      className="text-base font-bold transition-colors"
                      style={{ 
                        color: isHovered ? "#ef4444" : "var(--foreground)",
                        transition: "color 0.15s ease"
                      }}
                    >
                       {insight.name}
                    </div>

                    <div 
                      className="text-sm font-bold transition-colors"
                      style={{ 
                        color: isHovered ? "#ef4444" : "var(--foreground)",
                        transition: "color 0.15s ease"
                      }}
                    >
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
                  </>
                ) : (
                  <p className="text-[9px] text-muted-foreground">
                    No sessions recorded yet
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RevenueBrandsPanel;