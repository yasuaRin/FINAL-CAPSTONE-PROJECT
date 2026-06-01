// frontend/src/components/revenue/RevenueSessionsTable.jsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Edit2, Trash2, Plus, X, Activity,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

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
  formatCurrency,
  parseISO,
  format,
  resetForm = () => {},
  setShowSessionModal = () => {},
  uniquePeriods = [],
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredRow, setHoveredRow] = useState(null);

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

  return (
    <div className="lg:col-span-2 flex flex-col min-h-[500px] lg:h-[700px]">
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
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <Activity size={13} className="text-blue-600" /> Sessions
            </h3>

            <div className="relative flex-1 min-w-[120px] max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search brand..."
                className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-600/20 outline-none"
              />
            </div>

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

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead className="sticky top-0 bg-card z-20">
              <tr className="text-[10px] font-medium text-muted-foreground border-b border-border/50 bg-muted/10">
                <th className="px-3 sm:px-6 py-3 whitespace-nowrap">Date</th>
                <th className="px-3 sm:px-6 py-3 whitespace-nowrap">Time</th>
                <th className="px-3 sm:px-6 py-3 whitespace-nowrap">Brand</th>
                <th className="px-3 sm:px-6 py-3 hidden sm:table-cell whitespace-nowrap">Period</th>
                <th className="px-3 sm:px-6 py-3 whitespace-nowrap">Platform</th>
                <th className="px-3 sm:px-6 py-3 text-right hidden md:table-cell whitespace-nowrap">Viewers</th>
                <th className="px-3 sm:px-6 py-3 text-right whitespace-nowrap">Revenue</th>
                <th className="px-3 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/20">
              {paginatedSessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-muted-foreground">
                    {loading 
                      ? 'Loading sessions…' 
                      : hasActiveFilters 
                        ? `No sessions found for the selected ${tableFilter.brandId !== 'All' ? 'brand' : 'period'}. Try clearing filters.`
                        : 'No sessions found. Click "Add Session" to create one.'
                    }
                  </td>
                </tr>
              )}

              {paginatedSessions.map((log) => {
                const isHovered = hoveredRow === log.id;
                
                return (
                  <tr 
                    key={log.id} 
                    className="transition-all group"
                    style={{
                      transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
                      transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                      boxShadow: isHovered ? "0 8px 20px rgba(239,68,68,0.12)" : "none",
                      backgroundColor: isHovered ? "rgba(239,68,68,0.02)" : "transparent",
                    }}
                    onMouseEnter={() => setHoveredRow(log.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="px-3 sm:px-6 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {format(parseISO(log.date), 'MMM dd, yyyy')}
                    </td>

                    <td className="px-3 sm:px-6 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {log.time || '00:00'}
                    </td>

                    <td className="px-3 sm:px-6 py-3">
                      <span 
                        className="text-[11px] font-medium transition-colors"
                        style={{ 
                          color: isHovered ? "#ef4444" : "var(--foreground)",
                          transition: "color 0.15s ease"
                        }}
                      >
                        {log.brandName}
                      </span>
                    </td>

                    <td className="px-3 sm:px-6 py-3 hidden sm:table-cell">
                      <span className="text-[10px] text-muted-foreground">
                        {log.period}
                      </span>
                    </td>

                    <td className="px-3 sm:px-6 py-3">
                      <span className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded text-white ${
                        log.platform === 'TikTok'
                          ? 'bg-black'
                          : log.platform === 'Shopee'
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                      }`}>
                        {log.platform}
                      </span>
                    </td>

                    <td className="px-3 sm:px-6 py-3 text-right text-[11px] hidden md:table-cell">
                      {log.viewers?.toLocaleString()}
                    </td>

                    <td className="px-3 sm:px-6 py-3 text-right text-[11px] font-medium whitespace-nowrap">
                      {formatCurrency(log.revenue)}
                    </td>

                    <td className="px-3 sm:px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(log)}
                          className="p-1.5 rounded bg-muted/50 hover:bg-blue-600 hover:text-white transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                          title="Edit"
                        >
                          <Edit2 size={11} />
                        </button>

                        <button
                          onClick={() => handleDeleteSession(log)}
                          className="p-1.5 rounded bg-muted/50 hover:bg-red-500 hover:text-white transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-6 py-2.5 border-t border-border/60 bg-muted/5 flex items-center justify-between gap-2 min-h-[44px] flex-wrap rounded-b-3xl">
          <p className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">
            {totalCount === 0
              ? 'No sessions'
              : showingAll
                ? `All ${totalCount.toLocaleString()} session${totalCount !== 1 ? 's' : ''}`
                : `Showing ${rowStart.toLocaleString()}–${rowEnd.toLocaleString()} of ${totalCount.toLocaleString()} session${totalCount !== 1 ? 's' : ''}`
            }
          </p>

          {!showingAll && totalPages > 1 && totalCount > 0 && (
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-border bg-background hover:border-blue-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[28px] min-w-[28px] flex items-center justify-center"
                aria-label="Previous page"
              >
                <ChevronLeft size={12} />
              </button>

              {pageList.map((page, idx) =>
                page === '…' ? (
                  <span key={`ellipsis-${idx}`} className="text-[10px] text-muted-foreground px-1 select-none">…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[28px] min-h-[28px] px-2 rounded-lg border text-[10px] font-semibold transition-all ${
                      safePage === page
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-background border-border hover:border-blue-600/40 text-foreground'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-border bg-background hover:border-blue-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[28px] min-w-[28px] flex items-center justify-center"
                aria-label="Next page"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}

          {!showingAll && totalCount > rowLimit && (
            <button
              onClick={() => setRowLimit(null)}
              className="text-[10px] font-medium text-blue-600 hover:underline transition-colors whitespace-nowrap"
            >
              Show All ({totalCount})
            </button>
          )}

          {showingAll && totalCount > 25 && (
            <button
              onClick={() => setRowLimit(25)}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Show less (25 per page) ←
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueSessionsTable;