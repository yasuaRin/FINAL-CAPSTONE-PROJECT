// frontend/src/components/revenue/RevenueSessionsTable.jsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Edit2, Trash2, Plus, X, Activity,
  SlidersHorizontal, ChevronLeft, ChevronRight,
} from 'lucide-react';

const LIMIT_OPTIONS = [10, 25, 50, 100, 500, 1000, null];

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
  sortOpen, setSortOpen, limitOpen, setLimitOpen,
  sortGroups = [], activeSortLabel = '',
  sortCol,
  sortDir,
  setSortCol,
  setSortDir,
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

  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const filterRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowLimit, searchTerm, tableFilter, sortCol, sortDir]);

  const totalCount  = sessionIntelligence.length;
  const showingAll  = rowLimit === null;
  const totalPages  = showingAll ? 1 : Math.max(1, Math.ceil(totalCount / rowLimit));
  const safePage    = Math.min(currentPage, totalPages);

  const paginatedSessions = useMemo(() => {
    if (showingAll) return sessionIntelligence;
    const start = (safePage - 1) * rowLimit;
    return sessionIntelligence.slice(start, start + rowLimit);
  }, [sessionIntelligence, showingAll, safePage, rowLimit]);

  const pageList = getPageList(safePage, totalPages);

  const sortOptions = [
    { label: 'Newest',   col: 'date',    dir: 'desc' },
    { label: 'Oldest',   col: 'date',    dir: 'asc'  },
    { label: 'Revenue ↓',    col: 'revenue', dir: 'desc' },
    { label: 'Revenue ↑',    col: 'revenue', dir: 'asc'  },
    { label: 'Views ↓',  col: 'viewers', dir: 'desc' },
    { label: 'Views ↑',  col: 'viewers', dir: 'asc'  },
  ];

  const activeFilterCount = [
    tableFilter.period !== 'All',
    !(sortCol === 'date' && sortDir === 'desc'),
    rowLimit !== 25,
  ].filter(Boolean).length;

  const rowStart = showingAll ? 1 : (safePage - 1) * rowLimit + 1;
  const rowEnd   = showingAll ? totalCount : Math.min(safePage * rowLimit, totalCount);

  return (
    <div className="lg:col-span-2 flex flex-col min-h-[500px] lg:h-[700px]">
      <div
        id="session-intelligence"
        className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col h-full"
      >

        {/* Loading bar */}
        <div className="h-[3px] w-full bg-border/40 overflow-hidden flex-shrink-0">
          <AnimatePresence>
            {loading && (
              <motion.div
                className="h-full bg-primary rounded-full"
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
              <Activity size={13} className="text-primary" /> Sessions
            </h3>

            <div className="relative flex-1 min-w-[120px] max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search brand..."
                className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-primary/20 outline-none"
              />
            </div>

            {(tableFilter.brandId !== 'All' || tableFilter.period !== 'All') && (
              <button
                onClick={() => setTableFilter({ brandId: 'All', period: 'All' })}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] border border-primary/20 whitespace-nowrap"
              >
                Clear <X size={10} />
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">

              {/* Filters button */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFilterOpen((p) => !p)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all min-h-[32px] ${
                    filterOpen
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <SlidersHorizontal size={12} />
                  <span className="hidden xs:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {filterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                      style={{ top: 'calc(100% + 8px)' }}
                      className="absolute right-0 z-50 w-[min(288px,calc(100vw-2rem))] bg-card border border-border rounded-2xl shadow-xl"
                    >
                      <div className="p-4 space-y-4">

                        {/* Sort */}
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Sort by</p>
                          <div className="flex flex-wrap gap-1.5">
                            {sortOptions.map((opt) => {
                              const isActive = sortCol === opt.col && sortDir === opt.dir;
                              return (
                                <button
                                  key={`${opt.col}:${opt.dir}`}
                                  onClick={() => { setSortCol(opt.col); setSortDir(opt.dir); }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all min-h-[28px] ${
                                    isActive
                                      ? 'bg-primary text-white border-primary shadow-sm'
                                      : 'bg-background border-border hover:border-primary/40 text-foreground'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="border-t border-border/60" />

                        {/* Period */}
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Period</p>
                          <select
                            value={tableFilter.period !== 'All' ? tableFilter.period : ''}
                            onChange={(e) => setTableFilter({ ...tableFilter, period: e.target.value || 'All' })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-primary/20"
                          >
                            <option value="">All Periods</option>
                            {uniquePeriods.map(period => (
                              <option key={period} value={period}>{period}</option>
                            ))}
                          </select>
                        </div>

                        <div className="border-t border-border/60" />

                        {/* Show rows */}
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Show rows</p>
                          <div className="flex flex-wrap gap-1.5">
                            {LIMIT_OPTIONS.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => setRowLimit(opt)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all min-h-[28px] ${
                                  rowLimit === opt
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-background border-border hover:border-primary/40 text-foreground'
                                }`}
                              >
                                {opt === null ? 'All' : opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reset all */}
                        <button
                          onClick={() => {
                            setSortCol('date');
                            setSortDir('desc');
                            setTableFilter({ brandId: 'All', period: 'All' });
                            setRowLimit(25);
                            setFilterOpen(false);
                          }}
                          className="w-full py-1.5 rounded-lg border border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/20 transition-all"
                        >
                          Reset all
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Add session */}
              <button
                onClick={() => { resetForm(); setShowSessionModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-medium whitespace-nowrap min-h-[32px]"
              >
                <Plus size={12} />
                <span className="hidden xs:inline">Add Session</span>
                <span className="xs:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left min-w-[520px]">
            <thead className="sticky top-0 bg-card z-20">
              <tr className="text-[10px] font-medium text-muted-foreground border-b border-border/50 bg-muted/10">
                <th className="px-3 sm:px-6 py-3 whitespace-nowrap">Date</th>
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
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-muted-foreground">
                    {loading ? 'Loading sessions…' : 'No sessions found.'}
                  </td>
                </tr>
              )}
              {paginatedSessions.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-3 sm:px-6 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                    {format(parseISO(log.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-3 sm:px-6 py-3">
                    <span className="text-[11px] font-medium text-foreground group-hover:text-primary">
                      {log.brandName}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 hidden sm:table-cell">
                    <span className="text-[10px] text-muted-foreground">{log.period}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3">
                    <span className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded text-white ${
                      log.platform === 'TikTok' ? 'bg-black' :
                      log.platform === 'Shopee'  ? 'bg-orange-500' : 'bg-blue-500'
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
                        className="p-1.5 rounded bg-muted/50 hover:bg-blue-500 hover:text-white transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(log.id)}
                        className="p-1.5 rounded bg-muted/50 hover:bg-red-500 hover:text-white transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-6 py-2.5 border-t border-border/60 bg-muted/5 flex items-center justify-between gap-2 min-h-[44px] flex-wrap">

          <p className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">
            {totalCount === 0
              ? 'No sessions'
              : showingAll
                ? `All ${totalCount.toLocaleString()} sessions`
                : `${rowStart.toLocaleString()}–${rowEnd.toLocaleString()} of ${totalCount.toLocaleString()}`
            }
          </p>

          {!showingAll && totalPages > 1 && (
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-border bg-background hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[28px] min-w-[28px] flex items-center justify-center"
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
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-background border-border hover:border-primary/40 text-foreground'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-border bg-background hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[28px] min-w-[28px] flex items-center justify-center"
                aria-label="Next page"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}

          {showingAll && totalCount > 0 && (
            <button
              onClick={() => setRowLimit(25)}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              ← Show 25
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default RevenueSessionsTable;