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
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,0.02);
    flex-shrink: 0;
  }
  
  .brands-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    -webkit-overflow-scrolling: touch;
  }
  
  .brands-panel-body::-webkit-scrollbar {
    width: 4px;
  }
  
  .brands-panel-body::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.03);
    border-radius: 4px;
  }
  
  .brands-panel-body::-webkit-scrollbar-thumb {
    background: rgba(37,99,235,0.2);
    border-radius: 4px;
  }
  
  .brands-panel-body::-webkit-scrollbar-thumb:hover {
    background: rgba(37,99,235,0.4);
  }
  
  /* Firefox scrollbar */
  .brands-panel-body {
    scrollbar-width: thin;
    scrollbar-color: rgba(37,99,235,0.2) rgba(0,0,0,0.03);
  }
  
  .brand-card {
    padding: 16px;
    border-radius: 16px;
    border: 1px solid var(--border);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
    cursor: default;
    width: 100%;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
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
    font-size: 18px;
    font-weight: 700;
    transition: color 0.15s ease;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  
  .brand-revenue {
    font-size: 16px;
    font-weight: 700;
    transition: color 0.15s ease;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  
  .brand-meta {
    margin-top: 12px;
    font-size: 11px;
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
    width: 8px;
    height: 8px;
  }
  
  .brand-no-sessions {
    font-size: 11px;
    color: var(--muted-foreground);
    margin: 0;
  }
  
  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .brands-panel-header {
      padding: 14px 16px;
    }
    
    .brand-card {
      padding: 14px 16px;
    }
    
    .brand-name {
      font-size: 16px;
    }
    
    .brand-revenue {
      font-size: 15px;
    }
  }
  
  @media (max-width: 640px) {
    .brands-panel-header {
      padding: 12px 14px;
    }
    
    .brands-panel-header h3 {
      font-size: 10px;
    }
    
    .brands-panel-body {
      padding: 12px;
      gap: 10px;
    }
    
    .brand-card {
      padding: 12px 14px;
      border-radius: 14px;
    }
    
    .brand-name {
      font-size: 15px;
    }
    
    .brand-revenue {
      font-size: 14px;
    }
    
    .brand-meta {
      font-size: 10px;
      margin-top: 10px;
    }
    
    .brand-meta-item {
      gap: 3px;
    }
    
    .brand-icon {
      width: 7px;
      height: 7px;
    }
    
    .brand-no-sessions {
      font-size: 10px;
    }
  }
  
  @media (max-width: 480px) {
    .brands-panel-body {
      padding: 10px;
      gap: 8px;
    }
    
    .brand-card {
      padding: 10px 12px;
      border-radius: 12px;
    }
    
    .brand-name {
      font-size: 14px;
    }
    
    .brand-revenue {
      font-size: 13px;
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
    <div className="lg:col-span-1 border border-border bg-card rounded-3xl overflow-hidden shadow-sm flex flex-col h-[700px] w-full">
      <style>{BASE_STYLE}</style>
      
      <div className="brands-panel-wrapper">
        {/* Header */}
        <div className="brands-panel-header">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
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
                  transform: isHovered && isInteractive ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: isHovered && isInteractive ? "0 12px 32px rgba(37,99,235,0.15), 0 4px 12px rgba(0,0,0,0.08)" : "none",
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
                          <Calendar size={8} className="brand-icon text-primary" />
                          <span>
                            <strong>Active:</strong> {insight.overallRange}
                          </span>
                        </div>
                        <div className="brand-meta-item">
                          <TrendingUp size={8} className="brand-icon text-primary" />
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