// frontend/src/components/revenue/RevenueSessionsTable.jsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit2, Trash2, Plus, X,
  ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';

const BASE_STYLE = `
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  
  /* Single scrollable table container */
  .revenue-table-scroll {
    width: 100%;
    height: 100%;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    position: relative;
  }
  
  .revenue-table-scroll::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .revenue-table-scroll::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.03);
    border-radius: 8px;
  }
  
  .revenue-table-scroll::-webkit-scrollbar-thumb {
    background: rgba(37,99,235,0.25);
    border-radius: 8px;
  }
  
  .revenue-table-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(37,99,235,0.4);
  }
  
  /* Firefox scrollbar */
  .revenue-table-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(37,99,235,0.25) rgba(0,0,0,0.03);
  }
  
  .revenue-table-inner {
    display: flex;
    flex-direction: column;
    min-width: fit-content;
    height: 100%;
  }
  
  .revenue-grid-header,
  .revenue-grid-row {
    display: grid;
    gap: 4px;
    min-width: 920px;
    grid-template-columns: 50px 100px 70px 1fr 1fr 90px 105px 85px 110px 90px;
  }
  
  @media (max-width: 1200px) {
    .revenue-grid-header,
    .revenue-grid-row {
      grid-template-columns: 45px 90px 65px 1fr 1fr 80px 95px 75px 100px 80px;
      min-width: 820px;
    }
  }
  
  @media (max-width: 640px) {
    .revenue-grid-header,
    .revenue-grid-row {
      grid-template-columns: 40px 80px 60px 1fr 1fr 70px 85px 65px 90px 70px;
      min-width: 720px;
      gap: 2px;
    }
  }
  
  .revenue-cell {
    padding: 10px 6px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .revenue-cell-center {
    text-align: center;
    justify-content: center;
  }
  
  .revenue-cell-right {
    text-align: right;
    justify-content: flex-end;
  }
  
  .revenue-cell-left {
    text-align: left;
    justify-content: flex-start;
  }
  
  .revenue-cell-wrap {
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  
  /* Touch-friendly buttons */
  .revenue-action-btn {
    width: 32px;
    height: 32px;
    min-height: 32px;
    min-width: 32px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  @media (max-width: 640px) {
    .revenue-action-btn {
      width: 36px;
      height: 36px;
      min-height: 36px;
      min-width: 36px;
    }
  }
  
  .revenue-pagination-btn {
    padding: 6px 10px;
    min-height: 32px;
    min-width: 32px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--foreground);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  .revenue-pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .revenue-pagination-btn-active {
    border-color: var(--primary);
    background: var(--primary);
    color: #fff;
  }
  
  /* Custom "Show entries" dropdown — replaces native <select> so the menu
     always opens downward, regardless of browser/OS default placement. */
  .revenue-select-wrapper {
    position: relative;
    display: inline-block;
  }
  
  .revenue-select-trigger {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--foreground);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    min-height: 32px;
  }
  
  .revenue-select-trigger:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
  }
  
  .revenue-select-trigger-icon {
    display: inline-flex;
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }
  
  .revenue-select-trigger-icon-open {
    transform: rotate(180deg);
  }
  
  .revenue-select-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    bottom: auto;
    min-width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    z-index: 50;
    overflow: hidden;
    padding: 4px;
  }
  
  .revenue-select-option {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--foreground);
    cursor: pointer;
    white-space: nowrap;
    background: transparent;
    border: none;
    width: 100%;
    text-align: left;
    display: block;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  .revenue-select-option:hover,
  .revenue-select-option:focus {
    background: rgba(37,99,235,0.1);
    color: var(--primary);
  }
  
  .revenue-select-option-active {
    background: var(--primary);
    color: #fff;
  }
  
  .revenue-select-option-active:hover,
  .revenue-select-option-active:focus {
    background: var(--primary);
    color: #fff;
  }
  
  .revenue-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  
  .revenue-row-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    transition: background 0.18s ease, color 0.18s ease;
    flex-shrink: 0;
  }
  
  @media (max-width: 640px) {
    .revenue-row-number {
      width: 26px;
      height: 26px;
      font-size: 10px;
    }
  }
  
  /* Ensure the container doesn't create extra scrollbars */
  .revenue-table-container {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 8px 12px;
  }
  
  @media (max-width: 640px) {
    .revenue-table-container {
      padding: 4px 8px;
    }
  }
`;

const ROW_LIMIT_OPTIONS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 'all', label: 'All' },
];

function getPageList(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '…', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages];
}

const RevenueSessionsTable = ({
  visibleSessions = [],
  sessionIntelligence = [],
  searchTerm = '',
  setSearchTerm = () => {},
  tableFilter = {},
  setTableFilter = () => {},
  sortCol,
  sortDir,
  rowLimit,
  setRowLimit,
  openEditModal = () => {},
  handleDeleteSession = () => {},
  canDelete = true,
  formatCurrency,
  parseISO,
  format,
  resetForm = () => {},
  setShowSessionModal = () => {},
  uniquePeriods = [],
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showLimitMenu, setShowLimitMenu] = useState(false);
  const limitDropdownRef = useRef(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowLimit, searchTerm, tableFilter.brandId, tableFilter.period, sortCol, sortDir]);

  // Close the custom "entries" dropdown on outside click/tap, works the
  // same across mouse and touch input.
  useEffect(() => {
    if (!showLimitMenu) return;
    const handleOutside = (e) => {
      if (limitDropdownRef.current && !limitDropdownRef.current.contains(e.target)) {
        setShowLimitMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showLimitMenu]);

  const totalCount = sessionIntelligence.length;
  const showingAll = rowLimit === null;
  const totalPages = showingAll ? 1 : Math.max(1, Math.ceil(totalCount / rowLimit));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedSessions = useMemo(() => {
    if (showingAll) return sessionIntelligence;
    const start = (safePage - 1) * rowLimit;
    if (start >= sessionIntelligence.length) {
      return [];
    }
    return sessionIntelligence.slice(start, start + rowLimit);
  }, [sessionIntelligence, showingAll, safePage, rowLimit]);

  const pageList = getPageList(safePage, totalPages);

  const rowStart = totalCount === 0
    ? 0
    : (safePage - 1) * rowLimit + 1;

  const rowEnd = showingAll
    ? totalCount
    : Math.min(rowStart + rowLimit - 1, totalCount);

  const hasActiveFilters = tableFilter.brandId !== 'All' || tableFilter.period !== 'All';

  const getFilterDisplay = () => {
    if (tableFilter.brandId !== 'All' && tableFilter.period !== 'All') {
      return `${tableFilter.brandName || 'Brand'} · ${tableFilter.period}`;
    }
    if (tableFilter.brandId !== 'All') {
      return tableFilter.brandName || 'Selected Brand';
    }
    if (tableFilter.period !== 'All') {
      return tableFilter.period;
    }
    return '';
  };

  const platformBadgeStyle = (platform) => {
    if (platform === 'TikTok') return { background: '#000000', color: '#fff' };
    if (platform === 'Shopee') return { background: '#f97316', color: '#fff' };
    return { background: '#3b82f6', color: '#fff' };
  };

  const currentLimitValue = showingAll ? 'all' : rowLimit;
  const currentLimitLabel = ROW_LIMIT_OPTIONS.find((o) => o.value === currentLimitValue)?.label || currentLimitValue;

  const handleSelectLimit = (value) => {
    setRowLimit(value === 'all' ? null : Number(value));
    setShowLimitMenu(false);
  };

  return (
    <div className="lg:col-span-2 flex flex-col min-h-[400px] lg:h-[700px] w-full">
      <style>{BASE_STYLE}</style>
      <div
        id="session-intelligence"
        className="rounded-3xl border border-border shadow-sm flex flex-col h-full w-full"
        style={{ background: 'var(--card)' }}
      >
        {/* Loading bar */}
        <div className="h-[3px] w-full bg-border/40 overflow-hidden flex-shrink-0 rounded-t-3xl">
          <AnimatePresence>
            {loading && (
              <motion.div
                className="h-full bg-blue-600 rounded-full"
                initial={{ x: '-100%', width: '45%' }}
                animate={{ x: '280%' }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Toolbar */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/5 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider whitespace-nowrap">
              Live Session Record
            </h3>

            {hasActiveFilters && (
              <button
                onClick={() => setTableFilter({ brandId: 'All', period: 'All' })}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs border border-blue-600/20 whitespace-nowrap touch-manipulation"
              >
                Clear: {getFilterDisplay()} <X size={10} />
              </button>
            )}

            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <span className="font-bold">{totalCount}</span> results
              </div>
              <button
                onClick={() => { resetForm(); setShowSessionModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium whitespace-nowrap min-h-[32px] hover:bg-blue-700 transition-colors touch-manipulation"
              >
                <Plus size={12} />
                <span className="hidden xs:inline">Add Session</span>
                <span className="xs:hidden">Add</span>
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-2 text-[11px] text-muted-foreground md:hidden">
              Filtered by: {getFilterDisplay()}
            </div>
          )}
        </div>

        {/* Table container - single scroll */}
        <div className="revenue-table-container">
          <div className="revenue-table-scroll">
            <div className="revenue-table-inner">
              {/* Header - sticky with muted background matching Brand panel */}
              <div
                className="revenue-grid-header"
               style={{
                background: '#2563eb',
                borderRadius: 10,
                padding: '0 4px',
                flexShrink: 0,
                borderBottom: '1px solid var(--border)',
              }}
              >
                {['No', 'Date', 'Time', 'Brand', 'Host', 'Period', 'Platform', 'Viewers', 'Revenue', 'Actions'].map((h, i) => (
                  <div
                    key={h}
                    className={`revenue-cell ${
                      h === 'Actions' || h === 'Revenue' || h === 'Viewers' ? 'revenue-cell-right' :
                      h === 'Brand' || h === 'Host' ? 'revenue-cell-center' : 'revenue-cell-left'
                    }`}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                     color: '#ffffff',
                      padding: '12px 6px',
                      ...(h === 'Platform' ? { paddingLeft: 16 } : null),
                    }}
                  >
                    <span className={h === 'Period' ? 'hidden sm:inline' : h === 'Viewers' ? 'hidden md:inline' : ''}>
                      {h}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '4px 0',
                flex: 1,
              }}>
                {paginatedSessions.length === 0 && (
                  <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                    {loading
                      ? 'Loading sessions…'
                      : hasActiveFilters
                        ? `No sessions found for the selected ${tableFilter.brandId !== 'All' ? 'brand' : 'period'}. Try clearing filters.`
                        : 'No sessions found. Click "Add Session" to create one.'
                    }
                  </div>
                )}

                {paginatedSessions.map((log, idx) => {
                  const rowNumber = showingAll ? idx + 1 : (safePage - 1) * rowLimit + idx + 1;
                  const pStyle = platformBadgeStyle(log.platform);

                  return (
                    <div
                      key={log.id}
                      className="revenue-grid-row"
                      style={{
                        alignItems: 'center',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(37,99,235,0.15), 0 4px 12px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)';
                        e.currentTarget.style.background = 'rgba(37,99,235,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.background = 'var(--card)';
                      }}
                    >
                      {/* No */}
                      <div className="revenue-cell revenue-cell-center">
                        <span className="revenue-row-number" style={{ background: 'var(--muted)', color: '#2563eb' }}>
                          {rowNumber}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="revenue-cell revenue-cell-left">
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'block' }}>
                          {format(parseISO(log.date), 'MMM dd, yyyy')}
                        </span>
                      </div>

                      {/* Time */}
                      <div className="revenue-cell revenue-cell-left">
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                          {log.time || '00:00'}
                        </span>
                      </div>

                      {/* Brand */}
                      <div className="revenue-cell revenue-cell-center revenue-cell-wrap">
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                          {log.brandName}
                        </span>
                      </div>

                      {/* Host */}
                      <div className="revenue-cell revenue-cell-center">
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--foreground)', display: 'block' }}>
                          {log.staffName || '—'}
                        </span>
                      </div>

                      {/* Period */}
                      <div className="revenue-cell revenue-cell-left hidden sm:block">
                        <span style={{ fontSize: 10, color: 'var(--muted-foreground)', display: 'block' }}>
                          {log.period}
                        </span>
                        {log.periodRange && (
                          <span style={{ fontSize: 8, color: 'var(--muted-foreground)', opacity: 0.7, display: 'block' }}>
                            {log.periodRange}
                          </span>
                        )}
                      </div>

                      {/* Platform */}
                      <div className="revenue-cell revenue-cell-left" style={{ paddingLeft: 16 }}>
                        <span
                          className="revenue-badge"
                          style={pStyle}
                        >
                          {log.platform}
                        </span>
                      </div>

                      {/* Viewers */}
                      <div className="revenue-cell revenue-cell-right hidden md:block">
                        <span style={{ fontSize: 11, color: 'var(--foreground)' }}>
                          {log.viewers?.toLocaleString()}
                        </span>
                      </div>

                      {/* Revenue */}
                      <div className="revenue-cell revenue-cell-right">
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
                          {formatCurrency(log.revenue)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="revenue-cell revenue-cell-right">
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            onClick={() => openEditModal(log)}
                            title="Edit"
                            className="revenue-action-btn"
                            style={{
                              background: 'rgba(37,99,235,0.08)',
                              color: '#2563eb',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(37,99,235,0.2)';
                              e.currentTarget.style.transform = 'scale(1.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(37,99,235,0.08)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <Edit2 size={13} />
                          </button>

                          {canDelete && (
                            <button
                              onClick={() => handleDeleteSession(log)}
                              title="Delete"
                              className="revenue-action-btn"
                              style={{
                                background: 'rgba(219,26,26,0.08)',
                                color: '#DB1A1A',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(219,26,26,0.2)';
                                e.currentTarget.style.transform = 'scale(1.12)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(219,26,26,0.08)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {sessionIntelligence.length > 0 && (
          <div style={{ 
            padding: "12px 16px", 
            borderTop: "1px solid var(--border)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            flexWrap: "wrap", 
            gap: 8,
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Show:</span>

              {/* Custom dropdown: menu is always anchored below the trigger
                  (top: calc(100% + 4px)) so it never flips upward, unlike a
                  native <select> whose direction is decided by the browser. */}
              <div className="revenue-select-wrapper" ref={limitDropdownRef}>
                <button
                  type="button"
                  className="revenue-select-trigger"
                  onClick={() => setShowLimitMenu((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={showLimitMenu}
                >
                  {currentLimitLabel}
                  <span className={`revenue-select-trigger-icon ${showLimitMenu ? 'revenue-select-trigger-icon-open' : ''}`}>
                    <ChevronDown size={14} />
                  </span>
                </button>

                <AnimatePresence>
                  {showLimitMenu && (
                    <motion.div
                      className="revenue-select-menu"
                      role="listbox"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                    >
                      {ROW_LIMIT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={currentLimitValue === opt.value}
                          className={`revenue-select-option ${currentLimitValue === opt.value ? 'revenue-select-option-active' : ''}`}
                          onClick={() => handleSelectLimit(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>entries</span>
            </div>
            
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
              {totalCount === 0
                ? 'No sessions'
                : showingAll
                  ? `All ${totalCount.toLocaleString()} session${totalCount !== 1 ? 's' : ''}`
                  : `Showing ${rowStart.toLocaleString()} to ${rowEnd.toLocaleString()} of ${totalCount.toLocaleString()} sessions`
              }
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={safePage === 1}
                className="revenue-pagination-btn"
              >
                <ChevronLeft size={12} /> <span className="hidden xs:inline">Prev</span>
              </button>
              
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (safePage <= 3) pageNum = i + 1;
                  else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = safePage - 2 + i;
                  return (
                    <button 
                      key={pageNum} 
                      onClick={() => setCurrentPage(pageNum)}
                      className={`revenue-pagination-btn ${safePage === pageNum ? 'revenue-pagination-btn-active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={safePage === totalPages}
                className="revenue-pagination-btn"
              >
                <span className="hidden xs:inline">Next</span> <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueSessionsTable;