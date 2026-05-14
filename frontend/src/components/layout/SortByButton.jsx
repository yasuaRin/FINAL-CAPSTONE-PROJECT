/**
 * SortByButton.jsx - Date Range Picker with From/To inputs
 */

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, parseISO } from 'date-fns';
import { DayPicker } from 'react-day-picker';

const DATE_PRESETS = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Custom Range', value: 'custom' },
];

export const SortByButton = ({
  onDateRangeChange,
  selectedDateRange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize temp dates when calendar opens
  useEffect(() => {
    if (showCalendar && selectedDateRange?.start && selectedDateRange?.end) {
      setTempFromDate(format(selectedDateRange.start, 'yyyy-MM-dd'));
      setTempToDate(format(selectedDateRange.end, 'yyyy-MM-dd'));
    }
  }, [showCalendar, selectedDateRange]);

  const handleDatePreset = (presetValue) => {
    if (presetValue === 'custom') {
      setShowCalendar(true);
      return;
    }

    const now = new Date();
    let start = now;
    let end = now;

    switch (presetValue) {
      case '7d':
        start = subDays(now, 7);
        break;
      case '30d':
        start = subDays(now, 30);
        break;
      case '90d':
        start = subDays(now, 90);
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default:
        break;
    }

    onDateRangeChange({ 
      start: startOfDay(start), 
      end: endOfDay(end), 
      preset: presetValue 
    });
    setShowCalendar(false);
    setIsOpen(false);
  };

  const handleApplyCustomRange = () => {
    if (tempFromDate && tempToDate) {
      const fromDate = parseISO(tempFromDate);
      const toDate = parseISO(tempToDate);
      
      if (fromDate && toDate && fromDate <= toDate) {
        onDateRangeChange({
          start: startOfDay(fromDate),
          end: endOfDay(toDate),
          preset: 'custom'
        });
        setIsOpen(false);
        setShowCalendar(false);
      }
    }
  };

  const handleFromDateChange = (e) => {
    setTempFromDate(e.target.value);
  };

  const handleToDateChange = (e) => {
    setTempToDate(e.target.value);
  };

  const getLabel = () => {
    if (selectedDateRange?.preset && selectedDateRange.preset !== 'custom') {
      const preset = DATE_PRESETS.find(p => p.value === selectedDateRange.preset);
      return preset?.label || 'Select dates';
    }
    if (selectedDateRange?.start && selectedDateRange?.end) {
      return `${format(selectedDateRange.start, 'dd MMM yyyy')} - ${format(selectedDateRange.end, 'dd MMM yyyy')}`;
    }
    return 'Select dates';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-muted/20 border border-border text-foreground hover:border-primary/40 hover:text-primary h-10 px-4 py-2"
      >
        <Calendar size={14} />
        {getLabel()}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-[380px] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4">
              {!showCalendar ? (
                <div className="space-y-1">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleDatePreset(preset.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedDateRange?.preset === preset.value && preset.value !== 'custom'
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span>{preset.label}</span>
                      {selectedDateRange?.preset === preset.value && preset.value !== 'custom' && (
                        <Check size={14} className="text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={12} /> Back to presets
                  </button>
                  
                  {/* From/To Date Inputs */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={tempFromDate}
                        onChange={handleFromDateChange}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={tempToDate}
                        onChange={handleToDateChange}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  {/* Calendar for visual selection */}
                  <DayPicker
                    mode="range"
                    required
                    selected={{ from: tempFromDate ? parseISO(tempFromDate) : undefined, to: tempToDate ? parseISO(tempToDate) : undefined }}
                    onSelect={(range) => {
                      if (range?.from) {
                        setTempFromDate(format(range.from, 'yyyy-MM-dd'));
                      }
                      if (range?.to) {
                        setTempToDate(format(range.to, 'yyyy-MM-dd'));
                      }
                    }}
                    numberOfMonths={2}
                    className="rdp-custom mb-4"
                    classNames={{
                      months: 'flex flex-col sm:flex-row gap-4',
                      month: 'space-y-3',
                      month_caption: 'flex justify-center pt-1 relative items-center',
                      caption_label: 'text-sm font-bold',
                      nav: 'space-x-1 flex items-center',
                      button_previous: 'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center rounded-md hover:bg-muted',
                      button_next: 'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center rounded-md hover:bg-muted',
                      month_grid: 'w-full border-collapse',
                      weekdays: 'flex',
                      weekday: 'text-muted-foreground rounded-md w-9 font-bold text-[10px] uppercase text-center py-1',
                      week: 'flex w-full mt-1',
                      day: 'h-9 w-9 text-center text-sm p-0 relative',
                      day_button: 'h-9 w-9 p-0 font-medium hover:bg-muted rounded-md transition-colors flex items-center justify-center w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                      range_start: 'bg-primary text-primary-foreground font-bold rounded-l-md',
                      range_end: 'bg-primary text-primary-foreground font-bold rounded-r-md',
                      range_middle: 'bg-primary/10 text-primary font-medium rounded-none',
                      selected: 'bg-primary text-primary-foreground rounded-md',
                      today: 'bg-accent text-accent-foreground border border-primary/30 rounded-md',
                      outside: 'text-muted-foreground opacity-40',
                      disabled: 'text-muted-foreground opacity-30 cursor-not-allowed',
                      hidden: 'invisible',
                    }}
                    components={{
                      Chevron: ({ orientation }) =>
                        orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
                    }}
                  />
                  
                  {/* Apply Button */}
                  <button
                    onClick={handleApplyCustomRange}
                    disabled={!tempFromDate || !tempToDate}
                    className="w-full mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                  >
                    Apply Range
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SortByButton;