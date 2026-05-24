// frontend/src/components/layout/SortByButton.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, Calendar, X } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '../../services/supabase';

const parseLocalDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toInputValue = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const SortByButton = ({ 
  brands, 
  onBrandChange, 
  selectedBrand,
  onDateRangeChange,
  dateRange: externalDateRange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef(null);
  const [dateBounds, setDateBounds] = useState({ min: null, max: null });
  const [localDateRange, setLocalDateRange] = useState({
    start: null,
    end: null,
    preset: 'allData'
  });
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const fetchBounds = async () => {
      try {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('date')
          .order('date', { ascending: true })
          .limit(1);

        const { data: dataMax, error: errorMax } = await supabase
          .from('live_sessions')
          .select('date')
          .order('date', { ascending: false })
          .limit(1);

        if (!error && !errorMax && data?.length && dataMax?.length) {
          const minDate = data[0].date;
          const maxDate = dataMax[0].date;
          setDateBounds({ min: minDate, max: maxDate });
          
          if (!localDateRange.start && !localDateRange.end) {
            const newRange = {
              start: parseLocalDate(minDate),
              end: parseLocalDate(maxDate),
              preset: 'allData'
            };
            setLocalDateRange(newRange);
            onDateRangeChange?.(newRange);
          }
        }
      } catch (err) {
        console.error('Error fetching date bounds:', err);
      }
    };
    fetchBounds();
  }, []);

  useEffect(() => {
    if (externalDateRange) {
      setLocalDateRange(externalDateRange);
      if (externalDateRange.preset === 'custom' && externalDateRange.start && externalDateRange.end) {
        setCustomStart(toInputValue(externalDateRange.start));
        setCustomEnd(toInputValue(externalDateRange.end));
      }
    }
  }, [externalDateRange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const datePresets = [
    {
      label: 'All Data',
      value: 'allData',
      getRange: () => ({
        start: parseLocalDate(dateBounds.min),
        end: parseLocalDate(dateBounds.max),
        preset: 'allData',
      }),
    },
    {
      label: 'Last 7 Days',
      value: 'last7',
      getRange: () => ({
        start: startOfDay(subDays(new Date(), 7)),
        end: endOfDay(new Date()),
        preset: 'last7',
      }),
    },
    {
      label: 'Last 30 Days',
      value: 'last30',
      getRange: () => ({
        start: startOfDay(subDays(new Date(), 30)),
        end: endOfDay(new Date()),
        preset: 'last30',
      }),
    },
  ];

  const handleDatePreset = (preset) => {
    const range = preset.getRange();
    setLocalDateRange(range);
    onDateRangeChange?.(range);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) return;
    const start = parseLocalDate(customStart);
    const end = parseLocalDate(customEnd);
    if (!start || !end || start > end) return;
    const range = { start: startOfDay(start), end: endOfDay(end), preset: 'custom' };
    setLocalDateRange(range);
    onDateRangeChange?.(range);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (selectedBrand) {
      const brand = brands?.find(b => b.brand_id === selectedBrand);
      if (localDateRange.preset === 'allData') {
        return `${brand?.brand_name || 'Brand'} · All Data`;
      } else if (localDateRange.preset === 'last7') {
        return `${brand?.brand_name || 'Brand'} · Last 7D`;
      } else if (localDateRange.preset === 'last30') {
        return `${brand?.brand_name || 'Brand'} · Last 30D`;
      } else if (localDateRange.start && localDateRange.end) {
        return `${brand?.brand_name || 'Brand'} · ${format(localDateRange.start, 'MMM dd')} - ${format(localDateRange.end, 'MMM dd')}`;
      }
      return brand?.brand_name || 'Brand';
    }
    
    if (localDateRange.preset === 'allData') {
      return 'All Data';
    } else if (localDateRange.preset === 'last7') {
      return 'Last 7 Days';
    } else if (localDateRange.preset === 'last30') {
      return 'Last 30 Days';
    } else if (localDateRange.start && localDateRange.end) {
      return `${format(localDateRange.start, 'MMM dd')} - ${format(localDateRange.end, 'MMM dd')}`;
    }
    return 'All Filters';
  };

  const activeCount = (selectedBrand ? 1 : 0) + (localDateRange.preset !== 'allData' ? 1 : 0);

  const resetAllFilters = () => {
    onBrandChange?.(null);
    const allDataRange = {
      start: parseLocalDate(dateBounds.min),
      end: parseLocalDate(dateBounds.max),
      preset: 'allData'
    };
    setLocalDateRange(allDataRange);
    onDateRangeChange?.(allDataRange);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center gap-2 h-10 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all"
        style={{
          background: isHovered && !isOpen ? '#ef4444' : (isOpen ? 'rgba(59,130,246,0.05)' : 'rgba(0,0,0,0.05)'),
          borderColor: isHovered && !isOpen ? '#ef4444' : (isOpen ? '#3b82f6' : 'var(--border)'),
          color: isHovered && !isOpen ? 'white' : (isOpen ? '#3b82f6' : 'var(--foreground)'),
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
          transform: isHovered && !isOpen ? "translateY(-2px)" : "translateY(0)",
          boxShadow: isHovered && !isOpen ? "0 8px 20px rgba(239,68,68,0.25)" : "none",
        }}
      >
        <Filter size={14} />
        {getDisplayText()}
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] bg-card border border-border rounded-2xl shadow-xl"
            style={{ position: 'absolute' }}
          >
            <div className="p-4 space-y-4">
              {/* Date Range Section */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                  <Calendar size={10} /> Date Range
                </label>
                <div className="space-y-1">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleDatePreset(preset)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                        localDateRange.preset === preset.value
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'hover:bg-muted/10 text-foreground'
                      }`}
                    >
                      <span>{preset.label}</span>
                      {localDateRange.preset === preset.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                  
                  {/* Custom Range */}
                  <div className="pt-2 border-t border-border/60 mt-2">
                    <p className="text-[8px] text-muted-foreground mb-2">Custom Range</p>
                    <div className="flex flex-col gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-muted-foreground w-10">From:</span>
                        <input
                          type="date"
                          value={customStart}
                          max={customEnd || dateBounds.max || undefined}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          style={{ colorScheme: 'light dark' }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-muted-foreground w-10">To:</span>
                        <input
                          type="date"
                          value={customEnd}
                          min={customStart || dateBounds.min || undefined}
                          max={dateBounds.max || undefined}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          style={{ colorScheme: 'light dark' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCustomApply}
                      disabled={!customStart || !customEnd}
                      className="w-full py-2 rounded-lg bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Apply Custom Range
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60" />

              {/* Brand Filter */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                  Brand
                </label>
                <select
                  value={selectedBrand || ''}
                  onChange={(e) => onBrandChange?.(e.target.value || null)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">All Brands</option>
                  {brands?.map((brand) => (
                    <option key={brand.brand_id} value={brand.brand_id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset button */}
              {activeCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="w-full py-2 rounded-lg border border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/20 transition-all mt-2 flex items-center justify-center gap-1"
                >
                  <X size={10} /> Reset All Filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SortByButton;