// frontend/src/components/revenue/RevenueSessionsTable.jsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit2, Trash2, Plus, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const BASE_STYLE = `
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
`;

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

// Grid template with wider columns for better readability
const GRID_COLS = "50px 110px 80px 1.8fr 100px 100px 90px 120px 90px";

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
  formatCurrency,
  parseISO,
  format,
  resetForm = () => {},
  setShowSessionModal = () => {},
  uniquePeriods = [],
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowLimit, searchTerm, tableFilter.brandId, tableFilter.period, sortCol, sortDir]);

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

  // Custom styles matching Team page pagination
  const paginationButtonStyle = (isActive = false, isDisabled = false) => ({
    padding: '6px 10px',
    borderRadius: 8,
    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
    background: isActive ? 'var(--primary)' : 'var(--bg)',
    color: isActive ? '#fff' : 'var(--foreground)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    minWidth: 32,
    height: 32,
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  });

  const pageNumberStyle = (isActive = false) => ({
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
    background: isActive ? 'var(--primary)' : 'var(--bg)',
    color: isActive ? '#fff' : 'var(--foreground)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  });

  return (
    <div className="lg:col-span-2 flex flex-col min-h-[500px] lg:h-[700px]">
      <style>{BASE_STYLE}</style>
      <div
        id="session-intelligence"
        className="bg-card rounded-3xl border border-border shadow-sm flex flex-col h-full"
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
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider whitespace-nowrap">
              Live Session Record
            </h3>

            {hasActiveFilters && (
              <button
                onClick={() => setTableFilter({ brandId: 'All', period: 'All' })}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600/10 text-blue-600 text-[10px] border border-blue-600/20 whitespace-nowrap"
              >
                Clear: {getFilterDisplay()} <X size={10} />
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground">
                <span className="font-bold">{totalCount}</span> results
              </div>
              <button
                onClick={() => { resetForm(); setShowSessionModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-medium whitespace-nowrap min-h-[32px] hover:bg-blue-700 transition-colors"
              >
                <Plus size={12} />
                <span className="hidden xs:inline">Add Session</span>
                <span className="xs:hidden">Add</span>
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-2 text-[9px] text-muted-foreground md:hidden">
              Filtered by: {getFilterDisplay()}
            </div>
          )}
        </div>

        {/* Table - styled to match Brands page (grid rows, blue header, rounded cards) */}
        <div className="flex-1 overflow-auto px-2 sm:px-3 py-2">
          <div style={{ minWidth: 900 }}>
            {/* Header bar - matches Brands blue header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                background: '#2563eb',
                borderRadius: 10,
                padding: '0 4px',
              }}
            >
              {['No', 'Date', 'Time', 'Brand', 'Period', 'Platform', 'Viewers', 'Revenue', 'Actions'].map((h, i) => (
                <div
                  key={h}
                  style={{
                    padding: '12px 10px',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#fff',
                    textAlign: h === 'Actions' || h === 'Revenue' || h === 'Viewers' ? 'right' : 
                              h === 'Brand' ? 'center' : 'left',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  className={
                    h === 'Period' ? 'hidden sm:block' :
                    h === 'Viewers' ? 'hidden md:block' : ''
                  }
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
              {paginatedSessions.length === 0 && (
                <div className="px-6 py-12 text-center text-xs text-muted-foreground">
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
                    style={{
                      display: 'grid',
                      gridTemplateColumns: GRID_COLS,
                      alignItems: 'center',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(219,26,26,0.15), 0 4px 12px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(219,26,26,0.3)';
                      e.currentTarget.style.background = 'rgba(219,26,26,0.02)';
                      const name = e.currentTarget.querySelector('.session-brand-name');
                      const num = e.currentTarget.querySelector('.row-number');
                      const actions = e.currentTarget.querySelector('.row-actions');
                      if (name) name.style.color = '#DB1A1A';
                      if (num) { num.style.background = '#DB1A1A'; num.style.color = '#fff'; }
                      if (actions) actions.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'var(--card)';
                      const name = e.currentTarget.querySelector('.session-brand-name');
                      const num = e.currentTarget.querySelector('.row-number');
                      const actions = e.currentTarget.querySelector('.row-actions');
                      if (name) name.style.color = 'var(--foreground)';
                      if (num) { num.style.background = 'var(--muted)'; num.style.color = '#2563eb'; }
                      if (actions) actions.style.opacity = '0';
                    }}
                  >
                    {/* No */}
                    <div style={{ padding: '14px 6px', textAlign: 'center', minWidth: 0 }}>
                      <span
                        className="row-number"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'var(--muted)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#2563eb',
                          transition: 'background 0.18s ease, color 0.18s ease',
                        }}
                      >
                        {rowNumber}
                      </span>
                    </div>

                    {/* Date */}
                    <div style={{ padding: '14px 8px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {format(parseISO(log.date), 'MMM dd, yyyy')}
                      </span>
                    </div>

                    {/* Time */}
                    <div style={{ padding: '14px 8px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                        {log.time || '00:00'}
                      </span>
                    </div>

                    {/* Brand - Centered */}
                    <div style={{ padding: '14px 8px', textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
                      <span className="session-brand-name" style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', transition: 'color 0.15s ease' }}>
                        {log.brandName}
                      </span>
                    </div>

                    {/* Period */}
                    <div className="hidden sm:block" style={{ padding: '14px 8px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {log.period}
                      </span>
                    </div>

                    {/* Platform */}
                    <div style={{ padding: '14px 6px', minWidth: 0, overflow: 'hidden' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '3px 10px',
                          borderRadius: 6,
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          ...pStyle,
                        }}
                      >
                        {log.platform}
                      </span>
                    </div>

                    {/* Viewers */}
                    <div className="hidden md:block" style={{ padding: '14px 8px', textAlign: 'right', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: 12, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                        {log.viewers?.toLocaleString()}
                      </span>
                    </div>

                    {/* Revenue */}
                    <div style={{ padding: '14px 10px', textAlign: 'right', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(log.revenue)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ padding: '14px 8px', textAlign: 'right', minWidth: 0 }}>
                      <div
                        className="row-actions"
                        style={{ display: 'inline-flex', gap: 6, opacity: 0, transition: 'opacity 0.15s ease' }}
                      >
                        <button
                          onClick={() => openEditModal(log)}
                          title="Edit"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(37,99,235,0.08)',
                            cursor: 'pointer',
                            color: '#2563eb',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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

                        <button
                          onClick={() => handleDeleteSession(log)}
                          title="Delete"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(219,26,26,0.08)',
                            cursor: 'pointer',
                            color: '#DB1A1A',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer - Now matches Team page exactly */}
        {sessionIntelligence.length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Show:</span>
              <select 
                value={showingAll ? 'all' : rowLimit} 
                onChange={(e) => setRowLimit(e.target.value === 'all' ? null : Number(e.target.value))}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--foreground)", fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none" }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>entries</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {totalCount === 0
                ? 'No sessions'
                : showingAll
                  ? `All ${totalCount.toLocaleString()} session${totalCount !== 1 ? 's' : ''}`
                  : `Showing ${rowStart.toLocaleString()} to ${rowEnd.toLocaleString()} of ${totalCount.toLocaleString()} sessions`
              }
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={safePage === 1}
                style={paginationButtonStyle(false, safePage === 1)}
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <div style={{ display: "flex", gap: 4 }}>
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
                      style={pageNumberStyle(safePage === pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={safePage === totalPages}
                style={paginationButtonStyle(false, safePage === totalPages)}
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueSessionsTable;