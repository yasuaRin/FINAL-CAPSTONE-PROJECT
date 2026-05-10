// frontend/src/components/revenue/RevenueSessionsTable.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Check, Edit2, Trash2, ChevronDown, Plus, X, Activity } from 'lucide-react';

const RevenueSessionsTable = ({
  visibleSessions = [],
  sessionIntelligence = [],
  searchTerm = '',
  setSearchTerm = () => {},
  tableFilter = {},
  setTableFilter = () => {},
  sortRef,
  limitRef,
  sortOpen,
  setSortOpen,
  limitOpen,
  setLimitOpen,
  sortGroups = [],
  sortCol,
  sortDir,
  setSortCol,
  setSortDir,
  rowLimit,
  setRowLimit,
  limitOptions = [],
  activeSortLabel = '',
  openEditModal = () => {},
  handleDeleteSession = () => {},
  formatCurrency,
  parseISO,
  format,
  resetForm = () => {},
  setShowSessionModal = () => {},
}) => {
  return (
    <div className="lg:col-span-2 flex flex-col h-[700px]">
      <div id="session-intelligence" className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col h-full">

        {/* Table header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3 bg-muted/5 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search brand…"
                className="w-36 bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <Activity size={13} className="text-primary" /> Session Intelligence
            </h3>
            {(tableFilter.brandId !== 'All' || tableFilter.period !== 'All') ? (
              <button
                onClick={() => setTableFilter({ brandId: 'All', period: 'All' })}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-widest border border-primary/20 whitespace-nowrap"
              >
                Reset <X size={9} />
              </button>
            ) : (
              <span className="text-[9px] font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full whitespace-nowrap">
                {visibleSessions.length}/{sessionIntelligence.length.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Row limit dropdown */}
            <div className="relative" ref={limitRef}>
              <button
                onClick={() => { setLimitOpen((p) => !p); setSortOpen(false); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                  limitOpen
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                Show {rowLimit === null ? 'All' : rowLimit}
                <ChevronDown size={10} className={`transition-transform ${limitOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {limitOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    className="absolute right-0 top-full mt-2 z-50 w-36 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
                  >
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rows per view</span>
                    </div>
                    {limitOptions.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => { setRowLimit(opt); setLimitOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs font-medium transition-colors ${
                          rowLimit === opt ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted/10'
                        }`}
                      >
                        <span>{opt === null ? 'All' : `Top ${opt}`}</span>
                        {rowLimit === opt && <Check size={11} className="text-primary shrink-0" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => { setSortOpen((p) => !p); setLimitOpen(false); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                  sortOpen
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                <Filter size={10} /> Sort
                <ChevronDown size={10} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    className="absolute right-0 top-full mt-2 z-50 w-52 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
                  >
                    {sortGroups.map((group, gi) => (
                      <div key={gi}>
                        <div className="px-4 pt-3 pb-1">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">{group.label}</span>
                        </div>
                        {group.options.map((opt, oi) => {
                          const isActive = sortCol === opt.col && sortDir === opt.dir;
                          return (
                            <button
                              key={oi}
                              onClick={() => { setSortCol(opt.col); setSortDir(opt.dir); setSortOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs font-medium transition-colors ${
                                isActive ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted/10'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isActive && <Check size={11} className="text-primary shrink-0" />}
                            </button>
                          );
                        })}
                        {gi < sortGroups.length - 1 && <div className="mx-4 my-1 border-t border-border" />}
                      </div>
                    ))}
                    <div className="px-4 py-3 border-t border-border bg-muted/5">
                      <p className="text-[9px] text-muted-foreground">
                        Active: <span className="text-foreground font-bold">{activeSortLabel}</span>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { resetForm(); setShowSessionModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
            >
              <Plus size={13} /> Add Record
            </button>
          </div>
        </div>

        {/* Scrollable table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-card z-20">
              <tr className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 bg-muted/10">
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Brand</th>
                <th className="px-6 py-5">Period</th>
                <th className="px-6 py-5">Platform</th>
                <th className="px-6 py-5 text-right">Viewers</th>
                <th className="px-6 py-5 text-right">Revenue</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {visibleSessions.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                    {format(parseISO(log.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-bold text-foreground group-hover:text-primary">
                      {log.brandName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                      {log.period}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded-md text-white ${
                      log.platform === 'TikTok' ? 'bg-black' :
                      log.platform === 'Shopee' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {log.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-[11px] font-mono font-bold">
                    {log.viewers?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-[11px] font-mono font-bold">
                    {formatCurrency(log.revenue)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(log)}
                        className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-blue-500 hover:text-white transition-all"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(log.id)}
                        className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {rowLimit !== null && sessionIntelligence.length > rowLimit && (
          <div className="px-6 py-3 border-t border-border/60 bg-muted/5 flex items-center justify-between">
            <p className="text-[9px] text-muted-foreground">
              Showing <span className="text-foreground font-bold">{visibleSessions.length}</span> of{' '}
              <span className="text-foreground font-bold">{sessionIntelligence.length.toLocaleString()}</span> sessions
            </p>
            <button
              onClick={() => setRowLimit(null)}
              className="text-[9px] font-bold uppercase tracking-wider text-primary hover:text-primary/70 transition-colors"
            >
              View all →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueSessionsTable;