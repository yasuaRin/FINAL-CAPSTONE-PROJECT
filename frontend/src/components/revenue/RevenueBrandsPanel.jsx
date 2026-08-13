// frontend/src/components/revenue/RevenueBrandsPanel.jsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar } from 'lucide-react';

const BASE_STYLE = `
  /* Responsive brand card styles */
  .brands-panel-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  
  .brands-panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,0.02);
    flex-shrink: 0;
  }
  
  .brands-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    -webkit-overflow-scrolling: touch;
    min-height: 0;
  }
  
  /* Scrollbar matching RevenueSessionsTable - always visible */
  .brands-panel-body::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .brands-panel-body::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.05);
    border-radius: 8px;
  }
  
  .brands-panel-body::-webkit-scrollbar-thumb {
    background: rgba(37,99,235,0.3);
    border-radius: 8px;
  }
  
  .brands-panel-body::-webkit-scrollbar-thumb:hover {
    background: rgba(37,99,235,0.5);
  }
  
  /* Firefox scrollbar matching RevenueSessionsTable */
  .brands-panel-body {
    scrollbar-width: thin;
    scrollbar-color: rgba(37,99,235,0.3) rgba(0,0,0,0.05);
  }
  
  .brand-card {
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid var(--border);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
    cursor: default;
    width: 100%;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    flex-shrink: 0;
  }
  
  .brand-card-interactive {
    border-color: var(--border);
    cursor: pointer;
  }
  
  .brand-card-interactive:active {
    transform: scale(0.98);
  }
  
  .brand-card-disabled {
    border-color: var(--border);
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .brand-card-content {
    position: relative;
    z-index: 10;
  }
  
  .brand-name {
    font-size: 14px;
    font-weight: 600;
    transition: color 0.15s ease;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    line-height: 1.3;
  }
  
  .brand-revenue {
    font-size: 13px;
    font-weight: 600;
    transition: color 0.15s ease;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    line-height: 1.3;
    margin-top: 2px;
  }
  
  .brand-meta {
    margin-top: 8px;
    font-size: 10px;
    color: var(--muted-foreground);
  }
  
  .brand-meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
  }
  
  .brand-meta-item:first-child {
    margin-top: 0;
  }
  
  .brand-meta-item strong {
    font-weight: 600;
  }
  
  .brand-icon {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
  }
  
  .brand-no-sessions {
    font-size: 10px;
    color: var(--muted-foreground);
    margin: 0;
  }
  
  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .brands-panel-header {
      padding: 10px 14px;
    }
    
    .brands-panel-header h3 {
      font-size: 9px;
    }
    
    .brands-panel-body {
      padding: 10px;
      gap: 8px;
    }
    
    .brand-card {
      padding: 10px 12px;
      border-radius: 12px;
    }
    
    .brand-name {
      font-size: 13px;
    }
    
    .brand-revenue {
      font-size: 12px;
    }
    
    .brand-meta {
      font-size: 9px;
      margin-top: 6px;
    }
    
    .brand-icon {
      width: 6px;
      height: 6px;
    }
    
    .brand-no-sessions {
      font-size: 9px;
    }
  }
  
  @media (max-width: 640px) {
    .brands-panel-header {
      padding: 8px 12px;
    }
    
    .brands-panel-header h3 {
      font-size: 8px;
      letter-spacing: 0.15em;
    }
    
    .brands-panel-body {
      padding: 8px;
      gap: 6px;
    }
    
    .brand-card {
      padding: 8px 10px;
      border-radius: 10px;
    }
    
    .brand-name {
      font-size: 12px;
      font-weight: 600;
    }
    
    .brand-revenue {
      font-size: 11px;
      font-weight: 600;
      margin-top: 1px;
    }
    
    .brand-meta {
      font-size: 8px;
      margin-top: 5px;
    }
    
    .brand-meta-item {
      gap: 3px;
    }
    
    .brand-icon {
      width: 5px;
      height: 5px;
    }
    
    .brand-no-sessions {
      font-size: 8px;
    }
  }
  
  @media (max-width: 480px) {
    .brands-panel-body {
      padding: 6px;
      gap: 5px;
    }
    
    .brand-card {
      padding: 6px 8px;
      border-radius: 8px;
    }
    
    .brand-name {
      font-size: 11px;
    }
    
    .brand-revenue {
      font-size: 10px;
    }
    
    .brand-meta {
      font-size: 7px;
      margin-top: 4px;
    }
    
    .brand-icon {
      width: 4px;
      height: 4px;
    }
    
    .brand-no-sessions {
      font-size: 7px;
    }
  }
`;

const RevenueBrandsPanel = ({
  brandsList = [],
  insightBrandId,
  brandPerformanceInsights = [],
  handleHallOfFameClick,
  formatCurrency,
}) => {
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <div className="lg:col-span-1 border border-border bg-card rounded-3xl overflow-hidden shadow-sm flex flex-col" style={{ height: '700px', width: '100%' }}>
      <style>{BASE_STYLE}</style>
      
      <div className="brands-panel-wrapper">
        {/* Header */}
        <div className="brands-panel-header">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground">
              Brand Performance Overview
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="brands-panel-body">
          {brandPerformanceInsights.map((insight, idx) => {
            const isHovered = hoveredItem === insight.id;
            const isInteractive = insight.hasSessions;
            
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() =>
                  isInteractive &&
                  handleHallOfFameClick(insight.id, insight.peakPeriod)
                }
                className={`brand-card ${
                  isInteractive
                    ? 'brand-card-interactive'
                    : 'brand-card-disabled'
                }`}
                style={{
                  transform: isHovered && isInteractive ? "translateY(-3px)" : "translateY(0)",
                  boxShadow: isHovered && isInteractive ? "0 8px 24px rgba(37,99,235,0.12), 0 4px 8px rgba(0,0,0,0.06)" : "none",
                  borderColor: isHovered && isInteractive ? "rgba(37,99,235,0.3)" : "var(--border)",
                  backgroundColor: isHovered && isInteractive ? "rgba(37,99,235,0.02)" : "transparent",
                }}
                onMouseEnter={() => isInteractive && setHoveredItem(insight.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onTouchStart={() => isInteractive && setHoveredItem(insight.id)}
                onTouchEnd={() => setHoveredItem(null)}
              >
                <div className="brand-card-content">
                  {isInteractive ? (
                    <>
                      <div 
                        className="brand-name"
                        style={{ 
                          color: isHovered ? "#2563eb" : "var(--foreground)",
                        }}
                      >
                        {insight.name}
                      </div>

                      <div 
                        className="brand-revenue"
                        style={{ 
                          color: isHovered ? "#2563eb" : "var(--foreground)",
                        }}
                      >
                        {formatCurrency(insight.totalRevenue)}
                      </div>
                      
                      <div className="brand-meta">
                        <div className="brand-meta-item">
                          <Calendar size={7} className="brand-icon text-primary" />
                          <span>
                            <strong>Active:</strong> {insight.overallRange}
                          </span>
                        </div>
                        <div className="brand-meta-item">
                          <TrendingUp size={7} className="brand-icon text-primary" />
                          <span>
                            <strong>Peak {insight.peakPeriod}:</strong>{" "}
                            {formatCurrency(insight.bestPeriodRevenue || insight.peakRevenue)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="brand-no-sessions">
                      No sessions recorded yet
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RevenueBrandsPanel;